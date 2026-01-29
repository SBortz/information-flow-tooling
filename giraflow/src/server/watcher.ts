import * as fs from 'node:fs';

export interface WatcherOptions {
  filePath: string;
  onModelChange: () => void;
  onWireframeChange: () => void;
  debounceMs?: number;
}

export function createWatcher(options: WatcherOptions): {
  start: () => void;
  stop: () => void;
} {
  const { filePath, onModelChange, onWireframeChange, debounceMs = 100 } = options;

  const watchers: fs.FSWatcher[] = [];
  let debounceTimeout: NodeJS.Timeout | null = null;
  let pendingChangeType: 'model' | 'wireframe' | null = null;

  // Derive the .giraflow folder path from the .giraflow.json file
  // e.g., "model.giraflow.json" -> "model.giraflow/"
  const giraflowFolderPath = filePath.replace(/\.json$/, '');

  function scheduleCallback(changeType: 'model' | 'wireframe'): void {
    // Model changes take precedence over wireframe changes
    if (pendingChangeType !== 'model') {
      pendingChangeType = changeType;
    }

    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    debounceTimeout = setTimeout(() => {
      if (pendingChangeType === 'model') {
        console.log(`  ⟳ Model changed, reloading...`);
        onModelChange();
      } else {
        console.log(`  ⟳ Wireframe changed, refreshing iframes...`);
        onWireframeChange();
      }
      pendingChangeType = null;
    }, debounceMs);
  }

  return {
    start: () => {
      // Watch the main JSON file
      try {
        const jsonWatcher = fs.watch(filePath, () => scheduleCallback('model'));
        jsonWatcher.on('error', (err) => {
          console.error(`  ⚠ Watch error on JSON: ${err.message}`);
        });
        watchers.push(jsonWatcher);
      } catch (err) {
        console.error(`  ⚠ Could not watch JSON file: ${err}`);
      }

      // Watch the .giraflow folder if it exists (for wireframes, etc.)
      if (fs.existsSync(giraflowFolderPath) && fs.statSync(giraflowFolderPath).isDirectory()) {
        try {
          const folderWatcher = fs.watch(giraflowFolderPath, { recursive: true }, () => scheduleCallback('wireframe'));
          folderWatcher.on('error', (err) => {
            console.error(`  ⚠ Watch error on wireframes: ${err.message}`);
          });
          watchers.push(folderWatcher);
          console.log(`  👁 Watching wireframes in ${giraflowFolderPath.split('/').pop()}/`);
        } catch (err) {
          // Silently ignore if watching fails
        }
      }
    },
    stop: () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      for (const watcher of watchers) {
        watcher.close();
      }
    },
  };
}
