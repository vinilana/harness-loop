import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_HOOK_SERVER = 'http://localhost:4000';
const EVENT_LIMIT = 250;
const LOG_LIMIT = 250;
const RULES_STORAGE_KEY = 'hook-loop-lab-rules-v1';
const SERVER_STORAGE_KEY = 'hook-loop-lab-server-url';
const DEFAULT_MAX_DEPTH = 6;
const LOCAL_SERVER_CANDIDATES = Array.from({ length: 11 }, (_, index) => `http://localhost:${4000 + index}`);

const defaultRules = [
  {
    id: 'rule-nota-geral',
    name: 'Nota de qualquer evento recebido',
    enabled: true,
    sourcePattern: '*',
    eventPattern: '*',
    action: 'note',
    noteTemplate: 'Evento recebido de {{source}} com tipo {{event}} (id {{id}}).',
    counterName: 'recebidos',
    emitSourceTemplate: 'loop-engine',
    emitEventTemplate: '{{event}}.simulado',
    emitDelayMs: 0,
    maxDepth: DEFAULT_MAX_DEPTH
  },
  {
    id: 'rule-contador-cliente',
    name: 'Contar commits do Claude Code',
    enabled: true,
    sourcePattern: 'claude*',
    eventPattern: '*',
    action: 'counter',
    noteTemplate: '',
    counterName: 'claude_code.eventos',
    emitSourceTemplate: 'loop-engine',
    emitEventTemplate: '{{event}}.check',
    emitDelayMs: 300,
    maxDepth: 5
  },
  {
    id: 'rule-cursor-loop',
    name: 'Simular cadeia em Cursor',
    enabled: false,
    sourcePattern: 'cursor',
    eventPattern: 'task.*',
    action: 'emit',
    noteTemplate: '',
    counterName: '',
    emitSourceTemplate: 'cursor',
    emitEventTemplate: '{{event}}.followup',
    emitDelayMs: 600,
    maxDepth: 3
  }
];

const sanitize = (value, fallback) => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
};

const wildcardMatch = (pattern, value) => {
  if (!pattern || pattern === '*') {
    return true;
  }

  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\\\*/g, '.*');

  return new RegExp(`^${escaped}$`, 'i').test(String(value || '').trim());
};

const template = (tpl, event, context = {}) => {
  if (!tpl) return '';
  return tpl.replace(/{{([^}]+)}}/g, (_, keyPath) => {
    const key = keyPath.trim();
    if (key === 'id') return event.id || '';
    if (key === 'source') return event.source || '';
    if (key === 'event') return event.event || event.name || '';
    if (key.startsWith('payload.')) {
      const path = key.replace('payload.', '').split('.');
      let value = event.payload;
      for (const segment of path) {
        if (value && typeof value === 'object' && segment in value) {
          value = value[segment];
        } else {
          return '';
        }
      }
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    }
    if (key in context) return context[key];
    return '';
  });
};

const parseJSONSafely = (text) => {
  const obj = JSON.parse(text);
  return obj;
};

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`;

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const normalizeServerUrl = (url) => (url || DEFAULT_HOOK_SERVER).trim().replace(/\/$/, '');

const discoverServerUrl = async (preferredUrl) => {
  const normalized = normalizeServerUrl(preferredUrl);
  const candidates = [
    normalized,
    ...LOCAL_SERVER_CANDIDATES.filter((url) => url !== normalized)
  ];

  for (const candidate of candidates) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 700);

    try {
      const response = await fetch(`${candidate}/health`, {
        signal: controller.signal
      });

      if (response.ok) {
        return candidate;
      }
    } catch {
      // Try the next local development port.
    } finally {
      clearTimeout(timeout);
    }
  }

  return normalized;
};

const normalizeRule = (rule) => ({
  id: newId(),
  name: 'Nova regra',
  enabled: true,
  sourcePattern: '*',
  eventPattern: '*',
  action: 'note',
  noteTemplate: 'Evento {{id}} foi processado pela regra.',
  counterName: 'geral',
  emitSourceTemplate: 'loop-engine',
  emitEventTemplate: '{{event}}.simulado',
  emitDelayMs: 0,
  maxDepth: DEFAULT_MAX_DEPTH,
  ...rule
});

export default function App() {
  const [serverUrl, setServerUrl] = useState(() => {
    return localStorage.getItem(SERVER_STORAGE_KEY) || DEFAULT_HOOK_SERVER;
  });
  const [rules, setRules] = useState(() => {
    const stored = localStorage.getItem(RULES_STORAGE_KEY);
    if (!stored) {
      return deepClone(defaultRules);
    }

    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || !parsed.length) return deepClone(defaultRules);
      return parsed.map((rule) => normalizeRule(rule));
    } catch {
      return deepClone(defaultRules);
    }
  });
  const [events, setEvents] = useState([]);
  const [actionLog, setActionLog] = useState([]);
  const [counters, setCounters] = useState({});
  const [status, setStatus] = useState('desconectado');
  const [manualSource, setManualSource] = useState('codex');
  const [manualEventName, setManualEventName] = useState('agent.started');
  const [manualPayload, setManualPayload] = useState(`{
  "message": "exemplo de evento para aula"
}`);
  const [manualError, setManualError] = useState('');

  const rulesRef = useRef(rules);
  const pendingTimers = useRef([]);

  useEffect(() => {
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
    rulesRef.current = rules;
  }, [rules]);

  useEffect(() => {
    localStorage.setItem(SERVER_STORAGE_KEY, serverUrl);
  }, [serverUrl]);

  const addEvent = useCallback((event, parentId = null, source = 'remote') => {
    setEvents((prev) => {
      const entry = {
        ...deepClone(event),
        source: event.source || 'unknown',
        event: event.event || event.name || 'unknown',
        receivedAt: event.receivedAt || new Date().toISOString(),
        parentEventId: parentId,
        synthetic: !!event.synthetic,
        origin: source
      };

      return [entry, ...prev].slice(0, EVENT_LIMIT);
    });
  }, []);

  const addLog = useCallback((line) => {
    setActionLog((prev) => [`${new Date().toLocaleTimeString()} - ${line}`, ...prev].slice(0, LOG_LIMIT));
  }, []);

  const processEvent = useCallback((event, depth = 0, parentId = null) => {
    addEvent(event, parentId, event.synthetic ? 'simulado' : 'webhook');

    const matched = rulesRef.current.filter((rule) => {
      if (!rule.enabled) return false;
      if (!wildcardMatch(rule.sourcePattern, event.source)) return false;
      if (!wildcardMatch(rule.eventPattern, event.event || event.name || 'unknown')) return false;
      return true;
    });

    const context = {
      source: event.source,
      event: event.event || event.name,
      parent: parentId || '',
      depth: String(depth)
    };

    for (const rule of matched) {
      const safeRule = normalizeRule(rule);
      const safeDepth = Number.isFinite(safeRule.maxDepth) ? safeRule.maxDepth : DEFAULT_MAX_DEPTH;

      if (safeRule.action === 'note') {
        const note = template(safeRule.noteTemplate, event, context);
        addLog(`[${safeRule.name}] ${note}`);
      }

      if (safeRule.action === 'counter') {
        const counterName = sanitize(template(safeRule.counterName, event, context), 'geral');
        setCounters((prev) => ({
          ...prev,
          [counterName]: (prev[counterName] || 0) + 1
        }));
        addLog(`[${safeRule.name}] contador ${counterName} -> ${(counters[counterName] || 0) + 1}`);
      }

      if (safeRule.action === 'emit') {
        const emitSource = sanitize(template(safeRule.emitSourceTemplate, event, context), 'loop-engine');
        const emitEvent = sanitize(template(safeRule.emitEventTemplate, event, context), `${event.event || event.name}.simulado`);
        const delay = Number(safeRule.emitDelayMs) || 0;
        if (depth >= safeDepth) {
          addLog(`[${safeRule.name}] limite de profundidade atingido para ${event.id}`);
          continue;
        }

        const timer = setTimeout(() => {
          processEvent(
            {
              id: newId(),
              source: emitSource,
              event: emitEvent,
              payload: {
                synthetic: true,
                parentRule: safeRule.id,
                parentEventId: event.id,
                createdBy: rule.name
              },
              receivedAt: new Date().toISOString(),
              synthetic: true
            },
            depth + 1,
            event.id
          );
        }, delay);

        pendingTimers.current.push(timer);
        addLog(`[${safeRule.name}] agendado evento sintético em ${delay}ms -> ${emitSource} / ${emitEvent}`);
      }
    }
  }, [addEvent, addLog, counters]);

  useEffect(() => {
    let source;
    let cancelled = false;

    const connect = async () => {
      const activeServerUrl = await discoverServerUrl(serverUrl);

      if (cancelled) return;

      if (activeServerUrl !== normalizeServerUrl(serverUrl)) {
        setServerUrl(activeServerUrl);
        return;
      }

      const target = `${activeServerUrl}/events/stream`;
      source = new EventSource(target);

      source.addEventListener('open', onOpen);
      source.addEventListener('error', onError);
      source.addEventListener('message', onMessage);
    };

    setStatus('conectando');

    const onOpen = () => setStatus('conectado');
    const onError = () => setStatus('desconectado');
    const onMessage = (event) => {
      if (!event.data) return;
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'connected') return;
        processEvent(payload, 0, payload.parentEventId);
      } catch {
        addLog(`Evento inválido recebido: ${event.data}`);
      }
    };

    connect();

    return () => {
      cancelled = true;
      if (source) {
        source.removeEventListener('open', onOpen);
        source.removeEventListener('error', onError);
        source.removeEventListener('message', onMessage);
        source.close();
      }
      setStatus('desconectado');
      for (const timer of pendingTimers.current) {
        clearTimeout(timer);
      }
      pendingTimers.current = [];
    };
  }, [serverUrl, addLog, processEvent]);

  const sendManualEvent = async (event) => {
    event.preventDefault();
    setManualError('');

    let parsedPayload;
    try {
      parsedPayload = parseJSONSafely(manualPayload);
    } catch {
      setManualError('Payload JSON inválido. Corrija o corpo do objeto antes de enviar.');
      return;
    }

    try {
      const response = await fetch(`${normalizeServerUrl(serverUrl)}/hooks/${manualSource}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source: manualSource,
          event: manualEventName,
          payload: parsedPayload
        })
      });

      if (!response.ok) {
        throw new Error(`Erro ao enviar: ${response.status} ${response.statusText}`);
      }

      addLog(`Evento manual enviado para ${manualSource}/${manualEventName}`);
    } catch (error) {
      setManualError(error.message || 'Falha ao enviar evento manual');
    }
  };

  const addRule = () => {
    setRules((prev) => [...prev, normalizeRule({ name: `Regra ${prev.length + 1}` })]);
  };

  const updateRule = (id, partial) => {
    setRules((prev) => prev.map((rule) => (rule.id === id ? { ...rule, ...partial } : rule)));
  };

  const removeRule = (id) => {
    setRules((prev) => prev.filter((rule) => rule.id !== id));
  };

  const clearEverything = () => {
    setEvents([]);
    setActionLog([]);
    setCounters({});
  };

  const sortedRules = rules.slice();

  return (
    <div className="layout">
      <header className="hero">
        <h1>Loop Lab de Hooks (Codex / Claude / Cursor / Antigravity)</h1>
        <p>
          App didático para receber webhooks e simular ações em cada evento, mostrando
          visualmente como surgem cadeias de eventos.
        </p>
      </header>

      <section className="panel">
        <h2>Conexão + disparo manual</h2>
        <label>
          URL do servidor de webhook
          <input
            type="text"
            value={serverUrl}
            onChange={(event) => setServerUrl(event.target.value)}
            placeholder="http://localhost:4000"
          />
        </label>
        <p className="status">Status SSE: <strong>{status}</strong></p>

        <div className="hook-urls">
          <strong>Endpoints esperados:</strong>
          <ul>
            <li>{normalizeServerUrl(serverUrl)}/hooks/codex</li>
            <li>{normalizeServerUrl(serverUrl)}/hooks/claude</li>
            <li>{normalizeServerUrl(serverUrl)}/hooks/cursor</li>
            <li>{normalizeServerUrl(serverUrl)}/hooks/antigravity</li>
          </ul>
        </div>

        <form onSubmit={sendManualEvent} className="manual-form">
          <h3>Enviar evento de teste</h3>
          <label>
            source
            <select value={manualSource} onChange={(event) => setManualSource(event.target.value)}>
              <option value="codex">codex</option>
              <option value="claude">claude</option>
              <option value="cursor">cursor</option>
              <option value="antigravity">antigravity</option>
            </select>
          </label>
          <label>
            event
            <input value={manualEventName} onChange={(event) => setManualEventName(event.target.value)} />
          </label>
          <label>
            payload (JSON)
            <textarea
              value={manualPayload}
              onChange={(event) => setManualPayload(event.target.value)}
            />
          </label>
          <div className="row-actions">
            <button type="submit">Enviar para /hooks/:source</button>
            <button type="button" onClick={clearEverything}>Limpar logs e contadores</button>
          </div>
          {manualError ? <p className="error">{manualError}</p> : null}
        </form>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Regras de Ação (simuladas)</h2>
          <button onClick={addRule}>Nova regra</button>
        </div>

        {sortedRules.map((rule) => (
          <article className="rule" key={rule.id}>
            <div className="rule-head">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(event) => updateRule(rule.id, { enabled: event.target.checked })}
                />
                ativa
              </label>
              <input
                type="text"
                value={rule.name}
                className="rule-name"
                onChange={(event) => updateRule(rule.id, { name: event.target.value })}
              />
              <button onClick={() => removeRule(rule.id)} className="ghost">remover</button>
            </div>

            <div className="rule-grid">
              <label>
                Fonte (wildcard)
                <input
                  value={rule.sourcePattern}
                  onChange={(event) => updateRule(rule.id, { sourcePattern: event.target.value })}
                />
              </label>
              <label>
                Evento (wildcard)
                <input
                  value={rule.eventPattern}
                  onChange={(event) => updateRule(rule.id, { eventPattern: event.target.value })}
                />
              </label>
              <label>
                Ação
                <select
                  value={rule.action}
                  onChange={(event) => updateRule(rule.id, { action: event.target.value })}
                >
                  <option value="note">Adicionar anotação no log</option>
                  <option value="counter">Incrementar contador</option>
                  <option value="emit">Emitir evento sintético</option>
                </select>
              </label>
              <label>
                Máximo de profundidade
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={rule.maxDepth}
                  onChange={(event) => updateRule(rule.id, { maxDepth: Number(event.target.value) || 1 })}
                />
              </label>
            </div>

            {rule.action === 'note' && (
              <label>
                Template da anotação
                <input
                  value={rule.noteTemplate}
                  onChange={(event) => updateRule(rule.id, { noteTemplate: event.target.value })}
                />
              </label>
            )}

            {rule.action === 'counter' && (
              <label>
                Nome do contador
                <input
                  value={rule.counterName}
                  onChange={(event) => updateRule(rule.id, { counterName: event.target.value })}
                />
              </label>
            )}

            {rule.action === 'emit' && (
              <>
                <div className="rule-grid">
                  <label>
                    Fonte do evento sintético
                    <input
                      value={rule.emitSourceTemplate}
                      onChange={(event) => updateRule(rule.id, { emitSourceTemplate: event.target.value })}
                    />
                  </label>
                  <label>
                    Nome do evento sintético
                    <input
                      value={rule.emitEventTemplate}
                      onChange={(event) => updateRule(rule.id, { emitEventTemplate: event.target.value })}
                    />
                  </label>
                  <label>
                    Atraso (ms)
                    <input
                      type="number"
                      min={0}
                      value={rule.emitDelayMs}
                      onChange={(event) => updateRule(rule.id, { emitDelayMs: Number(event.target.value) || 0 })}
                    />
                  </label>
                </div>
                <p className="small">
                  {'Exemplo de template: {{source}}, {{event}}, {{payload.message}}, {{id}}'}
                </p>
              </>
            )}
          </article>
        ))}
      </section>

      <section className="grid-two">
        <article className="panel">
          <h2>Stream de eventos</h2>
          <p className="small">Mostra eventos recebidos e emitidos por regras.</p>
          <div className="log pre">
            {events.length === 0 ? <p className="small">Ainda sem eventos.</p> : null}
            {events.map((event) => (
              <div key={event.id} className="log-item">
                <div>
                  <strong>{new Date(event.receivedAt).toLocaleTimeString()}</strong>
                  {' '}
                  <span>{event.synthetic ? 'sintético' : 'webhook'}</span>
                  {' - '}
                  <span className="badge">{event.source}</span>
                  {' / '}
                  <span className="badge">{event.event}</span>
                  {event.parentEventId ? <span className="muted"> (pai: {event.parentEventId})</span> : null}
                </div>
                <pre>{JSON.stringify(event.payload, null, 2)}</pre>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Ações simuladas</h2>
          <div className="log pre">
            {actionLog.length === 0 ? <p className="small">Ainda sem ação registrada.</p> : null}
            {actionLog.map((line) => (
              <div key={line} className="log-item">
                {line}
              </div>
            ))}
          </div>
          <h3>Contadores</h3>
          <div className="log pre">
            {Object.entries(counters).length === 0 ? <p className="small">Ainda sem contador.</p> : null}
            {Object.entries(counters).map(([name, value]) => (
              <div key={name} className="log-item">
                <strong>{name}:</strong> {value}
              </div>
            ))}
          </div>
        </article>
      </section>

      <footer className="footer">
        <p>
          Dica pedagógica: use um evento com ação “emitir sintético” ligado em “task.started”
          e defina profundidade baixa para observar claramente o loop de reprocessamento.
        </p>
      </footer>
    </div>
  );
}
