<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useChatRuntime } from '@/runtime/engine/useChatRuntime';
import type { ProjectData } from '@/shared/types/project';

// ===== Estado de carregamento =====
const isLoading = ref(true);
const fatalError = ref<string | null>(null);

// ===== Runtime =====
const runtime = ref<ReturnType<typeof useChatRuntime> | null>(null);
const r = computed(() => runtime.value);

// ===== UI =====
const userInput = ref('');
const chatEndRef = ref<HTMLDivElement | null>(null);

// ===== Mensagens de erro (iguais ao Preview) =====
const ERROR_MESSAGES: Record<string, string> = {
  BLOCK_NOT_FOUND: 'Erro de fluxo: bloco não encontrado.',
  IMAGE_NOT_DEFINED: 'Erro: imagem não definida.',
  INVALID_NEXT_BLOCK: 'Erro de fluxo: bloco de destino não encontrado.',
  NO_CHOICE_TARGET: 'Erro: escolha sem destino definido.',
  NO_CHOICES: 'Erro: pergunta sem opções de escolha.',
  NO_CONDITION_MATCH: 'Nenhuma condição satisfeita.',
  NO_START_BLOCK: 'Bloco de início não encontrado.',
  START_NO_NEXT: 'Início sem conexão de saída.',
  UNSUPPORTED_BLOCK_TYPE: 'Tipo de bloco não suportado.',
};

// ===== Utils =====
function extractTokenFromPath(): string | null {
  const parts = window.location.pathname
    .split('/')
    .filter(Boolean);

  const pIndex = parts.lastIndexOf('p');
  return pIndex !== -1 ? parts[pIndex + 1] ?? null : null;
}

// ===== Fetch =====
async function loadProject() {
  const token = extractTokenFromPath();
  if (!token) {
    fatalError.value = 'INVALID_TOKEN';
    return;
  }

  try {
    const restRoot =
      window.CLIC_CHATBOT?.rest_root ?? '/wp-json/clic-chatbot/v1/';

    const res = await fetch(restRoot + 'publish/' + token);

    if (!res.ok) {
      fatalError.value = 'INVALID_TOKEN';
      return;
    }

    const json = await res.json();
    const data: ProjectData = json.chatbot.data;

    runtime.value = useChatRuntime({
      blocks: data.blocks,
      variables: data.variables,
    });
  } catch {
    fatalError.value = 'NETWORK_ERROR';
  } finally {
    isLoading.value = false;
  }
}

// ===== UI handlers =====
function startChat() {
  userInput.value = '';
  runtime.value?.start();
}

function sendText() {
  runtime.value?.submitText(userInput.value);
  userInput.value = '';
}

function selectChoice(choice: any) {
  runtime.value?.selectChoice(choice);
}

// ===== Scroll =====
watch(
  () => runtime.value?.messages.length,
  async () => {
    await nextTick();
    chatEndRef.value?.scrollIntoView({ behavior: 'smooth' });
  }
);

onMounted(loadProject);
</script>

<template>
  <div class="runtime-app">
    <!-- Loading -->
    <div v-if="isLoading" class="start-screen">
      <div class="start-icon">💬</div>
      <p>Carregando chatbot…</p>
    </div>

    <!-- Fatal error -->
    <div v-else-if="fatalError" class="start-screen">
      <div class="start-icon">⚠️</div>
      <p>Chatbot indisponível.</p>
    </div>

    <!-- Chat -->
    <div v-else class="chat-container">
      <!-- Tela inicial -->
      <div v-if="!r?.isRunning && r?.messages.length === 0" class="start-screen">
        <div class="start-icon">💬</div>
        <h3>Iniciar conversa</h3>
        <button class="btn-start" @click="startChat">▶️ Iniciar</button>
      </div>

      <!-- Mensagens -->
      <div v-else class="messages">
        <div
          v-for="message in r!.messages"
          :key="message.id"
          :class="[
            'message',
            message.type === 'bot' || message.type === 'image'
              ? 'message-bot'
              : 'message-user'
          ]"
        >
          <div v-if="message.type === 'image'" class="message-image">
            <img :src="message.content" />
          </div>
          <div
            v-else
            class="message-bubble"
            :class="{ 'message-error': ERROR_MESSAGES[message.content] }"
          >
            {{ ERROR_MESSAGES[message.content] ?? message.content }}
          </div>
        </div>

        <!-- Choices -->
        <div v-if="r!.currentChoices.length" class="choices-container">
          <button
            v-for="choice in r!.currentChoices"
            :key="choice.id"
            class="choice-button"
            @click="selectChoice(choice)"
          >
            {{ choice.label }}
          </button>
        </div>

        <div ref="chatEndRef" />
      </div>

      <!-- Input -->
      <div v-if="r!.isWaitingForInput" class="input-area">
        <input
          v-model="userInput"
          placeholder="Digite sua resposta…"
          @keyup.enter="sendText"
        />
        <button @click="sendText">📤</button>
      </div>

      <!-- Restart -->
      <div
        v-if="!r!.isWaitingForInput && !r!.currentChoices.length && !r!.isRunning"
        class="restart-area"
      >
        <button @click="startChat">🔄 Recomeçar</button>
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

.message-error::before {
  content: '⚠️';
  margin-right: 6px;
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
