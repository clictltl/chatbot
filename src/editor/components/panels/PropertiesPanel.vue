<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue';
import type { Block } from '@/shared/types/chatbot';
import { useAssetStore } from '@/editor/utils/useAssetStore';

const props = defineProps<{
  block: Block | null;
  variables: Record<string, any>;
}>();

const emit = defineEmits<{
  'update:block': [block: Block];
}>();

const localBlock = ref<Block | null>(null);
const mainTextareaRef = ref<HTMLTextAreaElement | null>(null);
const assetStore = useAssetStore();
const imageTab = ref<'url' | 'upload'>('url'); 
const fileInput = ref<HTMLInputElement | null>(null);
const uploadError = ref<string | null>(null);

watch(() => props.block, (newBlock) => {
  if (newBlock) {
    localBlock.value = JSON.parse(JSON.stringify(newBlock));

    // Se já tiver assetId, abre na aba Upload. Caso contrário, URL.
    if (newBlock.type === 'image') {
      imageTab.value = newBlock.assetId ? 'upload' : 'url';
    }
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

function setTab(tab: 'url' | 'upload') {
  imageTab.value = tab;
  uploadError.value = null;
  // Opcional: Limpar o campo do outro tipo quando troca de aba?
  // Geralmente é melhor não limpar automaticamente para não frustrar o usuário caso ele clique errado.
  // Vamos limpar apenas quando um novo valor for efetivamente definido.
}

function handleUrlInput() {
  if (!localBlock.value) return;
  // Se digitou URL, limpa o assetId para garantir consistência

  // Se tinha uma imagem local antes, captura o ID
  const oldAssetId = localBlock.value.assetId;
  
  localBlock.value.assetId = undefined; 
  updateBlock();

  // Tenta limpar
  if (oldAssetId) {
    assetStore.deleteAssetIfUnused(oldAssetId, localBlock.value.id);
  }
}

async function handleImageUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  uploadError.value = null;
  
  if (!file || !localBlock.value) return;

  // Captura o ID antigo antes de substituir
  const oldAssetId = localBlock.value.assetId;

  try {
    // Agora aguardamos o cálculo do hash
    const assetId = await assetStore.addAssetFile(file);

    // Atualiza Bloco
    localBlock.value.assetId = assetId;
    localBlock.value.imageUrl = undefined;

    // Tenta limpar o antigo (se houver e for diferente do novo)
    if (oldAssetId && oldAssetId !== assetId) {
      assetStore.deleteAssetIfUnused(oldAssetId, localBlock.value.id);
    }
    
    updateBlock();
    
  } catch (error) {
    uploadError.value = (error as Error).message || "Erro desconhecido ao carregar imagem.";
  } finally {
    // Reset do input sempre acontece
    target.value = '';
  }
}

function openFileDialog() {
  // Garante que o input existe antes de clicar
  nextTick(() => {
    fileInput.value?.click();
  });
}

function clearImage() {
  if (localBlock.value) {

    // Captura o ID antes de limpar
    const oldAssetId = localBlock.value.assetId;
    
    localBlock.value.imageUrl = undefined;
    localBlock.value.assetId = undefined;
    updateBlock();

    // Chama a limpeza
    if (oldAssetId) {
      assetStore.deleteAssetIfUnused(oldAssetId, localBlock.value.id);
    }
  }
}

// Computed para o preview (mais limpo que função)
const previewSrc = computed(() => {
  if (!localBlock.value) return undefined;
  if (localBlock.value.imageUrl) return localBlock.value.imageUrl;
  if (localBlock.value.assetId) return assetStore.getAssetSrc(localBlock.value.assetId);
  return undefined;
});

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

      <div v-if="localBlock.type !== 'start'
        && localBlock.type !== 'end'
        && localBlock.type !== 'setVariable'
        && localBlock.type !== 'math'
        && localBlock.type !== 'image'" class="property-group"
      >
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
        
        <!-- Abas de Navegação -->
        <div class="image-source-tabs">
          <button
            type="button"
            @click="setTab('url')"
            :class="{ active: imageTab === 'url' }"
            class="tab-button"
          >
            Link (URL)
          </button>
          <button
            type="button"
            @click="setTab('upload')"
            :class="{ active: imageTab === 'upload' }"
            class="tab-button"
          >
            Upload
          </button>
        </div>

        <!-- Conteúdo: Modo URL -->
        <div v-if="imageTab === 'url'" class="tab-content">
          <input
            v-model="localBlock.imageUrl"
            @input="handleUrlInput"
            placeholder="https://exemplo.com/foto.jpg"
            type="url"
            class="full-width-input"
          />
          <small class="help-text">Cole o link direto de uma imagem na internet.</small>
        </div>

        <!-- Conteúdo: Modo Upload -->
        <div v-if="imageTab === 'upload'" class="tab-content upload-area">
          <div class="upload-controls">
             <button @click="openFileDialog" class="btn-primary-outline" type="button">
              ☁️ Carregar Imagem
            </button>
            <span v-if="localBlock.assetId" class="file-status">Arquivo carregado</span>
            <span v-else class="file-status">Nenhum arquivo</span>
          </div>

          <div v-if="uploadError" class="error-message">
            ⚠️ {{ uploadError }}
          </div>
          
          <!-- Input Invisível -->
          <input
            ref="fileInput"
            type="file"
            accept="image/png, image/jpeg, image/gif, image/webp"
            @change="handleImageUpload"
            style="display: none;"
          />
          <small>A imagem será salva junto com o projeto.</small>
        </div>

        <!-- Preview Unificado (Sempre visível se houver imagem) -->
        <div v-if="previewSrc" class="image-preview-container">
          <label>Pré-visualização:</label>
          <div class="preview-box">
            <img :src="previewSrc" alt="Preview" />
            <button @click="clearImage" class="btn-remove-image" title="Remover imagem">
              ×
            </button>
          </div>
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

/* Estilos para as abas de Imagem */
.image-source-tabs {
  display: flex;
  margin-bottom: 10px;
  background: #f0f0f0;
  border-radius: 6px;
  padding: 4px;
  gap: 4px;
}

.tab-button {
  flex: 1;
  border: none;
  background: transparent;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #666;
  transition: all 0.2s;
}

.tab-button.active {
  background: white;
  color: #2c3e50;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.tab-content {
  display: flex;
  flex-direction: column; 
  gap: 6px; /* Espaço entre o input e o texto */
  margin-top: 10px;
}

.full-width-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.help-text {
  color: #666;
  font-size: 0.8rem;
  margin-left: 2px; /* Ligeiro alinhamento visual */
}

/* Área de Upload */
.upload-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-primary-outline {
  border: 1px solid #4caf50;
  color: #4caf50;
  background: white;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}
.btn-primary-outline:hover {
  background: #f1f8f1;
}

.file-status {
  font-size: 0.8rem;
  color: #888;
}

/* Preview */
.image-preview-container {
  margin-top: 16px;
  border-top: 1px solid #eee;
  padding-top: 12px;
}

.preview-box {
  position: relative;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
  display: flex;
  justify-content: center;
  background-image: radial-gradient(#e5e5e5 1px, transparent 1px);
  background-size: 10px 10px;
}

.preview-box img {
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
}

.btn-remove-image {
  position: absolute;
  top: 5px;
  right: 5px;
  background: rgba(0,0,0,0.6);
  color: white;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-remove-image:hover {
  background: red;
}

.error-message {
  color: #d32f2f;
  background-color: #ffebee;
  padding: 8px;
  border-radius: 4px;
  font-size: 0.85rem;
  margin-top: 8px;
  border: 1px solid #ffcdd2;
}
</style>
