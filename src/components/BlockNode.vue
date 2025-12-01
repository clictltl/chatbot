<script setup lang="ts">
/**
 * COMPONENTE DE BLOCO
 *
 * Representa um bloco individual no canvas com handles de entrada e saída
 */

import { computed } from 'vue';
import type { Block } from '../types/chatbot';

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
}>();

// Título e ícone do bloco baseado no tipo
const blockTitle = computed(() => {
  switch (props.block.type) {
    case "message": return "Mensagem";
    case "openQuestion": return "Pergunta Aberta";
    case "choiceQuestion": return "Múltipla Escolha";
    case "condition": return "Condicional";
    case "setVariable": return "Definir Variável";
    case "end": return "Fim da Conversa";
    default: return "Bloco";
  }
});

const blockIcon = computed(() => {
  switch (props.block.type) {
    case "message": return "💬";
    case "openQuestion": return "❓";
    case "choiceQuestion": return "📊";
    case "condition": return "⚙️";
    case "setVariable": return "📝";
    case "end": return "✅";
    default: return "📦";
  }
});

const blockColor = computed(() => {
  switch (props.block.type) {
    case "message": return "#3b82f6";
    case "openQuestion": return "#10b981";
    case "choiceQuestion": return "#f59e0b";
    case "condition": return "#8b5cf6";
    case "setVariable": return "#06b6d4";
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
    :class="{ selected: isSelected }"
    :style="{
      left: `${block.position.x}px`,
      top: `${block.position.y}px`,
      borderColor: blockColor
    }"
    @mousedown="handleMouseDown"
    @click="handleClick"
  >
    <div class="block-header" :style="{ backgroundColor: blockColor }">
      <span class="block-icon">{{ blockIcon }}</span>
      <span class="block-title">{{ blockTitle }}</span>
      <button
        class="delete-button"
        @click="handleDelete"
        @mousedown.stop
        title="Deletar bloco"
      >
        ×
      </button>
    </div>

    <!-- Handle de entrada (vermelho no topo) - todos os blocos têm entrada -->
    <div
      :data-handle-id="`${block.id}-input`"
      :data-block-id="block.id"
      class="handle input-handle"
      @mousedown="handleInputMouseDown"
      title="Handle de entrada"
    />

    <div class="block-content">
      <p v-if="block.type !== 'setVariable'">{{ block.content || 'Sem conteúdo' }}</p>

      <!-- Visualização para setVariable -->
      <div v-if="block.type === 'setVariable'" class="variable-assignment">
        <span class="var-name">{{ block.variableName || '?' }}</span>
        <span class="var-equals">=</span>
        <span class="var-value">{{ block.variableValue || '?' }}</span>
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
            :title="`Conectar condição`"
          />
        </div>
      </div>
    </div>

    <!-- Handle de saída principal (verde na base) - não renderiza para 'end' -->
    <div
      v-if="block.type !== 'end' && block.type !== 'choiceQuestion' && block.type !== 'condition'"
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
  transition: box-shadow 0.2s, border-color 0.2s;
  user-select: none;
}

.block-node:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.block-node.selected {
  border-color: #3b82f6;
  border-width: 3px;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);
}

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

/* Handles de conexão */
.handle {
  position: absolute;
  width: 14px;
  height: 14px;
  border: 3px solid white;
  border-radius: 50%;
  cursor: crosshair;
  transition: all 0.2s;
  z-index: 10;
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
  left: -7px;
  transform: translateY(-50%);
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
  right: -7px;
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
</style>
