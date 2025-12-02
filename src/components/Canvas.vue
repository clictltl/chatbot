<script setup lang="ts">
/**
 * CANVAS - Área de trabalho onde os blocos são desenhados e conectados
 *
 * Funcionalidades:
 * - Pan (arrastar o canvas com Ctrl+Click ou botão do meio do mouse)
 * - Zoom (com o slider no toolbar)
 * - Arrastar blocos
 * - Criar conexões arrastando de um handle de saída para um handle de entrada
 * - Desenhar setas entre blocos
 */

import { ref, computed, watch, onMounted, nextTick } from 'vue';
import type { Block, Connection } from '../types/chatbot';
import BlockNode from './BlockNode.vue';

const props = defineProps<{
  blocks: Block[];
  connections: Connection[];
  selectedBlockId: string | null;
  zoom: number;
}>();

const emit = defineEmits<{
  'update:selectedBlockId': [id: string | null];
  'update:blocks': [blocks: Block[]];
  'update:connections': [connections: Connection[]];
  'update:zoom': [zoom: number];
  'context-menu': [position: { x: number; y: number; screenX: number; screenY: number }];
  'block-context-menu': [blockId: string, position: { x: number; y: number; screenX: number; screenY: number }];
}>();

const canvasRef = ref<HTMLDivElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);

// Estado do canvas
const panOffset = ref({ x: 0, y: 0 });
const isPanning = ref(false);
const panStart = ref({ x: 0, y: 0 });

// Estado do arraste de blocos
const draggedBlock = ref<string | null>(null);
const dragStart = ref({ x: 0, y: 0, blockX: 0, blockY: 0 });

// Estado da criação de conexões
const connectingFrom = ref<{ blockId: string; outputId?: string; element: HTMLElement } | null>(null);
const mousePosition = ref({ x: 0, y: 0 });
const tempConnectionPath = ref<string>('');

// Estado da seleção de conexão
const selectedConnectionId = ref<string | null>(null);

const canvasStyle = computed(() => ({
  transform: `translate(${panOffset.value.x}px, ${panOffset.value.y}px) scale(${props.zoom / 100})`,
  transformOrigin: '0 0',
  '--pan-x': `${panOffset.value.x}px`,
  '--pan-y': `${panOffset.value.y}px`,
  '--zoom': `${props.zoom / 100}`
}));

// Função auxiliar para obter a posição de um handle
function getHandlePosition(handleElement: HTMLElement): { x: number; y: number } {
  const canvasBounds = canvasRef.value?.getBoundingClientRect();
  const handleBounds = handleElement.getBoundingClientRect();

  if (!canvasBounds) return { x: 0, y: 0 };

  const zoom = props.zoom / 100;

  return {
    x: (handleBounds.left + handleBounds.width / 2 - canvasBounds.left - panOffset.value.x) / zoom,
    y: (handleBounds.top + handleBounds.height / 2 - canvasBounds.top - panOffset.value.y) / zoom
  };
}

// Gera o path SVG para uma conexão estilo Landbot (com curvas arredondadas de 90 graus)
function getConnectionPath(fromX: number, fromY: number, toX: number, toY: number): string {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const radius = 15;
  const verticalGap = 60; // Espaço acima/abaixo do bloco
  const horizontalOffset = 50; // Distância para direita antes de virar

  // Se a conexão vai para frente (toX > fromX), usa o caminho simples
  if (dx > 0) {
    // Se os blocos estão aproximadamente na mesma altura
    if (Math.abs(dy) < 20) {
      return `M ${fromX} ${fromY} L ${toX} ${toY}`;
    }

    // Indo para frente e para baixo/cima
    const goingDown = dy > 0;
    const firstCornerX = fromX + horizontalOffset;

    if (goingDown) {
      return `
        M ${fromX} ${fromY}
        L ${firstCornerX - radius} ${fromY}
        Q ${firstCornerX} ${fromY}, ${firstCornerX} ${fromY + radius}
        L ${firstCornerX} ${toY - radius}
        Q ${firstCornerX} ${toY}, ${firstCornerX + radius} ${toY}
        L ${toX} ${toY}
      `.replace(/\s+/g, ' ').trim();
    } else {
      return `
        M ${fromX} ${fromY}
        L ${firstCornerX - radius} ${fromY}
        Q ${firstCornerX} ${fromY}, ${firstCornerX} ${fromY - radius}
        L ${firstCornerX} ${toY + radius}
        Q ${firstCornerX} ${toY}, ${firstCornerX + radius} ${toY}
        L ${toX} ${toY}
      `.replace(/\s+/g, ' ').trim();
    }
  }

  // Se a conexão vai para trás (toX <= fromX), usa o caminho em U
  const rightX = fromX + horizontalOffset;
  const leftX = toX - horizontalOffset;

  // Se o destino está abaixo, passa por baixo; se está acima, passa por cima
  const goingDown = dy > 0;
  const edgeY = goingDown
    ? Math.max(fromY, toY) + verticalGap  // Passa por baixo
    : Math.min(fromY, toY) - verticalGap; // Passa por cima

  if (goingDown) {
    // Caminho por baixo: direita -> baixo -> esquerda -> sobe até destino
    return `
      M ${fromX} ${fromY}
      L ${rightX - radius} ${fromY}
      Q ${rightX} ${fromY}, ${rightX} ${fromY + radius}
      L ${rightX} ${edgeY - radius}
      Q ${rightX} ${edgeY}, ${rightX - radius} ${edgeY}
      L ${leftX + radius} ${edgeY}
      Q ${leftX} ${edgeY}, ${leftX} ${edgeY - radius}
      L ${leftX} ${toY + radius}
      Q ${leftX} ${toY}, ${leftX + radius} ${toY}
      L ${toX} ${toY}
    `.replace(/\s+/g, ' ').trim();
  } else {
    // Caminho por cima: direita -> cima -> esquerda -> desce até destino
    return `
      M ${fromX} ${fromY}
      L ${rightX - radius} ${fromY}
      Q ${rightX} ${fromY}, ${rightX} ${fromY - radius}
      L ${rightX} ${edgeY + radius}
      Q ${rightX} ${edgeY}, ${rightX - radius} ${edgeY}
      L ${leftX + radius} ${edgeY}
      Q ${leftX} ${edgeY}, ${leftX} ${edgeY + radius}
      L ${leftX} ${toY - radius}
      Q ${leftX} ${toY}, ${leftX + radius} ${toY}
      L ${toX} ${toY}
    `.replace(/\s+/g, ' ').trim();
  }
}

// Atualiza o path da conexão temporária durante o arraste
function updateTempConnection() {
  if (!connectingFrom.value) {
    tempConnectionPath.value = '';
    return;
  }

  const fromPos = getHandlePosition(connectingFrom.value.element);
  const path = getConnectionPath(fromPos.x, fromPos.y, mousePosition.value.x, mousePosition.value.y);
  tempConnectionPath.value = path;
}

// Mouse down no canvas
function handleCanvasMouseDown(event: MouseEvent) {
  // Cancela conexão em andamento
  if (connectingFrom.value) {
    connectingFrom.value = null;
    tempConnectionPath.value = '';
    return;
  }

  // Pan: botão do meio ou Espaço + botão esquerdo
  if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
    event.preventDefault();
    isPanning.value = true;
    panStart.value = { x: event.clientX, y: event.clientY };
    return;
  }

  // Desseleciona ao clicar no canvas vazio
  if (event.target === canvasRef.value) {
    emit('update:selectedBlockId', null);
    selectedConnectionId.value = null;
  }
}

// Manipula o clique direito no canvas
function handleCanvasContextMenu(event: MouseEvent) {
  event.preventDefault();

  const rect = canvasRef.value?.getBoundingClientRect();
  if (!rect) return;

  const zoom = props.zoom / 100;
  const position = {
    x: (event.clientX - rect.left - panOffset.value.x) / zoom,
    y: (event.clientY - rect.top - panOffset.value.y) / zoom,
    screenX: event.clientX,
    screenY: event.clientY
  };

  emit('context-menu', position);
}

// Mouse move no canvas
function handleCanvasMouseMove(event: MouseEvent) {
  const rect = canvasRef.value?.getBoundingClientRect();
  if (rect) {
    const zoom = props.zoom / 100;
    mousePosition.value = {
      x: (event.clientX - rect.left - panOffset.value.x) / zoom,
      y: (event.clientY - rect.top - panOffset.value.y) / zoom
    };
  }

  // Atualiza conexão temporária
  if (connectingFrom.value) {
    updateTempConnection();
  }

  // Pan do canvas
  if (isPanning.value) {
    const dx = event.clientX - panStart.value.x;
    const dy = event.clientY - panStart.value.y;
    panOffset.value = {
      x: panOffset.value.x + dx,
      y: panOffset.value.y + dy
    };
    panStart.value = { x: event.clientX, y: event.clientY };
  }

  // Arrastar bloco
  if (draggedBlock.value) {
    const zoom = props.zoom / 100;
    const dx = (event.clientX - dragStart.value.x) / zoom;
    const dy = (event.clientY - dragStart.value.y) / zoom;

    const updatedBlocks = props.blocks.map(b =>
      b.id === draggedBlock.value
        ? { ...b, position: { x: dragStart.value.blockX + dx, y: dragStart.value.blockY + dy } }
        : b
    );
    emit('update:blocks', updatedBlocks);
  }
}

// Mouse up no canvas
function handleCanvasMouseUp() {
  isPanning.value = false;
  draggedBlock.value = null;
}

// Início do arraste de um bloco
function handleBlockDragStart(blockId: string, event: MouseEvent) {
  draggedBlock.value = blockId;
  const block = props.blocks.find(b => b.id === blockId);
  if (block) {
    dragStart.value = {
      x: event.clientX,
      y: event.clientY,
      blockX: block.position.x,
      blockY: block.position.y
    };
  }
}

// Seleção de um bloco
function handleBlockSelect(blockId: string) {
  if (!connectingFrom.value) {
    emit('update:selectedBlockId', blockId);
  }
}

// Deletar um bloco
function handleBlockDelete(blockId: string) {
  // Remove o bloco
  const updatedBlocks = props.blocks.filter(b => b.id !== blockId);
  emit('update:blocks', updatedBlocks);

  // Remove todas as conexões relacionadas ao bloco
  const updatedConnections = props.connections.filter(
    c => c.fromBlockId !== blockId && c.toBlockId !== blockId
  );
  emit('update:connections', updatedConnections);

  // Limpa seleção se o bloco deletado estava selecionado
  if (props.selectedBlockId === blockId) {
    emit('update:selectedBlockId', null);
  }
}

// Início de uma conexão (mousedown no handle de saída)
function handleConnectStart(blockId: string, outputId?: string) {
  const handleId = outputId ? `${blockId}-output-${outputId}` : `${blockId}-output`;
  const handleElement = document.querySelector(`[data-handle-id="${handleId}"]`) as HTMLElement;

  if (!handleElement) {
    console.error('Handle não encontrado:', handleId);
    return;
  }

  connectingFrom.value = {
    blockId,
    outputId,
    element: handleElement
  };

  updateTempConnection();
}

// Click no handle de entrada (finaliza a conexão)
function handleInputClick(blockId: string) {
  if (!connectingFrom.value || connectingFrom.value.blockId === blockId) {
    connectingFrom.value = null;
    tempConnectionPath.value = '';
    return;
  }

  // Cria a conexão
  createConnection(connectingFrom.value.blockId, connectingFrom.value.outputId, blockId);

  connectingFrom.value = null;
  tempConnectionPath.value = '';
}

// Cria uma nova conexão
function createConnection(fromBlockId: string, fromOutputId: string | undefined, toBlockId: string) {
  const fromBlock = props.blocks.find(b => b.id === fromBlockId);
  const toBlock = props.blocks.find(b => b.id === toBlockId);

  if (!fromBlock || !toBlock) return;

  // NÃO permitir saída do bloco 'end'
  if (fromBlock.type === 'end') {
    console.warn('Não é possível criar conexão a partir de um bloco de fim');
    return;
  }

  // NÃO permitir conexão duplicada idêntica
  const isDuplicate = props.connections.some(
    c => c.fromBlockId === fromBlockId &&
         c.fromOutputId === fromOutputId &&
         c.toBlockId === toBlockId
  );

  if (isDuplicate) {
    console.warn('Conexão duplicada - já existe');
    return;
  }

  // Atualiza o nextBlockId no bloco de origem
  const updatedBlocks = props.blocks.map(block => {
    if (block.id !== fromBlockId) return block;

    // Se tem outputId, atualiza a escolha ou condição específica
    if (fromOutputId && block.choices) {
      return {
        ...block,
        choices: block.choices.map(c =>
          c.id === fromOutputId ? { ...c, nextBlockId: toBlockId } : c
        )
      };
    }

    if (fromOutputId && block.conditions) {
      return {
        ...block,
        conditions: block.conditions.map(c =>
          c.id === fromOutputId ? { ...c, nextBlockId: toBlockId } : c
        )
      };
    }

    // Caso contrário, atualiza o nextBlockId principal
    return { ...block, nextBlockId: toBlockId };
  });

  emit('update:blocks', updatedBlocks);

  // Adiciona a conexão visual
  const newConnection: Connection = {
    id: `conn_${Date.now()}`,
    fromBlockId,
    fromOutputId,
    toBlockId
  };

  // Remove APENAS conexão antiga com mesmo from/fromOutput (permite múltiplas entradas)
  const filteredConnections = props.connections.filter(
    c => !(c.fromBlockId === fromBlockId && c.fromOutputId === fromOutputId)
  );

  emit('update:connections', [...filteredConnections, newConnection]);
}

// Calcula o path de uma conexão baseado nos IDs dos handles
function getConnectionPathById(conn: Connection): string {
  const fromHandleId = conn.fromOutputId
    ? `${conn.fromBlockId}-output-${conn.fromOutputId}`
    : `${conn.fromBlockId}-output`;
  const toHandleId = `${conn.toBlockId}-input`;

  const fromHandle = document.querySelector(`[data-handle-id='${fromHandleId}']`) as HTMLElement;
  const toHandle = document.querySelector(`[data-handle-id='${toHandleId}']`) as HTMLElement;

  if (!fromHandle || !toHandle) return '';

  const fromPos = getHandlePosition(fromHandle);
  const toPos = getHandlePosition(toHandle);

  return getConnectionPath(fromPos.x, fromPos.y, toPos.x, toPos.y);
}

// Seleciona uma conexão
function handleConnectionClick(connectionId: string, event: MouseEvent) {
  event.stopPropagation();
  selectedConnectionId.value = connectionId;
}

// Deleta a conexão selecionada
function deleteSelectedConnection() {
  if (!selectedConnectionId.value) return;

  const connection = props.connections.find(c => c.id === selectedConnectionId.value);
  if (!connection) return;

  // Remove a conexão da lista
  const updatedConnections = props.connections.filter(c => c.id !== selectedConnectionId.value);
  emit('update:connections', updatedConnections);

  // Atualiza o nextBlockId no bloco de origem
  const updatedBlocks = props.blocks.map(block => {
    if (block.id !== connection.fromBlockId) return block;

    // Se tem outputId, remove o nextBlockId da escolha ou condição específica
    if (connection.fromOutputId && block.choices) {
      return {
        ...block,
        choices: block.choices.map(c =>
          c.id === connection.fromOutputId ? { ...c, nextBlockId: undefined } : c
        )
      };
    }

    if (connection.fromOutputId && block.conditions) {
      return {
        ...block,
        conditions: block.conditions.map(c =>
          c.id === connection.fromOutputId ? { ...c, nextBlockId: undefined } : c
        )
      };
    }

    // Caso contrário, remove o nextBlockId principal
    return { ...block, nextBlockId: undefined };
  });

  emit('update:blocks', updatedBlocks);
  selectedConnectionId.value = null;
}

// Listener para teclas Delete/Backspace
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (selectedConnectionId.value) {
      event.preventDefault();
      deleteSelectedConnection();
    }
  }
}

// Handler para context menu em blocos
function handleBlockContextMenu(blockId: string, event: MouseEvent) {
  const canvasRect = canvasRef.value?.getBoundingClientRect();
  if (!canvasRect) return;

  const position = {
    x: event.clientX - canvasRect.left,
    y: event.clientY - canvasRect.top,
    screenX: event.clientX,
    screenY: event.clientY
  };

  emit('block-context-menu', blockId, position);
}

// Força re-render quando blocos ou conexões mudam
const renderKey = ref(0);

function forceUpdate() {
  nextTick(() => {
    renderKey.value++;
  });
}

watch(() => [props.blocks, props.connections, props.zoom, panOffset.value], forceUpdate, { deep: true });

// Handler para zoom com Ctrl + Wheel
function handleWheel(event: WheelEvent) {
  if (event.ctrlKey) {
    event.preventDefault();

    // Calcula o novo zoom (zoom está em porcentagem: 25-150)
    const delta = -event.deltaY * 0.1;
    const newZoom = Math.max(25, Math.min(150, props.zoom + delta));

    // Emite o evento para atualizar o zoom no componente pai
    emit('update:zoom', newZoom);
  }
}

onMounted(() => {
  forceUpdate();
  window.addEventListener('keydown', handleKeyDown);

  // Adiciona listener para zoom com Ctrl + Wheel
  const canvas = canvasRef.value;
  if (canvas) {
    canvas.addEventListener('wheel', handleWheel, { passive: false });
  }
});
</script>

<template>
  <div
    ref="canvasRef"
    class="canvas"
    :class="{ panning: isPanning }"
    @mousedown="handleCanvasMouseDown"
    @mousemove="handleCanvasMouseMove"
    @mouseup="handleCanvasMouseUp"
    @mouseleave="handleCanvasMouseUp"
    @contextmenu="handleCanvasContextMenu"
  >
    <!-- SVG para desenhar as conexões -->
    <svg
      ref="svgRef"
      class="connections-svg"
      :style="canvasStyle"
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 10 3, 0 6" fill="#64748b" />
        </marker>
        <marker
          id="arrowhead-temp"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 10 3, 0 6" fill="#10b981" />
        </marker>
      </defs>

      <!-- Conexões existentes -->
      <path
        v-for="conn in connections"
        :key="`${conn.id}-${renderKey}`"
        :d="getConnectionPathById(conn)"
        :stroke="selectedConnectionId === conn.id ? '#3b82f6' : '#64748b'"
        :stroke-width="selectedConnectionId === conn.id ? 3.5 : 2.5"
        fill="none"
        marker-end="url(#arrowhead)"
        class="connection-path"
        @click="handleConnectionClick(conn.id, $event)"
      />

      <!-- Conexão temporária durante o arraste -->
      <path
        v-if="tempConnectionPath"
        :d="tempConnectionPath"
        stroke="#10b981"
        stroke-width="2.5"
        stroke-dasharray="8 4"
        fill="none"
        marker-end="url(#arrowhead-temp)"
        class="connection-temp"
      />
    </svg>

    <!-- Container dos blocos -->
    <div class="blocks-container" :style="canvasStyle">
      <BlockNode
        v-for="block in blocks"
        :key="block.id"
        :block="block"
        :is-selected="block.id === selectedBlockId"
        :scale="zoom / 100"
        @select="handleBlockSelect(block.id)"
        @input-click="handleInputClick(block.id)"
        @drag-start="(e) => handleBlockDragStart(block.id, e)"
        @connect-start="(outputId) => handleConnectStart(block.id, outputId)"
        @delete="handleBlockDelete(block.id)"
        @context-menu="(e) => handleBlockContextMenu(block.id, e)"
      />
    </div>

    <!-- Dica quando está conectando -->
    <div v-if="connectingFrom" class="connection-hint">
      <strong>🔗 Conectando...</strong><br>
      Clique no handle vermelho (entrada) do bloco de destino
    </div>
  </div>
</template>

<style scoped>
.canvas {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background-color: #ffffff;
  cursor: default;
}

.canvas::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    linear-gradient(90deg, #f9fafb 1px, transparent 1px),
    linear-gradient(#f9fafb 1px, transparent 1px);
  background-size: 20px 20px;
  transform: translate(var(--pan-x, 0px), var(--pan-y, 0px)) scale(var(--zoom, 1));
  transform-origin: 0 0;
  pointer-events: none;
}

.canvas.panning {
  cursor: grabbing !important;
}

.connections-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
  z-index: 1;
}

.blocks-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 100;
}

.connection-path {
  transition: stroke 0.2s, stroke-width 0.2s;
  cursor: pointer;
  pointer-events: stroke;
  stroke-linecap: round;
}

.connection-path:hover {
  stroke: #3b82f6 !important;
  stroke-width: 3.5 !important;
}

.connection-temp {
  pointer-events: none;
  animation: dash 0.5s linear infinite;
}

@keyframes dash {
  to {
    stroke-dashoffset: -16;
  }
}

.connection-hint {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: #10b981;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
  z-index: 1000;
  text-align: center;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
  }
  50% {
    box-shadow: 0 4px 30px rgba(16, 185, 129, 0.6);
  }
}
</style>
