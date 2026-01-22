import type { InformationFlowModel, ViewMode, Event, StateView, Command, Actor } from '../lib/types';

class ModelStore {
  model = $state<InformationFlowModel | null>(null);
  error = $state<string | null>(null);
  watchedFile = $state<string>('');
  view = $state<ViewMode>('table');
  expandAll = $state(false);

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
    this.view = newView;
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
