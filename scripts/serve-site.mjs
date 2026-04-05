import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.resolve(__dirname, '..', 'docs');
const defaultHost = '::';
const displayHost = 'localhost';
const requestBaseUrl = 'http://localhost';
const defaultPort = 4173;
const maxPortAttempts = 10;

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
]);

function parsePort(argv) {
  const portFlagIndex = argv.findIndex((arg) => arg === '--port' || arg === '-p');
  const portValue = portFlagIndex >= 0 ? argv[portFlagIndex + 1] : process.env.PORT;
  const port = Number.parseInt(portValue ?? `${defaultPort}`, 10);
  return Number.isInteger(port) && port > 0 ? port : defaultPort;
}

function resolveRequestPath(urlPathname) {
  const decodedPath = decodeURIComponent(urlPathname);
  const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
  const absolutePath = path.resolve(docsRoot, relativePath);

  if (!absolutePath.startsWith(docsRoot)) {
    return null;
  }

  return absolutePath;
}

async function getExistingPath(filePath) {
  try {
    await access(filePath);
    return filePath;
  } catch {
    if (path.extname(filePath)) {
      return null;
    }

    const indexPath = path.join(filePath, 'index.html');
    try {
      await access(indexPath);
      return indexPath;
    } catch {
      return null;
    }
  }
}

function serveFile(filePath, response) {
  const contentType = mimeTypes.get(path.extname(filePath).toLowerCase()) ?? 'application/octet-stream';
  response.writeHead(200, { 'Content-Type': contentType });
  createReadStream(filePath).pipe(response);
}

function createStaticServer() {
  return createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? '/', requestBaseUrl);
    const resolvedPath = resolveRequestPath(requestUrl.pathname);

    if (!resolvedPath) {
      response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Forbidden');
      return;
    }

    const filePath = await getExistingPath(resolvedPath);
    if (!filePath) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    if (request.method === 'HEAD') {
      const contentType = mimeTypes.get(path.extname(filePath).toLowerCase()) ?? 'application/octet-stream';
      response.writeHead(200, { 'Content-Type': contentType });
      response.end();
      return;
    }

    serveFile(filePath, response);
  });
}

async function listen(server, host, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen({ host, port, ipv6Only: false }, () => {
      server.off('error', reject);
      resolve();
    });
  });
}

async function start() {
  const requestedPort = parsePort(process.argv.slice(2));
  const server = createStaticServer();

  for (let attempt = 0; attempt < maxPortAttempts; attempt += 1) {
    const port = requestedPort + attempt;
    try {
      await listen(server, defaultHost, port);
      console.log(`Serving docs at http://${displayHost}:${port}`);
      console.log(`Also available at http://127.0.0.1:${port}`);
      console.log('Press Ctrl+C to stop.');
      return;
    } catch (error) {
      if (error?.code !== 'EADDRINUSE' || attempt === maxPortAttempts - 1) {
        throw error;
      }
    }
  }
}

start().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to serve docs: ${message}`);
  process.exitCode = 1;
});
