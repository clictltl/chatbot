# 👨‍💻 Developer Guide

Quick start guide for developers working on the CLIC Chatbot Editor.

---

## 📋 Prerequisites

- **Node.js** 16+ ([Download](https://nodejs.org/))
- **npm** 7+ (comes with Node.js) or **pnpm** 7+
- **Git** for version control
- A code editor (VS Code recommended)

---

## ⚡ Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/clictltl/chatbot.git
cd chatbot
```

### 2. Install Dependencies

```bash
npm install
# or with pnpm
pnpm install
```

### 3. Start Development Server

```bash
npm run dev
```

The editor will be available at: **http://localhost:5173**

---

## 🛠️ Available Commands

### Development

```bash
# Start dev server with hot-reload
npm run dev

# Type check (TypeScript compilation)
npm run type-check
```

### Building

```bash
# Build for WordPress deployment (default)
npm run build

# Alternative: explicitly build for WordPress
npm run build:wordpress

# Build for GitHub Pages (with /chatbot/ path prefix)
npm run build:github
```

### Testing

```bash
# Run tests in watch mode (re-runs on file changes)
npm run test

# Run tests once
npm run test:run

# View test coverage (if configured)
npm run test:coverage
```

### Deployment

```bash
# Build and deploy to GitHub Pages
npm run deploy

# This runs: npm run build:github && touch dist/.nojekyll
```

---

## 📁 Project Structure

```
.
├── src/
│   ├── editor/                    # ⚙️ EDITOR APPLICATION
│   │   ├── App.vue               # Main editor component
│   │   ├── main-editor.ts        # Editor entry point
│   │   ├── auth.ts               # WordPress authentication logic
│   │   │
│   │   ├── components/
│   │   │   ├── canvas/           # Visual flow canvas
│   │   │   │   ├── Canvas.vue    # Main canvas component
│   │   │   │   └── BlockNode.vue # Individual block rendering
│   │   │   │
│   │   │   ├── layout/           # Top-level UI components
│   │   │   │   ├── FileMenu.vue  # File operations (save, load, export)
│   │   │   │   └── AuthMenu.vue  # Login/logout & user menu
│   │   │   │
│   │   │   ├── modals/           # Dialog components
│   │   │   │   ├── PublishModal.vue
│   │   │   │   ├── ShareModal.vue
│   │   │   │   ├── OpenProjectModal.vue
│   │   │   │   ├── DeleteProjectModal.vue
│   │   │   │   └── ConfirmSaveBeforePublishModal.vue
│   │   │   │
│   │   │   └── panels/           # Right sidebar panels
│   │   │       ├── PropertiesPanel.vue  # Edit selected block
│   │   │       ├── VariablesPanel.vue   # Manage variables
│   │   │       └── PreviewPanel.vue     # Real-time chat preview
│   │   │
│   │   └── utils/
│   │       ├── projectData.ts    # Reactive project state
│   │       ├── localProjectIO.ts # File import/export
│   │       └── useProjects.ts    # WordPress REST API client
│   │
│   ├── runtime/                   # 🎮 CHATBOT RUNTIME
│   │   ├── RuntimeApp.vue        # Chatbot widget component
│   │   ├── main-runtime.ts       # Runtime entry point
│   │   │
│   │   └── engine/
│   │       ├── useChatRuntime.ts # Core execution logic
│   │       │
│   │       └── __tests__/        # Unit tests
│   │           ├── message.test.ts
│   │           ├── openQuestion.test.ts
│   │           ├── choiceQuestion.test.ts
│   │           ├── condition.test.ts
│   │           ├── setVariable.test.ts
│   │           ├── math.test.ts
│   │           ├── image.test.ts
│   │           ├── start.test.ts
│   │           ├── stopChat.test.ts
│   │           └── helpers.ts
│   │
│   ├── shared/                    # 🤝 SHARED CODE
│   │   ├── types/
│   │   │   ├── chatbot.ts        # Block, Choice, Condition, Variable types
│   │   │   └── project.ts        # ProjectData type
│   │   │
│   │   └── utils/
│   │       ├── decodeHtml.ts     # HTML entity decoding
│   │       └── interpolation.ts  # {{variable}} template parsing
│   │
│   ├── styles/
│   │   ├── index.css             # Global styles
│   │   └── style.css             # Additional styles
│   │
│   ├── global.d.ts               # Global TypeScript declarations
│   └── vite-env.d.ts             # Vite environment types
│
├── public/                        # Static assets
├── index.html                     # Main HTML entry point
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                  # TypeScript configuration
├── package.json                   # Dependencies & scripts
├── eslint.config.js               # Linting rules
├── README.md                      # Project overview
├── DEVELOPERS.md                  # This file
└── DEPLOY.md                      # Deployment guide
```

---

## 🧪 Testing

### Running Tests

```bash
# Watch mode - re-runs on changes
npm run test

# Single run
npm run test:run
```

### Test Structure

Tests are located in `src/runtime/engine/__tests__/` and cover:
- **Block types** - Each block type has dedicated tests
- **Variable interpolation** - Template variable substitution
- **Conditional logic** - If/else evaluation
- **Chat flow execution** - End-to-end conversation flow
- **Math operations** - Numeric calculations
- **Image handling** - URL and base64 images

### Writing Tests

Tests use Vitest. Example:

```typescript
import { describe, it, expect } from 'vitest';
import { useChatRuntime } from '../useChatRuntime';

describe('Message Block', () => {
  it('should display a message', () => {
    const runtime = useChatRuntime({
      blocks: [
        { id: 'start', type: 'start', position: { x: 0, y: 0 }, content: '', nextBlockId: 'msg1' },
        { id: 'msg1', type: 'message', position: { x: 0, y: 100 }, content: 'Hello!' }
      ],
      variables: {}
    });

    runtime.start();
    expect(runtime.messages).toContainEqual(
      expect.objectContaining({ content: 'Hello!' })
    );
  });
});
```

---

## 🔄 Development Workflow

### 1. Creating a New Block Type

**Step 1:** Add to `BlockType` union in `src/shared/types/chatbot.ts`

```typescript
export type BlockType = "start" | "message" | "newBlock" | "end";
```

**Step 2:** Extend `Block` interface with block-specific properties

```typescript
export interface Block {
  // ... existing properties
  newProperty?: string;  // Your new property
}
```

**Step 3:** Add processing logic in `src/runtime/engine/useChatRuntime.ts`

```typescript
function processBlock(block: Block) {
  switch (block.type) {
    case 'newBlock':
      // Your logic here
      break;
    // ...
  }
}
```

**Step 4:** Create block UI component in `src/editor/components/canvas/BlockNode.vue`

**Step 5:** Add properties editor in `src/editor/components/panels/PropertiesPanel.vue`

**Step 6:** Add tests in `src/runtime/engine/__tests__/newBlock.test.ts`

### 2. Adding New Features

1. **Plan** - Document the feature and its impact
2. **Implement** - Write code with proper TypeScript types
3. **Test** - Add unit tests for new functionality
4. **Style** - Ensure responsive design (mobile-friendly)
5. **Document** - Update README if user-facing
6. **Test Locally** - Run `npm run dev` and test thoroughly
7. **Commit** - Push to feature branch and create PR

### 3. Debugging

**Browser DevTools:**
```javascript
// Check current project state
window.projectData

// Check runtime state
window.chatRuntime
```

**Console Logging:**
```typescript
import { ref, computed } from 'vue';

// Use ref for reactive debugging
const debugState = ref({ /* ... */ });
```

**Vue DevTools:**
- Install Vue DevTools extension
- Inspect component props and state
- Check emitted events

---

## 🔑 Key Concepts

### Reactive State (Editor)

Located in `src/editor/utils/projectData.ts`:

```typescript
// Accessible throughout the editor
import { 
  blocks,      // Block[]
  connections, // Connection[]
  variables,   // Record<string, Variable>
  selectedBlockId // string | null
} from '@/editor/utils/projectData';
```

These are Vue 3 reactive refs that update all connected components automatically.

### Chat Runtime Engine

Located in `src/runtime/engine/useChatRuntime.ts`:

```typescript
const runtime = useChatRuntime({
  blocks: Block[],
  variables: Record<string, Variable>
});

// Methods available:
runtime.start()           // Begin conversation
runtime.submitText(text)  // User input (open questions)
runtime.selectChoice(id)  // User selection (multiple choice)
runtime.stopChat()        // Stop conversation
```

### Variable Interpolation

Implemented in `src/shared/utils/interpolation.ts`:

```typescript
// Templates with {{variable}} syntax
"Hello, {{userName}}!"

// Supported in:
- Message content
- Conditional values
- Math operations
```

### WordPress Integration

Located in `src/editor/utils/useProjects.ts`:

REST API methods communicate with the WordPress plugin:
- `listProjects()` - GET /list
- `loadProject(id)` - GET /load/{id}
- `saveProject(name)` - POST /save
- `deleteProject(id)` - DELETE /delete/{id}
- `shareProject()` - POST /share
- `publishProject()` - POST /publish

---

## 🚀 Building for Production

### Build Modes

**WordPress Build:**
```bash
npm run build:wordpress
# or
npm run build
```

Output: `dist/` directory
- Includes editor and runtime as separate bundles
- No path prefix needed
- Ready for WordPress plugin

**GitHub Pages Build:**
```bash
npm run build:github
```

Output: `dist/` directory with `/chatbot/` path prefix
- Designed for `github.io/{user}/{repo}/` deployment
- Configure in `vite.config.ts`

### What Gets Built

```
dist/
├── index.html              # Landing page
├── editor.js / editor.css  # Editor bundle
├── runtime.js / runtime.css # Runtime bundle
└── assets/                 # Images, fonts, etc.
```

### Verifying Build

```bash
# Preview production build locally
npm run preview
```

Then visit `http://localhost:4173`

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Kill the process using port 5173
# macOS/Linux
lsof -ti:5173 | xargs kill -9

# Windows
netstat -ano | findstr :5173
taskkill /PID {PID} /F
```

### Dependencies Not Installing

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### TypeScript Errors

```bash
# Rebuild TypeScript project
npm run type-check

# The editor should show errors
# Fix them according to the messages
```

### Tests Failing

```bash
# Run single test file
npm run test src/runtime/engine/__tests__/message.test.ts

# Verbose output
npm run test -- --reporter=verbose
```

### Build Failing

```bash
# Check for TypeScript errors first
npm run type-check

# Check linting
npm run lint

# Then try building
npm run build
```

---

## 📦 Dependencies

### Production
- **vue** (3.4+) - UI framework
- **leader-line-new** (1.1+) - Canvas connection lines

### Development
- **vite** (5.4+) - Build tool
- **typescript** (5.5+) - Type checking
- **vitest** (3.2+) - Testing framework
- **@vitejs/plugin-vue** (5.1+) - Vue support in Vite
- **vue-tsc** (2.1+) - Vue TypeScript compiler

### Adding New Dependencies

```bash
# Production dependency
npm install package-name

# Development dependency
npm install --save-dev package-name

# Update package.json and package-lock.json
# Commit both files to git
```

---

## 🔗 Environment Variables

### WordPress Integration

When running in WordPress, these globals are available:

```javascript
window.CLIC_AUTH = {
  rest_root: '/wp-json/',
  nonce: 'wordpress-nonce-token'
};

window.CLIC_CHATBOT = {
  rest_root: '/wp-json/clic-chatbot/v1/',
  app_url: 'http://wordpress-site/chatbot/'
};
```

### Development Mode

No environment variables needed for standalone development.

---

## 🤝 Contributing Guidelines

### Before You Start
1. Check existing issues and PRs
2. Create an issue to discuss your idea
3. Wait for feedback before implementing

### Pull Request Process
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Add tests for new functionality
5. Run tests: `npm run test:run`
6. Commit with clear messages: `git commit -m "Add feature description"`
7. Push to your fork
8. Create a Pull Request with description

### Code Style
- Use TypeScript for type safety
- Follow Vue 3 `<script setup>` conventions
- Use meaningful variable names
- Add comments for complex logic
- Keep components focused and reusable

### Commit Messages
```
feat: Add new block type
fix: Correct variable interpolation bug
docs: Update README section
test: Add tests for condition block
refactor: Simplify chat runtime
```

---

## 📚 Resources

### Vue 3
- [Vue 3 Guide](https://vuejs.org/guide/introduction.html)
- [Vue 3 API Reference](https://vuejs.org/api/)
- [Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TypeScript with Vue](https://vuejs.org/guide/typescript/overview.html)

### Vite
- [Vite Guide](https://vitejs.dev/guide/)
- [Vite Config Reference](https://vitejs.dev/config/)

### Vitest
- [Vitest Documentation](https://vitest.dev/)

---

## 🆘 Getting Help

### Issues & Discussions
- Check [GitHub Issues](https://github.com/clictltl/chatbot/issues)
- Ask in [GitHub Discussions](https://github.com/clictltl/chatbot/discussions)

### Communication
- CLIC Project: [https://clic.tltlab.org](https://clic.tltlab.org)
- GitHub: [github.com/clictltl](https://github.com/clictltl)

---

## 📝 Common Tasks

### Add a New Modal

1. Create component in `src/editor/components/modals/MyModal.vue`
2. Import in parent component
3. Show with `v-if="showModal"`
4. Emit events to parent
5. Handle actions in parent

### Add Properties to a Block Type

1. Update `Block` interface in `src/shared/types/chatbot.ts`
2. Update default content in `src/editor/App.vue`
3. Add UI in `src/editor/components/panels/PropertiesPanel.vue`
4. Handle in runtime `src/runtime/engine/useChatRuntime.ts`
5. Add tests

### Add a New Panel

1. Create component in `src/editor/components/panels/MyPanel.vue`
2. Add tab button in `src/editor/App.vue` tabs
3. Show panel with `v-show="activeTab === 'myPanel'"`
4. Wire up data and events

---

**Happy coding! 🚀**

For more info, see [README.md](./README.md) and [DEPLOY.md](./DEPLOY.md)
