# Changelog

All notable changes to this project will be documented in this file.

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