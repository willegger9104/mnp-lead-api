const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const PORT = process.env.DOCS_PORT || 3001;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
};

function listDocs() {
  const docs = fs.readdirSync(root)
    .filter(f => f.endsWith('.html'))
    .map(f => `<li><a href="/${f}">${f}</a></li>`)
    .join('');
  return `<!doctype html>
<html><head><meta charset="utf-8"/><title>Front Range AI — Pitch Docs</title>
<style>
  body { font-family: 'Inter', system-ui, sans-serif; background: #060f0b; color: #e2e8e4; padding: 48px; }
  h1 { color: #d4af37; font-size: 1.6rem; margin-bottom: 8px; }
  p  { color: #7ab89a; margin-bottom: 24px; font-size: 0.9rem; }
  ul { list-style: none; padding: 0; }
  li { margin: 10px 0; }
  a  { color: #d4e8de; text-decoration: none; padding: 10px 16px; display: inline-block;
       background: linear-gradient(145deg, #0d2b22, #0a2019); border-radius: 8px;
       border: 1px solid rgba(212,175,55,0.2); }
  a:hover { border-color: #d4af37; color: #d4af37; }
</style></head>
<body>
  <h1>Front Range AI — Pitch Docs</h1>
  <p>Serving HTML artifacts from <code>${root}</code> on port ${PORT}.</p>
  <ul>${docs}</ul>
</body></html>`;
}

http.createServer((req, res) => {
  // Default landing page → directory index
  if (req.url === '/' || req.url === '/index') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(listDocs());
  }

  // Resolve and confine to project root (prevent path traversal)
  const requested = path.normalize(decodeURIComponent(req.url.split('?')[0]));
  const filePath  = path.join(root, requested);
  if (!filePath.startsWith(root)) {
    res.writeHead(403); return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'text/plain' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`[docs] serving ${root} on http://localhost:${PORT}`));
