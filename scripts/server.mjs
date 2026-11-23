// Lokal förhandsvisning: node scripts/server.mjs  → http://localhost:5179
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const rot = join(fileURLToPath(new URL('..', import.meta.url)), 'site');
const typer = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const port = Number(process.env.PORT) || 5179;

createServer(async (req, res) => {
  const sokvag = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([\\/]\.\.)+/, '');
  const fil = join(rot, sokvag.endsWith('/') || sokvag.endsWith('\\') ? join(sokvag, 'index.html') : sokvag);
  if (!fil.startsWith(rot)) { res.writeHead(403).end(); return; }
  try {
    const data = await readFile(fil);
    res.writeHead(200, { 'Content-Type': (typer[extname(fil)] || 'application/octet-stream') + '; charset=utf-8' }).end(data);
  } catch {
    res.writeHead(404).end('Hittades inte');
  }
}).listen(port, () => console.log(`http://localhost:${port}`));
