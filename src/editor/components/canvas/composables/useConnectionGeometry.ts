/**
 * COMPOSABLE: GEOMETRIA DE CONEXÕES
 * 
 * Responsável por calcular posições de handles e paths de conexões.
 * Usa as funções puras de pathCalculations.ts e adiciona lógica de DOM.
 */

import { type Ref } from 'vue';
import type { Connection } from '@/shared/types/chatbot';
import { getConnectionPath, getSmoothPath } from '../utils/pathCalculations';

export interface UseConnectionGeometryOptions {
  canvasRef: Ref<HTMLDivElement | null>;
  panOffset: Ref<{ x: number; y: number }>;
  zoom: Ref<number>;
}

export function useConnectionGeometry(options: UseConnectionGeometryOptions) {
  const { canvasRef, panOffset, zoom } = options;

  /**
   * Obtém a posição de um handle no sistema de coordenadas do mundo (canvas)
   */
  function getHandlePosition(handleElement: HTMLElement): { x: number; y: number } {
    const canvasBounds = canvasRef.value?.getBoundingClientRect();
    const handleBounds = handleElement.getBoundingClientRect();

    if (!canvasBounds) return { x: 0, y: 0 };

    const zoomScale = zoom.value / 100;

    return {
      x: (handleBounds.left + handleBounds.width / 2 - canvasBounds.left - panOffset.value.x) / zoomScale,
      y: (handleBounds.top + handleBounds.height / 2 - canvasBounds.top - panOffset.value.y) / zoomScale
    };
  }

  /**
   * Calcula o path SVG de uma conexão baseado nos IDs dos handles
   */
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

  /**
   * Obtém os pontos de uma conexão (início, waypoints, fim)
   */
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

  return {
    getHandlePosition,
    getConnectionPathById,
    getConnectionPoints
  };
}
