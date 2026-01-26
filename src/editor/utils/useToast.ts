import { ref } from 'vue';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const toasts = ref<ToastMessage[]>([]);
let nextId = 1;

export function useToast() {
  
  function add(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = nextId++;
    toasts.value.push({ id, message, type });

    // Remove automaticamente após 3 segundos
    setTimeout(() => {
      remove(id);
    }, 3000);
  }

  function remove(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }

  return {
    toasts,
    success: (msg: string) => add(msg, 'success'),
    error: (msg: string) => add(msg, 'error'),
    info: (msg: string) => add(msg, 'info'),
    remove
  };
}
