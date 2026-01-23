<img src="docs/images/Gira.png" alt="Giraflow" width="300">

# Giraflow


A human-readable JSON format for describing event-driven systems using [Event Modeling](https://eventmodeling.org/) methodology – with a live-reloading web preview and a terminal CLI to visualize and analyze models.

![Timeline View](docs/images/web-timeline.png)

---

## 1. Why

Modeling information flows is a powerful methodology for designing software systems. But where do you store the model? 

**The Problem:**
- Proprietary tools lock your designs into their platforms
- Visual-only formats can't be version controlled meaningfully

**The Solution:**
A simple, human-readable JSON format that:
-  Can be checked into Git alongside your code
-  Is easy to read and manually edit
-  Follows the natural flow of Information Flow (Timeline → Events → Views → Commands)
-  Supports tooling while remaining tool-agnostic

---

## 2. Philosophy

- **Information Flow is a continuous process.**  
  The format must allow incomplete systems to be saved. Since the methodology helps to develop the system design, the format itself should allow work-in-progress models that might be invalid in the beginning.

- **Validation belongs in tools, not the format.**  
  The file specification stays simple. Applications derive insights and validates.

- **No Slices in the file.**  
  Slices are implementation/project management concerns. They belong in a separate view, not the design file. They can also easily be derived from the model if necessary.

- **Human-readable above all.**  
  The file should be human readable and be able to correct manually with a text editor if necessary. Therefore this file format keeps a clean flow of what happens sequentially in the system.

- **GWTs are separate.**  
  Given-When-Then scenarios are alternative timelines. They don't belong on the main timeline.

---

## 3. Simple Example

A minimal information flow model showing the core flow: **Event → StateView → Actor → Command → Event**

```json
{
  "$schema": "./information-flow.schema.json",
  "name": "Simple Order Flow",
  "description": "Minimal example showing the core cycle: Event → State → Actor → Command → Event",
  "version": "1.0.0",
  "timeline": [
    {
      "type": "event",
      "name": "OrderPlaced",
      "tick": 10,
      "example": { "orderId": "ord-123", "customerId": "cust-456", "amount": 99.99 }
    },
    {
      "type": "state",
      "name": "PendingOrders",
      "tick": 20,
      "sourcedFrom": ["OrderPlaced", "OrderShipped"],
      "example": {
        "orders": [{ "orderId": "ord-123", "status": "pending", "amount": 99.99 }]
      }
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
      "tick": 40,
      "example": { "orderId": "ord-123", "trackingNumber": "DHL-789", "carrier": "DHL" }
    },
    {
      "type": "event",
      "name": "OrderShipped",
      "tick": 50,
      "producedBy": "ShipOrder-40",
      "example": { "orderId": "ord-123", "trackingNumber": "DHL-789", "shippedAt": "2024-01-15T14:30:00Z" }
    }
  ]
}
```

### Timeline Elements

| Type | Symbol | Naming | Description |
|------|--------|--------|-------------|
| `event` | ● | Past tense (`OrderShipped`) | Something that happened |
| `state` | ◆ | Noun (`PendingOrders`) | Read model built from events |
| `actor` | ○ | Role (`WarehouseWorker`) | Who reads views and sends commands |
| `command` | ▶ | Imperative (`ShipOrder`) | Intent to do something |

### The `tick` Property

The `tick` determines position on the timeline. Elements display in ascending order. Gaps between ticks create visual spacing in the output.

### Example Files

See the `example-giraflows/` folder for example models:
- `order-system.giraflow.json` - E-commerce order flow with scenarios
- `shopping.giraflow.json` - Shopping cart with inventory and archiving
- `todo-app.giraflow.json` - Simple todo application
- `library-management.giraflow.json` - Library with loans, reservations, reminders

---

## 4. Challenges

There are still some challenges to be solved. I will write more about them soon.

- **Duplicate definitions** - How to handle elements that appear multiple times with diverging details? The current approach is to simply keep duplication.
- **Given-When-Then scenarios** - GWTs add significant complexity and reduce readability. Options:
  - Keep them as separate scenario files?
  - Add a dedicated section for variations at the end of the model?
- **Model validation** - Detecting errors and inconsistencies in the model.
- **AI-powered implementation** - Generate application code from the model file.



---

## 5. Giraflow Web

A lightweight dev server that watches `.giraflow.json` files and provides a live-updating browser preview.

### Features

- **Live Reload** – Browser refreshes automatically on file changes
- **Three Views** – Info, Timeline, Slices & Scenarios
- **Expand All** – Toggle to show/hide JSON data and details
- **Scenario Display** – Given-When-Then scenarios for Commands and State Views

### Quick Start

```bash
cd giraflow
npm install
npm run build
npm start ../example-giraflows/shopping.giraflow.json
```

The browser opens at `http://localhost:3000`.

### Views

#### Info

Consolidated overview showing model name, description, and tables for all element types (Events, State Views, Commands, Actors) with their relationships.

![Info View](docs/images/web-consolidated.png)

#### Timeline

Swimlane-style timeline with color-coded symbols. Events, Commands, State Views, and Actors are arranged chronologically along a vertical axis.

![Timeline View](docs/images/web-timeline.png)

#### Slices & Scenarios

Expandable cards for Commands and State Views. Each card shows JSON examples, relationships (sourced from, read by), and Given-When-Then scenarios when expanded.

![Slices & Scenarios](docs/images/web-slices.png)

![Expanded Slice with Scenario](docs/images/web-slice-expanded.png)

---

## 6. Giraflow CLI

The **Giraflow CLI** (`giraflow-cli`) is a Node.js/TypeScript CLI tool to visualize `.giraflow.json` files in the terminal. Requires Node.js 18+.

### Installation

```bash
cd giraflow-cli
npm install
npm run build
```

### Usage

```bash
node dist/index.js <file> [options]
```

Or link globally:
```bash
npm link
giraflow-cli <file> [options]
```

### Examples

```bash
# Interactive mode - prompts for view selection
node dist/index.js model.giraflow.json

# Timeline view with example data
node dist/index.js model.giraflow.json -v timeline -e

# Table view for documentation
node dist/index.js model.giraflow.json -v table

# Validate against schema first
node dist/index.js model.giraflow.json -s information-flow.schema.json -v slice

# Export to file
node dist/index.js model.giraflow.json -v timeline -e -o output.txt
```

### Options

| Option | Description |
|--------|-------------|
| `-v, --view <mode>` | Display mode (see below) |
| `-e, --example` | Show example data in output |
| `-o, --output <file>` | Export output to a text file (without header) |
| `-s, --schema <path>` | Validate against JSON schema first |
| `-h, --help` | Show help |

### View Modes

| Mode | Best For | Description |
|------|----------|-------------|
| `timeline` | Quick overview | Vertical chronological view with symbols |
| `slice` | Detailed analysis | Panels with JSON examples and relationships |
| `table` | Documentation | Tables per type with data flow tree |

### Output Example (Timeline)

```
    ●  │       @10  OrderPlaced
       │            {
       │              "orderId": "ord-123",
       │              "customerId": "cust-456"
       │            }
       │
       ◆       @20  PendingOrders
       │            sourcedFrom: OrderPlaced, OrderShipped
       │
       │  ○    @30  WarehouseWorker
       │            readsView: PendingOrders
       │            sendsCommand: ShipOrder
       │
       ▶       @40  ShipOrder
       │
    ●  │       @50  OrderShipped
       │            producedBy: ShipOrder-40
```

### Screenshots

**Timeline View**

![Timeline View](docs/images/timeline-view.png)

**Timeline View with Example Data**

![Timeline View with Data](docs/images/timeline-view-with-data.png)

**Slice View**

![Slice View](docs/images/slice-view.png)

**Table View**

![Table View](docs/images/table-view.png)

