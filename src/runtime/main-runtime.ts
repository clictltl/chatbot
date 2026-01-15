import { createApp } from 'vue';
import RuntimeApp from './RuntimeApp.vue';

// segurança: runtime é SPA independente
const app = createApp(RuntimeApp);
app.mount('#app');
