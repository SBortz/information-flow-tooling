# Information Flow Live Preview

A lightweight web server that watches `.if` (Information Flow) files and provides an automatically updating HTML preview.

## Features

- **Live Reload**: Browser automatically refreshes on file changes
- **Three Views**: Timeline, Slices & Scenarios, Consolidated
- **Dark Theme**: Modern, eye-friendly design
- **Scenario Display**: Shows Given-When-Then scenarios for Commands and States

## Quick Start

```bash
cd live-preview
npm install
npm run build
npm start ../examples/todo-app.if --open
```

The browser will automatically open at `http://localhost:3000`.

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --port <port>` | Server port | 3000 |
| `-o, --open` | Automatically open browser | false |
| `-h, --help` | Show help | - |

**Examples:**

```bash
# With automatic browser start
npm start ../examples/todo-app.if --open

# On port 8080
npm start model.if --port 8080

# Development mode (no build required)
npm run dev -- ../examples/todo-app.if -o
```

---

## User Guide

### Views

The tool offers three different views that can be switched via the tabs in the header:

#### 1. Timeline (Default)

The Timeline shows the chronological flow of the Information Flow:

```
┌─────────────────────────────────────────────────┐
│  Events         │ Commands/States │  Actors    │
│  (left)         │ (center)        │  (right)   │
└─────────────────────────────────────────────────┘
```

- **Events** (●): Domain Events appear to the left of the line
- **Commands** (◆) & **States** (■): Located on the center line
- **Actors** (○): User interactions appear on the right

**Expand All**: Use the "Expand All" checkbox to show/hide JSON data models and details. This setting is saved in the browser.

#### 2. Slices & Scenarios

Shows each timeline entry as a detailed card with:

- JSON example data
- Relationships to other elements
- **Scenarios** (if defined):
  - Commands: Given-When-Then format
  - States/Read Models: Given-Then format

**Example of a Command scenario:**
```
📋 Successfully create new todo
   Given: TodoList { "todos": [] }
   When:  CreateTodo { "title": "Go shopping" }
   Then:  → TodoCreated { "id": "todo-1", "title": "Go shopping" }
```

**Example of a State scenario:**
```
📋 Completed todo is marked
   Given: TodoCreated { ... }
          TodoCompleted { ... }
   Then:  { "todos": [{ "completed": true }] }
```

#### 3. Consolidated

A compact table view with all elements:

| Tick | Type | Name | Related |
|------|------|------|---------|
| 1 | state | TodoList | TodoCreated, ... |
| 2 | actor | User | reads: TodoList → CreateTodo |

### Live Reload

The tool watches the specified `.if` file. On every change, the browser automatically refreshes – ideal for iterative development of Information Flow models.

---

## Technical Details

### Architecture

```
live-preview/
├── src/
│   ├── index.ts      # CLI entry point
│   ├── server.ts     # HTTP server with SSE
│   ├── watcher.ts    # File watching
│   ├── types.ts      # TypeScript interfaces
│   └── views/
│       ├── render.ts # HTML rendering
│       └── styles.ts # CSS styles
└── package.json
```

### How It Works

1. **File Watcher**: Watches the `.if` file using `fs.watch`
2. **HTTP Server**: Serves the rendered HTML
3. **Server-Sent Events (SSE)**: Sends reload notifications to the browser
4. **Hot Reload**: Browser automatically refreshes on changes

### Development

```bash
# Development mode with tsx (no build required)
npm run dev -- ../examples/todo-app.if -o

# Production build
npm run build
```
