<template>
  <!-- Só renderiza se estiver no WordPress -->
  <div v-if="isWordPress" class="auth-menu">
    <!-- Estado inicial -->
    <span v-if="!auth.state.ready">Verificando login...</span>

    <!-- Usuário não logado -->
    <button v-else-if="!auth.state.loggedIn" @click="showLogin = true">
      Entrar
    </button>

    <!-- Usuário logado -->
    <div v-else class="auth-user">
      <span class="auth-user-name">
        👤 {{ auth.state.name || 'Usuário' }}
      </span>

      <div class="auth-user-menu">
        <button @click="logout">
          Sair
        </button>
      </div>
    </div>

    <!-- Modal de login -->
    <div v-if="showLogin" class="login-modal">
      <div class="modal-overlay" @click="closeModal"></div>
      <div class="modal-content">
        <h3>Login</h3>

        <form @submit.prevent="submitLogin">
          <label>
            Usuário
            <input ref="usernameInput" v-model="username" type="text" required />
          </label>

          <label>
            Senha
            <input v-model="password" type="password" required />
          </label>

          <button type="submit" :disabled="loading">
            {{ loading ? 'Entrando...' : 'Entrar' }}
          </button>

          <p v-if="error" class="error">{{ error }}</p>
        </form>

        <button class="close-btn" @click="closeModal">Fechar</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useAuth } from '../auth';
import { getProjectData } from '../editor/projectData';
import { decodeHtml } from '../utils/decodeHtml';


// Estado auth (singleton)
const auth = useAuth();

// Modal e campos
const showLogin = ref(false);
const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const usernameInput = ref<HTMLInputElement | null>(null);

// Detecta WordPress
const isWordPress =
  typeof window !== 'undefined' && !!window.CLIC_AUTH;

// Foco automático quando o modal abre
watch(showLogin, (open) => {
  if (open) {
    requestAnimationFrame(() => {
      usernameInput.value?.focus();
    });
  }
});

// Fecha modal e limpa campos
function closeModal() {
  showLogin.value = false;
  username.value = '';
  password.value = '';
  error.value = '';
}

// Função de login
async function submitLogin() {
  error.value = '';
  loading.value = true;

  const restRoot = window.CLIC_AUTH?.rest_root ?? '/wp-json/clic-auth/v1/';
  const nonce = window.CLIC_AUTH?.nonce ?? '';

  try {
    const res = await fetch(restRoot + 'login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': nonce,
      },
      body: JSON.stringify({
        username: username.value,
        password: password.value,
      }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      // Backup temporário do projeto antes do reload (estilo Scratch)
      const project = getProjectData();
      sessionStorage.setItem('clic-chatbot:login-backup', JSON.stringify(project));

      // Reload para atualizar auth/menu sem perder conteúdo
      window.location.reload();
      return;
    }

    error.value = 'Login falhou. Verifique usuário e senha.';
  } catch (err: any) {
    error.value = err?.message || 'Erro inesperado';
  } finally {
    loading.value = false;
  }
}

function logout() {
  const rawUrl =
  window.CLIC_AUTH?.logout_url || '/wp-login.php?action=logout';

  const logoutUrl = decodeHtml(rawUrl);

  window.location.href = logoutUrl;

}
</script>

<style scoped>
.auth-menu {
  display: inline-block;
}

/* Modal */
.login-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 999;
}

.modal-overlay {
  position: absolute;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.6);
}

.modal-content {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 320px;
  max-width: 90%;
  transform: translate(-50%, -50%);
  background: #f7f7f7;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.modal-content h3 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  text-align: center;
}

.modal-content input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 6px;
}

.modal-content button {
  padding: 0.5rem;
  border: none;
  border-radius: 6px;
  background-color: #4CAF50;
  color: white;
  font-weight: bold;
  cursor: pointer;
}

.modal-content button:disabled {
  background-color: #9E9E9E;
  cursor: not-allowed;
}

.error {
  color: red;
  margin-top: 0.5rem;
  text-align: center;
}

.close-btn {
  margin-top: 1rem;
  background: #ddd;
  color: #333;
  font-weight: normal;
}

.close-btn:hover {
  background: #ccc;
}

.auth-user {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

/* menu escondido por padrão */
.auth-user-menu {
  display: none;
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 4px;

  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0.25rem;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  z-index: 9999;
}

.auth-user:hover .auth-user-menu {
  display: block;
}

.auth-user-menu button {
  background: none;
  border: none;
  padding: 0.4rem 0.6rem;
  cursor: pointer;
  font-size: 0.9rem;
}

.auth-user-menu button:hover {
  background: #f2f2f2;
}

.auth-user-menu::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 0;
  right: 0;
  height: 6px;
}
</style>
