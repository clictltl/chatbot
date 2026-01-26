<template>
  <div class="modal-backdrop">
    <div class="modal-overlay" @click="$emit('close')"></div>

    <div class="modal-card">
      <div class="modal-header">
        <div class="icon-container">
          <span class="icon">🚀</span>
        </div>
        <h3>Publicar Projeto</h3>
      </div>

      <div class="modal-body">
        
        <!-- Estado 1: Carregando -->
        <div v-if="loading" class="state-container">
          <span class="spinner"></span>
          <span>Processando publicação...</span>
        </div>

        <!-- Estado 2: Erro -->
        <div v-else-if="error" class="error-msg">
          <span class="icon">⚠️</span> {{ error }}
        </div>

        <!-- Estado 3: Sucesso -->
        <div v-else-if="result" class="success-content">
          
          <div class="success-banner">
            <p v-if="!result.existing" class="success-title">Publicado com sucesso!</p>
            <p v-else class="success-title">Atualizado com sucesso!</p>
            <p class="success-date">{{ formatDate(result.published_at) }}</p>
          </div>

          <label class="input-label">Link do Chatbot</label>
          <div class="input-group">
            <input
              ref="inputRef"
              readonly
              class="input-copy"
              :value="result.publish_url"
              @click="handleInputClick"
            />
            <button class="btn-copy" @click="copyToClipboard" title="Copiar Link">
              <span class="icon">📋</span>
            </button>
          </div>

          <p class="helper-text">
            Este link está ativo e pode ser acessado publicamente.
          </p>
        </div>

      </div>

      <div class="modal-actions">
        <button class="btn-primary" @click="$emit('close')">Concluído</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, toRefs, onMounted } from 'vue';
import { useProjects } from '@/editor/utils/useProjects';
import { useToast } from '@/editor/utils/useToast';

const emit = defineEmits(['close']);

const projects = useProjects();
const toast = useToast();
const { error } = toRefs(projects);

type PublishResult = {
  token: string;
  publish_url: string;
  published_at: string;
  existing: boolean;
};

const result = ref<PublishResult | null>(null);
const loading = ref(true);
const inputRef = ref<HTMLInputElement | null>(null);

onMounted(async () => {
  loading.value = true;
  try {
    const res = await projects.publishProject();
    if (res) {
      result.value = res;
      toast.success("Projeto publicado!");
    }
  } catch (e) {
    // Erro gerenciado pelo store
  } finally {
    loading.value = false;
  }
});

function handleInputClick() {
  inputRef.value?.select();
}

function copyToClipboard() {
  if (!result.value) return;
  navigator.clipboard.writeText(result.value.publish_url);
  toast.success('Link copiado!');
  handleInputClick();
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString('pt-BR', { 
      dateStyle: 'short', 
      timeStyle: 'medium' 
    });
  } catch {
    return dateStr;
  }
}
</script>

<style scoped>
/* --- Estrutura Base (Consistente com ShareModal) --- */
.modal-backdrop {
  position: fixed; inset: 0; z-index: 10000;
  display: flex; align-items: center; justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.modal-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(2px);
}

.modal-card {
  position: relative; background: white;
  width: 100%; max-width: 420px;
  padding: 1.5rem; border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
  animation: slideUp 0.3s ease-out;
  text-align: center;
}

/* Header & Icon */
.icon-container {
  background: #ecfdf5; /* Verde bem claro */
  color: #059669;
  width: 56px; height: 56px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 1rem auto;
}
.icon-container .icon { font-size: 28px; }

.modal-header h3 { margin: 0 0 1rem 0; color: #111827; font-size: 1.25rem; }

/* States */
.state-container {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 1rem 0; color: #6b7280; font-size: 0.9rem;
}
.spinner {
  width: 24px; height: 24px;
  border: 3px solid #e5e7eb; border-top-color: #059669; /* Verde Loading */
  border-radius: 50%; animation: spin 0.8s linear infinite;
}

.error-msg {
  background: #fef2f2; color: #b91c1c; font-size: 0.85rem;
  padding: 0.8rem; border-radius: 6px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}

/* Success Content */
.success-banner { margin-bottom: 1.5rem; }
.success-title { font-weight: 600; color: #059669; font-size: 1.1rem; margin: 0; }
.success-date { font-size: 0.8rem; color: #9ca3af; margin-top: 4px; }

/* Inputs */
.input-label { display: block; font-size: 0.85rem; font-weight: 500; color: #374151; margin-bottom: 6px; text-align: left; }
.input-group { display: flex; gap: 8px; }

.input-copy {
  flex: 1; padding: 0.6rem 0.8rem;
  border: 1px solid #d1d5db; border-radius: 6px;
  font-size: 0.9rem; color: #374151; background: #f9fafb;
  outline: none; transition: all 0.2s;
}
.input-copy:focus { border-color: #059669; background: white; box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1); }

.btn-copy {
  display: flex; align-items: center; justify-content: center;
  background: white; border: 1px solid #d1d5db;
  color: #374151; width: 42px;
  border-radius: 6px; cursor: pointer;
  transition: all 0.2s;
}
.btn-copy:hover { background: #f3f4f6; border-color: #9ca3af; color: #111827; }

.helper-text { margin-top: 10px; font-size: 0.8rem; color: #9ca3af; }

/* Actions */
.modal-actions { display: flex; justify-content: center; margin-top: 1.5rem; }

.btn-primary {
  background: #059669; /* Verde Publish */
  border: none; color: white;
  padding: 0.6rem 2rem; border-radius: 6px; cursor: pointer;
  font-weight: 500; transition: background 0.2s;
}
.btn-primary:hover { background: #047857; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>