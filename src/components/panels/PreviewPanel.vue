<script setup lang="ts">
/**
 * PAINEL DE PREVIEW DO CHATBOT
 *
 * Este componente simula a execução do chatbot, permitindo testar o fluxo
 * antes de publicá-lo. Ele percorre os blocos seguindo as conexões e
 * gerencia o estado da conversa.
 *
 * Funcionalidades:
 * - Exibe mensagens do bot e do usuário em bolhas estilizadas
 * - Processa perguntas abertas e múltipla escolha
 * - Avalia condições lógicas
 * - Interpola variáveis no texto (ex: {{nome}})
 * - Trata erros de fluxo (blocos não encontrados)
 */

import { ref, nextTick } from 'vue';
import type { Block, Variable, ChatMessage } from '@/types/chatbot';
import { interpolateText, evaluateCondition } from '@/utils/interpolation';

const props = defineProps<{
  blocks: Block[];
  variables: Record<string, Variable>;
}>();

const emit = defineEmits<{
  'toggle-fullscreen': [];
  'update:variables': [variables: Record<string, Variable>];
}>();

const isFullscreen = ref(false);

// Estado da conversa
const messages = ref<ChatMessage[]>([]);
const currentBlockId = ref<string | null>(null);
const userInput = ref('');
const isWaitingForInput = ref(false);
const currentChoices = ref<{ id: string; label: string; nextBlockId?: string }[]>([]);
const sessionVariables = ref<Record<string, Variable>>({});
const chatEndRef = ref<HTMLDivElement | null>(null);
const isRunning = ref(false);

// ✅ Token da sessão: serve para "cancelar" timeouts antigos quando parar/reiniciar
const runId = ref(0);

// ✅ Para o chat e volta pra tela inicial limpa
function stopChat() {
  // invalida callbacks pendentes
  runId.value++;

  isWaitingForInput.value = false;
  currentChoices.value = [];
  currentBlockId.value = null;

  messages.value = [];
  userInput.value = '';

  isRunning.value = false;
}

// Inicia uma nova sessão do chatbot
function startChat() {
  messages.value = [];
  currentBlockId.value = null;
  userInput.value = '';
  isWaitingForInput.value = false;
  currentChoices.value = [];
  isRunning.value = true;

  // ✅ nova sessão
  runId.value++;

  // Copia as variáveis para a sessão atual
  sessionVariables.value = {};
  Object.keys(props.variables).forEach(key => {
    sessionVariables.value[key] = { ...props.variables[key] };
  });

  // Sincroniza valores com as variáveis globais
  syncVariablesToParent();

  // Busca o primeiro bloco para iniciar o fluxo
  if (props.blocks.length > 0) {
    // Tenta encontrar o primeiro bloco do tipo 'message' ou usa o primeiro disponível
    const startBlock = props.blocks.find(b => b.type === 'message') || props.blocks[0];
    currentBlockId.value = startBlock.id;
    processBlock(startBlock);
  } else {
    addErrorMessage('Nenhum bloco encontrado. Crie blocos no canvas para começar.');
  }
}

// Processa um bloco baseado no seu tipo
function processBlock(block: Block) {
  if (!block) {
    addErrorMessage('(Erro de fluxo: bloco não encontrado)');
    endChat();
    return;
  }

  // ✅ Captura o id da sessão atual para proteger timeouts
  const myRun = runId.value;

  switch (block.type) {
    case 'message':
      // Exibe uma mensagem e continua para o próximo bloco
      addBotMessage(block.content);
      setTimeout(() => {
        if (!isRunning.value || runId.value !== myRun) return;

        if (block.nextBlockId) {
          const nextBlock = props.blocks.find(b => b.id === block.nextBlockId);
          if (nextBlock) {
            currentBlockId.value = block.nextBlockId;
            processBlock(nextBlock);
          } else {
            console.error(`Bloco de destino não encontrado: ${block.nextBlockId}`);
            addErrorMessage('(Erro de fluxo: bloco de destino não encontrado)');
            endChat();
          }
        } else {
          endChat();
        }
      }, 500);
      break;

    case 'openQuestion':
      // Aguarda uma resposta de texto do usuário
      addBotMessage(block.content);
      isWaitingForInput.value = true;
      currentChoices.value = [];
      break;

    case 'choiceQuestion':
      // Exibe botões de múltipla escolha
      addBotMessage(block.content);
      if (block.choices && block.choices.length > 0) {
        currentChoices.value = block.choices;
        isWaitingForInput.value = false;
      } else {
        addErrorMessage('(Erro: pergunta sem opções de escolha)');
        endChat();
      }
      break;

    case 'condition': {
      // Avalia condições e segue para o bloco correspondente
      let nextBlockId: string | undefined;

      if (block.conditions) {
        for (const condition of block.conditions) {
          if (
            evaluateCondition(
              condition.variableName,
              condition.operator,
              condition.value,
              sessionVariables.value
            )
          ) {
            nextBlockId = condition.nextBlockId;
            break;
          }
        }
      }

      if (nextBlockId) {
        const nextBlock = props.blocks.find(b => b.id === nextBlockId);
        if (nextBlock) {
          currentBlockId.value = nextBlockId;
          processBlock(nextBlock);
        } else {
          console.error(`Bloco de destino não encontrado: ${nextBlockId}`);
          addErrorMessage('(Erro de fluxo: bloco de destino não encontrado)');
          endChat();
        }
      } else {
        console.warn('Nenhuma condição foi satisfeita no bloco condicional');
        addErrorMessage('(Nenhuma condição satisfeita)');
        endChat();
      }
      break;
    }

    case 'setVariable':
      // Define o valor de uma variável e continua para o próximo bloco
      if (block.variableName && sessionVariables.value[block.variableName]) {
        const interpolatedValue = interpolateText(block.variableValue || '', sessionVariables.value);
        sessionVariables.value[block.variableName].value = interpolatedValue;
        syncVariablesToParent();
      }

      setTimeout(() => {
        if (!isRunning.value || runId.value !== myRun) return;

        if (block.nextBlockId) {
          const nextBlock = props.blocks.find(b => b.id === block.nextBlockId);
          if (nextBlock) {
            currentBlockId.value = block.nextBlockId;
            processBlock(nextBlock);
          } else {
            console.error(`Bloco de destino não encontrado: ${block.nextBlockId}`);
            addErrorMessage('(Erro de fluxo: bloco de destino não encontrado)');
            endChat();
          }
        } else {
          endChat();
        }
      }, 300);
      break;

    case 'math':
      // Realiza operação matemática com variável
      if (block.variableName && sessionVariables.value[block.variableName]) {
        const variable = sessionVariables.value[block.variableName];
        const currentValue = Number(variable.value) || 0;

        const interpolatedValue = interpolateText(block.mathValue || '0', sessionVariables.value);
        const operandValue = Number(interpolatedValue) || 0;

        let result = currentValue;
        switch (block.mathOperation) {
          case '+':
            result = currentValue + operandValue;
            break;
          case '-':
            result = currentValue - operandValue;
            break;
          case '*':
            result = currentValue * operandValue;
            break;
          case '/':
            result = operandValue !== 0 ? currentValue / operandValue : currentValue;
            break;
        }

        sessionVariables.value[block.variableName].value = result;
        syncVariablesToParent();
      }

      setTimeout(() => {
        if (!isRunning.value || runId.value !== myRun) return;

        if (block.nextBlockId) {
          const nextBlock = props.blocks.find(b => b.id === block.nextBlockId);
          if (nextBlock) {
            currentBlockId.value = block.nextBlockId;
            processBlock(nextBlock);
          } else {
            console.error(`Bloco de destino não encontrado: ${block.nextBlockId}`);
            addErrorMessage('(Erro de fluxo: bloco de destino não encontrado)');
            endChat();
          }
        } else {
          endChat();
        }
      }, 300);
      break;

    case 'image': {
      // Exibe uma imagem e continua para o próximo bloco
      const imageUrl = block.imageData || block.imageUrl;
      if (imageUrl) {
        addImageMessage(imageUrl);
      } else {
        addErrorMessage('(Erro: imagem não definida)');
      }

      setTimeout(() => {
        if (!isRunning.value || runId.value !== myRun) return;

        if (block.nextBlockId) {
          const nextBlock = props.blocks.find(b => b.id === block.nextBlockId);
          if (nextBlock) {
            currentBlockId.value = block.nextBlockId;
            processBlock(nextBlock);
          } else {
            console.error(`Bloco de destino não encontrado: ${block.nextBlockId}`);
            addErrorMessage('(Erro de fluxo: bloco de destino não encontrado)');
            endChat();
          }
        } else {
          endChat();
        }
      }, 500);
      break;
    }

    case 'end':
      if (block.content) {
        addBotMessage(block.content);
      }
      endChat();
      break;
  }
}

// Adiciona uma mensagem do bot ao chat
function addBotMessage(content: string) {
  const interpolated = interpolateText(content, sessionVariables.value);
  messages.value.push({
    id: `msg_${Date.now()}`,
    type: 'bot',
    content: interpolated
  });
  scrollToBottom();
}

// Adiciona uma mensagem do usuário ao chat
function addUserMessage(content: string) {
  messages.value.push({
    id: `msg_${Date.now()}`,
    type: 'user',
    content
  });
  scrollToBottom();
}

// Adiciona uma mensagem de erro ao chat
function addErrorMessage(content: string) {
  messages.value.push({
    id: `msg_${Date.now()}`,
    type: 'bot',
    content: `⚠️ ${content}`
  });
  scrollToBottom();
}

// Adiciona uma imagem ao chat
function addImageMessage(imageUrl: string) {
  messages.value.push({
    id: `msg_${Date.now()}`,
    type: 'image',
    content: imageUrl
  });
  scrollToBottom();
}

// Processa o envio de uma resposta de texto livre
function handleSendMessage() {
  if (!userInput.value.trim() || !isWaitingForInput.value) return;

  const input = userInput.value.trim();
  addUserMessage(input);

  // Salva a resposta na variável correspondente
  const currentBlock = props.blocks.find(b => b.id === currentBlockId.value);
  if (currentBlock && currentBlock.type === 'openQuestion' && currentBlock.variableName) {
    const variable = sessionVariables.value[currentBlock.variableName];
    if (variable) {
      if (variable.type === 'number') {
        sessionVariables.value[currentBlock.variableName] = {
          ...variable,
          value: Number(input) || 0
        };
      } else {
        sessionVariables.value[currentBlock.variableName] = {
          ...variable,
          value: input
        };
      }
      syncVariablesToParent();
    }
  }

  userInput.value = '';
  isWaitingForInput.value = false;

  // Segue para o próximo bloco
  if (currentBlock && currentBlock.nextBlockId) {
    const nextBlock = props.blocks.find(b => b.id === currentBlock.nextBlockId);
    if (nextBlock) {
      currentBlockId.value = currentBlock.nextBlockId;

      const myRun = runId.value;
      setTimeout(() => {
        if (!isRunning.value || runId.value !== myRun) return;
        processBlock(nextBlock);
      }, 300);
    } else {
      console.error(`Bloco de destino não encontrado: ${currentBlock.nextBlockId}`);
      addErrorMessage('(Erro de fluxo: bloco de destino não encontrado)');
      endChat();
    }
  } else {
    endChat();
  }
}

// Processa a escolha de uma opção de múltipla escolha
function handleChoiceClick(choice: { id: string; label: string; nextBlockId?: string }) {
  addUserMessage(choice.label);
  currentChoices.value = [];

  if (choice.nextBlockId) {
    const nextBlock = props.blocks.find(b => b.id === choice.nextBlockId);
    if (nextBlock) {
      currentBlockId.value = choice.nextBlockId;

      const myRun = runId.value;
      setTimeout(() => {
        if (!isRunning.value || runId.value !== myRun) return;
        processBlock(nextBlock);
      }, 300);
    } else {
      console.error(`Bloco de destino não encontrado: ${choice.nextBlockId}`);
      addErrorMessage('(Erro de fluxo: bloco de destino não encontrado)');
      endChat();
    }
  } else {
    console.warn('Escolha sem bloco de destino');
    addErrorMessage('(Erro: escolha sem destino definido)');
    endChat();
  }
}

// Finaliza a conversa
function endChat() {
  isWaitingForInput.value = false;
  currentChoices.value = [];
  isRunning.value = false;
}

// Rola o chat para o final automaticamente
function scrollToBottom() {
  nextTick(() => {
    if (chatEndRef.value) {
      chatEndRef.value.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

// Alterna o modo tela cheia
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
  emit('toggle-fullscreen');
}

// Sincroniza as variáveis da sessão com as variáveis globais (atualiza a aba Variáveis)
function syncVariablesToParent() {
  const updated = { ...props.variables };
  Object.keys(sessionVariables.value).forEach(key => {
    if (updated[key]) {
      updated[key] = { ...sessionVariables.value[key] };
    }
  });
  emit('update:variables', updated);
}
</script>

<template>
  <div class="preview-panel">
    <!-- ✅ NOVA BARRA (mantendo tudo igual) -->
    <div class="preview-toolbar">
      <button class="btn-toolbar btn-run" @click="startChat">
        ▶️ {{ isRunning ? 'Reiniciar' : 'Iniciar' }}
      </button>

      <button
        class="btn-toolbar btn-stop"
        @click="stopChat"
        :disabled="!isRunning && messages.length === 0"
      >
        ■ Parar
      </button>
    </div>

    <!-- Botão de expandir/recolher (mantido) -->
    <button
      @click="toggleFullscreen"
      class="btn-fullscreen"
      :title="isFullscreen ? 'Sair da tela cheia' : 'Expandir tela cheia'"
    >
      <span v-if="isFullscreen">✕</span>
      <span v-else>⛶</span>
    </button>

    <!-- Tela inicial antes de começar o teste -->
    <div v-if="!isRunning && messages.length === 0" class="start-screen">
      <div class="start-icon">💬</div>
      <h3>Teste seu Chatbot</h3>
      <p>Clique em "Iniciar" para conversar com seu chatbot e testar o fluxo criado.</p>
      <button @click="startChat" class="btn-start">▶️ Iniciar Teste</button>
    </div>

    <!-- Área do chat -->
    <div v-else class="chat-container">
      <div class="messages">
        <!-- Mensagens do bot e do usuário -->
        <div
          v-for="message in messages"
          :key="message.id"
          :class="['message', message.type === 'image' ? 'message-bot' : (message.type === 'bot' ? 'message-bot' : 'message-user')]"
        >
          <div v-if="message.type === 'image'" class="message-image">
            <img
              :src="message.content"
              alt="Imagem do chatbot"
              @error="(e) => { (e.target as HTMLImageElement).style.display = 'none'; }"
              @load="(e) => { (e.target as HTMLImageElement).style.display = 'block'; }"
            />
          </div>
          <div v-else class="message-bubble">
            {{ message.content }}
          </div>
        </div>

        <!-- Botões de múltipla escolha -->
        <div v-if="currentChoices.length > 0" class="choices-container">
          <button
            v-for="choice in currentChoices"
            :key="choice.id"
            @click="handleChoiceClick(choice)"
            class="choice-button"
          >
            {{ choice.label }}
          </button>
        </div>

        <!-- Elemento para scroll automático -->
        <div ref="chatEndRef" />
      </div>

      <!-- Campo de entrada para perguntas abertas -->
      <div v-if="isWaitingForInput" class="input-area">
        <input
          v-model="userInput"
          type="text"
          placeholder="Digite sua resposta..."
          @keyup.enter="handleSendMessage"
          autofocus
        />
        <button @click="handleSendMessage" class="btn-send">📤 Enviar</button>
      </div>

      <!-- Botão para reiniciar o chat -->
      <div v-if="!isWaitingForInput && currentChoices.length === 0 && !isRunning" class="restart-area">
        <button @click="startChat" class="btn-restart">🔄 Recomeçar</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f9fafb;
  position: relative;
}

/* ✅ Barra nova com botões */
.preview-toolbar {
  position: sticky;
  top: 0;
  z-index: 200;

  display: flex;
  gap: 10px;
  padding: 10px 12px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.btn-toolbar{
  height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  transition: all 0.2s;
}

.btn-run{
  background: #10b981;
  color: white;
}

.btn-run:hover{
  background: #059669;
  transform: translateY(-1px);
}

.btn-stop{
  background: #ef4444;
  color: white;
}

.btn-stop:hover{
  background: #dc2626;
  transform: translateY(-1px);
}

.btn-toolbar:disabled{
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Botão de tela cheia (seu original) */
.btn-fullscreen {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 100;
  width: 36px;
  height: 36px;
  padding: 0;
  background: white;
  color: #6b7280;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.btn-fullscreen:hover {
  background: #f9fafb;
  color: #3b82f6;
  border-color: #3b82f6;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.btn-fullscreen:active {
  transform: scale(0.95);
}

/* Tela inicial */
.start-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
  padding: 32px;
  text-align: center;
}

.start-icon {
  font-size: 64px;
  margin-bottom: 8px;
}

.start-screen h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.start-screen p {
  color: #6b7280;
  font-size: 14px;
  margin: 0;
  max-width: 280px;
  line-height: 1.5;
}

.btn-start {
  padding: 12px 24px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
}

.btn-start:hover {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

/* Container do chat */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Área de mensagens com scroll */
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  display: flex;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-bot {
  justify-content: flex-start;
}

.message-user {
  justify-content: flex-end;
}

/* Bolhas de mensagem */
.message-bubble {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
  word-wrap: break-word;
}

.message-bot .message-bubble {
  background: white;
  color: #374151;
  border: 1px solid #e5e7eb;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.message-user .message-bubble {
  background: #3b82f6;
  color: white;
  border-bottom-right-radius: 4px;
  box-shadow: 0 1px 3px rgba(59, 130, 246, 0.4);
}

/* Botões de múltipla escolha */
.choices-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  animation: slideIn 0.3s ease-out;
}

.choice-button {
  padding: 10px 16px;
  background: white;
  color: #3b82f6;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.choice-button:hover {
  background: #3b82f6;
  color: white;
  transform: translateX(4px);
}

/* Área de input para perguntas abertas */
.input-area {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #e5e7eb;
  background: white;
}

.input-area input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 13px;
  transition: all 0.2s;
}

.input-area input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.btn-send {
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-send:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

/* Área de reinício */
.restart-area {
  padding: 12px;
  border-top: 1px solid #e5e7eb;
  background: white;
  text-align: center;
}

.btn-restart {
  padding: 10px 20px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-restart:hover {
  background: #059669;
  transform: translateY(-1px);
}

/* Imagens no chat */
.message-image {
  max-width: 75%;
  border-radius: 12px;
  overflow: hidden;
  background: white;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.message-image img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 400px;
  object-fit: contain;
}
</style>
