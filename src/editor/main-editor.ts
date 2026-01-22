import { createApp } from 'vue';
import App from './App.vue';
import { checkLogin } from './auth';
import { useProjects } from './utils/useProjects';

async function init() {
  const projects = useProjects();

  // 1. Detectar link compartilhado
  const params = new URLSearchParams(window.location.search);
  const shareToken = params.get("share");

  if (shareToken) {
    await projects.loadSharedProject(shareToken);
    
    // limpa a URL (remove ?share=), mantendo o path atual
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }

  // 2. Verifica login normalmente
  await checkLogin();

  // 3. Monta app somente depois
  createApp(App).mount('#app');
}

init();
