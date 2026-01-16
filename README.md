# CLIC Chatbot Editor

A visual, node-based editor for creating interactive pedagogical chatbots. Build conversational flows with a drag-and-drop interface, dynamic variables, conditional logic, and more.

**Try it online:** [GitHub Pages Demo](https://clictltl.github.io/chatbot/)

---

## Features

### Visual Flow Editor
- **Node-based canvas** for designing conversation flows
- **9 block types** for different conversation elements:
  - **Message** - Bot messages
  - **Open Question** - Free-text user input
  - **Multiple Choice** - Button-based selections
  - **Conditional** - Branch logic based on variables
  - **Set Variable** - Store and update data
  - **Math Operation** - Perform calculations
  - **Image** - Display images (URL or upload)
  - **End** - Conclude the conversation
- **Drag & drop** block creation
- **Context menus** for block operations (duplicate, copy, paste, delete)
- **Copy/Paste/Duplicate** blocks across the canvas
- **Real-time preview** panel to test conversations

### Variables & Personalization
- Create custom variables (string or number)
- Store user responses in variables
- Interpolate variables in messages: `Hello, {{userName}}!`
- Use variables in conditionals for branching logic
- Perform math operations on numeric variables

### Deployment Options

#### 1. **WordPress Integration** (Full Features)
When integrated with the CLIC WordPress plugin, gain access to:
- **Save Projects** - Store chatbots in the WordPress database
- **Share Projects** - Generate shareable links
- **Publish Projects** - Make chatbots public and embeddable
- **User Accounts** - Save and manage multiple projects

#### 2. **Standalone Mode** (GitHub Pages)
Deploy independently without WordPress:
- **Import Projects** - Load chatbot JSON files
- **Export Projects** - Download chatbot configurations
- **Self-hosted** - Run on GitHub Pages or your own server
- **No backend required** - Fully client-side operation

---

## Use Cases

- **Interactive Learning Modules** - Create pedagogical chatbots for education
- **Customer Support** - Build FAQ and troubleshooting chatbots
- **Language Learning** - Interactive language practice conversations

---

## Architecture

### Project Structure
```
src/
├── editor/              # Visual chatbot editor application
│   ├── components/      # Vue components (canvas, panels, modals)
│   ├── utils/          # Project management & local storage
│   ├── auth.ts         # WordPress authentication
│   └── main-editor.ts  # Editor entry point
├── runtime/            # Chatbot execution engine
│   ├── engine/         # Core runtime logic (useChatRuntime)
│   └── main-runtime.ts # Runtime entry point
├── shared/             # Shared code
│   ├── types/          # TypeScript interfaces
│   └── utils/          # Helper utilities
└── styles/             # Global styles
```

### Technology Stack
- **Frontend Framework:** Vue 3
- **Language:** TypeScript
- **Build Tool:** Vite
- **Canvas Library:** leader-line-new (for visual connections)
- **Testing:** Vitest
- **Styling:** CSS (no frameworks)

### Data Model

#### Block Types & Structure
Each block contains:
- **id** - Unique identifier
- **type** - Block category (message, question, condition, etc.)
- **position** - Canvas coordinates {x, y}
- **content** - Main text/prompt
- **choices** - Options (for multiple choice)
- **conditions** - Logic rules (for conditional blocks)
- **variableName/Value** - For variable operations
- **nextBlockId** - Forward reference to next block

#### Variables
Store conversation data:
```typescript
{
  name: string;        // Variable identifier
  type: "string" | "number";
  value: string | number | null;
}
```

#### Connections
Visual links between blocks:
```typescript
{
  id: string;
  fromBlockId: string;      // Source block
  fromOutputId?: string;    // Specific output (choice/condition)
  toBlockId: string;        // Target block
  waypoints?: Array<{x, y}>;
}
```

---

## Getting Started

### For End Users

#### Option 1: Web Browser
1. Visit the editor: [https://clictltl.github.io/chatbot/](https://clictltl.github.io/chatbot/)
2. Create your chatbot flow visually
3. Preview in real-time
4. Export as JSON (standalone) or publish (WordPress)

#### Option 2: WordPress Plugin
1. Install the CLIC Chatbot WordPress plugin
2. Access the editor from your WordPress dashboard
3. All projects automatically saved to the database
4. Publish directly to your site

### For Developers

See **[DEVELOPERS.md](./DEVELOPERS.md)** for:
- Local installation & setup
- Development server
- Building for production
- Running tests
- Deployment guides

---

## Documentation

### Editor Concepts

#### Blocks
The fundamental building block of a chatbot. Each block represents a step in the conversation flow.

**Block Types:**
- **Start** - Required entry point, connects to the first conversational block
- **Message** - Displays a bot message; proceeds to next block automatically
- **Open Question** - Asks a free-text question; stores response in a variable
- **Multiple Choice** - Shows buttons with options; each option leads to a different block
- **Conditional** - Evaluates variable conditions; branches to different blocks
- **Set Variable** - Assigns a value to a variable without user interaction
- **Math** - Performs arithmetic operations on numeric variables
- **Image** - Displays an image from URL or upload
- **End** - Terminates the conversation

#### Connections
Visual lines connecting blocks. Each connection defines the flow from one block to another. Multiple connections can originate from choice options and condition branches.

#### Variables
Data storage throughout the conversation. Accessible in:
- Conditional logic (if userName == "John")
- Message templates (Hello {{userName}}!)
- Math operations (age * 2)

---

## Example: Simple Welcome Bot

1. **Start Block** → "Welcome!" message
2. **Message Block** → "What's your name?"
3. **Open Question Block** → Stores input in `userName` variable
4. **Message Block** → "Nice to meet you, {{userName}}!"
5. **End Block** → Closes conversation

---

## Integration with WordPress

When using the CLIC WordPress plugin:

### REST API Endpoints

**Authentication:** All endpoints require WordPress nonce header

```
GET    /wp-json/clic-chatbot/v1/me              # Check logged-in user
GET    /wp-json/clic-chatbot/v1/list            # List user's projects
GET    /wp-json/clic-chatbot/v1/load/{id}       # Load project by ID
POST   /wp-json/clic-chatbot/v1/save            # Create/update project
DELETE /wp-json/clic-chatbot/v1/delete/{id}     # Delete project
POST   /wp-json/clic-chatbot/v1/share           # Generate share link
POST   /wp-json/clic-chatbot/v1/publish         # Publish chatbot
GET    /wp-json/clic-chatbot/v1/publish/{token} # Load published chatbot
```

### Project Data Format

```typescript
{
  blocks: Block[];
  connections: Connection[];
  variables: Record<string, Variable>;
}
```

---

## Testing

The runtime engine includes comprehensive unit tests:

```bash
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
```

**Test Coverage:**
- Block type handling (message, question, condition, etc.)
- Variable interpolation and math operations
- Conditional logic evaluation
- Image rendering
- Chat flow execution

---

## Build & Deployment

### Development Mode
```bash
npm run dev
```
Runs on `http://localhost:5173`

### Production Build
```bash
npm run build:wordpress    # For WordPress deployment
npm run build:github       # For GitHub Pages
npm run deploy             # Build + deploy to GitHub Pages
```

### Deployment Options

**GitHub Pages:** See [DEPLOY.md](./DEPLOY.md) for automated GitHub Actions setup

**WordPress:** 
1. Install the CLIC WordPress plugin
2. Build with `npm run build:wordpress`
3. Upload built files to the plugin assets directory

---

## Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Contributing

We welcome contributions! Areas of interest:
- New block types
- Enhanced visual editor features
- Performance optimizations
- Internationalization (i18n)
- Additional test coverage
- Documentation improvements

---

## License

This project is part of the CLIC initiative. See LICENSE file for details.

---

## Resources

- **CLIC Project:** [https://clic.tltlab.org](https://clic.tltlab.org)
- **GitHub Repository:** [https://github.com/clictltl/chatbot](https://github.com/clictltl/chatbot)
- **Developer Guide:** [DEVELOPERS.md](./DEVELOPERS.md)
- **Deployment Guide:** [DEPLOY.md](./DEPLOY.md)

---

## FAQ

**Q: Can I use this without WordPress?**
A: Yes! Export/import chatbots as JSON files or deploy to GitHub Pages in standalone mode.

**Q: What happens to my chatbots if the service goes down?**
A: Export your chatbots regularly as JSON backups. Standalone mode requires no external services.

**Q: Can I customize the chatbot appearance?**
A: The runtime provides a responsive widget with CSS customization support.

**Q: What are the limitations?**
A: Currently supports text, images, and basic logic. No external API integrations yet.

**Q: How many variables can I have?**
A: No hard limit, but performance may degrade with 100+ variables. Keep your data structure simple.

---

**Made with love by the CLIC Team**
