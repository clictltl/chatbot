<template>
  <div class="toast-container">
    <transition-group name="toast">
      <div 
        v-for="toast in toasts" 
        :key="toast.id" 
        class="toast-item"
        :class="toast.type"
        @click="remove(toast.id)"
      >
        <!-- Ícone baseado no tipo -->
        <span v-if="toast.type === 'success'" class="icon">✅</span>
        <span v-if="toast.type === 'error'" class="icon">❌</span>
        <span v-if="toast.type === 'info'" class="icon">ℹ️</span>
        
        <span class="message">{{ toast.message }}</span>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '@/editor/utils/useToast';

const { toasts, remove } = useToast();
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 11000; /* Bem acima de tudo */
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none; /* Permite clicar através da área vazia */
}

.toast-item {
  pointer-events: auto;
  min-width: 250px;
  padding: 12px 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  border-left: 4px solid #ccc;
  overflow: hidden;
}

/* Tipos */
.toast-item.success { border-left-color: #10b981; }
.toast-item.error { border-left-color: #ef4444; }
.toast-item.info { border-left-color: #3b82f6; }

/* Animações */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
