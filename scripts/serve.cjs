const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../site");
const port = Number(process.env.PORT || 4175);
const prefix = "/Vick-10_08";
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".avif": "image/avif",
  ".png": "image/png",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
};
http
  .createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (pathname === prefix) {
      res.writeHead(301, { Location: prefix + "/" }).end();
      return;
    }
    if (pathname.startsWith(prefix + "/"))
      pathname = pathname.slice(prefix.length);
    const file = path.resolve(
      root,
      "." + pathname,
      pathname.endsWith("/") ? "index.html" : "",
    );
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    fs.stat(file, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404).end("Arquivo não encontrado.");
        return;
      }
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      });
      fs.createReadStream(file).pipe(res);
    });
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`Para Vitória: http://127.0.0.1:${port}${prefix}/`),
  );
