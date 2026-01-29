import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import type { InformationFlowModel } from './server/types.js';
import type { ServerResponse } from 'node:http';
import { buildSliceViewModel, type SliceViewModel } from './shared/slice-builder.js';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.md': 'text/plain',
  '.csv': 'text/csv',
};

export function ifLivePlugin(): Plugin {
  let filePath: string | null = null;
  let fileDir: string = process.cwd();
  let currentModel: InformationFlowModel | null = null;
  let currentSlices: SliceViewModel | null = null;
  let currentError: string | null = null;
  let jsonWatcher: fs.FSWatcher | null = null;
  let wireframeWatcher: fs.FSWatcher | null = null;
  let debounceTimeout: NodeJS.Timeout | null = null;
  let pendingChangeType: 'model' | 'wireframe' | null = null;
  const clients = new Set<ServerResponse>();

  function findGiraflowFiles(): string[] {
    const cwd = process.cwd();
    const files = fs.readdirSync(cwd);
    return files.filter(f => f.endsWith('.giraflow.json'));
  }

  function findFileArg(): string | null {
    if (process.env.IF_FILE) {
      return path.resolve(process.env.IF_FILE);
    }
    // Search for giraflow files in current directory
    const giraflowFiles = findGiraflowFiles();
    if (giraflowFiles.length === 1) {
      return path.resolve(giraflowFiles[0]);
    }
    return null;
  }

  function loadModel(): void {
    if (!filePath) return;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      currentModel = JSON.parse(content) as InformationFlowModel;
      currentError = null;

      // Build slices
      if (currentModel) {
        currentSlices = buildSliceViewModel(currentModel);
      }
    } catch (err) {
      currentError = err instanceof Error ? err.message : String(err);
    }
  }

  function notifyClients(eventType: 'reload' | 'wireframe-reload'): void {
    for (const client of clients) {
      client.write(`data: ${eventType}\n\n`);
    }
  }

  return {
    name: 'if-live',

    configureServer(server: ViteDevServer) {
      filePath = findFileArg();

      if (!filePath) {
        const giraflowFiles = findGiraflowFiles();
        if (giraflowFiles.length === 0) {
          server.config.logger.warn(
            '\n  No *.giraflow.json files found. Usage: npm run dev -- <file.giraflow.json>\n'
          );
        } else {
          server.config.logger.warn(
            '\n  Multiple giraflow files found. Please specify one:\n' +
            giraflowFiles.map(f => `    - npm run dev -- ${f}`).join('\n') + '\n'
          );
        }
        return;
      }

      if (!fs.existsSync(filePath)) {
        server.config.logger.error(`\n  File not found: ${filePath}\n`);
        return;
      }

      fileDir = path.dirname(filePath);

      // Initial load
      loadModel();

      const fileName = path.basename(filePath);
      server.config.logger.info(`\n  Watching: ${fileName}\n`);

      // Derive the .giraflow folder path
      const giraflowFolderPath = filePath.replace(/\.json$/, '');

      function scheduleNotify(changeType: 'model' | 'wireframe'): void {
        // Model changes take precedence
        if (pendingChangeType !== 'model') {
          pendingChangeType = changeType;
        }

        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          if (pendingChangeType === 'model') {
            server.config.logger.info(`  ⟳ Model changed, reloading...`);
            loadModel();
            notifyClients('reload');
          } else {
            server.config.logger.info(`  ⟳ Wireframe changed, refreshing iframes...`);
            notifyClients('wireframe-reload');
          }
          pendingChangeType = null;
        }, 100);
      }

      // Watch JSON file
      jsonWatcher = fs.watch(filePath, () => scheduleNotify('model'));
      jsonWatcher.on('error', (err) => {
        server.config.logger.error(`  Watch error (JSON): ${err.message}`);
      });

      // Watch wireframe folder if it exists
      if (fs.existsSync(giraflowFolderPath) && fs.statSync(giraflowFolderPath).isDirectory()) {
        wireframeWatcher = fs.watch(giraflowFolderPath, { recursive: true }, () => scheduleNotify('wireframe'));
        wireframeWatcher.on('error', (err) => {
          server.config.logger.error(`  Watch error (wireframes): ${err.message}`);
        });
        server.config.logger.info(`  👁 Watching wireframes in ${path.basename(giraflowFolderPath)}/\n`);
      }

      // Middleware for API and SSE
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/model') {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          });
          res.end(JSON.stringify({
            model: currentModel,
            error: currentError,
            watchedFile: filePath ? path.basename(filePath) : null,
          }));
          return;
        }

        if (req.url === '/api/slices') {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          });
          res.end(JSON.stringify(currentSlices));
          return;
        }

        if (req.url?.startsWith('/attachments/')) {
          const relativePath = decodeURIComponent(req.url.slice('/attachments/'.length));
          const absolutePath = path.resolve(fileDir, relativePath);

          // Prevent directory traversal
          if (!absolutePath.startsWith(fileDir)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
          }

          try {
            const content = fs.readFileSync(absolutePath);
            const ext = path.extname(absolutePath).toLowerCase();
            const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': mimeType });
            res.end(content);
          } catch {
            res.writeHead(404);
            res.end('Not found');
          }
          return;
        }

        if (req.url?.startsWith('/wireframes/')) {
          // Remove query string before extracting asset name
          const urlWithoutQuery = req.url.split('?')[0];
          const assetName = decodeURIComponent(urlWithoutQuery.slice('/wireframes/'.length));
          // Asset folder is the giraflow file path without .json extension
          const giraflowDir = filePath!.replace(/\.json$/, '');
          const absolutePath = path.resolve(giraflowDir, assetName);

          // Prevent directory traversal
          const resolvedGiraflowDir = path.resolve(giraflowDir);
          if (!absolutePath.startsWith(resolvedGiraflowDir + path.sep)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
          }

          try {
            const content = fs.readFileSync(absolutePath);
            const ext = path.extname(absolutePath).toLowerCase();
            const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': mimeType });
            res.end(content);
          } catch {
            res.writeHead(404);
            res.end('Asset not found');
          }
          return;
        }

        if (req.url === '/events') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          });

          clients.add(res);

          const interval = setInterval(() => {
            res.write(': ping\n\n');
          }, 30000);

          req.on('close', () => {
            clearInterval(interval);
            clients.delete(res);
          });
          return;
        }

        next();
      });
    },

    closeBundle() {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      if (jsonWatcher) jsonWatcher.close();
      if (wireframeWatcher) wireframeWatcher.close();
      for (const client of clients) {
        client.end();
      }
    },
  };
}
