# Giraflow

Live preview server for `.giraflow.json` models — edit your model file and see changes instantly in the browser.

![Timeline View](https://raw.githubusercontent.com/SBortz/giraflow/main/docs/images/web-timeline.png)

## Installation

```bash
npm install -g giraflow
```

## Quick Start

```bash
giraflow my-model.giraflow.json
```

This starts a local server and opens your browser. Any changes you save to the file are reflected immediately via hot reload.

## Options

| Option | Description |
|--------|-------------|
| `-p, --port <port>` | Port to run server on (default: 3000) |
| `--no-open` | Don't open browser automatically |
| `-h, --help` | Show help |

```bash
# Custom port
giraflow model.giraflow.json --port 8080

# Without auto-opening the browser
giraflow model.giraflow.json --no-open
```

## Views

Switch between views using the navigation bar in the browser.

### Timeline

Chronological flow of events, state views, commands, and actors with colored symbols and example data.

![Timeline View](https://raw.githubusercontent.com/SBortz/giraflow/main/docs/images/web-timeline.png)

### Slices

Each element as an expandable card with JSON examples and Given-When-Then scenarios.

![Slice View](https://raw.githubusercontent.com/SBortz/giraflow/main/docs/images/web-slices.png)

Expanded:

![Slice Expanded](https://raw.githubusercontent.com/SBortz/giraflow/main/docs/images/web-slice-expanded.png)

### Table

Consolidated tabular overview of all elements grouped by type.

![Table View](https://raw.githubusercontent.com/SBortz/giraflow/main/docs/images/web-consolidated.png)

## Creating Models

To create a new `.giraflow.json` file from scratch, use the interactive wizard provided by the companion CLI tool:

```bash
npm install -g giraflow-cli
giraflow-cli create my-model.giraflow.json
```

The wizard guides you through adding events, state views, actors, and commands step by step. See the [giraflow-cli README](../giraflow-cli/README.md) for details.

The CLI also offers terminal-based views (`timeline`, `slice`, `table`) and schema validation — useful for CI pipelines or when you prefer staying in the terminal.

## File Format

Models are JSON files following the [Giraflow JSON Schema](https://github.com/SBortz/giraflow/blob/main/information-flow.schema.json). A minimal example:

```json
{
  "name": "My Model",
  "timeline": [
    { "type": "event", "name": "OrderPlaced", "tick": 10 },
    { "type": "state", "name": "OrdersSV", "tick": 20, "sourcedFrom": ["OrderPlaced"] },
    { "type": "actor", "name": "WarehouseWorker", "tick": 30, "readsView": "OrdersSV", "sendsCommand": "ShipOrder" },
    { "type": "command", "name": "ShipOrder", "tick": 40 }
  ]
}
```

See more in the [examples directory](https://github.com/SBortz/giraflow/tree/main/example-giraflows).

## Links

- [GitHub](https://github.com/SBortz/giraflow)
- [JSON Schema](https://github.com/SBortz/giraflow/blob/main/information-flow.schema.json)
- [Examples](https://github.com/SBortz/giraflow/tree/main/example-giraflows)
- [giraflow-cli](https://www.npmjs.com/package/giraflow-cli) — Terminal views, schema validation, and interactive model creation
