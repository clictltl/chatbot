<template>
  <div class="modal-backdrop">
    <div class="modal-overlay" @click="$emit('close')"></div>
    
    <div class="modal-card">
      <div class="modal-header">
        <h3>Compartilhar Projeto</h3>
        <p>Gere um link público para permitir que outras pessoas visualizem ou testem seu chatbot.</p>
      </div>

      <div class="modal-body">
        
        <!-- Estado: Carregando -->
        <div v-if="loading" class="state-container">
          <span class="spinner"></span>
          <span>Gerando link de compartilhamento...</span>
        </div>

        <!-- Estado: Erro -->
        <div v-else-if="error" class="error-msg">
          <span class="icon">⚠️</span> {{ error }}
        </div>

        <!-- Estado: Sucesso (Link Gerado) -->
        <div v-else-if="shareUrl" class="share-content">
          <label class="input-label">Link Público</label>
          
          <div class="input-group">
            <input
              ref="inputRef"
              readonly
              class="input-copy"
              :value="shareUrl"
              @click="handleInputClick"
            />
            <button class="btn-copy" @click="copyToClipboard" title="Copiar para área de transferência">
              <span class="icon">📋</span> Copiar
            </button>
          </div>
          
          <p class="helper-text">
            Qualquer pessoa com este link poderá acessar a versão compartilhada deste projeto.
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

const shareUrl = ref<string | null>(null);
const loading = ref(true);
const inputRef = ref<HTMLInputElement | null>(null);

onMounted(async () => {
  loading.value = true;
  try {
    const url = await projects.shareProject();
    shareUrl.value = url;
  } catch (e) {
    // Erro gerenciado pelo store, mas garantimos que loading pare
  } finally {
    loading.value = false;
  }
});

function handleInputClick() {
  // Seleciona todo o texto ao clicar
  inputRef.value?.select();
}

async function copyToClipboard() {
  if (!shareUrl.value) return;
  
  try {
    await navigator.clipboard.writeText(shareUrl.value);
    toast.success("Link copiado para a área de transferência!");
    handleInputClick(); // Mantém selecionado para feedback visual
  } catch (err) {
    toast.error("Não foi possível copiar automaticamente.");
  }
}
</script>

<style scoped>
/* --- Modal Structure --- */
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
}

.modal-header h3 { margin: 0 0 0.5rem 0; color: #111827; font-size: 1.25rem; }
.modal-header p { margin: 0 0 1.5rem 0; color: #6b7280; font-size: 0.9rem; line-height: 1.5; }

/* --- Loading State --- */
.state-container {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; padding: 2rem 0; color: #6b7280; font-size: 0.9rem;
}

.spinner {
  width: 24px; height: 24px;
  border: 3px solid #e5e7eb; border-top-color: #2563eb;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}

/* --- Error State --- */
.error-msg {
  background: #fef2f2; color: #b91c1c; font-size: 0.85rem;
  padding: 0.8rem; border-radius: 6px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}

/* --- Content & Inputs --- */
.input-label {
  display: block; font-size: 0.85rem; font-weight: 500;
  color: #374151; margin-bottom: 6px;
}

.input-group {
  display: flex; gap: 8px;
}

.input-copy {
  flex: 1;
  padding: 0.6rem 0.8rem;
  border: 1px solid #d1d5db; border-radius: 6px;
  font-size: 0.9rem; color: #374151;
  background: #f9fafb;
  outline: none; transition: all 0.2s;
}

.input-copy:focus {
  border-color: #2563eb;
  background: white;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.btn-copy {
  display: flex; align-items: center; gap: 6px;
  background: white; border: 1px solid #d1d5db;
  color: #374151; padding: 0 12px;
  border-radius: 6px; cursor: pointer;
  font-weight: 500; font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-copy:hover {
  background: #f3f4f6; border-color: #9ca3af; color: #111827;
}

.btn-copy:active {
  transform: translateY(1px);
}

.helper-text {
  margin-top: 10px;
  font-size: 0.8rem;
  color: #9ca3af;
}

/* --- Actions --- */
.modal-actions {
  display: flex; justify-content: flex-end;
  margin-top: 1.5rem;
}

.btn-primary {
  background: #2563eb; border: none; color: white;
  padding: 0.6rem 1.2rem; border-radius: 6px; cursor: pointer;
  font-weight: 500; transition: background 0.2s;
}
.btn-primary:hover { background: #1d4ed8; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>