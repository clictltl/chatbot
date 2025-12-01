<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Block } from '../types/chatbot';

const props = defineProps<{
  block: Block | null;
  variables: Record<string, any>;
}>();

const emit = defineEmits<{
  'update:block': [block: Block];
}>();

const localBlock = ref<Block | null>(null);

watch(() => props.block, (newBlock) => {
  if (newBlock) {
    localBlock.value = JSON.parse(JSON.stringify(newBlock));
  } else {
    localBlock.value = null;
  }
}, { immediate: true });

function updateBlock() {
  if (localBlock.value) {
    emit('update:block', localBlock.value);
  }
}

function addChoice() {
  if (localBlock.value && localBlock.value.type === 'choiceQuestion') {
    if (!localBlock.value.choices) localBlock.value.choices = [];
    localBlock.value.choices.push({
      id: `choice_${Date.now()}`,
      label: 'Nova opção',
      nextBlockId: undefined
    });
    updateBlock();
  }
}

function removeChoice(choiceId: string) {
  if (localBlock.value && localBlock.value.choices) {
    localBlock.value.choices = localBlock.value.choices.filter(c => c.id !== choiceId);
    updateBlock();
  }
}

function addCondition() {
  if (localBlock.value && localBlock.value.type === 'condition') {
    if (!localBlock.value.conditions) localBlock.value.conditions = [];
    const firstVarName = Object.keys(props.variables)[0] || 'var1';
    localBlock.value.conditions.push({
      id: `cond_${Date.now()}`,
      variableName: firstVarName,
      operator: '==',
      value: '',
      nextBlockId: undefined
    });
    updateBlock();
  }
}

function removeCondition(condId: string) {
  if (localBlock.value && localBlock.value.conditions) {
    localBlock.value.conditions = localBlock.value.conditions.filter(c => c.id !== condId);
    updateBlock();
  }
}
</script>

<template>
  <div class="properties-panel">
    <div v-if="!block" class="empty-state">
      <p>Selecione um bloco para editar suas propriedades</p>
    </div>

    <div v-else-if="localBlock" class="properties-content">
      <div class="property-group">
        <label>Tipo de Bloco</label>
        <input type="text" :value="localBlock.type" disabled />
      </div>

      <div v-if="localBlock.type !== 'end' && localBlock.type !== 'setVariable'" class="property-group">
        <label>{{ localBlock.type === 'message' ? 'Mensagem' : 'Pergunta' }}</label>
        <textarea
          v-model="localBlock.content"
          @input="updateBlock"
          placeholder="Digite o conteúdo..."
          rows="4"
        />
        <small>Use &#123;&#123;variavel&#125;&#125; para inserir valores de variáveis</small>
      </div>

      <div v-if="localBlock.type === 'end'" class="property-group">
        <label>Mensagem Final</label>
        <textarea
          v-model="localBlock.content"
          @input="updateBlock"
          placeholder="Obrigado por usar o chatbot!"
          rows="3"
        />
      </div>

      <div v-if="localBlock.type === 'setVariable'" class="property-group">
        <label>Nome da Variável</label>
        <select v-model="localBlock.variableName" @change="updateBlock">
          <option :value="undefined">Selecione uma variável</option>
          <option v-for="name in Object.keys(variables)" :key="name" :value="name">
            {{ name }}
          </option>
        </select>
      </div>

      <div v-if="localBlock.type === 'setVariable'" class="property-group">
        <label>Valor</label>
        <input
          v-model="localBlock.variableValue"
          @input="updateBlock"
          placeholder="Digite o valor..."
        />
        <small>Use &#123;&#123;variavel&#125;&#125; para usar valores de outras variáveis</small>
      </div>

      <div v-if="localBlock.type === 'openQuestion'" class="property-group">
        <label>Salvar resposta em variável</label>
        <select v-model="localBlock.variableName" @change="updateBlock">
          <option :value="undefined">Não salvar</option>
          <option v-for="name in Object.keys(variables)" :key="name" :value="name">
            {{ name }}
          </option>
        </select>
      </div>

      <div v-if="localBlock.type === 'choiceQuestion'" class="property-group">
        <label>Opções de Resposta</label>
        <div class="choices-list">
          <div v-for="choice in localBlock.choices" :key="choice.id" class="choice-editor">
            <input
              v-model="choice.label"
              @input="updateBlock"
              placeholder="Texto da opção"
            />
            <button @click="removeChoice(choice.id)" class="btn-remove" title="Remover opção">×</button>
          </div>
        </div>
        <button @click="addChoice" class="btn-add">+ Adicionar Opção</button>
      </div>

      <div v-if="localBlock.type === 'condition'" class="property-group">
        <label>Condições</label>
        <div class="conditions-list">
          <div v-for="condition in localBlock.conditions" :key="condition.id" class="condition-editor">
            <select v-model="condition.variableName" @change="updateBlock">
              <option v-for="name in Object.keys(variables)" :key="name" :value="name">
                {{ name }}
              </option>
            </select>
            <select v-model="condition.operator" @change="updateBlock">
              <option value="==">=</option>
              <option value="!=">≠</option>
              <option value=">">></option>
              <option value="<"><</option>
              <option value=">=">≥</option>
              <option value="<=">≤</option>
            </select>
            <input
              v-model="condition.value"
              @input="updateBlock"
              placeholder="Valor"
            />
            <button @click="removeCondition(condition.id)" class="btn-remove" title="Remover condição">×</button>
          </div>
        </div>
        <button @click="addCondition" class="btn-add">+ Adicionar Condição</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.properties-panel {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6b7280;
  text-align: center;
  padding: 24px;
}

.properties-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.property-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.property-group label {
  font-weight: 600;
  font-size: 13px;
  color: #374151;
}

.property-group small {
  font-size: 11px;
  color: #6b7280;
  margin-top: -4px;
}

.property-group input,
.property-group select,
.property-group textarea {
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
}

.property-group input:disabled {
  background: #f3f4f6;
  color: #6b7280;
  cursor: not-allowed;
}

.property-group input:focus,
.property-group select:focus,
.property-group textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.choices-list,
.conditions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.choice-editor,
.condition-editor {
  display: flex;
  gap: 6px;
  align-items: center;
}

.choice-editor input {
  flex: 1;
}

.condition-editor select,
.condition-editor input {
  flex: 1;
}

.condition-editor select:first-child {
  flex: 1.5;
}

.condition-editor select:nth-child(2) {
  flex: 0.7;
}

.btn-remove {
  width: 28px;
  height: 28px;
  padding: 0;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
}

.btn-remove:hover {
  background: #dc2626;
}

.btn-add {
  padding: 8px 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-add:hover {
  background: #2563eb;
}
</style>
