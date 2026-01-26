<template>
  <div class="modal-backdrop">
    <div class="modal-overlay" @click="close"></div>
    
    <div class="modal-card wide">
      <div class="modal-header">
        <h3>Abrir projeto</h3>
        <p>Selecione um projeto da lista para continuar editando.</p>
      </div>

      <div class="modal-body list-container">
        
        <!-- Loading da Lista -->
        <div v-if="loadingList" class="state-msg">
          <span class="spinner"></span> Carregando projetos...
        </div>

        <!-- Lista Vazia -->
        <div v-else-if="projectsList.length === 0" class="state-msg empty">
          <span class="icon">📂</span>
          Você ainda não tem projetos salvos.
        </div>

        <!-- Lista de Projetos -->
        <ul v-else class="project-list">
          <li 
            v-for="p in projectsList" 
            :key="p.id"
            class="project-item"
            :class="{ 'selected': selectedId === p.id }"
            @click="selectProject(p.id)"
            @dblclick="openSelected"
          >
            <div class="item-icon">📄</div>
            <div class="item-info">
              <span class="item-name">{{ p.name }}</span>
              <span class="item-date">Editado em: {{ formatDate(p.updated_at) }}</span>
            </div>
          </li>
        </ul>

        <!-- Erro -->
        <p v-if="error" class="error-msg">
          <span class="icon">⚠️</span> {{ error }}
        </p>
      </div>

      <div class="modal-actions">
        <button class="btn-cancel" @click="close">Cancelar</button>
        <button 
          class="btn-confirm" 
          :disabled="!selectedId || isOpening" 
          @click="openSelected"
        >
          {{ isOpening ? 'Abrindo...' : 'Abrir' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, toRefs, onMounted } from 'vue';
import { useProjects } from '@/editor/utils/useProjects';

const emit = defineEmits(['close']);

// Store
const projects = useProjects();
const { projectsList, error } = toRefs(projects);

// Estado local
const selectedId = ref<number | null>(null);
const loadingList = ref(false);
const isOpening = ref(false);

// Ao montar, atualiza a lista para garantir dados frescos
onMounted(async () => {
  loadingList.value = true;
  try {
    await projects.listProjects();
  } catch (e) {
    // Erro já é tratado no store/error
  } finally {
    loadingList.value = false;
  }
});

function close() {
  emit('close');
}

function selectProject(id: number) {
  selectedId.value = id;
}

async function openSelected() {
  if (!selectedId.value || isOpening.value) return;

  isOpening.value = true;
  
  // O store.loadProject retorna boolean ou o objeto
  const result = await projects.loadProject(selectedId.value);

  isOpening.value = false;
  if (result) {
    emit('close');
  }
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return dateStr;
  }
}
</script>

<style scoped>
/* --- Estrutura Modal Padrão --- */
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
  width: 100%; max-width: 400px;
  /* Altura máxima para permitir scroll em listas longas */
  max-height: 85vh; display: flex; flex-direction: column;
  padding: 1.5rem; border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
  animation: slideUp 0.3s ease-out;
}

.modal-card.wide { max-width: 500px; }

.modal-header h3 { margin: 0 0 0.5rem 0; color: #111827; }
.modal-header p { margin: 0 0 1rem 0; color: #6b7280; font-size: 0.9rem; }

/* --- Lista de Projetos --- */
.list-container {
  flex: 1; /* Ocupa o espaço disponível */
  overflow-y: auto; /* Scroll se necessário */
  min-height: 200px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 4px;
  background: #f9fafb;
}

.project-list { list-style: none; padding: 0; margin: 0; }

.project-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px; margin-bottom: 2px;
  border-radius: 6px; cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
  background: white;
}

.project-item:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.project-item.selected {
  background: #eff6ff;
  border-color: #bfdbfe;
  box-shadow: 0 0 0 1px #bfdbfe;
}

.item-icon { font-size: 1.2rem; opacity: 0.6; }

.item-info { display: flex; flex-direction: column; }
.item-name { font-size: 0.95rem; color: #374151; font-weight: 500; }
.project-item.selected .item-name { color: #1d4ed8; }

.item-date { font-size: 0.75rem; color: #9ca3af; margin-top: 2px; }

/* --- Estados (Empty/Loading/Error) --- */
.state-msg {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  height: 100%; min-height: 150px;
  color: #6b7280; font-size: 0.9rem;
}
.state-msg .icon { font-size: 2rem; opacity: 0.5; margin-bottom: 4px; }
.state-msg.empty { color: #9ca3af; }

.spinner {
  width: 20px; height: 20px;
  border: 2px solid #e5e7eb; border-top-color: #6b7280;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}

.error-msg {
  background: #fef2f2; color: #b91c1c; font-size: 0.85rem;
  padding: 0.6rem; border-radius: 6px; margin-top: 1rem;
  display: flex; align-items: center; gap: 6px;
}

/* --- Ações --- */
.modal-actions {
  display: flex; justify-content: flex-end; gap: 10px;
  margin-top: 1.5rem; padding-top: 1rem;
  border-top: 1px solid #f3f4f6;
}

.btn-cancel {
  background: white; border: 1px solid #d1d5db; color: #374151;
  padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;
}
.btn-cancel:hover { background: #f9fafb; }

.btn-confirm {
  background: #2563eb; border: none; color: white;
  padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 500;
}
.btn-confirm:hover { background: #1d4ed8; }
.btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>