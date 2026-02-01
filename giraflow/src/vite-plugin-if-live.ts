import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin, ViteDevServer } from 'vite';
import type { GiraflowModel } from './server/types.js';
import type { ServerResponse } from 'node:http';
import { buildSliceViewModel, type SliceViewModel } from './shared/slice-builder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  let currentModel: GiraflowModel | null = null;
  let currentSlices: SliceViewModel | null = null;
  let currentError: string | null = null;
  let jsonWatcher: fs.FSWatcher | null = null;
  let wireframeWatcher: fs.FSWatcher | null = null;
  let debounceTimeout: NodeJS.Timeout | null = null;
  let pendingChangeType: 'model' | 'wireframe' | null = null;
  let isPublicMode = false;
  let availableFiles: string[] = [];
  let server: ViteDevServer | null = null;
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
    // If multiple files, select the first one
    if (giraflowFiles.length > 1) {
      return path.resolve(giraflowFiles[0]);
    }
    return null;
  }

  function loadModel(): void {
    if (!filePath) return;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      currentModel = JSON.parse(content) as GiraflowModel;
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

  function closeWatchers(): void {
    if (jsonWatcher) {
      jsonWatcher.close();
      jsonWatcher = null;
    }
    if (wireframeWatcher) {
      wireframeWatcher.close();
      wireframeWatcher = null;
    }
  }

  function setupWatchers(scheduleNotify: (changeType: 'model' | 'wireframe') => void): void {
    if (!filePath || !server) return;

    // Watch JSON file
    jsonWatcher = fs.watch(filePath, () => scheduleNotify('model'));
    jsonWatcher.on('error', (err) => {
      server?.config.logger.error(`  Watch error (JSON): ${err.message}`);
    });

    // Watch wireframe folder if it exists
    const giraflowFolderPath = filePath.replace(/\.json$/, '');
    if (fs.existsSync(giraflowFolderPath) && fs.statSync(giraflowFolderPath).isDirectory()) {
      wireframeWatcher = fs.watch(giraflowFolderPath, { recursive: true }, () => scheduleNotify('wireframe'));
      wireframeWatcher.on('error', (err) => {
        server?.config.logger.error(`  Watch error (wireframes): ${err.message}`);
      });
      server.config.logger.info(`  👁 Watching wireframes in ${path.basename(giraflowFolderPath)}/\n`);
    }
  }

  function switchToFile(fileName: string, scheduleNotify: (changeType: 'model' | 'wireframe') => void): boolean {
    const newPath = path.resolve(process.cwd(), fileName);
    if (!fs.existsSync(newPath)) {
      return false;
    }

    closeWatchers();
    filePath = newPath;
    fileDir = path.dirname(filePath);
    loadModel();
    setupWatchers(scheduleNotify);

    if (server) {
      server.config.logger.info(`\n  Switched to: ${fileName}\n`);
    }
    return true;
  }

  return {
    name: 'if-live',

    configureServer(viteServer: ViteDevServer) {
      server = viteServer;
      // Check if we're in public mode
      isPublicMode = server.config.mode === 'public';

      // In public mode, serve index-public.html instead of index.html
      if (isPublicMode) {
        server.middlewares.use((req, res, next) => {
          // Rewrite root request to index-public.html
          if (req.url === '/' || req.url === '/index.html') {
            req.url = '/index-public.html';
          }

          // Serve AI instructions in public mode too
          if (req.url === '/api/ai-instructions') {
            const aiInstructionsPath = path.join(__dirname, '..', 'giraflow-ai-instructions.md');
            if (fs.existsSync(aiInstructionsPath)) {
              const content = fs.readFileSync(aiInstructionsPath, 'utf-8');
              res.writeHead(200, {
                'Content-Type': 'text/markdown',
                'Content-Disposition': 'attachment; filename="giraflow-ai-instructions.md"',
              });
              res.end(content);
              return;
            }
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('AI instructions not found');
            return;
          }

          // Serve schema in public mode too
          if (req.url === '/api/schema') {
            const schemaPath = path.join(__dirname, '..', 'giraflow.schema.json');
            if (fs.existsSync(schemaPath)) {
              const content = fs.readFileSync(schemaPath, 'utf-8');
              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Content-Disposition': 'attachment; filename="giraflow.schema.json"',
              });
              res.end(content);
              return;
            }
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Schema not found');
            return;
          }

          next();
        });
        return;
      }

      // Scan for available giraflow files
      availableFiles = findGiraflowFiles();
      filePath = findFileArg();

      if (!filePath && availableFiles.length === 0) {
        server.config.logger.warn(
          '\n  No *.giraflow.json files found. Usage: giraflow <file.giraflow.json>\n'
        );
        return;
      }

      if (filePath && !fs.existsSync(filePath)) {
        server.config.logger.error(`\n  File not found: ${filePath}\n`);
        return;
      }

      if (filePath) {
        fileDir = path.dirname(filePath);
      }

      // Initial load
      loadModel();

      const fileName = filePath ? path.basename(filePath) : null;
      if (fileName) {
        server.config.logger.info(`\n  Watching: ${fileName}\n`);
      }

      function scheduleNotify(changeType: 'model' | 'wireframe'): void {
        // Model changes take precedence
        if (pendingChangeType !== 'model') {
          pendingChangeType = changeType;
        }

        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          if (pendingChangeType === 'model') {
            server!.config.logger.info(`  ⟳ Model changed, reloading...`);
            loadModel();
            notifyClients('reload');
          } else {
            server!.config.logger.info(`  ⟳ Wireframe changed, refreshing iframes...`);
            notifyClients('wireframe-reload');
          }
          pendingChangeType = null;
        }, 100);
      }

      // Setup initial watchers
      setupWatchers(scheduleNotify);

      // Middleware for API and SSE
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/model' && req.method === 'GET') {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          });
          res.end(JSON.stringify({
            model: currentModel,
            error: currentError,
            watchedFile: filePath ? path.basename(filePath) : null,
            availableFiles,
          }));
          return;
        }

        if (req.url === '/api/model' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              // Validate JSON
              const model = JSON.parse(body);

              if (!filePath) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'No file selected' }));
                return;
              }

              // Write to file
              fs.writeFileSync(filePath, JSON.stringify(model, null, 2), 'utf-8');

              // Reload model
              loadModel();

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Invalid JSON' }));
            }
          });
          return;
        }

        if (req.url === '/api/select-file' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { file } = JSON.parse(body);
              if (!file || !availableFiles.includes(file)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid file' }));
                return;
              }

              const success = switchToFile(file, scheduleNotify);
              if (success) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
                notifyClients('reload');
              } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'File not found' }));
              }
            } catch {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid request' }));
            }
          });
          return;
        }

        if (req.url === '/api/create-file' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { name } = JSON.parse(body);
              if (!name || typeof name !== 'string') {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Name is required' }));
                return;
              }

              // Sanitize name: remove special characters, replace spaces with hyphens
              const sanitized = name
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim();

              if (!sanitized) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid name' }));
                return;
              }

              const fileName = `${sanitized}.giraflow.json`;
              const newFilePath = path.resolve(process.cwd(), fileName);

              // Check if file already exists
              if (fs.existsSync(newFilePath)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'File already exists' }));
                return;
              }

              // Create empty template
              const emptyTemplate = {
                "$schema": "./giraflow.schema.json",
                "name": name,
                "description": "",
                "version": "1.0.0",
                "timeline": [
                  {
                    "type": "state",
                    "name": "InitialState",
                    "tick": 1,
                    "sourcedFrom": [],
                    "example": {}
                  },
                  {
                    "type": "actor",
                    "name": "User",
                    "tick": 2,
                    "readsView": "InitialState",
                    "sendsCommand": "DoSomething"
                  },
                  {
                    "type": "command",
                    "name": "DoSomething",
                    "tick": 3,
                    "example": { "data": "example" }
                  },
                  {
                    "type": "event",
                    "name": "SomethingHappened",
                    "tick": 4,
                    "producedBy": "DoSomething-3",
                    "example": { "result": "success" }
                  }
                ],
                "specifications": []
              };

              fs.writeFileSync(newFilePath, JSON.stringify(emptyTemplate, null, 2), 'utf-8');

              // Update available files list
              availableFiles = findGiraflowFiles();

              // Switch to the new file
              const success = switchToFile(fileName, scheduleNotify);
              if (success) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, fileName }));
                notifyClients('reload');
              } else {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to switch to new file' }));
              }
            } catch (err) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Invalid request' }));
            }
          });
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

        if (req.url === '/api/ai-instructions') {
          const aiInstructionsPath = path.join(__dirname, '..', 'giraflow-ai-instructions.md');
          if (fs.existsSync(aiInstructionsPath)) {
            const content = fs.readFileSync(aiInstructionsPath, 'utf-8');
            res.writeHead(200, {
              'Content-Type': 'text/markdown',
              'Content-Disposition': 'attachment; filename="giraflow-ai-instructions.md"',
            });
            res.end(content);
            return;
          }
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('AI instructions not found');
          return;
        }

        if (req.url === '/api/schema') {
          const schemaPath = path.join(__dirname, '..', 'giraflow.schema.json');
          if (fs.existsSync(schemaPath)) {
            const content = fs.readFileSync(schemaPath, 'utf-8');
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Content-Disposition': 'attachment; filename="giraflow.schema.json"',
            });
            res.end(content);
            return;
          }
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Schema not found');
          return;
        }

        if (req.url === '/api/wireframe' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { filename, content } = JSON.parse(body);

              // Validate filename: no directory traversal, must be .html
              if (!filename || typeof filename !== 'string' ||
                  filename.includes('..') || filename.includes('\\') ||
                  !filename.endsWith('.html')) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid filename' }));
                return;
              }

              // Asset folder is the giraflow file path without .json extension
              const giraflowDir = filePath!.replace(/\.json$/, '');
              const targetPath = path.join(giraflowDir, filename);

              // Security: ensure the resolved path is within the giraflow dir
              const resolvedGiraflowDir = path.resolve(giraflowDir);
              const resolvedTargetPath = path.resolve(targetPath);
              if (!resolvedTargetPath.startsWith(resolvedGiraflowDir + path.sep)) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Forbidden' }));
                return;
              }

              // Ensure parent directory exists for new files
              const parentDir = path.dirname(resolvedTargetPath);
              if (!fs.existsSync(parentDir)) {
                fs.mkdirSync(parentDir, { recursive: true });
              }

              // Write the file (create new or update existing)
              fs.writeFileSync(resolvedTargetPath, content, 'utf-8');

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
              // The watcher will automatically trigger a wireframe reload
            } catch {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid request' }));
            }
          });
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
