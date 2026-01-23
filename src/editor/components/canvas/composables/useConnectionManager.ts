/**
 * COMPOSABLE: GERENCIAMENTO DE CONEXÕES
 * 
 * Responsável por criar, deletar e selecionar conexões.
 * Gerencia também a conexão temporária durante o arraste.
 */

import { ref, type Ref } from 'vue';
import type { Block, Connection } from '@/shared/types/chatbot';
import { getConnectionPath } from '../utils/pathCalculations';

export interface UseConnectionManagerOptions {
  blocks: Ref<Block[]>;
  connections: Ref<Connection[]>;
  onUpdateBlocks: (blocks: Block[]) => void;
  onUpdateConnections: (connections: Connection[]) => void;
}

export function useConnectionManager(options: UseConnectionManagerOptions) {
  const { blocks, connections, onUpdateBlocks, onUpdateConnections } = options;

  // Estado da criação de conexões
  const connectingFrom = ref<{ blockId: string; outputId?: string; element: HTMLElement } | null>(null);
  const tempConnectionPath = ref<string>('');
  
  // Estado da seleção
  const selectedConnectionId = ref<string | null>(null);

  /**
   * Inicia a criação de uma conexão a partir de um handle de saída
   */
  function startConnection(blockId: string, outputId?: string) {
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
  }

  /**
   * Cancela a conexão em andamento
   */
  function cancelConnection() {
    connectingFrom.value = null;
    tempConnectionPath.value = '';
  }

  /**
   * Atualiza o path da conexão temporária
   */
  function updateTempConnection(mouseX: number, mouseY: number, getHandlePosition: (el: HTMLElement) => { x: number; y: number }) {
    if (!connectingFrom.value) {
      tempConnectionPath.value = '';
      return;
    }

    const fromPos = getHandlePosition(connectingFrom.value.element);
    const path = getConnectionPath(fromPos.x, fromPos.y, mouseX, mouseY);
    tempConnectionPath.value = path;
  }

  /**
   * Finaliza a conexão clicando no handle de entrada
   */
  function finishConnection(toBlockId: string) {
    if (!connectingFrom.value || connectingFrom.value.blockId === toBlockId) {
      cancelConnection();
      return;
    }

    createConnection(connectingFrom.value.blockId, connectingFrom.value.outputId, toBlockId);
    cancelConnection();
  }

  /**
   * Cria uma nova conexão entre dois blocos
   */
  function createConnection(fromBlockId: string, fromOutputId: string | undefined, toBlockId: string) {
    const fromBlock = blocks.value.find(b => b.id === fromBlockId);
    const toBlock = blocks.value.find(b => b.id === toBlockId);

    if (!fromBlock || !toBlock) return;

    // NÃO permitir saída do bloco 'end'
    if (fromBlock.type === 'end') {
      console.warn('Não é possível criar conexão a partir de um bloco de fim');
      return;
    }

    // NÃO permitir conexão duplicada idêntica
    const isDuplicate = connections.value.some(
      c => c.fromBlockId === fromBlockId && c.fromOutputId === fromOutputId && c.toBlockId === toBlockId
    );

    if (isDuplicate) {
      console.warn('Conexão duplicada - já existe');
      return;
    }

    // Atualiza o nextBlockId no bloco de origem
    const updatedBlocks = blocks.value.map(block => {
      if (block.id !== fromBlockId) return block;

      // Se tem outputId, atualiza a escolha ou condição específica
      if (fromOutputId && block.choices) {
        return {
          ...block,
          choices: block.choices.map(c => (c.id === fromOutputId ? { ...c, nextBlockId: toBlockId } : c))
        };
      }

      if (fromOutputId && block.conditions) {
        return {
          ...block,
          conditions: block.conditions.map(c => (c.id === fromOutputId ? { ...c, nextBlockId: toBlockId } : c))
        };
      }

      // Caso contrário, atualiza o nextBlockId principal
      return { ...block, nextBlockId: toBlockId };
    });

    onUpdateBlocks(updatedBlocks);

    // Adiciona a conexão visual
    const newConnection: Connection = {
      id: `conn_${Date.now()}`,
      fromBlockId,
      fromOutputId,
      toBlockId
    };

    // Remove APENAS conexão antiga com mesmo from/fromOutput (permite múltiplas entradas)
    const filteredConnections = connections.value.filter(
      c => !(c.fromBlockId === fromBlockId && c.fromOutputId === fromOutputId)
    );

    onUpdateConnections([...filteredConnections, newConnection]);
  }

  /**
   * Seleciona uma conexão
   */
  function selectConnection(connectionId: string) {
    selectedConnectionId.value = connectionId;
  }

  /**
   * Desseleciona a conexão atual
   */
  function deselectConnection() {
    selectedConnectionId.value = null;
  }

  /**
   * Deleta a conexão selecionada
   */
  function deleteSelectedConnection() {
    if (!selectedConnectionId.value) return;

    const connection = connections.value.find(c => c.id === selectedConnectionId.value);
    if (!connection) return;

    deleteConnection(connection.id);
  }

  /**
   * Deleta uma conexão específica por ID
   */
  function deleteConnection(connectionId: string) {
    const connection = connections.value.find(c => c.id === connectionId);
    if (!connection) return;

    // Remove a conexão da lista
    const updatedConnections = connections.value.filter(c => c.id !== connectionId);
    onUpdateConnections(updatedConnections);

    // Atualiza o nextBlockId no bloco de origem
    const updatedBlocks = blocks.value.map(block => {
      if (block.id !== connection.fromBlockId) return block;

      // Se tem outputId, remove o nextBlockId da escolha ou condição específica
      if (connection.fromOutputId && block.choices) {
        return {
          ...block,
          choices: block.choices.map(c => (c.id === connection.fromOutputId ? { ...c, nextBlockId: undefined } : c))
        };
      }

      if (connection.fromOutputId && block.conditions) {
        return {
          ...block,
          conditions: block.conditions.map(c => (c.id === connection.fromOutputId ? { ...c, nextBlockId: undefined } : c))
        };
      }

      // Caso contrário, remove o nextBlockId principal
      return { ...block, nextBlockId: undefined };
    });

    onUpdateBlocks(updatedBlocks);
    
    if (selectedConnectionId.value === connectionId) {
      selectedConnectionId.value = null;
    }
  }

  return {
    // Estado
    connectingFrom,
    tempConnectionPath,
    selectedConnectionId,
    
    // Métodos
    startConnection,
    cancelConnection,
    updateTempConnection,
    finishConnection,
    selectConnection,
    deselectConnection,
    deleteSelectedConnection,
    deleteConnection
  };
}
