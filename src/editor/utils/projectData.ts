import { ref, watch } from 'vue';
import type { Block, Connection, Variable } from '@/shared/types/chatbot';
import type { ProjectData, ProjectAsset } from '@/shared/types/project';

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
export const assets = ref<Record<string, ProjectAsset>>({});
export const selectedBlockId = ref<string | null>(null);

// --- CONTROLE DE MUDANÇAS ---
export const hasUnsavedChanges = ref(false);
const isLoadingData = ref(false); // Trava para evitar marcar 'dirty' ao carregar

/**
 * Exporta o estado atual do editor
 */
export function getProjectData(): ProjectData {
  return {
    blocks: blocks.value,
    connections: connections.value,
    variables: variables.value,
    assets: assets.value
  };
}

/**
 * Aplica um projeto ao editor
 * (login+reload, import JSON, banco de dados)
 */
export function setProjectData(data: ProjectData) {
  isLoadingData.value = true;

  if (Array.isArray(data.blocks) && data.blocks.length > 0) {
    blocks.value = data.blocks;
  }

  if (Array.isArray(data.connections)) {
    connections.value = data.connections;
  }

  if (data.variables && typeof data.variables === 'object') {
    variables.value = data.variables;
  }

  if (data.assets && typeof data.assets === 'object') {
    assets.value = data.assets;
  } else {
    assets.value = {};
  }

  selectedBlockId.value = null;

  // Define como salvo e libera o watcher após um breve delay (next tick)
  hasUnsavedChanges.value = false;
  setTimeout(() => {
    hasUnsavedChanges.value = false; // Garante limpeza final (double check)
    isLoadingData.value = false;
  }, 500);
}

/**
 * Reseta o editor para um estado inicial válido
 * (novo projeto, importação, reset explícito)
 */
export function resetProjectData() {
  isLoadingData.value = true;

  blocks.value = [
    {
      ...startBlock,
      position: { ...startBlock.position }
    },
    {
      ...firstMessageBlock,
      position: { ...firstMessageBlock.position }
    }
  ];

  connections.value = [
    {
      ...initialConnection,
      id: `conn_${Date.now()}`
    }
  ];

  variables.value = {};
  assets.value = {};
  selectedBlockId.value = null;

  hasUnsavedChanges.value = false;
   setTimeout(() => {
    hasUnsavedChanges.value = false;
    isLoadingData.value = false;
  }, 500);
}

/**
 * Marca o projeto como salvo e cria uma janela de proteção
 * para ignorar atualizações reativas tardias (ex: upload de assets).
 */
export function markAsSaved() {
  // 1. Bloqueia o watcher imediatamente
  isLoadingData.value = true;
  
  // 2. Marca como limpo
  hasUnsavedChanges.value = false;

  // 3. Mantém bloqueado por 500ms para garantir que
  // qualquer "eco" de reatividade seja ignorado
  setTimeout(() => {
    hasUnsavedChanges.value = false; // Garante limpeza final
    isLoadingData.value = false;     // Libera o watcher
  }, 500);
}

// --- WATCHER GLOBAL ---
// Monitora qualquer mudança profunda nos objetos principais
watch(
  [blocks, connections, variables, assets],
  () => {
    if (!isLoadingData.value) {
      hasUnsavedChanges.value = true;
    }
  },
  { deep: true }
);