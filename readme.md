<p align="center">
  <img src="docs/images/Gira.png" alt="Giraflow Logo" width="300">
</p>

<h1 align="center">Giraflow</h1>

<p align="center">
  <strong>A human-readable JSON format for Event Modeling with live visualization</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/giraflow"><img src="https://img.shields.io/npm/v/giraflow?color=orange&label=npm" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://giraflow.vercel.app"><img src="https://img.shields.io/badge/demo-live-brightgreen.svg" alt="Live Demo"></a>
</p>

<p align="center">
  <a href="https://giraflow.vercel.app">Live Demo</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-format-specification">Format Spec</a> •
  <a href="#-features">Features</a>
</p>

---

<p align="center">
  <img src="docs/images/web-timeline.png" alt="Giraflow Timeline View" width="800">
</p>

## 🎯 What is Giraflow?

Giraflow is a **JSON-based format** for describing event-driven systems using [Event Modeling](https://eventmodeling.org/) methodology. It comes with a **live-reloading web preview** that visualizes your models instantly.

### The Problem

- 🔒 Proprietary tools lock your designs into their platforms
- 📊 Visual-only formats can't be version controlled meaningfully
- 🤝 Collaboration on system design requires expensive tooling

### The Solution

A simple, **human-readable JSON format** that:

- ✅ Lives in Git alongside your code
- ✅ Is easy to read and manually edit
- ✅ Follows the natural flow of Event Modeling
- ✅ Supports tooling while remaining tool-agnostic

## 🚀 Quick Start

### Try the Live Demo

Visit **[giraflow.vercel.app](https://giraflow.vercel.app)** to explore Giraflow without installation.

### Local Development

```bash
# Clone the repository
git clone https://github.com/SBortz/giraflow.git
cd giraflow/giraflow

# Install dependencies
npm install

# Start the dev server with an example model
npm run dev -- ../example-giraflows/shopping.giraflow.json
```

Open `http://localhost:3000` – the browser auto-refreshes when you edit the file!

### Using the npm Package

```bash
# Install globally
npm install -g giraflow

# Start the preview server
giraflow your-model.giraflow.json
```

## 📝 Format Specification

A Giraflow model is a JSON file describing the **timeline** of an event-driven system.

### Minimal Example

```json
{
  "$schema": "https://raw.githubusercontent.com/SBortz/giraflow/main/giraflow.schema.json",
  "name": "Simple Order Flow",
  "description": "Minimal example: Event → State → Actor → Command → Event",
  "version": "1.0.0",
  "timeline": [
    {
      "type": "event",
      "name": "OrderPlaced",
      "tick": 10,
      "example": { "orderId": "ord-123", "amount": 99.99 }
    },
    {
      "type": "state",
      "name": "PendingOrders",
      "tick": 20,
      "sourcedFrom": ["OrderPlaced", "OrderShipped"]
    },
    {
      "type": "actor",
      "name": "WarehouseWorker",
      "tick": 30,
      "readsView": "PendingOrders",
      "sendsCommand": "ShipOrder"
    },
    {
      "type": "command",
      "name": "ShipOrder",
      "tick": 40
    },
    {
      "type": "event",
      "name": "OrderShipped",
      "tick": 50,
      "producedBy": "ShipOrder-40"
    }
  ]
}
```

### Timeline Elements

| Type | Symbol | Naming Convention | Description |
|------|:------:|-------------------|-------------|
| `event` | ● | Past tense (`OrderShipped`) | Something that happened |
| `state` | ◆ | Noun (`PendingOrders`) | Read model built from events |
| `actor` | ○ | Role (`WarehouseWorker`) | Who reads views and sends commands |
| `command` | ▶ | Imperative (`ShipOrder`) | Intent to do something |

### The `tick` Property

The `tick` determines position on the timeline. Elements display in ascending order, allowing you to insert new elements between existing ones.

## ✨ Features

### 🌐 Web Preview

<table>
<tr>
<td width="50%">

**Timeline View**

Swimlane-style visualization with color-coded symbols. Events, Commands, State Views, and Actors arranged chronologically.

</td>
<td width="50%">

<img src="docs/images/web-timeline.png" alt="Timeline View" width="400">

</td>
</tr>
<tr>
<td>

**Info View**

Consolidated overview showing all element types with their relationships in structured tables.

</td>
<td>

<img src="docs/images/web-consolidated.png" alt="Info View" width="400">

</td>
</tr>
<tr>
<td>

**Slices & Scenarios**

Expandable cards for Commands and State Views with Given-When-Then scenarios.

</td>
<td>

<img src="docs/images/web-slices.png" alt="Slices View" width="400">

</td>
</tr>
</table>

### 🔥 Live Reload

Edit your `.giraflow.json` file and see changes instantly in the browser – no manual refresh needed.

### 📋 JSON Schema Validation

Full JSON Schema support for IDE autocompletion and validation:

```json
{
  "$schema": "https://raw.githubusercontent.com/SBortz/giraflow/main/giraflow.schema.json"
}
```

### 📦 Export Options

Export your models to various formats (draw.io export coming soon).

## 📁 Example Models

The `example-giraflows/` folder contains ready-to-use examples:

| Model | Description |
|-------|-------------|
| `shopping.giraflow.json` | Shopping cart with inventory management |
| `simple-todo-app.giraflow.json` | Basic todo application |
| `habit-tracker.giraflow.json` | Habit tracking system |
| `coloring-wishlist.giraflow.json` | Wishlist management |

## 🧠 Design Philosophy

1. **Event Modeling is a continuous process**  
   The format allows incomplete, work-in-progress models.

2. **Validation belongs in tools, not the format**  
   The file specification stays simple. Applications validate.

3. **No slices in the file**  
   Slices are project management concerns – they can be derived from the model.

4. **Human-readable above all**  
   Files should be readable and editable with any text editor.

## 🛠️ Development

```bash
cd giraflow

# Development with hot reload
npm run dev -- ../example-giraflows/shopping.giraflow.json

# Build for production
npm run build

# Start production server
npm start ../example-giraflows/shopping.giraflow.json
```

## 📄 License

[MIT](LICENSE) © Sebastian Bortz

---

<p align="center">
  <sub>Built with ❤️ for the Event Modeling community</sub>
</p>
