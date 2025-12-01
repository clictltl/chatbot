#!/bin/bash

# Script de deploy para GitHub Pages
# Repositório: https://github.com/nathanrab1/chatbot

echo "🚀 Iniciando deploy do Editor de Chatbot..."

# 1. Fazer build do projeto
echo "📦 Fazendo build..."
npm run build

# 2. Navegar para a pasta dist
cd dist

# 3. Inicializar repositório git
echo "🔧 Configurando git..."
git init
git add -A
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')"

# 4. Fazer push para o branch gh-pages
echo "📤 Enviando para GitHub Pages..."
git push -f git@github.com:nathanrab1/chatbot.git main:gh-pages

cd ..

echo "✅ Deploy concluído!"
echo "🌐 Seu site estará disponível em: https://nathanrab1.github.io/chatbot/"
echo ""
echo "⚠️  Lembre-se de:"
echo "   1. Criar o repositório 'chatbot' no GitHub"
echo "   2. Configurar GitHub Pages em Settings > Pages"
echo "   3. Selecionar branch 'gh-pages' como source"
