import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { InformationFlowModel } from './types.js';
import { buildSliceViewModel, exportSlicesToJson, type SliceViewModel } from '../shared/slice-builder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerOptions {
  filePath: string;
  port: number;
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

export function createServer(options: ServerOptions): {
  start: () => void;
  stop: () => void;
  triggerReload: () => void;
  triggerWireframeReload: () => void;
} {
  const { filePath, port } = options;
  const clients = new Set<http.ServerResponse>();

  let currentModel: InformationFlowModel | null = null;
  let currentSlices: SliceViewModel | null = null;
  let currentError: string | null = null;

  // Path to built client assets
  // In dist: server is at dist/server/server/, client is at dist/client/
  const clientDistPath = path.join(__dirname, '../../client');
  const isDev = !fs.existsSync(clientDistPath);

  function writeSlicesJson(): void {
    if (!currentSlices) return;
    // Asset folder: hotel.giraflow.json → hotel.giraflow/slices.json
    const giraflowDir = filePath.replace(/\.json$/i, '');
    if (!fs.existsSync(giraflowDir)) {
      fs.mkdirSync(giraflowDir, { recursive: true });
    }
    const slicesPath = path.join(giraflowDir, 'slices.json');
    fs.writeFileSync(slicesPath, exportSlicesToJson(currentSlices.slices));
  }

  function loadModel(): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      currentModel = JSON.parse(content) as InformationFlowModel;
      currentError = null;

      // Build slices and auto-export
      if (currentModel) {
        currentSlices = buildSliceViewModel(currentModel);
        writeSlicesJson();
      }
    } catch (err) {
      currentError = err instanceof Error ? err.message : String(err);
      // Keep old model for display, just show error
    }
  }

  // Initial load
  loadModel();

  function triggerReload(): void {
    loadModel();
    for (const client of clients) {
      client.write('data: reload\n\n');
    }
  }

  function triggerWireframeReload(): void {
    for (const client of clients) {
      client.write('data: wireframe-reload\n\n');
    }
  }

  function serveStaticFile(res: http.ServerResponse, filePath: string): boolean {
    try {
      const ext = path.extname(filePath);
      const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(content);
      return true;
    } catch {
      return false;
    }
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${port}`);

    // SSE endpoint for live reload
    if (url.pathname === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      clients.add(res);

      // Keep-alive ping
      const interval = setInterval(() => {
        res.write(': ping\n\n');
      }, 30000);

      req.on('close', () => {
        clearInterval(interval);
        clients.delete(res);
      });

      return;
    }

    // Wireframe assets endpoint (renamed to avoid conflict with Vite's /assets/)
    if (url.pathname.startsWith('/wireframes/')) {
      // pathname already excludes query string
      const assetName = decodeURIComponent(url.pathname.slice('/wireframes/'.length));
      // Compute asset folder from giraflow file path (remove .json extension)
      const giraflowDir = filePath.replace(/\.json$/, '');
      const assetPath = path.join(giraflowDir, assetName);

      // Security: prevent directory traversal
      const resolvedAssetPath = path.resolve(assetPath);
      const resolvedGiraflowDir = path.resolve(giraflowDir);
      if (!resolvedAssetPath.startsWith(resolvedGiraflowDir + path.sep)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
      }

      if (serveStaticFile(res, resolvedAssetPath)) return;

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Asset Not Found');
      return;
    }

    // API endpoint for model data
    if (url.pathname === '/api/model') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(
        JSON.stringify({
          model: currentModel,
          error: currentError,
          watchedFile: path.basename(filePath),
        })
      );
      return;
    }

    // API endpoint for slices
    if (url.pathname === '/api/slices') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify(currentSlices));
      return;
    }

    // API endpoint for saving wireframes
    if (url.pathname === '/api/wireframe' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
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
          const giraflowDir = filePath.replace(/\.json$/, '');
          const targetPath = path.join(giraflowDir, filename);

          // Security: ensure the resolved path is within the giraflow dir
          const resolvedGiraflowDir = path.resolve(giraflowDir);
          const resolvedTargetPath = path.resolve(targetPath);
          if (!resolvedTargetPath.startsWith(resolvedGiraflowDir + path.sep)) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Forbidden' }));
            return;
          }

          // File must already exist (no creating new files)
          if (!fs.existsSync(resolvedTargetPath)) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'File not found' }));
            return;
          }

          // Write the file
          fs.writeFileSync(resolvedTargetPath, content, 'utf-8');
          triggerWireframeReload();

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid request' }));
        }
      });
      return;
    }

    // In development mode, let Vite handle everything except API/events
    if (isDev) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Development mode: Use Vite dev server for client assets');
      return;
    }

    // Production: Serve static files from dist/client
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const indexPath = path.join(clientDistPath, 'index.html');
      if (serveStaticFile(res, indexPath)) return;
    }

    // Try to serve the requested file
    const requestedPath = path.join(clientDistPath, url.pathname);
    // Prevent directory traversal
    if (requestedPath.startsWith(clientDistPath)) {
      if (serveStaticFile(res, requestedPath)) return;
    }

    // Fallback: serve index.html for SPA routing
    const indexPath = path.join(clientDistPath, 'index.html');
    if (serveStaticFile(res, indexPath)) return;

    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  return {
    start: () => {
      server.listen(port, () => {
        const fileName = path.basename(filePath);
        console.log(`\n  🦒 Giraflow`);
        console.log(`  ────────────────────────────────`);
        console.log(`  Watching: ${fileName}`);
        console.log(`  Server:   http://localhost:${port}`);
        if (isDev) {
          console.log(`  Mode:     Development (use Vite on port 5173)`);
        }
        console.log(`\n  Press Ctrl+C to stop\n`);
      });
    },
    stop: () => {
      for (const client of clients) {
        client.end();
      }
      server.close();
    },
    triggerReload,
    triggerWireframeReload,
  };
}
