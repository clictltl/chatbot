<template>
  <div class="overlay" @click.self="close">
    <div class="modal">
      <h3>Excluir projeto</h3>

      <p v-if="currentProjectName">
        Tem certeza de que deseja excluir o projeto <strong>"{{ currentProjectName }}"</strong>?
      </p>

      <p v-else>
        Tem certeza de que deseja excluir este projeto?
      </p>

      <!-- Erro -->
      <p v-if="error" class="error">
        Erro: {{ error }}
      </p>

      <div class="buttons">
        <button class="danger" @click="confirmDelete">Excluir</button>
        <button @click="close">Cancelar</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRefs } from 'vue';
import { useProjects } from '@/utils/useProjects';

const emit = defineEmits(["close", "deleted"]);

const projects = useProjects();
const { currentProjectId, currentProjectName, error } = toRefs(projects);

function close() {
  emit("close");
}

async function confirmDelete() {
  if (!currentProjectId.value) {
    error.value = "NO_PROJECT_SELECTED";
    return;
  }

  const ok = await projects.deleteProject(currentProjectId.value);

  if (ok) {
    emit("deleted");  // ← avisa o FileMenu
    emit("close");
  }
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.modal {
  background: white;
  padding: 1.5rem;
  width: 320px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
}

.buttons {
  display: flex;
  gap: 10px;
  margin-top: 1rem;
}

button.danger {
  background: #d9534f;
  color: white;
}

.error {
  color: red;
  margin-top: 10px;
}
</style>
