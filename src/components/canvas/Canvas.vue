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

import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import type { Block, Connection } from '@/types/chatbot';
import BlockNode from './BlockNode.vue';

const props = defineProps<{
  blocks: Block[];
  connections: Connection[];
  selectedBlockId: string | null;
  zoom: number;
}>();

const emit = defineEmits<{
  'update:selectedBlockId': [id: string | null];
   'focus-block-editor': []; // ✅ NOVO EVENTO
  'update:blocks': [blocks: Block[]];
  'update:connections': [connections: Connection[]];
  'update:zoom': [zoom: number];
  'context-menu': [position: { x: number; y: number; screenX: number; screenY: number }];
  'block-context-menu': [blockId: string, position: { x: number; y: number; screenX: number; screenY: number }];
}>();

const canvasRef = ref<HTMLDivElement | null>(null);

// Estado do canvas
const panOffset = ref({ x: 0, y: 0 });
const isPanning = ref(false);
const panStart = ref({ x: 0, y: 0 });

const lastZoom = ref(props.zoom);

// Quando o zoom veio do Ctrl+Wheel, guardamos a âncora (mouse)
const wheelZoomAnchor = ref<{ x: number; y: number } | null>(null);

/**
 * Ajusta panOffset para que o ponto do "mundo" sob (anchorClientX/Y) fique fixo na tela,
 * mesmo mudando o zoom.
 */
function keepPointUnderAnchor(oldZoomPct: number, newZoomPct: number, anchorClientX: number, anchorClientY: number) {
  const rect = canvasRef.value?.getBoundingClientRect();
  if (!rect) return;

  const oldZoom = oldZoomPct / 100;
  const newZoom = newZoomPct / 100;

  // Posição da âncora em coordenadas do canvas (tela, relativa ao canvas)
  const ax = anchorClientX - rect.left;
  const ay = anchorClientY - rect.top;

  // Coordenadas do "mundo" (antes do zoom) que estavam sob a âncora
  const worldX = (ax - panOffset.value.x) / oldZoom;
  const worldY = (ay - panOffset.value.y) / oldZoom;

  // Atualiza panOffset para manter worldX/worldY sob a mesma âncora após o zoom
  panOffset.value = {
    x: ax - worldX * newZoom,
    y: ay - worldY * newZoom
  };
}

// Estado do arraste de blocos
const draggedBlock = ref<string | null>(null);
const dragStart = ref({ x: 0, y: 0, blockX: 0, blockY: 0 });

// Estado da criação de conexões
const connectingFrom = ref<{ blockId: string; outputId?: string; element: HTMLElement } | null>(null);
const mousePosition = ref({ x: 0, y: 0 });
const tempConnectionPath = ref<string>('');

// Estado da seleção de conexão
const selectedConnectionId = ref<string | null>(null);

// Estado do arraste de waypoints
const draggingWaypoint = ref<{ connectionId: string; waypointIndex: number } | null>(null);
const draggingSegment = ref<{ connectionId: string; segmentIndex: number; startPos: { x: number; y: number } } | null>(null);

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

  // Arrastar segmento/waypoint
  if (draggingSegment.value || draggingWaypoint.value) {
    handleSegmentDrag(event);
  }
}

// Mouse up no canvas
function handleCanvasMouseUp() {
  isPanning.value = false;
  draggedBlock.value = null;
  handleSegmentMouseUp();
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

    // ✅ avisa o componente pai para abrir a aba "Bloco" e focar no editor
    emit('focus-block-editor');
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

// Cria um path suave com cantos arredondados entre pontos
function getSmoothPath(points: { x: number; y: number }[], shortenEnd: number = 0): string {
  if (points.length < 2) return '';

  // Encurta o último ponto se necessário
  const workingPoints = [...points];
  if (shortenEnd > 0 && workingPoints.length >= 2) {
    const lastIdx = workingPoints.length - 1;
    const prevPoint = workingPoints[lastIdx - 1];
    const lastPoint = workingPoints[lastIdx];

    const dx = lastPoint.x - prevPoint.x;
    const dy = lastPoint.y - prevPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > shortenEnd) {
      workingPoints[lastIdx] = {
        x: lastPoint.x - (dx / distance) * shortenEnd,
        y: lastPoint.y - (dy / distance) * shortenEnd
      };
    }
  }

  if (workingPoints.length === 2) {
    return `M ${workingPoints[0].x} ${workingPoints[0].y} L ${workingPoints[1].x} ${workingPoints[1].y}`;
  }

  const radius = 20; // Raio das curvas
  let path = `M ${workingPoints[0].x} ${workingPoints[0].y}`;

  for (let i = 0; i < workingPoints.length - 1; i++) {
    const current = workingPoints[i];
    const next = workingPoints[i + 1];
    const isLast = i === workingPoints.length - 2;

    const dx = next.x - current.x;
    const dy = next.y - current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < radius * 2) {
      // Se a distância for muito curta, faz linha reta
      path += ` L ${next.x} ${next.y}`;
    } else if (isLast) {
      // Último segmento: arredonda apenas o início
      const startRadius = Math.min(radius, distance / 2);
      const ratio = startRadius / distance;
      const cornerX = current.x + dx * ratio;
      const cornerY = current.y + dy * ratio;

      path += ` L ${cornerX} ${cornerY}`;
      path += ` L ${next.x} ${next.y}`;
    } else {
      // Segmentos intermediários: arredonda o final
      const nextNext = workingPoints[i + 2];
      const endRadius = Math.min(radius, distance / 2);
      const ratio = 1 - endRadius / distance;
      const cornerX = current.x + dx * ratio;
      const cornerY = current.y + dy * ratio;

      path += ` L ${cornerX} ${cornerY}`;

      // Calcula o ponto de controle para a curva
      const nextDx = nextNext.x - next.x;
      const nextDy = nextNext.y - next.y;
      const nextDistance = Math.sqrt(nextDx * nextDx + nextDy * nextDy);
      const nextRatio = Math.min(radius, nextDistance / 2) / nextDistance;
      const nextCornerX = next.x + nextDx * nextRatio;
      const nextCornerY = next.y + nextDy * nextRatio;

      // Curva quadrática suave
      path += ` Q ${next.x} ${next.y}, ${nextCornerX} ${nextCornerY}`;
    }
  }

  return path;
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

  // Encurta o path para parar antes do handle de destino (deixa espaço para clicar)
  // Como as curvas sempre terminam horizontalmente (da esquerda para direita),
  // encurtamos apenas no eixo X
  const shortenDistance = 8; // pixels antes do handle
  const shortenedToPos = {
    x: toPos.x - shortenDistance,
    y: toPos.y
  };

  // Se tiver waypoints, cria um path suave que passa por eles
  if (conn.waypoints && conn.waypoints.length > 0) {
    const points = [fromPos, ...conn.waypoints, shortenedToPos];
    return getSmoothPath(points, 0); // Já encurtamos acima
  }

  return getConnectionPath(fromPos.x, fromPos.y, shortenedToPos.x, shortenedToPos.y);
}

// Obtém os pontos de uma conexão (início, waypoints, fim)
function getConnectionPoints(conn: Connection): { x: number; y: number }[] {
  const fromHandleId = conn.fromOutputId
    ? `${conn.fromBlockId}-output-${conn.fromOutputId}`
    : `${conn.fromBlockId}-output`;
  const toHandleId = `${conn.toBlockId}-input`;

  const fromHandle = document.querySelector(`[data-handle-id='${fromHandleId}']`) as HTMLElement;
  const toHandle = document.querySelector(`[data-handle-id='${toHandleId}']`) as HTMLElement;

  if (!fromHandle || !toHandle) return [];

  const fromPos = getHandlePosition(fromHandle);
  const toPos = getHandlePosition(toHandle);

  const points = [fromPos];
  if (conn.waypoints) {
    points.push(...conn.waypoints);
  }
  points.push(toPos);

  return points;
}

// Seleciona uma conexão
function handleConnectionClick(connectionId: string, event: MouseEvent) {
  event.stopPropagation();
  event.preventDefault();
  selectedConnectionId.value = connectionId;
  console.log('Connection clicked:', connectionId);
}

// Inicia o arraste de um segmento para criar/mover waypoint
function handleSegmentMouseDown(connectionId: string, segmentIndex: number, event: MouseEvent) {
  event.stopPropagation();
  event.preventDefault();

  const canvasBounds = canvasRef.value?.getBoundingClientRect();
  if (!canvasBounds) return;

  const zoom = props.zoom / 100;
  const startPos = {
    x: (event.clientX - canvasBounds.left - panOffset.value.x) / zoom,
    y: (event.clientY - canvasBounds.top - panOffset.value.y) / zoom
  };

  draggingSegment.value = { connectionId, segmentIndex, startPos };
  selectedConnectionId.value = connectionId;
}

// Inicia o arraste de um waypoint existente
function handleWaypointMouseDown(connectionId: string, waypointIndex: number, event: MouseEvent) {
  event.stopPropagation();
  event.preventDefault();
  draggingWaypoint.value = { connectionId, waypointIndex };
}

// Atualiza a posição durante o arraste
function handleSegmentDrag(event: MouseEvent) {
  if (!draggingSegment.value && !draggingWaypoint.value) return;

  const canvasBounds = canvasRef.value?.getBoundingClientRect();
  if (!canvasBounds) return;

  const zoom = props.zoom / 100;
  const currentPos = {
    x: (event.clientX - canvasBounds.left - panOffset.value.x) / zoom,
    y: (event.clientY - canvasBounds.top - panOffset.value.y) / zoom
  };

  if (draggingSegment.value) {
    // Criando um novo waypoint arrastando o segmento
    const { connectionId, segmentIndex } = draggingSegment.value;
    const connection = props.connections.find(c => c.id === connectionId);
    if (!connection) return;

    const updatedConnections = props.connections.map(c => {
      if (c.id !== connectionId) return c;

      const waypoints = c.waypoints ? [...c.waypoints] : [];
      waypoints.splice(segmentIndex, 0, currentPos);

      return { ...c, waypoints };
    });

    emit('update:connections', updatedConnections);

    // Muda para modo de arraste de waypoint
    draggingWaypoint.value = { connectionId, waypointIndex: segmentIndex };
    draggingSegment.value = null;
  } else if (draggingWaypoint.value) {
    // Movendo um waypoint existente
    const { connectionId, waypointIndex } = draggingWaypoint.value;

    const updatedConnections = props.connections.map(c => {
      if (c.id !== connectionId) return c;

      const waypoints = c.waypoints ? [...c.waypoints] : [];
      waypoints[waypointIndex] = currentPos;

      return { ...c, waypoints };
    });

    emit('update:connections', updatedConnections);
  }
}

// Finaliza o arraste
function handleSegmentMouseUp() {
  draggingSegment.value = null;
  draggingWaypoint.value = null;
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

watch(
  () => props.zoom,
  (newZoom, oldZoom) => {
    // Se o zoom foi acionado pelo Ctrl+Wheel: ancora no mouse
    if (wheelZoomAnchor.value) {
      keepPointUnderAnchor(oldZoom, newZoom, wheelZoomAnchor.value.x, wheelZoomAnchor.value.y);
      wheelZoomAnchor.value = null;
      lastZoom.value = newZoom;
      return;
    }

    // Caso contrário (slider/toolbar/etc): ancora no centro do canvas
    const rect = canvasRef.value?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    keepPointUnderAnchor(oldZoom, newZoom, centerX, centerY);
    lastZoom.value = newZoom;
  }
);

// Handler para zoom com Ctrl + Wheel
function handleWheel(event: WheelEvent) {
  // se você quiser manter o pan com shift e evitar conflito, pode deixar assim:
  if (isPanning.value) return;

  event.preventDefault();

  // deltaY > 0 geralmente = scroll pra baixo (zoom out)
  const delta = -event.deltaY * 0.1;

  const newZoom = Math.max(25, Math.min(150, props.zoom + delta));

  // ancora no mouse (mesmo comportamento que você queria)
  wheelZoomAnchor.value = { x: event.clientX, y: event.clientY };

  emit('update:zoom', newZoom);
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

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);

  const canvas = canvasRef.value;
  if (canvas) {
    canvas.removeEventListener('wheel', handleWheel as any);
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
      <g v-for="conn in connections" :key="`${conn.id}-${renderKey}`">
        <!-- Hitbox invisível para facilitar clique -->
        <path
          :d="getConnectionPathById(conn)"
          stroke="transparent"
          stroke-width="12"
          fill="none"
          class="connection-hitbox"
          @click="handleConnectionClick(conn.id, $event)"
        />

        <!-- Path visível -->
        <path
          :d="getConnectionPathById(conn)"
          :stroke="selectedConnectionId === conn.id ? '#3b82f6' : '#64748b'"
          :stroke-width="selectedConnectionId === conn.id ? 3.5 : 2.5"
          fill="none"
          marker-end="url(#arrowhead)"
          class="connection-path"
          @click="handleConnectionClick(conn.id, $event)"
        />

        <!-- Segmentos arrastáveis (apenas quando selecionado) -->
        <template v-if="selectedConnectionId === conn.id">
          <line
            v-for="(point, index) in getConnectionPoints(conn).slice(0, -1)"
            :key="`segment-${index}`"
            :x1="point.x"
            :y1="point.y"
            :x2="getConnectionPoints(conn)[index + 1].x"
            :y2="getConnectionPoints(conn)[index + 1].y"
            stroke="rgba(59, 130, 246, 0.2)"
            stroke-width="12"
            class="connection-segment"
            @mousedown="handleSegmentMouseDown(conn.id, index, $event)"
          />
        </template>

        <!-- Waypoints editáveis (apenas quando selecionado) -->
        <template v-if="selectedConnectionId === conn.id">
          <circle
            v-for="(waypoint, index) in conn.waypoints"
            :key="`waypoint-${index}`"
            :cx="waypoint.x"
            :cy="waypoint.y"
            r="8"
            fill="#3b82f6"
            stroke="#ffffff"
            stroke-width="2"
            class="connection-waypoint"
            @mousedown="handleWaypointMouseDown(conn.id, index, $event)"
            @click.stop
          />
        </template>
      </g>

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

    <!-- Dica quando uma conexão está selecionada -->
    <div v-if="selectedConnectionId" class="delete-hint">
      Pressione <kbd>Delete</kbd> ou <kbd>Backspace</kbd> para remover esta conexão
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
  overflow: visible;
  z-index: 150;
  pointer-events: none;
}

.blocks-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 100;
  pointer-events: none;
}

.blocks-container > * {
  pointer-events: auto;
}

.connection-hitbox {
  cursor: pointer;
  pointer-events: stroke;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.connections-svg g {
  pointer-events: all;
}

.connection-path {
  transition: stroke 0.2s, stroke-width 0.2s, filter 0.2s;
  cursor: pointer;
  pointer-events: none;
  stroke-linecap: round;
  filter: drop-shadow(0 0 0 transparent);
}

g:hover .connection-path {
  stroke: #3b82f6 !important;
  stroke-width: 4 !important;
  filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.5));
}

.connection-temp {
  pointer-events: none;
  animation: dash 0.5s linear infinite;
}

.connection-segment {
  cursor: grab;
  pointer-events: stroke;
}

.connection-segment:active {
  cursor: grabbing;
}

.connection-waypoint {
  cursor: move;
  pointer-events: all;
  transition: r 0.2s, fill 0.2s, stroke 0.2s;
}

.connection-waypoint:hover {
  r: 10;
  filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.5));
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

.delete-hint {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #ef4444;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
  z-index: 1000;
  text-align: center;
  animation: slideUp 0.3s ease-out;
}

.delete-hint kbd {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  font-weight: 600;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translate(-50%, 10px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}
</style>
