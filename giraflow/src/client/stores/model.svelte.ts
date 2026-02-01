import type { GiraflowModel, ViewMode, Event, StateView, Command, Actor } from '../lib/types';
import type { SliceViewModel } from '../lib/models/slice-model';

const PUBLIC_SESSION_KEY = 'giraflow-public-session';

interface PublicSession {
  selectedExampleId: string;
  currentExampleFolder: string | null;
  currentRawJson: string;
  currentView: ViewMode;
  editedWireframes: Record<string, string>;
  lastModified: number;
}

class ModelStore {
  model = $state<GiraflowModel | null>(null);
  slices = $state<SliceViewModel | null>(null);
  error = $state<string | null>(null);
  watchedFile = $state<string>('');
  availableFiles = $state<string[]>([]);
  view = $state<ViewMode>('timeline');
  expandAll = $state(false);
  highlightTick = $state<number | null>(null);

  // Editor state
  rawJson = $state<string>('');
  isPublicMode = $state(false);
  jsonError = $state<string | null>(null);

  // Current example folder (for wireframe paths in public mode)
  currentExampleFolder = $state<string | null>(null);

  // Selected example ID (for public mode session persistence)
  selectedExampleId = $state<string>('');

  // Wireframe edits (session-only, for public mode)
  editedWireframes = $state<Map<string, string>>(new Map());

  getEditedWireframe(src: string): string | null {
    return this.editedWireframes.get(src) ?? null;
  }

  setEditedWireframe(src: string, content: string) {
    const newMap = new Map(this.editedWireframes);
    newMap.set(src, content);
    this.editedWireframes = newMap;
    this.savePublicSession();
  }

  clearAllEditedWireframes() {
    this.editedWireframes = new Map();
  }

  // Public session persistence methods
  savePublicSession() {
    if (!this.isPublicMode) return;

    try {
      const session: PublicSession = {
        selectedExampleId: this.selectedExampleId,
        currentExampleFolder: this.currentExampleFolder,
        currentRawJson: this.rawJson,
        currentView: this.view,
        editedWireframes: Object.fromEntries(this.editedWireframes),
        lastModified: Date.now(),
      };
      localStorage.setItem(PUBLIC_SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      console.warn('Failed to save public session to localStorage:', e);
    }
  }

  loadPublicSession(): boolean {
    if (!this.isPublicMode) return false;

    try {
      const stored = localStorage.getItem(PUBLIC_SESSION_KEY);
      if (!stored) return false;

      const session: PublicSession = JSON.parse(stored);

      // Validate required fields exist
      if (!session.selectedExampleId || !session.currentRawJson) {
        return false;
      }

      // Restore state
      this.selectedExampleId = session.selectedExampleId;
      this.currentExampleFolder = session.currentExampleFolder;
      this.rawJson = session.currentRawJson;
      this.view = session.currentView || 'timeline';
      this.editedWireframes = new Map(Object.entries(session.editedWireframes || {}));

      // Parse and set the model
      if (session.currentRawJson.trim()) {
        try {
          const parsed = JSON.parse(session.currentRawJson);
          this.model = parsed as GiraflowModel;
          this.error = null;
        } catch (e) {
          this.jsonError = e instanceof Error ? e.message : 'Invalid JSON';
          return false;
        }
      }

      return true;
    } catch (e) {
      console.warn('Failed to load public session from localStorage:', e);
      return false;
    }
  }

  clearPublicSession() {
    try {
      localStorage.removeItem(PUBLIC_SESSION_KEY);
    } catch (e) {
      console.warn('Failed to clear public session:', e);
    }
  }

  get events(): Event[] {
    if (!this.model) return [];
    return this.model.timeline.filter((el): el is Event => el.type === 'event');
  }

  get states(): StateView[] {
    if (!this.model) return [];
    return this.model.timeline.filter((el): el is StateView => el.type === 'state');
  }

  get commands(): Command[] {
    if (!this.model) return [];
    return this.model.timeline.filter((el): el is Command => el.type === 'command');
  }

  get actors(): Actor[] {
    if (!this.model) return [];
    return this.model.timeline.filter((el): el is Actor => el.type === 'actor');
  }

  setView(newView: ViewMode) {
    history.pushState({ view: newView }, '', `#${newView}`);
    this.view = newView;
    this.savePublicSession();
  }

  navigateToTick(tick: number) {
    const newHash = `timeline/tick-${tick}`;
    history.pushState({ view: 'timeline', tick }, '', `#${newHash}`);

    this.highlightTick = tick;
    this.view = 'timeline';
    requestAnimationFrame(() => {
      const el = document.getElementById(`tick-${tick}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('highlight-flash');
        setTimeout(() => el.classList.remove('highlight-flash'), 2000);
      }
      this.highlightTick = null;
    });
  }

  navigateToSlice(sliceKey: string) {
    // Use pushState for browser history support
    const newHash = `slice/${sliceKey}`;
    history.pushState({ view: 'slice', sliceKey }, '', `#${newHash}`);

    this.view = 'slice';
    requestAnimationFrame(() => {
      const el = document.getElementById(`slice-${sliceKey}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  handleHashChange() {
    const hash = window.location.hash.slice(1);

    // Default to timeline view if no hash
    if (!hash) {
      this.view = 'timeline';
      return;
    }

    const parts = hash.split('/');
    const viewPart = parts[0];
    const targetPart = parts[1];

    if (viewPart === 'timeline') {
      this.view = 'timeline';
      if (targetPart?.startsWith('tick-')) {
        const tick = parseInt(targetPart.replace('tick-', ''), 10);
        if (!isNaN(tick)) {
          this.highlightTick = tick;
          requestAnimationFrame(() => {
            const el = document.getElementById(`tick-${tick}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('highlight-flash');
              setTimeout(() => el.classList.remove('highlight-flash'), 2000);
            }
            this.highlightTick = null;
          });
        }
      }
    } else if (viewPart === 'slice') {
      this.view = 'slice';
      if (targetPart) {
        requestAnimationFrame(() => {
          const el = document.getElementById(`slice-${targetPart}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      }
    } else if (viewPart === 'table') {
      this.view = 'table';
    } else if (viewPart === 'editor') {
      this.view = 'editor';
    } else if (viewPart === 'howto') {
      this.view = 'howto';
    }
  }

  setExpandAll(value: boolean) {
    this.expandAll = value;
    localStorage.setItem('expandAll', String(value));
  }

  loadExpandAllFromStorage() {
    const stored = localStorage.getItem('expandAll');
    if (stored !== null) {
      this.expandAll = stored === 'true';
    }
  }

  updateModel(data: { model: GiraflowModel | null; error: string | null; watchedFile: string; availableFiles?: string[] }) {
    this.model = data.model;
    this.error = data.error;
    this.watchedFile = data.watchedFile;
    if (data.availableFiles) {
      this.availableFiles = data.availableFiles;
    }
  }

  async selectFile(fileName: string): Promise<boolean> {
    const res = await fetch('/api/select-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: fileName }),
    });
    return res.ok;
  }

  updateSlices(slices: SliceViewModel | null) {
    this.slices = slices;
  }

  // Load model from JSON string (for editor)
  loadFromJson(json: string) {
    this.rawJson = json;
    this.jsonError = null;

    if (!json.trim()) {
      this.model = null;
      return;
    }

    try {
      const parsed = JSON.parse(json);
      this.model = parsed as GiraflowModel;
      this.error = null;
      this.savePublicSession();
    } catch (e) {
      this.jsonError = e instanceof Error ? e.message : 'Invalid JSON';
    }
  }

  // Update raw JSON when model changes (from file watcher)
  syncRawJsonFromModel() {
    if (this.model) {
      this.rawJson = JSON.stringify(this.model, null, 2);
    }
  }

  setPublicMode(isPublic: boolean) {
    this.isPublicMode = isPublic;
  }

  setCurrentExampleFolder(folder: string | null) {
    this.currentExampleFolder = folder;
  }

  /**
   * Get the URL path for a wireframe based on current mode.
   * In public mode: /examples/{folder}/{wireframe}
   * In local mode: /wireframes/{wireframe}
   */
  getWireframePath(wireframe: string): string {
    if (this.isPublicMode && this.currentExampleFolder) {
      return `/examples/${this.currentExampleFolder}/${wireframe}`;
    }
    return `/wireframes/${wireframe}`;
  }
}

export const modelStore = new ModelStore();

// Signal for wireframe-only reloads (increments on each wireframe change)
export const wireframeReloadSignal = $state({ value: 0 });

export function triggerWireframeReload() {
  wireframeReloadSignal.value++;
}
