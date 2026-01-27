<template>
  <div class="filemenu-container" ref="fileMenuContainer">

    <!-- Grupo: Botão + Nome do Projeto -->
    <div class="trigger-group">
      
      <!-- Botão Gatilho -->
      <button class="menu-trigger" :class="{ 'active': open }" @click="toggleMenu">
        <span class="label">Arquivo</span>
        <svg class="chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      <!-- Nome do Projeto -->
      <div v-if="currentProjectId" class="project-info">
        <div class="separator-vertical"></div>
        <span class="icon">📄</span>
        <span class="name" :title="currentProjectName">{{ currentProjectName }}</span>
      </div>

    </div>

    <!-- Dropdown Menu -->
    <transition name="fade-slide">
      <div v-if="open" class="dropdown-menu" :class="{ 'align-right': !isWordPress }">
        
        <!-- Grupo: Novo -->
        <div class="menu-group">
          <div class="menu-item" @click="handleMenuClick(() => withGuard(newProject))">
            <span class="icon">✨</span> Novo projeto
          </div>
        </div>
        
        <div class="divider" v-if="showWordPressItems"></div>

        <!-- Grupo: WordPress -->
        <div class="menu-group" v-if="showWordPressItems">
          <div class="menu-label">Nuvem</div>
          <div class="menu-item" @click="handleMenuClick(saveProject)">
            <span class="icon">💾</span> Salvar
          </div>
          <div class="menu-item" @click="handleMenuClick(openSaveAs)">
            <span class="icon">🔖</span> Salvar como...
          </div>
          <div class="menu-item" @click="handleMenuClick(() => withGuard(openList))">
            <span class="icon">📂</span> Abrir...
          </div>
          <div class="menu-item danger" @click="handleMenuClick(openDeleteModal)">
            <span class="icon">🗑️</span> Excluir...
          </div>
        </div>
        
        <div class="divider" v-if="showWordPressItems"></div>

        <!-- Grupo: Publicação -->
         <div class="menu-group" v-if="showWordPressItems">
          <div class="menu-item" @click="handleMenuClick(openShare)">
            <span class="icon">🔗</span> Compartilhar...
          </div>
          <div class="menu-item highlight" @click="handleMenuClick(openPublish)">
            <span class="icon">🚀</span> Publicar
          </div>
        </div>

        <div class="divider"></div>

        <!-- Grupo: Local -->
        <div class="menu-group">
          <div class="menu-label">Local (PC)</div>
          <div class="menu-item" @click="handleMenuClick(() => withGuard(openFromComputer))">
            <span class="icon">📥</span> Importar Projeto
          </div>
          <div class="menu-item" @click="handleMenuClick(saveToComputer)">
            <span class="icon">📤</span> Exportar Projeto
          </div>
        </div>

      </div>
    </transition>

    <!-- Modais -->
    <SaveAsModal v-if="showSaveAs" :mode="saveAsMode" @close="handleSaveAsClose"  @success="handleSaveAsSuccess"/>
    <OpenProjectModal v-if="showOpen" @close="showOpen = false" />
    <DeleteProjectModal v-if="showDelete" @close="showDelete = false" @deleted="handleDeleted"/>
    <ShareModal v-if="showShare" @close="showShare = false"/>
    <ConfirmSaveBeforePublishModal v-if="showConfirmSaveBeforePublish" @close="showConfirmSaveBeforePublish = false" @confirm="confirmSaveAndPublish"/>
    <PublishModal v-if="showPublish" @close="showPublish = false"/>
    <UnsavedChangesModal v-if="showUnsavedChanges" @cancel="handleUnsavedCancel" @discard="handleUnsavedDiscard" @save="handleUnsavedSave"/>

  </div>
</template>

<script setup lang="ts">
import { ref, toRefs, computed, onMounted, onUnmounted } from 'vue';
import { useProjects } from '@/editor/utils/useProjects';
import { resetProjectData, hasUnsavedChanges } from '@/editor/utils/projectData';
import { useAuth } from '@/editor/auth';
import { importFromComputer, exportToComputer } from '@/editor/utils/localProjectIO';
import { useToast } from '@/editor/utils/useToast';

// Imports dos Modais
import SaveAsModal from '@/editor/components/modals/SaveAsModal.vue';
import OpenProjectModal from '@/editor/components/modals/OpenProjectModal.vue';
import DeleteProjectModal from '@/editor/components/modals/DeleteProjectModal.vue';
import ShareModal from '@/editor/components/modals/ShareModal.vue';
import PublishModal from '@/editor/components/modals/PublishModal.vue';
import ConfirmSaveBeforePublishModal from '@/editor/components/modals/ConfirmSaveBeforePublishModal.vue';
import UnsavedChangesModal from '@/editor/components/modals/UnsavedChangesModal.vue';


const projects = useProjects();
const { currentProjectId, currentProjectName } = toRefs(projects);
const auth = useAuth();
const toast = useToast();

const open = ref(false);
const showSaveAs = ref(false);
const saveAsMode = ref<'create' | 'copy'>('create');
const showOpen = ref(false);
const showDelete = ref(false);
const showShare = ref(false);
const showPublish = ref(false);
const showConfirmSaveBeforePublish = ref(false);
const pendingPublish = ref(false);

// Estados para Unsaved Changes
const showUnsavedChanges = ref(false);
const pendingAction = ref<Function | null>(null);

// Referência ao container principal para detectar cliques fora
const fileMenuContainer = ref<HTMLElement | null>(null);

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

// Lógica de fechar ao clicar fora
const handleClickOutside = (event: MouseEvent) => {
  // Se o menu estiver aberto E o clique for fora do container
  if (
    open.value &&
    fileMenuContainer.value &&
    !fileMenuContainer.value.contains(event.target as Node)
  ) {
    open.value = false;
  }
};

// Lifecycle Hooks para adicionar/remover o listener global
onMounted(() => { document.addEventListener('click', handleClickOutside); });
onUnmounted(() => { document.removeEventListener('click', handleClickOutside); });

// --- Lógica de Proteção (Guard) ---

function withGuard(action: Function) {
  if (hasUnsavedChanges.value) {
    pendingAction.value = action;
    showUnsavedChanges.value = true;
  } else {
    action();
  }
}

function handleUnsavedCancel() {
  showUnsavedChanges.value = false;
  pendingAction.value = null;
}

function handleUnsavedDiscard() {
  showUnsavedChanges.value = false;
  if (pendingAction.value) {
    pendingAction.value(); // Executa a ação (ex: newProject) sem salvar
  }
  pendingAction.value = null;
  // O resetProjectData ou loadProject chamados pela ação vão resetar a flag hasUnsavedChanges
}

async function handleUnsavedSave() {
  showUnsavedChanges.value = false;
  
  // Cenário 1: Projeto nunca salvo
  if (!projects.currentProjectId.value) {
    // Configura o modal de Salvar Como
    saveAsMode.value = 'create';
    showSaveAs.value = true;
    
    // IMPORTANTE: Não limpamos pendingAction.value aqui!
    // Ele fica guardado esperando o sucesso do modal.
    return; 
  } 

  // Cenário 2: Projeto já existe (Salvamento direto)
  const saved = await projects.saveProject();

 if (saved) {
    toast.success("Salvo com sucesso!");

    // Se tinha algo pendente (ex: abrir novo projeto), executa agora
    if (pendingAction.value) {
      pendingAction.value();
      pendingAction.value = null;
    }
  } else {
    toast.error("Erro ao salvar.");
  }
}

// Novo
function newProject() {
  resetProjectData();

  // novo projeto SEMPRE rompe vínculo
  projects.currentProjectId.value = null;
  projects.currentProjectName.value = '';
}

// Salvar
async function saveProject() {
  // Se é um novo projeto, forçar "Salvar como..."
  if (!projects.currentProjectId.value) {
    saveAsMode.value = 'create';
    showSaveAs.value = true;
    return;
  }

  // Senão salva normalmente
  try {
    const success = await projects.saveProject();

    if (success) {
      toast.success('Projeto salvo com sucesso!');
    } else {
      // Se projects.saveProject retornar false, provavelmente definiu projects.error
      toast.error(projects.error.value || 'Erro ao salvar projeto.');
    }
  } catch (err) {
    console.error(err);
    toast.error('Ocorreu um erro inesperado.');
  }
}

// Salvar como...
function openSaveAs() {
  saveAsMode.value = 'copy';
  showSaveAs.value = true;
}

// Sucesso do modal Salvar Como
function handleSaveAsSuccess() {
  // Feedback visual sempre
  toast.success('Projeto salvo com sucesso!'); 
  
  // Prioridade 1: Havia uma ação pendente (vinda do Guard de "Não Salvo")?
  // Ex: Usuário clicou em "Novo Projeto" -> "Salvar" -> "Digitou Nome" -> Sucesso
  if (pendingAction.value) {
    pendingAction.value(); // Executa (ex: newProject())
    pendingAction.value = null; // Limpa
    return;
  }

  // Prioridade 2: Havia uma publicação pendente?
  if (pendingPublish.value) {
    pendingPublish.value = false;
    showPublish.value = true;     
  }
}

function handleSaveAsClose() {
  showSaveAs.value = false;
  
  // Se o usuário cancelou o "Salvar Como", cancelamos qualquer fluxo que dependia disso
  pendingPublish.value = false; 
  pendingAction.value = null; 
}

// Abrir...
async function openList() {
  await projects.listProjects();
  showOpen.value = true;
}

// Excluir...
function openDeleteModal() {
  showDelete.value = true;
}

function handleDeleted() {
  newProject();
  showDelete.value = false;
}

// Compartilhar...
function openShare() {
  showShare.value = true;
}

// Publicar
function openPublish() {
  showConfirmSaveBeforePublish.value = true;
}

async function confirmSaveAndPublish() {
  // Cenário A: Projeto Novo (Nunca salvo)
  if (!projects.currentProjectId.value) {
    showConfirmSaveBeforePublish.value = false; 
    
    // MARCA A INTENÇÃO: "O usuário quer publicar depois de salvar"
    pendingPublish.value = true; 
    
    saveAsMode.value = 'create';
    showSaveAs.value = true;
    
    toast.info("Dê um nome ao projeto para continuar a publicação.");
    return;
  }

  // Cenário B: Projeto Existente
  const saved = await projects.saveProject();
  
  if (!saved) {
    toast.error("Erro ao salvar o projeto. A publicação foi cancelada.");
    return;
  }

  showConfirmSaveBeforePublish.value = false;
  showPublish.value = true;
}

// Ações locais (computador)
function openFromComputer() {
  importFromComputer(
    () => {
      // Rompe vínculo com projeto salvo (se houver)
      projects.currentProjectId.value = null;
      projects.currentProjectName.value = '';
      toast.success('Projeto carregado com sucesso!');
    },
    () => {
      alert('Erro ao carregar o projeto.');
    }
  );
}


function saveToComputer() {
  exportToComputer();
}
</script>

<style scoped>
/* Apenas estilos do MENU aqui. Estilos de modal removidos. */
.filemenu-container {
  position: relative;
  display: inline-block;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.trigger-group { display: flex; align-items: center; gap: 8px; }

.menu-trigger {
  display: flex; align-items: center; gap: 6px;
  background: transparent; border: 1px solid transparent;
  padding: 6px 12px; border-radius: 6px; cursor: pointer;
  color: #374151; font-weight: 500; font-size: 14px;
  transition: all 0.2s ease;
}
.menu-trigger:hover, .menu-trigger.active { background-color: #f3f4f6; color: #111827; }
.menu-trigger.active .chevron { transform: rotate(180deg); }
.chevron { transition: transform 0.2s ease; opacity: 0.6; }

.project-info {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: #6b7280; white-space: nowrap;
}
.separator-vertical { width: 1px; height: 16px; background-color: #e5e7eb; }
.project-info .name { font-weight: 500; max-width: 150px; overflow: hidden; text-overflow: ellipsis; display: inline-block; }

.dropdown-menu {
  position: absolute; top: calc(100% + 6px); left: 0; right: auto;
  transform-origin: top left; min-width: 240px;
  background: white; border: 1px solid #e5e7eb; border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  padding: 6px; z-index: 9999;
}
.dropdown-menu.align-right { left: auto; right: 0; transform-origin: top right; }

.menu-group { display: flex; flex-direction: column; }
.menu-label { font-size: 11px; text-transform: uppercase; color: #9ca3af; font-weight: 600; padding: 8px 10px 4px; letter-spacing: 0.05em; }
.menu-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 6px; cursor: pointer; font-size: 14px; color: #4b5563; transition: background-color 0.15s; }
.menu-item:hover { background-color: #f3f4f6; color: #1f2937; }
.menu-item.danger { color: #dc2626; }
.menu-item.danger:hover { background-color: #fef2f2; }
.menu-item.highlight { color: #2563eb; font-weight: 500; }
.menu-item.highlight:hover { background-color: #eff6ff; }
.divider { height: 1px; background-color: #e5e7eb; margin: 6px 0; }
.menu-item .icon { font-size: 16px; min-width: 20px; text-align: center; }

/* Transitions */
.fade-slide-enter-active, .fade-slide-leave-active { transition: opacity 0.2s, transform 0.2s; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
