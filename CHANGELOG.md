# Changelog

All notable changes to this project will be documented in this file.

## [0.2.5] - 2025-01-29

- **Fixed navigation**: Back- and forth navigation was broken. It's fixed with this minor update.

## [0.2.4] - 2025-01-29

### Changed

- **Reworked Info Page**: Events, State Views, Commands, and Actors are now deduplicated with occurrence counts. Each item displays clickable tick chips (`@1`, `@5`, etc.) that navigate directly to that position in the timeline.
- **Master-Detail Slices View**: The Slices & Scenarios view has been rebuilt as a master-detail layout for better navigation between slices.
- **Scenario Timeline**: Scenarios now display a visual timeline showing the sequence of events, commands, and state changes.
- **Example Data in Slices**: Slices now show example data for states and commands.
- **URL-based Navigation**: Tabs now update the URL hash, enabling browser back/forward navigation and deep links to specific timeline positions.
- **Timeline Styling**: Improved visual positioning of timeline points.

## [0.2.3] - 2025-01-27


### Breaking Changes
- **Moved cli functionality to giraflow live preview**: Instead of maintaining 2 different tools, the giraflow command was equipped with the cli functionality. The giraflow-cli package was removed from the project.
- **copy-schema**: With the copy-schema command you can copy the schema to the directory you're in currently.


## [0.2.2] - 2025-01-27

### Breaking Changes

- **Changed scenario data model completely**: The previous model didn't support scenarios like they are live with Event Modeling. Given-Then for States might show a state for every new event. Command-based scenarios might involve several executions of a command with different outcomes. That's now possible.
- **Only one Timeline derived scenario**: Previously there was one scenario for every occurrence within the model. This is now merged into one bigger scenario that inherits every occurrence from the timeline with respect to its position on the timeline.

### Added

- **Auto-discovery of giraflow files**: Running `giraflow` without arguments now automatically searches the current directory for `.giraflow.json` files

### Changed

- **Improved scenario visualization**: Labels (Event/Command/State names) are now displayed inside color-coded boxes with a colored left border matching their type (orange for events, blue for commands, green for state)
- **Command execution grouping**: Commands and their produced events are now visually grouped with a dashed neutral border to show they belong together
- **Removed success/failure icons from scenario headers**: Since scenarios can now contain multiple commands with mixed success/failure states, the checkmark/X icon has been removed from scenario titles
- **Updated examples to respect new model**: The FinishTodo scenario now demonstrates multiple commands with events in between, including a failing command.


## [0.1.1] - 2025-01-25

### Breaking Changes

- **Scenarios moved outside timeline**: Specifications with scenarios are now defined in a separate top-level `specifications` array instead of inline within timeline elements. This enables deduplication when the same command or state appears multiple times.

  **Before:**
  ```json
  {
    "timeline": [
      {
        "type": "command",
        "name": "CreateTodo",
        "tick": 3,
        "scenarios": [...]
      }
    ]
  }
  ```

  **After (v0.1.0):**
  ```json
  {
    "timeline": [
      { "type": "command", "name": "CreateTodo", "tick": 3 }
    ],
    "specifications": [
      { "name": "CreateTodo", "type": "command", "scenarios": [...] }
    ]
  }
  ```

### Added

- **Slice View with deduplication**: Commands and states that appear multiple times in the timeline are now shown as a single slice in the slice view with all tick references
- **Auto-generated scenarios**: Each timeline occurrence automatically generates a scenario showing the system state at that point

### Changed

- Improved scenario display: Shows element name instead of generic hints in THEN clauses
- UI refinements in web preview

## [0.0.9] - 2025-01-23

Initial release with basic timeline and scenario support.