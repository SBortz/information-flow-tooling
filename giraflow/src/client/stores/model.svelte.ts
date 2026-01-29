import type { InformationFlowModel, ViewMode, Event, StateView, Command, Actor } from '../lib/types';

class ModelStore {
  model = $state<InformationFlowModel | null>(null);
  error = $state<string | null>(null);
  watchedFile = $state<string>('');
  view = $state<ViewMode>('table');
  expandAll = $state(false);
  highlightTick = $state<number | null>(null);

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

    // Default to table view if no hash
    if (!hash) {
      this.view = 'table';
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

  updateModel(data: { model: InformationFlowModel | null; error: string | null; watchedFile: string }) {
    this.model = data.model;
    this.error = data.error;
    this.watchedFile = data.watchedFile;
  }
}

export const modelStore = new ModelStore();

// Signal for wireframe-only reloads (increments on each wireframe change)
export const wireframeReloadSignal = $state({ value: 0 });

export function triggerWireframeReload() {
  wireframeReloadSignal.value++;
}
