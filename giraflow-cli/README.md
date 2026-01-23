# Giraflow CLI

CLI tool for visualizing and analyzing Information Flow models (`.giraflow.json`).

## Installation

```bash
npm install -g giraflow-cli
```

## Usage

### Visualize an existing model

```bash
giraflow-cli <file> [options]
```

#### Options

| Option | Description |
|--------|-------------|
| `-v, --view <mode>` | `timeline`, `slice`, or `table` |
| `-e, --example` | Show example data |
| `-s, --schema <path>` | Validate against JSON schema |
| `--validate` | Validate against bundled schema |
| `-o, --output <file>` | Export to file |

#### Examples

```bash
# Interactive mode (prompts for view)
giraflow-cli model.giraflow.json

# Slice view with scenarios
giraflow-cli model.giraflow.json -v slice

# Timeline with example data
giraflow-cli model.giraflow.json -v timeline -e

# Table view for documentation
giraflow-cli model.giraflow.json -v table
```

### Create a new model

```bash
giraflow-cli create [output-file]
```

Starts an interactive wizard that guides you through building a `.giraflow.json` model step by step.

#### Workflow

1. **Model metadata** — Name (required) and description (optional)
2. **Element loop** — Repeat until done:
   - Choose element type: Event, State View, Actor, or Command
   - Enter a name
   - Fill in type-specific fields (all optional, press Enter to skip):

     | Type | Optional fields |
     |------|----------------|
     | Event | `producedBy` (command name), `externalSource` |
     | State View | `sourcedFrom` (comma-separated event names) |
     | Actor | `readsView` (defaults to last state), `sendsCommand` |
     | Command | — |

   - Add example data (choose one):
     - **None** — skip
     - **Free text** — stored as a string value
     - **Key-Value pairs** — interactive loop, stored as a JSON object
   - Confirm whether to add another element
3. **Save** — writes the model as JSON with 2-space indentation

#### Examples

```bash
# Specify output file directly
giraflow-cli create my-model.giraflow.json

# Let the wizard ask for the filename (defaults to <name>.giraflow.json)
giraflow-cli create
```

## Views

### Timeline

Chronological flow with symbols (●Event ◆State ▶Command ○Actor). Use `-e` to include example data.

![Timeline View](https://raw.githubusercontent.com/SBortz/giraflow/main/docs/images/timeline-view.png)

With example data (`-e`):

![Timeline View with Data](https://raw.githubusercontent.com/SBortz/giraflow/main/docs/images/timeline-view-with-data.png)

### Slice

Detailed panels with JSON examples and Given-When-Then scenarios.

![Slice View](https://raw.githubusercontent.com/SBortz/giraflow/main/docs/images/slice-view.png)

### Table

Tabular overview per element type with data flow tree.

![Table View](https://raw.githubusercontent.com/SBortz/giraflow/main/docs/images/table-view.png)

## See Also

[**giraflow**](https://www.npmjs.com/package/giraflow) — Live preview server with hot reload for viewing models in the browser.

## Links

- [GitHub](https://github.com/SBortz/giraflow)
- [JSON Schema](https://github.com/SBortz/giraflow/blob/main/information-flow.schema.json)
- [Examples](https://github.com/SBortz/giraflow/tree/main/example-giraflows)
