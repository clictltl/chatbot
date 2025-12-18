<!-- src/components/OpenProjectModal.vue -->
<template>
  <div class="overlay" @click.self="close">
    <div class="modal">
      <h3>Abrir projeto</h3>

      <!-- ERRO -->
      <p v-if="error" class="error">
        Erro: {{ error }}
      </p>

      <!-- LISTA DE PROJETOS -->
      <div v-if="projectsList.length > 0">
        <div
          class="project-item"
          v-for="p in projectsList"
          :key="p.id"
          @click="openSelected(p.id)"
        >
          <strong>{{ p.name }}</strong>
          <span class="date">{{ formatDate(p.updated_at) }}</span>
        </div>
      </div>

      <!-- SEM PROJETOS -->
      <p v-else class="empty">
        Você ainda não tem projetos salvos.
      </p>

      <button class="close-btn" @click="close">Fechar</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRefs } from 'vue';
import { useProjects } from '../utils/useProjects';

/**
 * Tipagem do item retornado por /list
 */
export interface ProjectListItem {
  id: number;
  name: string;
  updated_at: string;
}

const emit = defineEmits(['close']);

// Projects store
const projects = useProjects();

/**
 * Desestruturando refs com typing correto
 */
const { projectsList, error } = toRefs(projects);

// DEBUG TEMPORÁRIO
console.log("Modal abriu. Lista atual:", projectsList.value);

/**
 * Fecha o modal
 */
function close() {
  emit('close');
}

/**
 * Abre um projeto selecionado
 */
async function openSelected(id: number) {
  const result = await projects.loadProject(id);

  if (result) {
    emit('close');
  }
}

/**
 * Formata data de forma amigável
 */
function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('pt-BR');
  } catch {
    return dateStr;
  }
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
}

.modal {
  background: white;
  padding: 1.5rem;
  width: 340px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
}

.project-item {
  padding: 12px;
  border-radius: 6px;
  background: #f3f3f3;
  margin-bottom: 10px;
  cursor: pointer;
  transition: background 0.15s;
}

.project-item:hover {
  background: #e7e7e7;
}

.date {
  display: block;
  font-size: 12px;
  opacity: 0.7;
}

.error {
  color: red;
  margin-bottom: 12px;
}

.empty {
  opacity: 0.7;
  margin-bottom: 1rem;
}

.close-btn {
  margin-top: 1rem;
}
</style>
