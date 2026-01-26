<template>
  <!-- Só renderiza se estiver no WordPress e o sistema de auth estiver carregado -->
  <div v-if="isWordPress" class="auth-menu-container">
    
    <!-- Estado: Verificando -->
    <span v-if="!auth.state.ready" class="loading-state">
      <span class="spinner"></span>
    </span>

    <!-- Estado: Usuário NÃO logado -->
    <button v-else-if="!auth.state.loggedIn" class="btn-login" @click="showLogin = true">
      <span class="icon">👤</span> Entrar
    </button>

    <!-- Estado: Usuário LOGADO -->
    <div v-else class="user-profile-wrapper" ref="userMenuContainer">
      <!-- Botão do Perfil -->
      <button class="user-trigger" :class="{ 'active': showUserMenu }" @click="toggleUserMenu">
        <div class="avatar-circle">
          {{ getUserInitials(auth.state.name) }}
        </div>
        <span class="user-name">{{ auth.state.name || 'Usuário' }}</span>
        <svg class="chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      <!-- Dropdown Menu (Logout) -->
      <transition name="fade-slide">
        <div v-if="showUserMenu" class="user-dropdown">
          <div class="menu-item danger" @click="logout">
            <span class="icon">🚪</span> Sair
          </div>
        </div>
      </transition>
    </div>

    <!-- Modal de Login -->
    <transition name="fade">
      <div v-if="showLogin" class="modal-backdrop">
        <div class="modal-overlay" @click="closeModal"></div>
        <div class="modal-card">
          <div class="modal-header">
            <h3>Bem-vindo de volta</h3>
            <p>Faça login para salvar seus projetos na nuvem.</p>
          </div>

          <form @submit.prevent="submitLogin" class="login-form">
            <div class="form-group">
              <label>Usuário ou E-mail</label>
              <input ref="usernameInput" v-model="username" type="text" required placeholder="Digite seu usuário" />
            </div>

            <div class="form-group">
              <label>Senha</label>
              <input v-model="password" type="password" required placeholder="Digite sua senha" />
            </div>

            <p v-if="error" class="error-msg">
              <span class="icon">⚠️</span> {{ error }}
            </p>

            <div class="form-actions">
              <button type="button" class="btn-cancel" @click="closeModal">Cancelar</button>
              <button type="submit" class="btn-confirm" :disabled="loading">
                <span v-if="loading" class="spinner-sm"></span>
                {{ loading ? 'Entrando...' : 'Entrar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>

  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useAuth } from '@/editor/auth';
import { getProjectData } from '@/editor/utils/projectData';
import { useAssetStore } from '@/editor/utils/useAssetStore';
import { decodeHtml } from '@/shared/utils/decodeHtml';


// Estado auth (singleton)
const auth = useAuth();
const assetStore = useAssetStore();

// Estados
const showLogin = ref(false);
const showUserMenu = ref(false); // Controle manual do menu de usuário
const userMenuContainer = ref<HTMLElement | null>(null);

const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const usernameInput = ref<HTMLInputElement | null>(null);

// Detecta WP
const isWordPress = typeof window !== 'undefined' && !!window.CLIC_AUTH;

// --- Lógica de Interação ---

// Foco no input ao abrir modal
watch(showLogin, (open) => {
  if (open) {
    requestAnimationFrame(() => usernameInput.value?.focus());
  }
});

// Fechar menu ao clicar fora
const handleClickOutside = (event: MouseEvent) => {
  if (showUserMenu.value && userMenuContainer.value && !userMenuContainer.value.contains(event.target as Node)) {
    showUserMenu.value = false;
  }
};

onMounted(() => document.addEventListener('click', handleClickOutside));
onUnmounted(() => document.removeEventListener('click', handleClickOutside));

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value;
}

function closeModal() {
  showLogin.value = false;
  username.value = '';
  password.value = '';
  error.value = '';
}

// Utilitário para iniciais (ex: "Lucas Coletti" -> "LC")
function getUserInitials(name: string = '') {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// --- Lógica de Auth ---

const ERROR_MESSAGES: Record<string, string> = {
  'MISSING_CREDENTIALS': 'Preencha usuário e senha.',
  'LOGIN_FAILED': 'Usuário ou senha incorretos.',
  'TOO_MANY_ATTEMPTS': 'Muitas tentativas. Aguarde alguns minutos.'
}

async function submitLogin() {
  error.value = '';
  loading.value = true;

  const restRoot = window.CLIC_AUTH?.rest_root ?? '/wp-json/clic-auth/v1/';
  const nonce = window.CLIC_AUTH?.nonce ?? '';

  try {
    const res = await fetch(restRoot + 'login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
      body: JSON.stringify({ username: username.value, password: password.value }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      await assetStore.persistToDisk(); 
      const project = getProjectData();
      sessionStorage.setItem('clic-chatbot:login-backup', JSON.stringify(project));
      window.location.reload();
      return;
    }

    error.value = ERROR_MESSAGES[data.error] || 'Erro ao fazer login.'
  } catch (err: any) {
    error.value = err?.message || 'Erro inesperado';
  } finally {
    loading.value = false;
  }
}

function logout() {
  const rawUrl = window.CLIC_AUTH?.logout_url || '/wp-login.php?action=logout';
  window.location.href = decodeHtml(rawUrl);
}
</script>

<style scoped>
/* Fonte Padrão */
.auth-menu-container {
  display: flex;
  align-items: center;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* --- Estado Loading --- */
.loading-state { padding: 0 10px; }
.spinner {
  display: inline-block; width: 16px; height: 16px;
  border: 2px solid #e5e7eb; border-top-color: #6b7280;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}

/* --- Botão Login (Unlogged) --- */
.btn-login {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: 1px solid #d1d5db;
  color: #374151;
  padding: 6px 16px;
  border-radius: 6px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-login:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
  color: #111827;
}

/* --- Usuário Logado (Logged) --- */
.user-profile-wrapper {
  position: relative;
}

.user-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.user-trigger:hover, .user-trigger.active {
  background: #f3f4f6;
}

/* Avatar Circle */
.avatar-circle {
  width: 28px; height: 28px;
  background: #2563eb; /* Azul Brand */
  color: white;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 600; letter-spacing: 0.5px;
}

.user-name {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron { color: #9ca3af; transition: transform 0.2s; }
.user-trigger.active .chevron { transform: rotate(180deg); }

/* --- Dropdown User --- */
.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 160px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  padding: 4px;
  z-index: 50;
}

.menu-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
  transition: background 0.15s;
}

.menu-item:hover { background: #f3f4f6; }
.menu-item.danger { color: #dc2626; }
.menu-item.danger:hover { background: #fef2f2; }

/* --- Modal Login Styles --- */
.modal-backdrop {
  position: fixed; inset: 0;
  z-index: 10000;
  display: flex; align-items: center; justify-content: center;
}

.modal-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(2px);
}

.modal-card {
  position: relative;
  background: white;
  width: 100%; max-width: 360px;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
  animation: slideUp 0.3s ease-out;
}

.modal-header h3 { margin: 0 0 0.5rem 0; color: #111827; font-size: 1.25rem; text-align: center; }
.modal-header p { margin: 0 0 1.5rem 0; color: #6b7280; font-size: 0.875rem; text-align: center; }

.form-group { margin-bottom: 1rem; }
.form-group label { display: block; font-size: 0.85rem; font-weight: 500; color: #374151; margin-bottom: 0.4rem; }
.form-group input {
  width: 100%; padding: 0.6rem 0.8rem;
  border: 1px solid #d1d5db; border-radius: 6px;
  font-size: 0.95rem; outline: none; transition: border 0.2s;
}
.form-group input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }

.error-msg {
  background: #fef2f2; color: #b91c1c; font-size: 0.85rem;
  padding: 0.6rem; border-radius: 6px; display: flex; align-items: center; gap: 6px;
  margin-bottom: 1rem;
}

.form-actions {
  display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.5rem;
}

.btn-cancel {
  background: white; border: 1px solid #d1d5db; color: #374151;
  padding: 0.6rem; border-radius: 6px; cursor: pointer; font-weight: 500;
  transition: background 0.2s;
}
.btn-cancel:hover { background: #f9fafb; }

.btn-confirm {
  background: #2563eb; border: none; color: white;
  padding: 0.6rem; border-radius: 6px; cursor: pointer; font-weight: 500;
  display: flex; justify-content: center; align-items: center; gap: 8px;
  transition: background 0.2s;
}
.btn-confirm:hover { background: #1d4ed8; }
.btn-confirm:disabled { opacity: 0.7; cursor: wait; }

/* Animações */
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.fade-slide-enter-active, .fade-slide-leave-active { transition: opacity 0.2s, transform 0.2s; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
