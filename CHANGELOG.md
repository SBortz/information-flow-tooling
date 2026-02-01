# Changelog

All notable changes to this project will be documented in this file.

## [0.4.0] - 2025-02-01

### Added

- **Public Website Mode**: Giraflow can now be hosted as a public website for sharing models without requiring local installation. Run with `npm run dev:public` or deploy the built public version.
- **JSON Editor**: Integrated JSON editor for editing the model directly in the browser. In local mode, changes can be saved to the file. In public mode, changes are session-only.
- **Editable Wireframes**: Wireframe HTML files can now be edited directly in the browser with a code editor. In local mode, changes are persisted to disk. In public mode, changes are session-only.
- **Create New Wireframes**: When adding a new wireframe path in the JSON that doesn't exist yet, a default template is automatically shown. In local mode, clicking "Create" saves the new file to disk.
- **Save Model to File**: The JSON editor now includes a "Save" button (local mode only) to persist changes directly to the `.giraflow.json` file.
- **Image Support in Wireframes**: Wireframe viewers now support image files (PNG, JPG, GIF, SVG, WebP) in addition to HTML files.
- **Extended Shopping example**: Generated wireframes for the shopping example.
- **How-to Guide**: Added a how-to guide for how to use the giraflow tool in general.

### Changed

- **Removed `externalSource` field from schema**: This field is no longer necessary as the `system` field now handles external system references.

## [0.3.7] - 2025-01-30

### Changed

- **Reworked AI instructions**: Fine-tuning of ai instructions
- **Coloring pictures example**: Put in a download image flow into the example
- **Status field in model**: Added a status field to the schema for the AI to put implementation status into it.

## [0.3.6] - 2025-01-29

- **Slices file generation**: To help AI understand the model, the application generates a slices.json file in the assets.
- ** Actor reads multiple state views**: The model didn't support actors reading multiple state views. This is now possible.
- **Default Port**: Is now 4321

## [0.3.5] - 2025-01-29

- **Support for multiple lanes**: Event Models should be able to support multiple lanes in order to work with multiple systems / actors in different roles. This is now possible.

## [0.3.2] - 2025-01-29

- **Timeline view is default**: Made timeline view the central view.


## [0.3.1] - 2025-01-29

- **Data Model**: Generate data model from giraflow files instead of directly building it inside the views.
- **Stylings**: Little styling tweaks.

## [0.3.0] - 2025-01-29

### Changed

- **Timeline Master-Detail Layout**: The timeline view has been redesigned with a master-detail layout. A compact timeline on the left shows all ticks with visual lane positioning, while the right pane displays full details for each element.
- **Scroll-synchronized highlighting**: Scrolling through the detail pane automatically highlights the corresponding item in the master timeline.
- **Deep linking**: Each timeline tick has a unique URL, enabling direct navigation and browser history support.

### Fixed

- **Scroll highlighting reliability**: Replaced IntersectionObserver with scroll event listener to prevent ticks from being skipped during fast scrolling.

## [0.2.6] - 2025-01-29

### Added

- **Wireframe support for Actors**: Actor entries can now include a `wireframes` array referencing HTML files in the `.giraflow` folder. Wireframes are displayed as interactive previews in the timeline view.
- **Code/Preview toggle**: Wireframe viewer includes a toggle switch to view either the rendered preview or the HTML source code with syntax highlighting.
- **Wireframe live reload**: Changes to wireframe files trigger an automatic iframe refresh without reloading the entire page.
- **Local wired-elements bundle**: The wired-elements library is now bundled locally (`/lib/wired-elements.js`) for faster loading and offline support.

### Changed

- **Wireframe naming convention**: Wireframe files should follow the pattern `user-<tick>.html` for consistency.

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