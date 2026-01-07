<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import type { Block } from '@/types/chatbot';

const props = defineProps<{
  block: Block | null;
  variables: Record<string, any>;
}>();

const emit = defineEmits<{
  'update:block': [block: Block];
}>();

const localBlock = ref<Block | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const mainTextareaRef = ref<HTMLTextAreaElement | null>(null);


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

function handleImageUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file || !localBlock.value) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    if (localBlock.value && e.target?.result) {
      localBlock.value.imageData = e.target.result as string;
      localBlock.value.imageUrl = undefined;
      updateBlock();
    }
  };
  reader.readAsDataURL(file);
}

function clearImage() {
  if (localBlock.value) {
    localBlock.value.imageUrl = undefined;
    localBlock.value.imageData = undefined;
    updateBlock();
  }
}

function openFileDialog() {
  fileInput.value?.click();
}

function focusContent() {
  nextTick(() => {
    mainTextareaRef.value?.focus();
  });
}

defineExpose({ focusContent });

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

      <div v-if="localBlock.type !== 'end' && localBlock.type !== 'setVariable' && localBlock.type !== 'math' && localBlock.type !== 'image'" class="property-group">
        <label>{{ localBlock.type === 'message' ? 'Mensagem' : 'Pergunta' }}</label>
        <textarea
          ref="mainTextareaRef"
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
          ref="mainTextareaRef"
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

      <div v-if="localBlock.type === 'math'" class="property-group">
        <label>Variável</label>
        <select v-model="localBlock.variableName" @change="updateBlock">
          <option :value="undefined">Selecione uma variável</option>
          <option v-for="name in Object.keys(variables)" :key="name" :value="name">
            {{ name }}
          </option>
        </select>
        <small>Variável que receberá o resultado da operação</small>
      </div>

      <div v-if="localBlock.type === 'math'" class="property-group">
        <label>Operação</label>
        <select v-model="localBlock.mathOperation" @change="updateBlock">
          <option value="+">+ (Somar)</option>
          <option value="-">- (Subtrair)</option>
          <option value="*">* (Multiplicar)</option>
          <option value="/">/ (Dividir)</option>
        </select>
      </div>

      <div v-if="localBlock.type === 'math'" class="property-group">
        <label>Valor</label>
        <input
          v-model="localBlock.mathValue"
          @input="updateBlock"
          placeholder="Digite um número ou {{variavel}}"
        />
        <small>Use um número fixo ou &#123;&#123;variavel&#125;&#125; para usar valor de outra variável</small>
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

      <div v-if="localBlock.type === 'image'" class="property-group">
        <label>Fonte da Imagem</label>
        <div class="image-source-tabs">
          <button
            @click="localBlock.imageData = undefined; updateBlock()"
            :class="{ active: !localBlock.imageData }"
            class="tab-button"
          >
            URL
          </button>
          <button
            @click="localBlock.imageUrl = undefined; updateBlock()"
            :class="{ active: localBlock.imageData }"
            class="tab-button"
          >
            Upload
          </button>
        </div>

        <div v-if="!localBlock.imageData" class="image-url-input">
          <input
            v-model="localBlock.imageUrl"
            @input="updateBlock"
            placeholder="https://exemplo.com/imagem.jpg"
            type="url"
          />
          <small>Cole a URL de uma imagem da web</small>
        </div>

        <div v-else class="image-upload-input">
          <button @click="openFileDialog" class="upload-button" type="button">
            📁 Escolher Arquivo
          </button>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            @change="handleImageUpload"
            style="display: none;"
          />
          <small>Formatos aceitos: JPG, PNG, GIF, WebP</small>
        </div>

        <div v-if="localBlock.imageUrl || localBlock.imageData" class="image-preview">
          <img :src="localBlock.imageData || localBlock.imageUrl" alt="Preview" />
          <button @click="clearImage" class="btn-clear">Remover Imagem</button>
        </div>
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

.image-source-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.tab-button {
  flex: 1;
  padding: 8px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  transition: all 0.2s;
}

.tab-button:hover {
  background: #e5e7eb;
}

.tab-button.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.image-url-input,
.image-upload-input {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.upload-button {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  transition: background 0.2s;
  width: 100%;
}

.upload-button:hover {
  background: #2563eb;
}

.image-preview {
  margin-top: 12px;
  padding: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.image-preview img {
  width: 100%;
  max-height: 200px;
  object-fit: contain;
  border-radius: 4px;
}

.btn-clear {
  padding: 6px 12px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-clear:hover {
  background: #dc2626;
}
</style>
