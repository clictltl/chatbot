// src/editor/projectData.ts
import { ref } from 'vue';
import type { Block, Connection, Variable } from '../types/chatbot';

/**
 * Estado reativo do editor
 * Deve nascer SEMPRE válido
 */

// Bloco inicial padrão
const initialBlock: Block = {
  id: 'block_inicio',
  type: 'message',
  position: { x: 100, y: 100 },
  content: 'Olá! Bem-vindo ao chatbot.',
  nextBlockId: undefined
};

export const blocks = ref<Block[]>([initialBlock]);
export const connections = ref<Connection[]>([]);
export const variables = ref<Record<string, Variable>>({});
export const selectedBlockId = ref<string | null>(null);

/**
 * Estrutura serializável do projeto
 */
export interface ProjectData {
  blocks: Block[];
  connections: Connection[];
  variables: Record<string, Variable>;
}

/**
 * Exporta o estado atual do editor
 */
export function getProjectData(): ProjectData {
  return {
    blocks: blocks.value,
    connections: connections.value,
    variables: variables.value
  };
}

/**
 * Aplica um projeto ao editor
 * (login+reload, import JSON, banco de dados)
 */
export function setProjectData(data: ProjectData) {
  if (Array.isArray(data.blocks) && data.blocks.length > 0) {
    blocks.value = data.blocks;
  }

  if (Array.isArray(data.connections)) {
    connections.value = data.connections;
  }

  if (data.variables && typeof data.variables === 'object') {
    variables.value = data.variables;
  }

  selectedBlockId.value = null;
}
