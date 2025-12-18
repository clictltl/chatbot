<script setup lang="ts">
/**
 * EDITOR DE CHATBOT PEDAGÓGICO
 *
 * Este é o componente principal que gerencia todo o editor de chatbot.
 * Ele mantém o estado de:
 * - blocks: Array com todos os blocos do fluxo
 * - connections: Array com as conexões visuais entre blocos
 * - variables: Objeto com as variáveis disponíveis no chatbot
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { Block, BlockType } from './types/chatbot';
import { blocks, connections, variables, selectedBlockId, getProjectData, setProjectData } from './utils/projectData';
import Canvas from './components/Canvas.vue';
import PropertiesPanel from './components/PropertiesPanel.vue';
import VariablesPanel from './components/VariablesPanel.vue';
import PreviewPanel from './components/PreviewPanel.vue';
import AuthMenu from './components/AuthMenu.vue';
import FileMenu from './components/FileMenu.vue';

const zoom = ref(100);
const activeTab = ref<'properties' | 'variables' | 'preview'>('properties');
const showNewBlockMenu = ref(false);
const showContextMenu = ref(false);
const contextMenuPosition = ref<{ x: number; y: number; screenX: number; screenY: number } | null>(null);
const isPreviewFullscreen = ref(false);
const sidePanelWidth = ref(350);
const isResizing = ref(false);
const showBlockContextMenu = ref(false);
const blockContextMenuPosition = ref<{ x: number; y: number; screenX: number; screenY: number } | null>(null);
const contextMenuBlockId = ref<string | null>(null);
const hasCopiedBlock = ref(false);

// Retorna o bloco atualmente selecionado
const selectedBlock = computed(() => {
  if (!selectedBlockId.value) return null;
  return blocks.value.find(b => b.id === selectedBlockId.value) || null;
});

onMounted(() => {
  // Restaura o projeto salvo temporariamente (ex: após login com reload),
  // substituindo o estado inicial do editor se existir backup.
  const saved = sessionStorage.getItem('clic-chatbot:login-backup');
  if (saved) {
    try {
      setProjectData(JSON.parse(saved));
      sessionStorage.removeItem('clic-chatbot:login-backup');
    } catch (e) {
      console.error('Erro ao restaurar projeto após login', e);
    }
  }

  // Verifica se há bloco copiado no localStorage ao montar o componente
  hasCopiedBlock.value = !!localStorage.getItem('copiedBlock');

  // Adiciona listener para fechar menus ao clicar fora
  document.addEventListener('click', handleDocumentClick);
});

// Remove listener ao desmontar
onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
});

// Cria um novo bloco no canvas
function createBlock(type: BlockType) {
  const newBlock: Block = {
    id: `block_${Date.now()}`,
    type,
    position: contextMenuPosition.value
      ? { x: contextMenuPosition.value.x, y: contextMenuPosition.value.y }
      : { x: 100 + blocks.value.length * 50, y: 100 + blocks.value.length * 30 },
    content: getDefaultContent(type),
    choices: type === 'choiceQuestion' ? [] : undefined,
    conditions: type === 'condition' ? [] : undefined,
    nextBlockId: undefined
  };

  blocks.value.push(newBlock);
  selectedBlockId.value = newBlock.id;
  showNewBlockMenu.value = false;
  showContextMenu.value = false;
  contextMenuPosition.value = null;
}

// Handler de clique no documento para fechar menus
function handleDocumentClick(event: MouseEvent) {
  const target = event.target as HTMLElement;

  // Verifica se o clique foi fora do menu de novo bloco
  if (!target.closest('.new-block-wrapper')) {
    showNewBlockMenu.value = false;
  }
}

// Retorna o conteúdo padrão baseado no tipo do bloco
function getDefaultContent(type: BlockType): string {
  switch (type) {
    case 'message':
      return 'Olá! Bem-vindo ao chatbot.';
    case 'openQuestion':
      return 'Qual é o seu nome?';
    case 'choiceQuestion':
      return 'Escolha uma opção:';
    case 'condition':
      return 'Verificando condição...';
    case 'setVariable':
      return 'Definindo variável...';
    case 'math':
      return 'Operação matemática';
    case 'image':
      return 'Imagem';
    case 'end':
      return 'Obrigado por usar o chatbot!';
    default:
      return '';
  }
}

// Atualiza um bloco existente
function updateBlock(updatedBlock: Block) {
  const index = blocks.value.findIndex(b => b.id === updatedBlock.id);
  if (index !== -1) {
    blocks.value[index] = updatedBlock;
  }
}

// Adiciona uma nova variável ao chatbot
function addVariable(name: string, type: 'string' | 'number') {
  variables.value[name] = {
    name,
    type,
    value: type === 'number' ? 0 : ''
  };
}

// Remove uma variável do chatbot
function removeVariable(name: string) {
  delete variables.value[name];
}

// Exporta o fluxo como JSON para download
function exportJSON() {
  const data = getProjectData();

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'chatbot.json';
  a.click();
  URL.revokeObjectURL(url);
}

// Importa um JSON e carrega o projeto
function importJSON() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';

  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);

        setProjectData(data);

        alert('Projeto carregado com sucesso!');
      } catch (error) {
        alert('Erro ao carregar o arquivo JSON. Verifique se o formato está correto.');
        console.error('Erro ao importar JSON:', error);
      }
    };

    reader.readAsText(file);
  };

  input.click();
}

// Visualiza o JSON em uma nova janela
function viewJSON() {
  const data = {
    blocks: blocks.value,
    connections: connections.value,
    variables: variables.value
  };

  const json = JSON.stringify(data, null, 2);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(`
      <html>
        <head>
          <title>JSON do Chatbot</title>
          <style>
            body {
              font-family: monospace;
              padding: 20px;
              background: #1e1e1e;
              color: #d4d4d4;
            }
            pre {
              background: #2d2d2d;
              padding: 20px;
              border-radius: 8px;
              overflow: auto;
            }
          </style>
        </head>
        <body>
          <h2>JSON do Chatbot</h2>
          <pre>${json}</pre>
        </body>
      </html>
    `);
  }
}

// Alterna o modo tela cheia do preview
function togglePreviewFullscreen() {
  isPreviewFullscreen.value = !isPreviewFullscreen.value;
  if (isPreviewFullscreen.value) {
    activeTab.value = 'preview';
  }
}

// Abre o menu de contexto com botão direito
function handleCanvasContextMenu(position: { x: number; y: number; screenX: number; screenY: number }) {
  contextMenuPosition.value = position;
  showContextMenu.value = true;
}

// Fecha o menu de contexto
function closeContextMenu() {
  showContextMenu.value = false;
  contextMenuPosition.value = null;
  showBlockContextMenu.value = false;
  blockContextMenuPosition.value = null;
  contextMenuBlockId.value = null;
}

// Abre o menu de contexto do bloco
function handleBlockContextMenu(blockId: string, position: { x: number; y: number; screenX: number; screenY: number }) {
  showContextMenu.value = false;
  contextMenuBlockId.value = blockId;
  blockContextMenuPosition.value = position;
  showBlockContextMenu.value = true;
}

// Duplica um bloco
function duplicateBlock() {
  if (!contextMenuBlockId.value) return;

  const blockToDuplicate = blocks.value.find(b => b.id === contextMenuBlockId.value);
  if (!blockToDuplicate) return;

  const newBlock: Block = {
    ...JSON.parse(JSON.stringify(blockToDuplicate)),
    id: Date.now().toString(),
    position: {
      x: blockToDuplicate.position.x + 50,
      y: blockToDuplicate.position.y + 50
    }
  };

  blocks.value = [...blocks.value, newBlock];
  closeContextMenu();
}

// Copia um bloco (salva no localStorage)
function copyBlock() {
  if (!contextMenuBlockId.value) return;

  const blockToCopy = blocks.value.find(b => b.id === contextMenuBlockId.value);
  if (!blockToCopy) return;

  localStorage.setItem('copiedBlock', JSON.stringify(blockToCopy));
  hasCopiedBlock.value = true;
  closeContextMenu();
}

// Cola um bloco copiado
function pasteBlock() {
  const copiedBlockJson = localStorage.getItem('copiedBlock');
  if (!copiedBlockJson) return;

  const copiedBlock = JSON.parse(copiedBlockJson);
  const newBlock: Block = {
    ...copiedBlock,
    id: Date.now().toString(),
    position: contextMenuPosition.value
      ? { x: contextMenuPosition.value.x, y: contextMenuPosition.value.y }
      : { x: copiedBlock.position.x + 50, y: copiedBlock.position.y + 50 }
  };

  blocks.value = [...blocks.value, newBlock];
  closeContextMenu();
}

// Deleta um bloco do menu de contexto
function deleteBlockFromMenu() {
  if (!contextMenuBlockId.value) return;

  blocks.value = blocks.value.filter(b => b.id !== contextMenuBlockId.value);
  connections.value = connections.value.filter(
    c => c.fromBlockId !== contextMenuBlockId.value && c.toBlockId !== contextMenuBlockId.value
  );

  if (selectedBlockId.value === contextMenuBlockId.value) {
    selectedBlockId.value = null;
  }

  closeContextMenu();
}

// Inicia o redimensionamento do painel lateral
function startResize(event: MouseEvent) {
  isResizing.value = true;
  event.preventDefault();

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.value) return;
    const newWidth = window.innerWidth - e.clientX;
    sidePanelWidth.value = Math.max(300, Math.min(800, newWidth));
  };

  const handleMouseUp = () => {
    isResizing.value = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}
</script>

<template>
  <div class="app">
    <!-- Toolbar superior com controles principais -->
    <header class="toolbar">
      <div class="toolbar-left">
        <h1>📚 Editor de Chatbot Pedagógico</h1>
      </div>

      <div class="toolbar-center">
        <label>Zoom:</label>
        <input
          type="range"
          v-model.number="zoom"
          min="25"
          max="150"
          step="5"
        />
      </div>

      <div class="toolbar-right">
        <div class="new-block-wrapper" @click.stop>
          <button @click="showNewBlockMenu = !showNewBlockMenu" class="btn-primary">
            ➕ Novo Bloco
          </button>

          <!-- Menu dropdown para criar novos blocos -->
          <div v-if="showNewBlockMenu" class="block-menu" @click.stop>
            <button @click="createBlock('message')" class="block-menu-item">
              <span class="block-icon" style="background: #3b82f6;">💬</span>
              Mensagem
            </button>
            <button @click="createBlock('openQuestion')" class="block-menu-item">
              <span class="block-icon" style="background: #10b981;">❓</span>
              Pergunta Aberta
            </button>
            <button @click="createBlock('choiceQuestion')" class="block-menu-item">
              <span class="block-icon" style="background: #f59e0b;">📊</span>
              Múltipla Escolha
            </button>
            <button @click="createBlock('condition')" class="block-menu-item">
              <span class="block-icon" style="background: #8b5cf6;">⚙️</span>
              Condicional
            </button>
            <button @click="createBlock('setVariable')" class="block-menu-item">
              <span class="block-icon" style="background: #06b6d4;">📝</span>
              Definir Variável
            </button>
            <button @click="createBlock('math')" class="block-menu-item">
              <span class="block-icon" style="background: #f97316;">🔢</span>
              Operação Matemática
            </button>
            <button @click="createBlock('image')" class="block-menu-item">
              <span class="block-icon" style="background: #ec4899;">🖼️</span>
              Imagem
            </button>
            <button @click="createBlock('end')" class="block-menu-item">
              <span class="block-icon" style="background: #ef4444;">✅</span>
              Fim da Conversa
            </button>
          </div>
        </div>

        <button @click="importJSON" class="btn-secondary">📂 Importar</button>
        <button @click="viewJSON" class="btn-secondary">👁️ Ver JSON</button>
        <button @click="exportJSON" class="btn-secondary">💾 Exportar</button>

        <FileMenu />

        <AuthMenu />

      </div>
    </header>

    <!-- Área principal com canvas e painel lateral -->
    <div class="main-content">
      <!-- Canvas onde os blocos são desenhados e conectados -->
      <div class="canvas-area" v-show="!isPreviewFullscreen" @click="closeContextMenu">
        <Canvas
          :blocks="blocks"
          :connections="connections"
          :selected-block-id="selectedBlockId"
          :zoom="zoom"
          @update:selected-block-id="selectedBlockId = $event"
          @update:blocks="blocks = $event"
          @update:connections="connections = $event"
          @update:zoom="zoom = $event"
          @context-menu="handleCanvasContextMenu"
          @block-context-menu="handleBlockContextMenu"
        />

        <!-- Menu de contexto (botão direito) -->
        <div
          v-if="showContextMenu && contextMenuPosition"
          class="context-menu"
          :style="{
            left: contextMenuPosition.screenX + 'px',
            top: contextMenuPosition.screenY + 'px'
          }"
          @click.stop
        >
          <button @click="createBlock('message')" class="block-menu-item">
            <span class="block-icon" style="background: #3b82f6;">💬</span>
            Mensagem
          </button>
          <button @click="createBlock('openQuestion')" class="block-menu-item">
            <span class="block-icon" style="background: #10b981;">❓</span>
            Pergunta Aberta
          </button>
          <button @click="createBlock('choiceQuestion')" class="block-menu-item">
            <span class="block-icon" style="background: #f59e0b;">📊</span>
            Múltipla Escolha
          </button>
          <button @click="createBlock('condition')" class="block-menu-item">
            <span class="block-icon" style="background: #8b5cf6;">⚙️</span>
            Condicional
          </button>
          <button @click="createBlock('setVariable')" class="block-menu-item">
            <span class="block-icon" style="background: #06b6d4;">📝</span>
            Definir Variável
          </button>
          <button @click="createBlock('math')" class="block-menu-item">
            <span class="block-icon" style="background: #f97316;">🔢</span>
            Operação Matemática
          </button>
          <button @click="createBlock('image')" class="block-menu-item">
            <span class="block-icon" style="background: #ec4899;">🖼️</span>
            Imagem
          </button>
          <button @click="createBlock('end')" class="block-menu-item">
            <span class="block-icon" style="background: #ef4444;">✅</span>
            Fim da Conversa
          </button>
          <button v-if="hasCopiedBlock" @click="pasteBlock" class="block-menu-item paste-item">
            <span class="block-icon" style="background: #6366f1;">📋</span>
            Colar Bloco
          </button>
        </div>
      </div>

      <!-- Menu de contexto do bloco (botão direito no bloco) -->
      <div
        v-if="showBlockContextMenu && blockContextMenuPosition"
        class="context-menu block-context-menu"
        :style="{
          left: blockContextMenuPosition.screenX + 'px',
          top: blockContextMenuPosition.screenY + 'px'
        }"
        @click.stop
      >
        <button @click="duplicateBlock" class="context-menu-item">
          <span>⚡</span>
          Duplicar
        </button>
        <button @click="copyBlock" class="context-menu-item">
          <span>📋</span>
          Copiar
        </button>
        <button @click="deleteBlockFromMenu" class="context-menu-item delete">
          <span>🗑️</span>
          Deletar
        </button>
      </div>

      <!-- Painel lateral com propriedades, variáveis e preview -->
      <aside class="side-panel" :class="{ 'fullscreen': isPreviewFullscreen }" :style="{ width: isPreviewFullscreen ? '100%' : `${sidePanelWidth}px` }">
        <!-- Resize handle -->
        <div v-if="!isPreviewFullscreen" class="resize-handle" @mousedown="startResize"></div>

        <div class="tabs">
          <button
            :class="['tab', { active: activeTab === 'properties' }]"
            @click="activeTab = 'properties'"
          >
            🔧 Bloco
          </button>
          <button
            :class="['tab', { active: activeTab === 'variables' }]"
            @click="activeTab = 'variables'"
          >
            🔢 Variáveis
          </button>
          <button
            :class="['tab', { active: activeTab === 'preview' }]"
            @click="activeTab = 'preview'"
          >
            👁️ Preview
          </button>
        </div>

        <div class="tab-content">
          <PropertiesPanel
            v-show="activeTab === 'properties'"
            :block="selectedBlock"
            :variables="variables"
            @update:block="updateBlock"
          />

          <VariablesPanel
            v-show="activeTab === 'variables'"
            :variables="variables"
            @update:variables="variables = $event"
            @add-variable="addVariable"
            @remove-variable="removeVariable"
          />

          <PreviewPanel
            v-show="activeTab === 'preview'"
            :blocks="blocks"
            :variables="variables"
            @update:variables="variables = $event"
            @toggle-fullscreen="togglePreviewFullscreen"
          />
        </div>
      </aside>
    </div>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #f3f4f6;
}

.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Toolbar no topo */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  gap: 24px;
}

.toolbar-left h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.toolbar-center {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-center label {
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
}

.toolbar-center input[type="range"] {
  width: 120px;
}

.toolbar-center span {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  min-width: 45px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.new-block-wrapper {
  position: relative;
}

.btn-primary {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  padding: 8px 16px;
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

/* Menu de novos blocos */
.block-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 220px;
  padding: 8px;
}

.block-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  background: white;
  border: none;
  border-radius: 6px;
  text-align: left;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.block-menu-item:hover {
  background: #f3f4f6;
}

.block-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  font-size: 14px;
}

/* Menu de contexto do bloco */
.block-context-menu {
  min-width: 160px;
}

.context-menu-item {
  width: 100%;
  padding: 10px 16px;
  background: white;
  border: none;
  text-align: left;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 10px;
}

.context-menu-item:hover {
  background: #f3f4f6;
}

.context-menu-item.delete {
  color: #ef4444;
}

.context-menu-item.delete:hover {
  background: #fee2e2;
}

.context-menu-item span {
  font-size: 16px;
}

.paste-item {
  border-top: 1px solid #e5e7eb;
  margin-top: 4px;
  padding-top: 12px;
}

/* Layout principal */
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.canvas-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* Painel lateral */
.side-panel {
  min-width: 300px;
  max-width: 800px;
  background: white;
  border-left: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  position: relative;
  flex-shrink: 0;
}

.side-panel.fullscreen {
  width: 100%;
  border-left: none;
}

/* Handle de redimensionamento */
.resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  cursor: ew-resize;
  z-index: 1000;
  transition: background 0.2s;
}

.resize-handle:hover {
  background: #3b82f6;
}

.resize-handle:active {
  background: #2563eb;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
}

.tab {
  flex: 1;
  padding: 12px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.tab:hover {
  color: #374151;
  background: #f9fafb;
}

.tab.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

.tab-content {
  flex: 1;
  overflow: hidden;
}

/* Menu de contexto */
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 220px;
  padding: 8px;
}
</style>
