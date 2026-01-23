/**
 * FUNÇÕES PURAS DE CÁLCULO DE PATHS SVG
 * 
 * Este módulo contém funções puras para cálculo de geometria e paths SVG.
 * Não contém estado Vue, apenas transformações matemáticas.
 */

/**
 * Gera um path SVG estilo Landbot com curvas arredondadas de 90 graus
 * 
 * @param fromX - Coordenada X inicial
 * @param fromY - Coordenada Y inicial
 * @param toX - Coordenada X final
 * @param toY - Coordenada Y final
 * @returns String do path SVG
 */
export function getConnectionPath(fromX: number, fromY: number, toX: number, toY: number): string {
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
  const edgeY = goingDown ? Math.max(fromY, toY) + verticalGap : Math.min(fromY, toY) - verticalGap;

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

/**
 * Cria um path suave com cantos arredondados entre múltiplos pontos (waypoints)
 * 
 * @param points - Array de pontos {x, y} para conectar
 * @param shortenEnd - Distância para encurtar o último segmento (opcional)
 * @returns String do path SVG
 */
export function getSmoothPath(points: { x: number; y: number }[], shortenEnd: number = 0): string {
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

/**
 * Calcula a distância euclidiana entre dois pontos
 */
export function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Encurta um ponto no final de uma linha por uma distância especificada
 */
export function shortenPoint(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  distance: number
): { x: number; y: number } {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const totalDistance = Math.sqrt(dx * dx + dy * dy);

  if (totalDistance <= distance) {
    return { x: fromX, y: fromY };
  }

  return {
    x: toX - (dx / totalDistance) * distance,
    y: toY - (dy / totalDistance) * distance
  };
}
