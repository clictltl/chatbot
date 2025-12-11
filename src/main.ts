import { createApp } from 'vue';
import App from './App.vue';
import { checkLogin } from './auth';

checkLogin().then(() => {
  createApp(App).mount('#app');
});