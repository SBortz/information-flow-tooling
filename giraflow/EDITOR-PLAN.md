# Plan: Live-Preview als Editor

## Übersicht

Das Tooling soll vom reinen Viewer zum Editor werden. Der Benutzer kann das Model direkt in der UI bearbeiten, und Änderungen werden in die `.if.json`-Datei zurückgeschrieben.

## Architektur-Entscheidung: Whole-Model-Save

Statt granularer CRUD-Endpoints (add/update/delete für jedes Element einzeln) einen einfachen Ansatz:

- **Ein einziger Write-Endpoint**: `PUT /api/model` — speichert das gesamte Model
- **Client mutiert lokalen State** und sendet bei Änderungen das komplette Model
- **Watcher pausiert** kurz nach eigenem Schreibvorgang, um Self-Trigger zu vermeiden
- **Optimistic Updates**: UI reagiert sofort, Server-Bestätigung im Hintergrund

Vorteile: Einfach, atomar, keine Merge-Konflikte bei gleichzeitigen Feld-Änderungen.

---

## 1. Server: Write-Endpoint

### `PUT /api/model` im Vite-Plugin

```typescript
if (req.method === 'PUT' && req.url === '/api/model') {
  // Body lesen (JSON)
  // Validieren (JSON Schema oder Typ-Check)
  // Watcher kurz pausieren
  // Atomar schreiben (tmp-Datei + rename)
  // In-Memory-Model aktualisieren
  // Watcher wieder starten
  // 200 OK
}
```

### Datei: `src/vite-plugin-if-live.ts`

Änderungen:
- `PUT /api/model` Handler hinzufügen
- Watcher-Pause-Mechanismus (Flag `skipNextChange`)
- Atomares Schreiben: `fs.writeFileSync(tmpPath, ...)` + `fs.renameSync(tmpPath, filePath)`

---

## 2. Model Store: Mutations

### Datei: `src/client/stores/model.svelte.ts`

Neue Methoden:

```typescript
// Model-Metadaten
updateMetadata(name: string, description?: string, version?: string)

// Timeline-Elemente
addElement(element: TimelineElement)
updateElement(tick: number, updated: Partial<TimelineElement>)
removeElement(tick: number)
reorderElement(fromTick: number, toTick: number)

// Scenarios
addScenario(elementTick: number, scenario: CommandScenario | StateViewScenario)
updateScenario(elementTick: number, index: number, scenario: ...)
removeScenario(elementTick: number, index: number)

// Attachments
addAttachment(elementTick: number, attachment: Attachment)
removeAttachment(elementTick: number, index: number)

// Persistence
saveModel()  // PUT /api/model mit aktuellem State
```

### Auto-Save vs. manueller Save

- **Option A**: Debounced Auto-Save (jede Änderung → 500ms Verzögerung → Save)
- **Option B**: Expliziter Save-Button (Ctrl+S / Button in Header)
- **Empfehlung**: Beides — Auto-Save mit visuellem "Unsaved changes"-Indikator

---

## 3. UI: Editierbare Komponenten

### 3a. Info-Tab (TableView) — Model-Metadaten editieren

- Model-Name: Inline-Edit (click to edit)
- Description: Textarea
- Version: Inline-Edit
- Events/States/Commands/Actors-Tabellen: Zeilen klickbar → Edit-Dialog oder Inline

### 3b. Timeline-Tab — Elemente hinzufügen/entfernen

- "Add Element"-Button am Ende (oder zwischen Elementen)
- Typ-Auswahl (Event/State/Command/Actor)
- Inline-Edit für Name, Tick
- Delete-Button pro Element
- Drag-and-Drop für Reihenfolge (Tick-Werte anpassen)

### 3c. Slice-Tab — Scenarios & Details editieren

- Example-JSON: Editierbarer JSON-Editor (Textarea oder strukturiert)
- Scenarios: Add/Edit/Delete
- Given-Events: Add/Remove Event-Referenzen
- When/Then: JSON-Editor
- Attachments: Add/Remove

### 3d. Neue Shared-Komponenten

- `InlineEdit.svelte` — Klick-zum-Editieren Text-Feld
- `JsonEditor.svelte` — Textarea mit JSON-Validierung
- `ElementForm.svelte` — Formular für neues Timeline-Element
- `ScenarioForm.svelte` — Formular für neue Scenarios
- `ConfirmDialog.svelte` — Bestätigung für Löschvorgänge

---

## 4. Watcher-Koordination

### Problem
Wenn der Editor die Datei schreibt, triggered der Watcher ein Reload → überschreibt lokale Änderungen.

### Lösung
```typescript
let skipNextChange = false;

// Beim Schreiben:
skipNextChange = true;
fs.writeFileSync(filePath, content);

// Im Watcher-Callback:
if (skipNextChange) {
  skipNextChange = false;
  return; // Kein Reload
}
```

### Externe Änderungen
Wenn jemand die Datei extern ändert (IDE), wird trotzdem ein Reload getriggered. UI zeigt Notification: "File changed externally. Reload?"

---

## 5. Validierung

### Client-seitig (vor Save)
- Pflichtfelder: name, type, tick für alle Elemente
- Tick-Eindeutigkeit (optional — Warnung)
- Referenz-Integrität: `producedBy` verweist auf existierenden Command, `sourcedFrom` auf Events, etc.
- JSON-Syntax für Example-Felder

### Server-seitig (vor Schreiben)
- JSON-Parse-Check
- Grundlegende Struktur-Validierung

---

## 6. Implementierungs-Reihenfolge (MVP)

### Phase 1: Grundgerüst
1. `PUT /api/model` Endpoint im Vite-Plugin
2. `saveModel()` Methode im Store
3. Watcher-Pause-Mechanismus
4. Save-Button im Header

### Phase 2: Metadaten-Editing
5. Model-Name, Description, Version editierbar im Info-Tab

### Phase 3: Timeline-Editing
6. Add/Remove Timeline-Elemente
7. Inline-Edit für Element-Properties (Name, Tick, Referenzen)

### Phase 4: Scenario-Editing
8. Add/Remove Scenarios
9. Given/When/Then editieren

### Phase 5: Polish
10. Undo/Redo (Command-Pattern)
11. Keyboard-Shortcuts (Ctrl+S, Ctrl+Z)
12. Unsaved-Changes-Indikator
13. Externe-Änderungen-Notification

---

## Dateien die geändert/erstellt werden

**Geändert:**
- `src/vite-plugin-if-live.ts` — PUT Endpoint, Watcher-Pause
- `src/client/stores/model.svelte.ts` — Mutation-Methoden, saveModel
- `src/client/components/Header.svelte` — Save-Button/Status
- `src/client/components/views/TableView.svelte` — Editierbare Metadaten
- `src/client/components/views/TimelineView.svelte` — Add/Edit/Delete
- `src/client/components/views/SliceView.svelte` — Scenario/Attachment-Editing

**Neu:**
- `src/client/components/shared/InlineEdit.svelte`
- `src/client/components/shared/JsonEditor.svelte`
- `src/client/components/shared/ElementForm.svelte`
- `src/client/components/shared/ConfirmDialog.svelte`

---

## Verifizierung

1. Model-Name im Info-Tab ändern → Datei wird aktualisiert
2. Neues Event im Timeline-Tab hinzufügen → erscheint in Datei
3. Datei extern ändern → UI zeigt Notification / lädt neu
4. Scenario hinzufügen/bearbeiten → korrekt in Datei gespeichert
5. Browser-Reload → gespeicherte Änderungen bleiben
