/**
 * COMPOSABLE: INTERAÇÕES DO CANVAS
 * 
 * Coordena todas as interações de mouse e teclado no canvas.
 * Gerencia arraste de blocos, mouse tracking, e eventos de teclado.
 */

import { ref, type Ref } from 'vue';
import type { Block } from '@/shared/types/chatbot';

export interface UseCanvasInteractionsOptions {
  canvasRef: Ref<HTMLDivElement | null>;
  panOffset: Ref<{ x: number; y: number }>;
  zoom: Ref<number>;
  blocks: Ref<Block[]>;
  onUpdateBlocks: (blocks: Block[]) => void;
}

export function useCanvasInteractions(options: UseCanvasInteractionsOptions) {
  const { canvasRef, panOffset, zoom, blocks, onUpdateBlocks } = options;

  // Estado do mouse
  const mousePosition = ref({ x: 0, y: 0 });

  // Estado do arraste de blocos
  const draggedBlock = ref<string | null>(null);
  const dragStart = ref({ x: 0, y: 0, blockX: 0, blockY: 0 });

  /**
   * Converte coordenadas da tela para coordenadas do mundo
   */
  function screenToWorld(clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvasRef.value?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    const zoomScale = zoom.value / 100;
    
    return {
      x: (clientX - rect.left - panOffset.value.x) / zoomScale,
      y: (clientY - rect.top - panOffset.value.y) / zoomScale
    };
  }

  /**
   * Atualiza a posição do mouse em coordenadas do mundo
   */
  function updateMousePosition(event: MouseEvent) {
    mousePosition.value = screenToWorld(event.clientX, event.clientY);
  }

  /**
   * Inicia o arraste de um bloco
   */
  function startBlockDrag(blockId: string, event: MouseEvent) {
    draggedBlock.value = blockId;
    const block = blocks.value.find(b => b.id === blockId);
    if (block) {
      dragStart.value = {
        x: event.clientX,
        y: event.clientY,
        blockX: block.position.x,
        blockY: block.position.y
      };
    }
  }

  /**
   * Atualiza a posição do bloco durante o arraste
   */
  function updateBlockDrag(event: MouseEvent) {
    if (!draggedBlock.value) return;

    const zoomScale = zoom.value / 100;
    const dx = (event.clientX - dragStart.value.x) / zoomScale;
    const dy = (event.clientY - dragStart.value.y) / zoomScale;

    const updatedBlocks = blocks.value.map(b =>
      b.id === draggedBlock.value
        ? { ...b, position: { x: dragStart.value.blockX + dx, y: dragStart.value.blockY + dy } }
        : b
    );
    
    onUpdateBlocks(updatedBlocks);
  }

  /**
   * Finaliza o arraste de bloco
   */
  function endBlockDrag() {
    draggedBlock.value = null;
  }

  /**
   * Verifica se está arrastando um bloco
   */
  function isDraggingBlock(): boolean {
    return draggedBlock.value !== null;
  }

  return {
    // Estado
    mousePosition,
    draggedBlock,
    
    // Métodos
    updateMousePosition,
    startBlockDrag,
    updateBlockDrag,
    endBlockDrag,
    isDraggingBlock,
    screenToWorld
  };
}
