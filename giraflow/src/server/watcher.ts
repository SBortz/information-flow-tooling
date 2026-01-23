import * as fs from 'node:fs';

export interface WatcherOptions {
  filePath: string;
  onChange: () => void;
  debounceMs?: number;
}

export function createWatcher(options: WatcherOptions): {
  start: () => void;
  stop: () => void;
} {
  const { filePath, onChange, debounceMs = 100 } = options;
  
  let watcher: fs.FSWatcher | null = null;
  let debounceTimeout: NodeJS.Timeout | null = null;
  
  function handleChange(eventType: string): void {
    // Debounce rapid changes (common with many editors)
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    
    debounceTimeout = setTimeout(() => {
      console.log(`  ⟳ File changed, reloading...`);
      onChange();
    }, debounceMs);
  }
  
  return {
    start: () => {
      try {
        watcher = fs.watch(filePath, handleChange);
        
        watcher.on('error', (err) => {
          console.error(`  ⚠ Watch error: ${err.message}`);
        });
      } catch (err) {
        console.error(`  ⚠ Could not watch file: ${err}`);
      }
    },
    stop: () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      if (watcher) {
        watcher.close();
      }
    },
  };
}
