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

const canvasStyle = computed(() => ({
  transform: `translate(${panOffset.value.x}px, ${panOffset.value.y}px) scale(${props.zoom / 100})`,
  transformOrigin: '0 0'
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

// Gera o path SVG para uma conexão
function getConnectionPath(fromX: number, fromY: number, toX: number, toY: number): string {
  const dy = toY - fromY;
  const controlOffset = Math.abs(dy) * 0.4 + 50;

  return `M ${fromX} ${fromY} C ${fromX} ${fromY + controlOffset}, ${toX} ${toY - controlOffset}, ${toX} ${toY}`;
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
  if (connectingFrom.value) {
    connectingFrom.value = null;
    tempConnectionPath.value = '';
    return;
  }

  if (event.button === 1 || (event.button === 0 && event.ctrlKey)) {
    event.preventDefault();
    isPanning.value = true;
    panStart.value = { x: event.clientX, y: event.clientY };
  } else if (event.target === canvasRef.value) {
    emit('update:selectedBlockId', null);
  }
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

// Força re-render quando blocos ou conexões mudam
const renderKey = ref(0);

function forceUpdate() {
  nextTick(() => {
    renderKey.value++;
  });
}

watch(() => [props.blocks, props.connections, props.zoom, panOffset.value], forceUpdate, { deep: true });

onMounted(() => {
  forceUpdate();
});
</script>

<template>
  <div
    ref="canvasRef"
    class="canvas"
    @mousedown="handleCanvasMouseDown"
    @mousemove="handleCanvasMouseMove"
    @mouseup="handleCanvasMouseUp"
    @mouseleave="handleCanvasMouseUp"
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
        stroke="#64748b"
        stroke-width="2.5"
        fill="none"
        marker-end="url(#arrowhead)"
        class="connection-path"
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
      />
    </div>

    <!-- Dica quando está conectando -->
    <div v-if="connectingFrom" class="connection-hint">
      <strong>🔗 Conectando...</strong><br>
      Clique no handle vermelho (entrada) do bloco de destino
    </div>

    <!-- Dica inicial -->
    <div v-if="blocks.length === 1" class="empty-hint">
      <div class="empty-icon">🚀</div>
      <h3>Comece Aqui!</h3>
      <p>Conecte novos blocos ao <strong>bloco inicial</strong> ou crie mais blocos usando "<strong>➕ Novo Bloco</strong>"</p>
    </div>
  </div>
</template>

<style scoped>
.canvas {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(90deg, #f9fafb 1px, transparent 1px),
    linear-gradient(#f9fafb 1px, transparent 1px);
  background-size: 20px 20px;
  background-position: 0 0;
  cursor: grab;
}

.canvas:active {
  cursor: grabbing;
}

.connections-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
  z-index: 100;
}

.blocks-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.connection-path {
  transition: stroke 0.2s;
  cursor: pointer;
  pointer-events: stroke;
}

.connection-path:hover {
  stroke: #3b82f6;
  stroke-width: 3.5;
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

.empty-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #9ca3af;
  user-select: none;
  pointer-events: none;
}

.empty-icon {
  font-size: 80px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-hint h3 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 700;
  color: #6b7280;
}

.empty-hint p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  max-width: 400px;
}
</style>
