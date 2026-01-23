# Information Flow Tooling CLI

CLI tool for visualizing and analyzing Information Flow models (`.informationflow.json`).

## Installation

```bash
npm install -g information-flow-tooling
```

## Usage

```bash
ift <file> [options]
```

### Options

| Option | Description |
|--------|-------------|
| `-v, --view <mode>` | `timeline`, `slice`, or `table` |
| `-e, --example` | Show example data |
| `-s, --schema <path>` | Validate against JSON schema |
| `-o, --output <file>` | Export to file |

### Examples

```bash
# Interactive mode
ift model.informationflow.json

# Slice view with scenarios
ift model.informationflow.json -v slice

# Timeline with example data
ift model.informationflow.json -v timeline -e

# Table view for documentation
ift model.informationflow.json -v table
```

## Views

- **timeline** - Chronological flow with symbols (●Event ◆State ▶Command ○Actor)
- **slice** - Detailed panels with JSON examples and Given-When-Then scenarios
- **table** - Tables per element type with data flow tree

## Links

- [GitHub](https://github.com/SBortz/information-flow-tooling)
- [JSON Schema](https://github.com/SBortz/information-flow-tooling/blob/main/information-flow.schema.json)
- [Examples](https://github.com/SBortz/information-flow-tooling/tree/main/examples)
