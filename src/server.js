import http from 'node:http';

/**
 * Web server nhỏ để Render nhận diện là Web Service và để UptimeRobot ping
 * (giữ cho Render free không "ngủ" sau 15 phút).
 */
export function startServer(getStatus) {
  const port = Number(process.env.PORT) || 3000;
  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      const body = JSON.stringify({ ok: true, uptime: Math.round(process.uptime()), ...getStatus() });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(body);
      return;
    }
    res.writeHead(404).end('Not found');
  });
  server.listen(port, () => console.log(`[web] Health server chạy tại cổng ${port} (/health)`));
  return server;
}

