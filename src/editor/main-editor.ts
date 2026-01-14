import { createApp } from 'vue';
import App from './App.vue';
import { checkLogin } from './auth';
import { useProjects } from './utils/useProjects';
import { setProjectData } from './utils/projectData';

async function init() {

  const isWordPress =
    typeof window !== 'undefined' && !!window.CLIC_CHATBOT;

  // 1. Detectar link compartilhado
  const params = new URLSearchParams(window.location.search);
  const shareToken = params.get("share");

  if (shareToken) {
    try {
      const restRoot = window.CLIC_CHATBOT?.rest_root ?? '/wp-json/clic-chatbot/v1/';

      const res = await fetch(restRoot + 'share/' + shareToken);
      const data = await res.json();

      if (data.success) {
        // aplica o projeto compartilhado
        setProjectData(data.project.data);

        // reseta o estado do "useProjects"
        const projects = useProjects();
        projects.currentProjectId.value = null;
        projects.currentProjectName.value = "";
      }
    } catch (e) {
      console.error("Erro ao carregar projeto compartilhado:", e);
    }
  }

  // 2. Normaliza URL FINAL (apenas no WordPress)
  if (isWordPress) {
    const appUrl = window.CLIC_CHATBOT!.app_url;
    const appPath = new URL(appUrl, window.location.origin).pathname;
    const editorPath = appPath.replace(/\/$/, '') + '/editor';

    const pathname = window.location.pathname;

    if (!pathname.startsWith(editorPath)) {
      window.history.replaceState(
        {},
        document.title,
        editorPath
      );
    }
  }

  // 3. Verifica login normalmente
  await checkLogin();

  // 4. Monta app somente depois
  createApp(App).mount('#app');
}

init();
