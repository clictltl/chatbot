<script setup lang="ts">
/**
 * COMPONENTE DE BLOCO
 *
 * Representa um bloco individual no canvas com handles de entrada e saída
 */

import { computed } from 'vue';
import type { Block } from '@/types/chatbot';

const props = defineProps<{
  block: Block;
  isSelected: boolean;
  scale: number;
}>();

const emit = defineEmits<{
  select: [];
  inputClick: [];
  dragStart: [event: MouseEvent];
  connectStart: [outputId?: string];
  delete: [];
  contextMenu: [event: MouseEvent];
}>();

// Título e ícone do bloco baseado no tipo
const blockTitle = computed(() => {
  switch (props.block.type) {
    case "start": return "Início";
    case "message": return "Mensagem";
    case "openQuestion": return "Pergunta Aberta";
    case "choiceQuestion": return "Múltipla Escolha";
    case "condition": return "Condicional";
    case "setVariable": return "Definir Variável";
    case "math": return "Operação Matemática";
    case "image": return "Imagem";
    case "end": return "Fim da Conversa";
    default: return "Bloco";
  }
});

const blockIcon = computed(() => {
  switch (props.block.type) {
    case "start": return "▶️";
    case "message": return "💬";
    case "openQuestion": return "❓";
    case "choiceQuestion": return "📊";
    case "condition": return "⚙️";
    case "setVariable": return "📝";
    case "math": return "🔢";
    case "image": return "🖼️";
    case "end": return "✅";
    default: return "📦";
  }
});

const blockColor = computed(() => {
  switch (props.block.type) {
    case "start": return "#10b981";
    case "message": return "#3b82f6";
    case "openQuestion": return "#d97706";
    case "choiceQuestion": return "#f59e0b";
    case "condition": return "#8b5cf6";
    case "setVariable": return "#06b6d4";
    case "math": return "#f97316";
    case "image": return "#ec4899";
    case "end": return "#ef4444";
    default: return "#6b7280";
  }
});

function handleMouseDown(event: MouseEvent) {
  const target = event.target as HTMLElement;
  // Não inicia drag se clicar no handle
  if (target.classList.contains('handle')) {
    return;
  }
  emit('dragStart', event);
}

function handleClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (target.classList.contains('handle')) {
    return;
  }
  emit('select');
}

function handleContextMenu(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
  const target = event.target as HTMLElement;
  if (target.classList.contains('handle')) {
    return;
  }
  emit('contextMenu', event);
}

function handleOutputMouseDown(event: MouseEvent, outputId?: string) {
  event.stopPropagation();
  event.preventDefault();
  emit('connectStart', outputId);
}

function handleInputMouseDown(event: MouseEvent) {
  event.stopPropagation();
  event.preventDefault();
  emit('inputClick');
}

function handleDelete(event: MouseEvent) {
  event.stopPropagation();
  event.preventDefault();
  emit('delete');
}
</script>

<template>
  <div
    :data-block-id="block.id"
    class="block-node"
    :class="[
      { selected: isSelected },
      { 'start-node': block.type === 'start' }
    ]"
    :style="{
      left: `${block.position.x}px`,
      top: `${block.position.y}px`,
      borderColor: blockColor
    }"
    @mousedown="handleMouseDown"
    @click="handleClick"
    @contextmenu="handleContextMenu"
  >
    <!-- ✅ START (inteiro verde, sem área branca) -->
    <div v-if="block.type === 'start'" class="start-body" :style="{ backgroundColor: blockColor }">
      <span class="start-title">Início</span>
    </div>

    <!-- ✅ RESTO (layout normal) -->
    <template v-else>
      <div class="block-header" :style="{ backgroundColor: blockColor }">
        <span class="block-icon">{{ blockIcon }}</span>
        <span class="block-title">{{ blockTitle }}</span>

        <button
          v-if="block.id !== 'start'"
          class="delete-button"
          @click="handleDelete"
          @mousedown.stop
          title="Deletar bloco"
        >
          ×
        </button>
      </div>

      <!-- Handle de entrada (não aparece no start) -->
      <div
        v-if="block.id !== 'start'"
        :data-handle-id="`${block.id}-input`"
        :data-block-id="block.id"
        class="handle input-handle"
        @mousedown="handleInputMouseDown"
        title="Handle de entrada"
      />

      <div class="block-content">
        <p v-if="block.type !== 'setVariable' && block.type !== 'image' && block.type !== 'math'">
          {{ block.content || 'Sem conteúdo' }}
        </p>

        <!-- Visualização para setVariable -->
        <div v-if="block.type === 'setVariable'" class="variable-assignment">
          <span class="var-name">{{ block.variableName || '?' }}</span>
          <span class="var-equals">=</span>
          <span class="var-value">{{ block.variableValue || '?' }}</span>
        </div>

        <!-- Visualização para math -->
        <div v-if="block.type === 'math'" class="math-operation">
          <span class="var-name">{{ block.variableName || '?' }}</span>
          <span class="math-op">{{ ` ${block.mathOperation || '+'} ` }}</span>
          <span class="var-value">{{ block.mathValue || '?' }}</span>
        </div>

        <!-- Visualização para image -->
        <div v-if="block.type === 'image'" class="image-preview-block">
          <img
            v-if="block.imageData || block.imageUrl"
            :src="block.imageData || block.imageUrl"
            alt="Preview"
          />
          <span v-else class="no-image">Nenhuma imagem definida</span>
        </div>

        <!-- Opções de múltipla escolha -->
        <div v-if="block.type === 'choiceQuestion' && block.choices" class="choices">
          <div v-for="choice in block.choices" :key="choice.id" class="choice-item">
            <span>{{ choice.label }}</span>
            <div
              :data-handle-id="`${block.id}-output-${choice.id}`"
              :data-block-id="block.id"
              :data-output-id="choice.id"
              class="handle output-handle choice-output"
              @mousedown="handleOutputMouseDown($event, choice.id)"
              :title="`Conectar '${choice.label}'`"
            />
          </div>
        </div>

        <!-- Condições -->
        <div v-if="block.type === 'condition' && block.conditions" class="conditions">
          <div v-for="condition in block.conditions" :key="condition.id" class="condition-item">
            <span>{{ condition.variableName }} {{ condition.operator }} {{ condition.value }}</span>
            <div
              :data-handle-id="`${block.id}-output-${condition.id}`"
              :data-block-id="block.id"
              :data-output-id="condition.id"
              class="handle output-handle condition-output"
              @mousedown="handleOutputMouseDown($event, condition.id)"
              title="Conectar condição"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- ✅ Handle de saída principal (verde na direita)
         - para start: aparece (e é o único handle)
         - não renderiza para end / choiceQuestion / condition (como já era) -->
    <div
      v-if="block.type === 'start' || (block.type !== 'end' && block.type !== 'choiceQuestion' && block.type !== 'condition')"
      :data-handle-id="`${block.id}-output`"
      :data-block-id="block.id"
      class="handle output-handle main-output"
      @mousedown="handleOutputMouseDown($event)"
      title="Handle de saída"
    />
  </div>
</template>

<style scoped>
.block-node {
  position: absolute;
  width: 220px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: move;
  transition: box-shadow 0.2s, border-color 0.2s, background 0.2s;
  user-select: none;
  z-index: 160;
}

.block-node:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.block-node.selected {
  border-color: #3b82f6;
  border-width: 3px;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);
}

/* ✅ START: remove branco e deixa tudo verde */
.start-node {
  background: #10b981;
  border-color: #10b981 !important;
}

.start-body {
  height: 72px; /* ajuste se quiser mais alto/baixo */
  width: 100%;
  border-radius: 8px;

  display: flex;
  align-items: center;
  justify-content: center;

  color: white;
  font-weight: 800;
  font-size: 14px;
  letter-spacing: 0.2px;
}

.start-title {
  line-height: 1;
}

/* Header normal */
.block-header {
  padding: 8px 12px;
  border-radius: 6px 6px 0 0;
  color: white;
  font-weight: 600;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  position: relative;
}

.delete-button {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.2);
  border: none;
  color: white;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  padding: 0;
  opacity: 0.7;
}

.delete-button:hover {
  background: rgba(0, 0, 0, 0.4);
  opacity: 1;
  transform: translateY(-50%) scale(1.1);
}

.block-icon {
  font-size: 16px;
}

.block-title {
  text-align: center;
}

.block-content {
  padding: 12px;
}

.block-content p {
  margin: 0;
  font-size: 13px;
  color: #374151;
  line-height: 1.4;
  word-break: break-word;
}

.choices, .conditions {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.choice-item, .condition-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  background: #f9fafb;
  border-radius: 4px;
  font-size: 12px;
  color: #6b7280;
}

.variable-assignment {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #f0f9ff;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
}

.var-name {
  color: #0369a1;
  font-weight: 600;
}

.var-equals {
  color: #64748b;
  font-weight: 500;
}

.var-value {
  color: #059669;
  font-weight: 600;
}

.math-operation {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #fff7ed;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
}

.math-op {
  color: #ea580c;
  font-weight: 700;
}

/* Handles de conexão */
.handle {
  position: absolute;
  width: 16px;
  height: 16px;
  border: 3px solid white;
  border-radius: 50%;
  cursor: crosshair;
  transition: all 0.2s;
  z-index: 200;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.handle:hover {
  transform: scale(1.5);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
}

/* Handle de entrada (vermelho na esquerda) */
.input-handle {
  background: #ef4444;
  top: 50%;
  left: -8px;
  transform: translateY(-50%);
}

/* Área clicável expandida no handle de entrada */
.input-handle::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 32px;
  height: 32px;
  transform: translate(-50%, -50%);
  cursor: crosshair;
  z-index: 250;
}

.input-handle:hover {
  background: #dc2626;
  transform: translateY(-50%) scale(1.5);
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.3);
}

/* Handles de saída (verde) */
.output-handle {
  background: #10b981;
}

.output-handle:hover {
  background: #059669;
}

/* Handle de saída principal (na direita do bloco) */
.main-output {
  top: 50%;
  right: -8px;
  transform: translateY(-50%);
}

.main-output:hover {
  transform: translateY(-50%) scale(1.5);
}

/* Handles de saída nas opções/condições */
.choice-output, .condition-output {
  position: relative;
  margin-left: 8px;
  flex-shrink: 0;
}

.image-preview-block {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 80px;
  background: #f9fafb;
  border-radius: 6px;
  overflow: hidden;
}

.image-preview-block img {
  width: 100%;
  height: auto;
  max-height: 120px;
  object-fit: contain;
}

.no-image {
  font-size: 12px;
  color: #9ca3af;
  font-style: italic;
}
</style>
