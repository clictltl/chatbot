<script setup lang="ts">
/**
 * CANVAS - Área de trabalho onde os blocos são desenhados e conectados
 *
 * Este componente foi refatorado e agora usa composables para organizar
 * as responsabilidades em módulos menores e reutilizáveis.
 */

import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick, toRef } from 'vue';
import type { Block, Connection, BlockType } from '@/shared/types/chatbot';
import BlockNode from './BlockNode.vue';
import CanvasToolbar from './components/CanvasToolbar.vue';
import ConnectionsLayer from './components/ConnectionsLayer.vue';
import { useCanvasTransform } from './composables/useCanvasTransform';
import { useConnectionGeometry } from './composables/useConnectionGeometry';
import { useConnectionManager } from './composables/useConnectionManager';
import { useWaypointEditor } from './composables/useWaypointEditor';
import { useCanvasInteractions } from './composables/useCanvasInteractions';

const props = defineProps<{
  blocks: Block[];
  connections: Connection[];
  selectedBlockId: string | null;
  zoom: number;
}>();

const emit = defineEmits<{
  'update:selectedBlockId': [id: string | null];
  'focus-block-editor': [];
  'update:blocks': [blocks: Block[]];
  'update:connections': [connections: Connection[]];
  'update:zoom': [zoom: number];
  'context-menu': [position: { x: number; y: number; screenX: number; screenY: number }];
  'block-context-menu': [blockId: string, position: { x: number; y: number; screenX: number; screenY: number }];
  'create-block': [payload: { type: BlockType; position?: { x: number; y: number } }];
}>();

// Refs
const canvasRef = ref<HTMLDivElement | null>(null);
const renderKey = ref(0);

// Callbacks para composables
const updateBlocks = (blocks: Block[]) => emit('update:blocks', blocks);
const updateConnections = (connections: Connection[]) => emit('update:connections', connections);

// Setup dos composables
const blocksRef = toRef(props, 'blocks');
const connectionsRef = toRef(props, 'connections');

const transform = useCanvasTransform({
  canvasRef,
  initialZoom: props.zoom
});

const geometry = useConnectionGeometry({
  canvasRef,
  panOffset: transform.panOffset,
  zoom: transform.zoom
});

const connectionMgr = useConnectionManager({
  blocks: blocksRef,
  connections: connectionsRef,
  onUpdateBlocks: updateBlocks,
  onUpdateConnections: updateConnections
});

const waypointEditor = useWaypointEditor({
  canvasRef,
  panOffset: transform.panOffset,
  zoom: transform.zoom,
  connections: connectionsRef,
  onUpdateConnections: updateConnections,
  onSelectConnection: connectionMgr.selectConnection
});

const interactions = useCanvasInteractions({
  canvasRef,
  panOffset: transform.panOffset,
  zoom: transform.zoom,
  blocks: blocksRef,
  onUpdateBlocks: updateBlocks
});

// Estilo do canvas com transformações
const canvasStyle = computed(() => ({
  transform: `translate(${transform.panOffset.value.x}px, ${transform.panOffset.value.y}px) scale(${transform.zoom.value / 100})`,
  transformOrigin: '0 0',
  '--pan-x': `${transform.panOffset.value.x}px`,
  '--pan-y': `${transform.panOffset.value.y}px`,
  '--zoom': `${transform.zoom.value / 100}`
}));

// Mouse down no canvas
function handleCanvasMouseDown(event: MouseEvent) {
  // Cancela conexão em andamento
  if (connectionMgr.connectingFrom.value) {
    connectionMgr.cancelConnection();
    return;
  }

  // Pan: botão do meio ou Espaço + botão esquerdo
  if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
    event.preventDefault();
    transform.startPan(event.clientX, event.clientY);
    return;
  }

  // Desseleciona ao clicar no canvas vazio
  if (event.target === canvasRef.value) {
    emit('update:selectedBlockId', null);
    connectionMgr.deselectConnection();
  }
}

// Mouse move no canvas
function handleCanvasMouseMove(event: MouseEvent) {
  interactions.updateMousePosition(event);

  // Atualiza conexão temporária
  if (connectionMgr.connectingFrom.value) {
    connectionMgr.updateTempConnection(
      interactions.mousePosition.value.x,
      interactions.mousePosition.value.y,
      geometry.getHandlePosition
    );
  }

  // Pan do canvas
  if (transform.isPanning.value) {
    transform.updatePan(event.clientX, event.clientY);
  }

  // Arrastar bloco
  if (interactions.isDraggingBlock()) {
    interactions.updateBlockDrag(event);
  }

  // Arrastar waypoint/segmento
  if (waypointEditor.isDragging()) {
    waypointEditor.updateDrag(event);
  }
}

// Mouse up no canvas
function handleCanvasMouseUp() {
  transform.endPan();
  interactions.endBlockDrag();
  waypointEditor.endDrag();
}

// Context menu no canvas
function handleCanvasContextMenu(event: MouseEvent) {
  event.preventDefault();

  const rect = canvasRef.value?.getBoundingClientRect();
  if (!rect) return;

  const zoom = transform.zoom.value / 100;
  const position = {
    x: (event.clientX - rect.left - transform.panOffset.value.x) / zoom,
    y: (event.clientY - rect.top - transform.panOffset.value.y) / zoom,
    screenX: event.clientX,
    screenY: event.clientY
  };

  emit('context-menu', position);
}

// Handlers de blocos
function handleBlockDragStart(blockId: string, event: MouseEvent) {
  interactions.startBlockDrag(blockId, event);
}

function handleBlockSelect(blockId: string) {
  if (!connectionMgr.connectingFrom.value) {
    emit('update:selectedBlockId', blockId);
    emit('focus-block-editor');
  }
}

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

// Handlers de conexões
function handleConnectStart(blockId: string, outputId?: string) {
  connectionMgr.startConnection(blockId, outputId);
}

function handleInputClick(blockId: string) {
  connectionMgr.finishConnection(blockId);
}

function handleConnectionClick(connectionId: string) {
  connectionMgr.selectConnection(connectionId);
}

// Handlers de waypoints
function handleSegmentMouseDown(connectionId: string, segmentIndex: number, event: MouseEvent) {
  waypointEditor.startDragSegment(connectionId, segmentIndex, event);
}

function handleWaypointMouseDown(connectionId: string, waypointIndex: number, event: MouseEvent) {
  waypointEditor.startDragWaypoint(connectionId, waypointIndex, event);
}

// Toolbar handlers
function handleCreateBlock(type: BlockType) {
  const pos = transform.getCanvasCenterWorldPosition();
  emit('create-block', { type, position: pos });
}

function handleZoomIn() {
  transform.zoomIn();
  emit('update:zoom', transform.zoom.value);
}

function handleZoomOut() {
  transform.zoomOut();
  emit('update:zoom', transform.zoom.value);
}

// Keyboard handler
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (connectionMgr.selectedConnectionId.value) {
      event.preventDefault();
      connectionMgr.deleteSelectedConnection();
    }
  }
}

// Força re-render quando blocos ou conexões mudam
function forceUpdate() {
  nextTick(() => {
    renderKey.value++;
  });
}

// Watch para mudanças que requerem re-render
watch(() => [props.blocks, props.connections, transform.zoom.value, transform.panOffset.value], forceUpdate, { deep: true });

// Watch para sincronizar zoom externo
watch(() => props.zoom, (newZoom) => {
  if (newZoom !== transform.zoom.value) {
    transform.setZoom(newZoom);
  }
});

// Lifecycle
onMounted(() => {
  forceUpdate();
  window.addEventListener('keydown', handleKeyDown);

  const canvas = canvasRef.value;
  if (canvas) {
    canvas.addEventListener('wheel', transform.handleWheel, { passive: false });
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);

  const canvas = canvasRef.value;
  if (canvas) {
    canvas.removeEventListener('wheel', transform.handleWheel as any);
  }
});
</script>

<template>
  <div
    ref="canvasRef"
    class="canvas"
    :class="{ panning: transform.isPanning.value }"
    @mousedown="handleCanvasMouseDown"
    @mousemove="handleCanvasMouseMove"
    @mouseup="handleCanvasMouseUp"
    @mouseleave="handleCanvasMouseUp"
    @contextmenu="handleCanvasContextMenu"
  >
    <!-- Toolbar com menu e controles de zoom -->
    <CanvasToolbar
      @create-block="handleCreateBlock"
      @zoom-in="handleZoomIn"
      @zoom-out="handleZoomOut"
    />

    <!-- Camada de conexões SVG -->
    <ConnectionsLayer
      :connections="connections"
      :selectedConnectionId="connectionMgr.selectedConnectionId.value"
      :tempConnectionPath="connectionMgr.tempConnectionPath.value"
      :renderKey="renderKey"
      :canvasStyle="canvasStyle"
      :getConnectionPathById="geometry.getConnectionPathById"
      :getConnectionPoints="geometry.getConnectionPoints"
      @connection-click="handleConnectionClick"
      @segment-mousedown="handleSegmentMouseDown"
      @waypoint-mousedown="handleWaypointMouseDown"
    />

    <!-- Container dos blocos -->
    <div class="blocks-container" :style="canvasStyle">
      <BlockNode
        v-for="block in blocks"
        :key="block.id"
        :block="block"
        :is-selected="block.id === selectedBlockId"
        :scale="transform.zoom.value / 100"
        @select="handleBlockSelect(block.id)"
        @input-click="handleInputClick(block.id)"
        @drag-start="(e) => handleBlockDragStart(block.id, e)"
        @connect-start="(outputId) => handleConnectStart(block.id, outputId)"
        @delete="handleBlockDelete(block.id)"
        @context-menu="(e) => handleBlockContextMenu(block.id, e)"
      />
    </div>

    <!-- Dica quando está conectando -->
    <div v-if="connectionMgr.connectingFrom.value" class="connection-hint">
      <strong>🔗 Conectando...</strong><br />
      Clique no handle vermelho (entrada) do bloco de destino
    </div>

    <!-- Dica quando uma conexão está selecionada -->
    <div v-if="connectionMgr.selectedConnectionId.value" class="delete-hint">
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
