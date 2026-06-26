import cors from 'cors';
import express from 'express';

const app = express();
const PORT = Number(process.env.PORT || 4000);
const MAX_HISTORY = 500;
const MAX_PORT_ATTEMPTS = 10;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const clients = new Set();
const history = [];

const nowIso = () => new Date().toISOString();

const randomId = () => `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 11)}`;

const normalizeEvent = (req) => {
  const body = req.body || {};
  const source = req.params.source || body.source || req.query.source || 'unknown';
  const eventName = body.event || body.event_name || body.type || body.kind || body.action || 'unknown';

  return {
    id: body.id || randomId(),
    source,
    event: eventName,
    payload: body.payload !== undefined ? body.payload : body,
    receivedAt: nowIso(),
    raw: body
  };
};

const sendSSE = (res, event) => {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
};

const publish = (event) => {
  history.push(event);
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  for (const client of clients) {
    sendSSE(client.res, event);
  }
};

app.get('/health', (_req, res) => {
  res.json({ ok: true, connectedClients: clients.size });
});

app.get('/events/history', (_req, res) => {
  res.json(history);
});

app.get('/events/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const client = {
    id: randomId(),
    res
  };

  clients.add(client);
  sendSSE(res, { type: 'connected', at: nowIso() });

  for (const item of history.slice(-100)) {
    sendSSE(res, item);
  }

  req.on('close', () => {
    clients.delete(client);
    res.end();
  });
});

app.post('/hooks', (req, res) => {
  const event = normalizeEvent({ ...req, params: {}, query: req.query });
  publish(event);
  res.json({ ok: true, eventId: event.id, event });
});

app.post('/hooks/:source', (req, res) => {
  const event = normalizeEvent(req);
  publish(event);
  res.json({ ok: true, eventId: event.id, event });
});

app.use((req, res) => {
  res.status(404).json({ ok: false, message: 'Route not found' });
});

const listen = (port, attempt = 0) => {
  const server = app.listen(port, () => {
    console.log(`Hook Loop Lab server running on http://localhost:${port}`);
    console.log(`SSE: http://localhost:${port}/events/stream`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && attempt < MAX_PORT_ATTEMPTS) {
      const nextPort = port + 1;
      console.warn(`Port ${port} is already in use, trying ${nextPort}...`);
      listen(nextPort, attempt + 1);
      return;
    }

    throw error;
  });
};

listen(PORT);
