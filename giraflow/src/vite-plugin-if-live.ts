import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import type { InformationFlowModel } from './server/types.js';
import type { ServerResponse } from 'node:http';

const MIME_TYPES: Record<string, string> = {
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
  let currentError: string | null = null;
  let watcher: fs.FSWatcher | null = null;
  let debounceTimeout: NodeJS.Timeout | null = null;
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
    } catch (err) {
      currentError = err instanceof Error ? err.message : String(err);
    }
  }

  function notifyClients(): void {
    for (const client of clients) {
      client.write('data: reload\n\n');
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

      // File watcher
      watcher = fs.watch(filePath, () => {
        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          server.config.logger.info(`  ⟳ File changed, reloading...`);
          loadModel();
          notifyClients();
        }, 100);
      });

      watcher.on('error', (err) => {
        server.config.logger.error(`  Watch error: ${err.message}`);
      });

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
      if (watcher) watcher.close();
      for (const client of clients) {
        client.end();
      }
    },
  };
}
