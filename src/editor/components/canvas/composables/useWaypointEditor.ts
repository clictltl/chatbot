/**
 * COMPOSABLE: EDITOR DE WAYPOINTS
 * 
 * Responsável por criar e editar waypoints em conexões.
 * Permite arrastar segmentos para criar novos waypoints e mover waypoints existentes.
 */

import { ref, type Ref } from 'vue';
import type { Connection } from '@/shared/types/chatbot';

export interface UseWaypointEditorOptions {
  canvasRef: Ref<HTMLDivElement | null>;
  panOffset: Ref<{ x: number; y: number }>;
  zoom: Ref<number>;
  connections: Ref<Connection[]>;
  onUpdateConnections: (connections: Connection[]) => void;
  onSelectConnection: (id: string) => void;
}

export function useWaypointEditor(options: UseWaypointEditorOptions) {
  const { canvasRef, panOffset, zoom, connections, onUpdateConnections, onSelectConnection } = options;

  // Estado do arraste
  const draggingWaypoint = ref<{ connectionId: string; waypointIndex: number } | null>(null);
  const draggingSegment = ref<{ connectionId: string; segmentIndex: number; startPos: { x: number; y: number } } | null>(null);

  /**
   * Converte coordenadas da tela para coordenadas do mundo
   */
  function screenToWorld(clientX: number, clientY: number): { x: number; y: number } {
    const canvasBounds = canvasRef.value?.getBoundingClientRect();
    if (!canvasBounds) return { x: 0, y: 0 };

    const zoomScale = zoom.value / 100;
    
    return {
      x: (clientX - canvasBounds.left - panOffset.value.x) / zoomScale,
      y: (clientY - canvasBounds.top - panOffset.value.y) / zoomScale
    };
  }

  /**
   * Inicia o arraste de um segmento para criar um waypoint
   */
  function startDragSegment(connectionId: string, segmentIndex: number, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    const startPos = screenToWorld(event.clientX, event.clientY);
    draggingSegment.value = { connectionId, segmentIndex, startPos };
    onSelectConnection(connectionId);
  }

  /**
   * Inicia o arraste de um waypoint existente
   */
  function startDragWaypoint(connectionId: string, waypointIndex: number, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    draggingWaypoint.value = { connectionId, waypointIndex };
  }

  /**
   * Atualiza a posição durante o arraste
   */
  function updateDrag(event: MouseEvent) {
    if (!draggingSegment.value && !draggingWaypoint.value) return;

    const currentPos = screenToWorld(event.clientX, event.clientY);

    if (draggingSegment.value) {
      // Criando um novo waypoint arrastando o segmento
      const { connectionId, segmentIndex } = draggingSegment.value;
      const connection = connections.value.find(c => c.id === connectionId);
      if (!connection) return;

      const updatedConnections = connections.value.map(c => {
        if (c.id !== connectionId) return c;

        const waypoints = c.waypoints ? [...c.waypoints] : [];
        waypoints.splice(segmentIndex, 0, currentPos);

        return { ...c, waypoints };
      });

      onUpdateConnections(updatedConnections);

      // Muda para modo de arraste de waypoint
      draggingWaypoint.value = { connectionId, waypointIndex: segmentIndex };
      draggingSegment.value = null;
    } else if (draggingWaypoint.value) {
      // Movendo um waypoint existente
      const { connectionId, waypointIndex } = draggingWaypoint.value;

      const updatedConnections = connections.value.map(c => {
        if (c.id !== connectionId) return c;

        const waypoints = c.waypoints ? [...c.waypoints] : [];
        waypoints[waypointIndex] = currentPos;

        return { ...c, waypoints };
      });

      onUpdateConnections(updatedConnections);
    }
  }

  /**
   * Finaliza o arraste
   */
  function endDrag() {
    draggingSegment.value = null;
    draggingWaypoint.value = null;
  }

  /**
   * Verifica se está arrastando algum elemento
   */
  function isDragging(): boolean {
    return draggingSegment.value !== null || draggingWaypoint.value !== null;
  }

  return {
    // Estado
    draggingWaypoint,
    draggingSegment,
    
    // Métodos
    startDragSegment,
    startDragWaypoint,
    updateDrag,
    endDrag,
    isDragging
  };
}
