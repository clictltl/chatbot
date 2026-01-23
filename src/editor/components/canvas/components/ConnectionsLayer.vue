<script setup lang="ts">
/**
 * CAMADA DE CONEXÕES SVG
 * 
 * Renderiza todas as conexões, waypoints e conexão temporária
 */

import type { Connection } from '@/shared/types/chatbot';

defineProps<{
  connections: Connection[];
  selectedConnectionId: string | null;
  tempConnectionPath: string;
  renderKey: number;
  canvasStyle: Record<string, any>;
  getConnectionPathById: (conn: Connection) => string;
  getConnectionPoints: (conn: Connection) => { x: number; y: number }[];
}>();

const emit = defineEmits<{
  'connection-click': [connectionId: string, event: MouseEvent];
  'segment-mousedown': [connectionId: string, segmentIndex: number, event: MouseEvent];
  'waypoint-mousedown': [connectionId: string, waypointIndex: number, event: MouseEvent];
}>();

function handleConnectionClick(connectionId: string, event: MouseEvent) {
  event.stopPropagation();
  event.preventDefault();
  emit('connection-click', connectionId, event);
}

function handleSegmentMouseDown(connectionId: string, segmentIndex: number, event: MouseEvent) {
  emit('segment-mousedown', connectionId, segmentIndex, event);
}

function handleWaypointMouseDown(connectionId: string, waypointIndex: number, event: MouseEvent) {
  emit('waypoint-mousedown', connectionId, waypointIndex, event);
}
</script>

<template>
  <svg class="connections-svg" :style="canvasStyle">
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
        <polygon points="0 0, 10 3, 0 6" fill="#64748b" />
      </marker>
      <marker id="arrowhead-temp" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
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
</template>

<style scoped>
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

.connections-svg g {
  pointer-events: all;
}

.connection-hitbox {
  cursor: pointer;
  pointer-events: stroke;
  stroke-linecap: round;
  stroke-linejoin: round;
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
</style>
