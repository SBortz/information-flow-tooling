# Giraflow Application Design Methodology

## Purpose

A reusable, AI-assisted workflow for designing new applications using the giraflow format. This methodology guides you from idea to complete event model.

---

## Phase 1: Coarse-Grained Timeline

**Goal:** Define the main flow of what happens in the system, step by step.

### Prompt Template

```
I want to design a [APPLICATION TYPE] for [PURPOSE].

The main user journey is:
1. [First thing that happens]
2. [Second thing that happens]
3. ...

Help me create the coarse-grained timeline with:
- Events (things that happened - past tense: OrderPlaced, UserRegistered)
- State Views (read models - nouns: PendingOrders, UserProfile)
- Actors (who does things - roles: Customer, Admin, System)
- Commands (intent to act - imperative: PlaceOrder, RegisterUser)

Use tick values spaced by 10 (10, 20, 30...) for future insertions.
```

### Output Format

```json
{
  "name": "[Application Name]",
  "timeline": [
    { "type": "event", "name": "...", "tick": 10 },
    { "type": "state", "name": "...", "tick": 20, "sourcedFrom": ["..."] },
    { "type": "actor", "name": "...", "tick": 30, "readsView": "...", "sendsCommand": "..." },
    { "type": "command", "name": "...", "tick": 40 }
  ]
}
```

### Key Patterns to Follow

1. **Information Flow:** Event → State View → Actor → Command → Event
2. **Naming:**
   - Events: Past tense (CartCreated, ItemAdded)
   - States: Nouns (CartItemsStateView, PendingOrders)
   - Actors: Roles (Customer, WarehouseWorker)
   - Commands: Imperative (AddItem, ShipOrder)

3. **Relationships:**
   - State views `sourcedFrom` events they subscribe to
   - Actors `readsView` and `sendsCommand`
   - Events can have `producedBy: "CommandName-Tick"`

---

## Phase 2: Wireframes

**Goal:** Visualize what each actor sees and interacts with.

### Prompt Template

```
For each actor in the timeline, let's create a simple wireframe.

The actor reads [STATE VIEW] and sends [COMMAND].

Create an HTML wireframe showing:
- What information from the state view is displayed
- What inputs/actions trigger the command
- Keep it simple - use wired-elements for sketch-style UI

Save as [actor]-[tick].html
```

### Output Format

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module" src="/lib/wired-elements.js"></script>
</head>
<body>
  <wired-card>
    <h2>[Screen Title]</h2>
    <!-- Display data from state view -->
    <!-- Input controls for command -->
    <wired-button>[Action]</wired-button>
  </wired-card>
</body>
</html>
```

### Reference in Timeline

```json
{
  "type": "actor",
  "name": "Customer",
  "tick": 30,
  "readsView": "CartItems",
  "sendsCommand": "Checkout",
  "wireframes": ["customer-30.html"]
}
```

---

## Phase 3: Data Examples

**Goal:** Add concrete example payloads to events, commands, and state views.

### Prompt Template

```
Now let's add example data to make the model concrete.

For each element, provide realistic example payloads:
- Events: What data does this event carry?
- Commands: What input does this command receive?
- State Views: What does the read model look like after projection?

Use realistic but simple data (e.g., "ord-123", "user-456").
```

### Output Format

```json
{
  "type": "event",
  "name": "OrderPlaced",
  "tick": 10,
  "example": {
    "orderId": "ord-123",
    "customerId": "cust-456",
    "items": [{ "productId": "prod-789", "quantity": 2 }],
    "total": 59.98
  }
}
```

---

## Future Phases (Extensible)

### Phase 4: Scenarios & Specifications
- Define Given-When-Then scenarios for commands
- Define Given-Then scenarios for state projections
- Cover success paths and error cases

### Phase 5: External Integrations
- Identify external event sources
- Add `externalSource` to events from other systems

### Phase 6: Attachments & Notes
- Add notes for business rules
- Add links to related documentation

---

## Quick Reference: Element Types

| Type | Symbol | Naming | Required Properties | Optional Properties |
|------|--------|--------|---------------------|---------------------|
| Event | ● | Past tense | name, tick | producedBy, externalSource, system, example |
| State | ◆ | Noun | name, tick, sourcedFrom | example, attachments |
| Actor | ○ | Role | name, tick, readsView, sendsCommand | wireframes, role |
| Command | ▶ | Imperative | name, tick | example, attachments |

### Swimlane Grouping

Events and actors can be grouped into swimlanes for visual organization:

- **Events:** Use `system` to group events by bounded context (e.g., "Inventory", "Shipping")
- **Actors:** Use `role` to group actors by category (e.g., "Customer", "Admin", "System")

**Layout:**
```
[System B][System A][Default] | [Commands/States] | [Default][Role A][Role B]
         ↑ alphabetical       ↑ center lane        ↑ innermost ↑ alphabetical
```

**Example:**
```json
{
  "type": "event",
  "name": "ItemShipped",
  "tick": 50,
  "system": "Shipping"
}

{
  "type": "actor",
  "name": "WarehouseWorker",
  "tick": 40,
  "readsView": "PendingShipments",
  "sendsCommand": "ShipItem",
  "role": "Operations"
}
```

---

## Verification

After completing the design:
1. Save as `[name].giraflow.json`
2. Run `giraflow [filename]` to visualize
3. Check Timeline view for correct flow
4. Check Slices view for element details
5. Verify relationships are correct
