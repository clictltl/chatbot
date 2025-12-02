# 🧩 Editor Visual de Chatbots Pedagógicos  
### Construção de chatbots por blocos — inspirado no construcionismo e no Landbot

Este projeto é um **editor visual de chatbots**, criado especialmente para **professores e estudantes** desenvolverem fluxos conversacionais de maneira criativa, exploratória e autoral — alinhado ao pensamento construcionista de Seymour Papert.

Com ele, qualquer pessoa pode **montar um chatbot arrastando blocos**, conectando mensagens, perguntas e condicionais, e testando tudo em tempo real.

---

## 🚀 Funcionalidades principais

### 🧱 Editor de blocos (Node Editor)
- Criar blocos de:
  - Mensagem
  - Pergunta
  - Condicional
  - Fim do chat
- Conectar blocos visualmente (arrastando setas)
- Suporte a múltiplas entradas no mesmo bloco
- Zoom com scroll
- Pan do canvas arrastando o fundo
- Mover blocos livremente

### 💬 Preview em tempo real
- Conversa gerada automaticamente a partir do fluxo
- Variáveis atualizadas em tempo real
- Suporte a:
  - Comparação case-insensitive
  - `.trim()` automático
  - Avaliação robusta de condicionais
- Modo tela cheia para visualização do chatbot

### 🧪 Painéis laterais
- Propriedades do bloco (mensagens, perguntas, expressões)
- Aba de variáveis
- Preview fullscreen com botão “voltar”

### 📦 Exportação
- Fluxo pode ser exportado como JSON
- Possibilidade de reimportar projetos no futuro

---

## 📁 Estrutura do projeto (resumo)
src/
├─ components/
│ ├─ BlockNode.vue
│ ├─ Canvas.vue
│ ├─ PreviewPanel.vue
│ ├─ PropertiesPanel.vue
│ ├─ VariablesPanel.vue
│
├─ utils/
│ ├─ interpolation.ts
│
├─ types/
│ ├─ chatbot.ts
│
├─ App.vue
├─ main.ts


---

# 🛠️ Instalação

### 1. Clonar o repositório

```bash
git clone https://github.com/nathanrab1/chatbot.git
cd chatbot

npm install
npm run dev
```
http://localhost:5173

🔨 Build de produção
```bash
npm run build
```
Os arquivos finais ficam em:

dist/

🌐 Deploy
🚀 Método recomendado — Vercel

Vá para: https://vercel.com/new

Conecte o repositório do GitHub

A Vercel detecta automaticamente Vite + Vue
Deploy automático a cada push no main
Sem configurações adicionais.



GitHub Pages

Ajuste o vite.config.ts:

export default defineConfig({
  base: "./",
  plugins: [vue()],
})


Build:

npm run build

Subir dist/ para a branch gh-pages:

git subtree push --prefix dist origin gh-pages


Em Settings → Pages selecionar:

Source: gh-pages


URL final:

https://chatbot-brown-gamma.vercel.app/

🧠 Filosofia pedagógica

Este editor segue princípios do construcionismo:

Aprendizagem pela criação de artefatos significativos

Experimentação ativa

Fluxo visual como forma de pensamento computacional

O erro como parte do processo iterativo

Ferramenta com piso baixo, teto alto e paredes amplas

Útil para:

aulas de computação

projetos interdisciplinares

criação de narrativas interativas

oficinas maker

🤝 Contribuindo
git checkout -b feature/nova-funcionalidade
git commit -m "feat: adiciona nova funcionalidade"
git push origin feature/nova-funcionalidade