import { createApp } from 'vue';
import App from './App.vue';
import { checkLogin } from './auth';

const app = createApp(App);

// monta o app imediatamente
app.mount('#app');

// checa login em paralelo
checkLogin();