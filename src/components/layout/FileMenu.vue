<template>
  <div class="filemenu">

    <!-- Botão Arquivo -->
    <div class="menu-button" @click="toggleMenu">
      Arquivo ▼
    </div>

    <!-- Nome do projeto atual -->
    <div class="project-name" v-if="currentProjectId">
      📄 {{ currentProjectName }}
    </div>

    <!-- Dropdown -->
    <div v-if="open" class="dropdown" :class="{ 'align-right': !isWordPress }">
      <div class="item" @click="handleMenuClick(newProject)">Novo projeto</div>
      
      <!-- Ações disponíveis no worpress quando logado -->
      <template v-if="showWordPressItems">
        <div class="separator"></div>
        <div class="item" @click="handleMenuClick(saveProject)">Salvar</div>
        <div class="item" @click="handleMenuClick(() => showSaveAs = true)">Salvar como...</div>
        <div class="item" @click="handleMenuClick(openList)">Abrir...</div>
        <div class="item" @click="handleMenuClick(openDeleteModal)">Excluir...</div>
        <div class="item" @click="handleMenuClick(openShare)">Compartilhar...</div>
      </template>

      <div class="separator"></div>

      <!-- Ações locais (computador) -->
      <div class="item" @click="handleMenuClick(openFromComputer)">Abrir do computador</div>
      <div class="item" @click="handleMenuClick(saveToComputer)">Salvar no computador</div>
    </div>

    <!-- Modal: Salvar como -->
    <div v-if="showSaveAs" class="placeholder-modal">
      <div class="box">
        <h3>Salvar como...</h3>
        <input v-model="saveAsName" placeholder="Nome do novo projeto" />
        <button @click="confirmSaveAs">Confirmar</button>
        <button @click="showSaveAs = false">Cancelar</button>

        <p v-if="error" class="error-msg">
          Erro: {{ error }}
        </p>
      </div>
    </div>

    <OpenProjectModal v-if="showOpen" @close="showOpen = false" />

    <DeleteProjectModal v-if="showDelete" @close="showDelete = false" @deleted="handleDeleted"/>

    <ShareModal v-if="showShare" @close="showShare = false"/>

  </div>
</template>

<script setup lang="ts">
import { ref, toRefs, computed } from 'vue';
import { useProjects } from '@/utils/useProjects';
import { resetProjectData } from '@/utils/projectData';
import { useAuth } from '@/auth';
import { importFromComputer, exportToComputer } from '@/utils/localProjectIO';
import OpenProjectModal from '@/components/modals/OpenProjectModal.vue';
import DeleteProjectModal from '@/components/modals/DeleteProjectModal.vue';
import ShareModal from '@/components/modals/ShareModal.vue';

const projects = useProjects();
const { currentProjectId, currentProjectName, error } = toRefs(projects);
const auth = useAuth();

const open = ref(false);
const showSaveAs = ref(false);
const showOpen = ref(false);
const showDelete = ref(false);
const saveAsName = ref("");
const showShare = ref(false);

// Detecta WordPress
const isWordPress =
  typeof window !== 'undefined' &&
  !!window.CLIC_AUTH && !!window.CLIC_CHATBOT;

// Detecta usuário logado
const showWordPressItems = computed(() => {
  return auth.state.ready && auth.state.loggedIn;
});

// abre/fecha dropdown
function toggleMenu() {
  open.value = !open.value;
}

function handleMenuClick(action: Function) {
  open.value = false;
  projects.error.value = null;
  action();
}

// ----------------------------------------------------------------------
// Novo
// ----------------------------------------------------------------------
function newProject() {
  resetProjectData();

  // novo projeto SEMPRE rompe vínculo
  projects.currentProjectId.value = null;
  projects.currentProjectName.value = '';

  open.value = false;
}

// ----------------------------------------------------------------------
// Salvar
// ----------------------------------------------------------------------
async function saveProject() {
  // Se é um novo projeto, forçar "Salvar como..."
  if (!projects.currentProjectId.value) {
    showSaveAs.value = true;
    return;
  }

  // Senão salva normalmente
  await projects.saveProject();
  open.value = false;
}

// ----------------------------------------------------------------------
// Salvar como...
// ----------------------------------------------------------------------
async function confirmSaveAs() {
  const result = await projects.saveProjectAs(saveAsName.value);

  if (result) {
    // deu certo
    showSaveAs.value = false;
    saveAsName.value = "";
  }
  // se der erro o modal fica aberto e o usuário vê a mensagem
}

// ----------------------------------------------------------------------
// Abrir...
// ----------------------------------------------------------------------
async function openList() {
  await projects.listProjects();
  showOpen.value = true;
}

// ----------------------------------------------------------------------
// Excluir...
// ----------------------------------------------------------------------
function openDeleteModal() {
  open.value = false;
  showDelete.value = true;
}

function handleDeleted() {
  newProject();
  showDelete.value = false;
}

// ----------------------------------------------------------------------
// Compartilhar...
// ----------------------------------------------------------------------
function openShare() {
  showShare.value = true;
  open.value = false; // fecha menu
}

// ----------------------------------------------------------------------
// Ações locais (computador)
// ----------------------------------------------------------------------
function openFromComputer() {
  importFromComputer(
    () => {
      // Rompe vínculo com projeto salvo (se houver)
      projects.currentProjectId.value = null;
      projects.currentProjectName.value = '';

      alert('Projeto carregado com sucesso!');
    },
    () => {
      alert('Erro ao carregar o arquivo JSON. Verifique se o formato está correto.');
    }
  );
}


function saveToComputer() {
  exportToComputer();
}
</script>

<style scoped>
.filemenu {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.menu-button {
  background: #ececec;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
}

.menu-button:hover {
  background: #e0e0e0;
}

.project-name {
  font-size: 14px;
  opacity: 0.8;
}

/* Dropdown */
.dropdown {
  position: absolute;
  top: 36px;
  left: 0;
  background: white;
  border: 1px solid #ccc;
  border-radius: 6px;
  width: 200px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);

  z-index: 9999; /* GARANTE que fica sempre por cima */
}

.dropdown.align-right {
  left: auto;
  right: 0;
}

.item {
  padding: 10px;
  cursor: pointer;
}

.item:hover {
  background: #f0f0f0;
}

/* Placeholder dos modais (até criarmos os reais) */
.placeholder-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.3);

  display: flex;
  align-items: center;
  justify-content: center;

  z-index: 10000;
}

.box {
  background: white;
  padding: 2rem;
  border-radius: 12px;
}

.disabled {
  opacity: 0.4;
  pointer-events: none;
}

.error-msg {
  color: red;
  margin-top: 8px;
  font-size: 13px;
}

.separator {
  height: 1px;
  background: #ddd;
  margin: 6px 0;
}

</style>
