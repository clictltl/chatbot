// src/editor/projectData.ts
import { ref } from 'vue';
import type { Block, Connection, Variable } from '../types/chatbot';

/**
 * Estado reativo do editor
 * Deve nascer SEMPRE válido
 */

// IDs fixos para o fluxo inicial
const START_ID = 'start';
const FIRST_MESSAGE_ID = 'block_message_1';

// Posições iniciais (lado a lado)
const START_POSITION = { x: 100, y: 120 };
const GAP_X = 320;
const GAP_Y = 60;

// Bloco START (inteiro verde, sem conteúdo)
const startBlock: Block = {
  id: START_ID,
  type: 'start',
  position: START_POSITION,
  content: '',  
  nextBlockId: FIRST_MESSAGE_ID
};

// Primeiro bloco de mensagem
const firstMessageBlock: Block = {
  id: FIRST_MESSAGE_ID,
  type: 'message',
  position: {
    x: START_POSITION.x + GAP_X,
    y: START_POSITION.y + GAP_Y
  },
  content: 'Olá! Bem-vindo ao chatbot.',
  nextBlockId: undefined
};

// Conexão visual entre start → mensagem
const initialConnection: Connection = {
  id: `conn_${Date.now()}`,
  fromBlockId: START_ID,
  fromOutputId: undefined, // saída principal do start
  toBlockId: FIRST_MESSAGE_ID,
};

// Estado reativo
export const blocks = ref<Block[]>([
  startBlock,
  firstMessageBlock
]);

export const connections = ref<Connection[]>([
  initialConnection
]);

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
