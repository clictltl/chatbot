# 🚀 Como publicar no GitHub Pages

Este projeto está configurado para deploy automático no GitHub Pages usando GitHub Actions.

## Método Recomendado: GitHub Actions (Automático)

### 1. Criar o repositório no GitHub

1. Acesse: https://github.com/new
2. Nome do repositório: **project** (ou o nome que preferir)
3. Deixe como **público**
4. **NÃO** adicione README, .gitignore ou licença
5. Clique em **Create repository**

### 2. Configurar o vite.config.ts

**IMPORTANTE:** Atualize o `base` no arquivo `vite.config.ts` com o nome do seu repositório:

```typescript
export default defineConfig({
  plugins: [vue()],
  base: process.env.NODE_ENV === 'production' ? '/SEU-REPOSITORIO/' : './',
  // ...
})
```

Substitua `/SEU-REPOSITORIO/` pelo nome do seu repositório. Por exemplo:
- Se o repo é `chatbot`, use `/chatbot/`
- Se o repo é `meu-editor`, use `/meu-editor/`

### 3. Enviar o código para o GitHub

No terminal, dentro da pasta do projeto, execute:

```bash
# Inicializar git (se ainda não iniciou)
git init

# Adicionar todos os arquivos
git add .

# Fazer o primeiro commit
git commit -m "Initial commit - Editor de Chatbot"

# Conectar com o repositório remoto (substitua SEU-USUARIO e SEU-REPO)
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git

# Enviar o código para o GitHub
git push -u origin main
```

### 4. Configurar GitHub Pages

1. Vá em: `https://github.com/SEU-USUARIO/SEU-REPO/settings/pages`
2. Em **Source**, selecione:
   - Source: **GitHub Actions**
3. A configuração será salva automaticamente

### 5. Acessar o site

Após o push, o GitHub Actions irá automaticamente:
1. Instalar as dependências
2. Fazer o build do projeto
3. Fazer o deploy no GitHub Pages

Você pode acompanhar o progresso na aba **Actions** do seu repositório.

O site estará disponível em:
**https://SEU-USUARIO.github.io/SEU-REPO/**

---

## Método Alternativo: Deploy Manual

Se preferir fazer deploy manual sem GitHub Actions:

---

### Manual: Usando o script deploy.sh

```bash
./deploy.sh
```

Ou manualmente:

```bash
# Build do projeto
npm run build

# Entrar na pasta dist
cd dist

# Inicializar git
git init
git add -A
git commit -m "Deploy"

# Enviar para gh-pages (substitua a URL do seu repo)
git push -f https://github.com/SEU-USUARIO/SEU-REPO.git main:gh-pages

cd ..
```

Depois configure em Settings > Pages:
- Branch: **gh-pages**
- Folder: **/ (root)**

---

## 🔄 Atualizações futuras

### Com GitHub Actions (automático):

Simplesmente faça commit e push das suas alterações:

```bash
git add .
git commit -m "Descrição das mudanças"
git push
```

O GitHub Actions irá automaticamente fazer o build e deploy! 🎉

### Com deploy manual:

1. Faça commit das suas alterações:
   ```bash
   git add .
   git commit -m "Descrição das mudanças"
   git push
   ```

2. Execute o deploy novamente:
   ```bash
   ./deploy.sh
   ```

---

## ⚠️ Solução de problemas

**O GitHub Actions falhou?**
- Vá na aba **Actions** do seu repositório para ver os logs de erro
- Verifique se você configurou corretamente em Settings > Pages > Source: GitHub Actions

**Site não aparece?**
- Aguarde 2-5 minutos após o primeiro deploy
- Verifique se o `base` no `vite.config.ts` está correto (deve ser `/nome-do-repo/`)
- Verifique a aba Actions para ver se o deploy foi concluído com sucesso

**Recursos não carregam (404 nos assets)?**
- Certifique-se que o `base` no `vite.config.ts` corresponde ao nome do seu repositório
- O formato correto é: `base: '/nome-do-repositorio/'` (com barras no início e fim)

**Erro de permissão?**
- Certifique-se que o repositório tem permissões de GitHub Pages habilitadas
- Em Settings > Actions > General > Workflow permissions: marque "Read and write permissions"
