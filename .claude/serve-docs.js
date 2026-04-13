const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };

http.createServer((req, res) => {
  const filePath = path.join(root, req.url === '/' ? '/pitch-sheet.html' : req.url);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'text/plain' });
    res.end(data);
  });
}).listen(3001, () => console.log('Docs server running on port 3001'));
