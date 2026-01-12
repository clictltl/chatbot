import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Detecta o target pelo argumento --mode
  const isGithub = mode === 'github'
  
  // Define o base path baseado no target
  const getBasePath = () => {
    if (isGithub) {
      return '/chatbot/'
    }
    // WordPress - usa path vazio em produção
    return mode === 'production' ? '' : './'
  }

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    base: getBasePath(),
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
    }
  }
})
