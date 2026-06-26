import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_HOOK_SERVER = 'http://localhost:4000';
const EVENT_LIMIT = 250;
const LOG_LIMIT = 250;
const RULES_STORAGE_KEY = 'hook-loop-lab-rules-v1';
const SERVER_STORAGE_KEY = 'hook-loop-lab-server-url';
const DEFAULT_MAX_DEPTH = 6;
const LOCAL_SERVER_CANDIDATES = Array.from({ length: 11 }, (_, index) => `http://localhost:${4000 + index}`);

const SOURCE_PRESETS = ['codex', 'claude', 'cursor', 'antigravity'];

const EVENT_PRESETS = {
  'agent.started': { message: 'Agente iniciado — exemplo para aula' },
  'task.started': { task: 'exemplo', priority: 'high' },
  'agent.completed': { status: 'ok', durationMs: 1200 },
  'task.completed': { result: 'success' }
};

const ACTION_LABELS = {
  note: { label: 'Anotação', icon: '📝' },
  counter: { label: 'Contador', icon: '🔢' },
  emit: { label: 'Emitir', icon: '⚡' }
};

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
  if (!pattern || pattern === '*') return true;
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

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`;

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const normalizeServerUrl = (url) => (url || DEFAULT_HOOK_SERVER).trim().replace(/\/$/, '');

const discoverServerUrl = async (preferredUrl) => {
  const normalized = normalizeServerUrl(preferredUrl);
  const candidates = [normalized, ...LOCAL_SERVER_CANDIDATES.filter((url) => url !== normalized)];

  for (const candidate of candidates) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 700);
    try {
      const response = await fetch(`${candidate}/health`, { signal: controller.signal });
      if (response.ok) return candidate;
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

const validateJson = (text) => {
  try {
    JSON.parse(text);
    return '';
  } catch (error) {
    return error.message || 'JSON inválido';
  }
};

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

const buildEventChain = (events, eventId) => {
  const chain = new Set();
  if (!eventId) return chain;

  const byId = new Map(events.map((e) => [e.id, e]));
  let current = byId.get(eventId);
  while (current) {
    chain.add(current.id);
    current = current.parentEventId ? byId.get(current.parentEventId) : null;
  }

  const findDescendants = (parentId) => {
    for (const e of events) {
      if (e.parentEventId === parentId && !chain.has(e.id)) {
        chain.add(e.id);
        findDescendants(e.id);
      }
    }
  };
  findDescendants(eventId);
  return chain;
};

function StatusBadge({ status }) {
  const labels = {
    conectado: 'Conectado',
    conectando: 'Conectando…',
    desconectado: 'Desconectado'
  };
  return (
    <span className={`status-badge status-${status}`} role="status">
      <span className="status-dot" aria-hidden="true" />
      {labels[status] || status}
    </span>
  );
}

function CopyButton({ text, label = 'Copiar' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e?.stopPropagation?.();
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <button type="button" className="copy-btn" onClick={handleCopy} aria-label={`${label}: ${text}`}>
      {copied ? '✓ Copiado' : label}
    </button>
  );
}

export default function App() {
  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem(SERVER_STORAGE_KEY) || DEFAULT_HOOK_SERVER);
  const [rules, setRules] = useState(() => {
    const stored = localStorage.getItem(RULES_STORAGE_KEY);
    if (!stored) return deepClone(defaultRules);
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
  const [connectionError, setConnectionError] = useState('');
  const [portDetectedNotice, setPortDetectedNotice] = useState('');
  const [reconnectKey, setReconnectKey] = useState(0);
  const [manualSource, setManualSource] = useState('codex');
  const [customSource, setCustomSource] = useState('');
  const [useCustomSource, setUseCustomSource] = useState(false);
  const [manualEventName, setManualEventName] = useState('agent.started');
  const [manualPayload, setManualPayload] = useState(`{
  "message": "exemplo de evento para aula"
}`);
  const [manualError, setManualError] = useState('');
  const [jsonValidationError, setJsonValidationError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState('');
  const [expandedRules, setExpandedRules] = useState(() => new Set());
  const [lastMatchedRuleIds, setLastMatchedRuleIds] = useState([]);
  const [streamFilterSource, setStreamFilterSource] = useState('');
  const [streamFilterEvent, setStreamFilterEvent] = useState('');
  const [streamSearch, setStreamSearch] = useState('');
  const [streamPaused, setStreamPaused] = useState(false);
  const [frozenEvents, setFrozenEvents] = useState(null);
  const [highlightedEventId, setHighlightedEventId] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState('');

  const rulesRef = useRef(rules);
  const pendingTimers = useRef([]);

  useEffect(() => {
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
    rulesRef.current = rules;
  }, [rules]);

  useEffect(() => {
    localStorage.setItem(SERVER_STORAGE_KEY, serverUrl);
  }, [serverUrl]);

  useEffect(() => {
    setJsonValidationError(validateJson(manualPayload));
  }, [manualPayload]);

  const effectiveSource = useCustomSource ? customSource.trim() : manualSource;

  const addEvent = useCallback((event, parentId = null, source = 'remote', depth = 0) => {
    setEvents((prev) => {
      const entry = {
        ...deepClone(event),
        source: event.source || 'unknown',
        event: event.event || event.name || 'unknown',
        receivedAt: event.receivedAt || new Date().toISOString(),
        parentEventId: parentId,
        synthetic: !!event.synthetic,
        origin: source,
        depth
      };
      return [entry, ...prev].slice(0, EVENT_LIMIT);
    });
  }, []);

  const addLog = useCallback((line) => {
    setActionLog((prev) => [`${new Date().toLocaleTimeString()} - ${line}`, ...prev].slice(0, LOG_LIMIT));
  }, []);

  const processEvent = useCallback((event, depth = 0, parentId = null) => {
    addEvent(event, parentId, event.synthetic ? 'simulado' : 'webhook', depth);

    const matched = rulesRef.current.filter((rule) => {
      if (!rule.enabled) return false;
      if (!wildcardMatch(rule.sourcePattern, event.source)) return false;
      if (!wildcardMatch(rule.eventPattern, event.event || event.name || 'unknown')) return false;
      return true;
    });

    setLastMatchedRuleIds(matched.map((r) => r.id));

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
        setCounters((prev) => {
          const next = { ...prev, [counterName]: (prev[counterName] || 0) + 1 };
          addLog(`[${safeRule.name}] contador ${counterName} -> ${next[counterName]}`);
          return next;
        });
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
  }, [addEvent, addLog]);

  useEffect(() => {
    let source;
    let cancelled = false;

    const connect = async () => {
      setConnectionError('');
      setPortDetectedNotice('');
      setStatus('conectando');

      const activeServerUrl = await discoverServerUrl(serverUrl);
      if (cancelled) return;

      const normalized = normalizeServerUrl(serverUrl);
      if (activeServerUrl !== normalized) {
        setPortDetectedNotice(`Servidor detectado automaticamente em ${activeServerUrl}`);
        setServerUrl(activeServerUrl);
        return;
      }

      const target = `${activeServerUrl}/events/stream`;
      source = new EventSource(target);

      source.addEventListener('open', () => {
        setStatus('conectado');
        setConnectionError('');
      });

      source.addEventListener('error', () => {
        setStatus('desconectado');
        setConnectionError(`Não foi possível conectar ao SSE em ${target}. Verifique se o servidor está rodando (npm run dev:api).`);
      });

      source.addEventListener('message', (event) => {
        if (!event.data) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'connected') return;
          processEvent(payload, 0, payload.parentEventId);
        } catch {
          addLog(`Evento inválido recebido: ${event.data}`);
        }
      });
    };

    connect();

    return () => {
      cancelled = true;
      if (source) source.close();
      setStatus('desconectado');
      for (const timer of pendingTimers.current) clearTimeout(timer);
      pendingTimers.current = [];
    };
  }, [serverUrl, reconnectKey, addLog, processEvent]);

  const handleReconnect = () => setReconnectKey((k) => k + 1);

  const formatJson = () => {
    try {
      const parsed = JSON.parse(manualPayload);
      setManualPayload(JSON.stringify(parsed, null, 2));
      setManualError('');
    } catch {
      setManualError('Não é possível formatar: JSON inválido.');
    }
  };

  const applyEventPreset = (eventName) => {
    setManualEventName(eventName);
    if (EVENT_PRESETS[eventName]) {
      setManualPayload(JSON.stringify(EVENT_PRESETS[eventName], null, 2));
    }
  };

  const sendManualEvent = async (event) => {
    event.preventDefault();
    setManualError('');
    setSendSuccess('');

    if (jsonValidationError) {
      setManualError('Corrija o JSON antes de enviar.');
      return;
    }

    if (!effectiveSource.trim()) {
      setManualError('Informe um source válido.');
      return;
    }

    let parsedPayload;
    try {
      parsedPayload = JSON.parse(manualPayload);
    } catch {
      setManualError('Payload JSON inválido.');
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(`${normalizeServerUrl(serverUrl)}/hooks/${effectiveSource}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: effectiveSource,
          event: manualEventName,
          payload: parsedPayload
        })
      });

      if (!response.ok) {
        throw new Error(`Erro ao enviar: ${response.status} ${response.statusText}`);
      }

      setSendSuccess(`Evento enviado com sucesso para ${effectiveSource}/${manualEventName}`);
      addLog(`Evento manual enviado para ${effectiveSource}/${manualEventName}`);
      setTimeout(() => setSendSuccess(''), 4000);
    } catch (error) {
      setManualError(error.message || 'Falha ao enviar evento manual');
    } finally {
      setIsSending(false);
    }
  };

  const addRule = () => {
    const rule = normalizeRule({ name: `Regra ${rules.length + 1}` });
    setRules((prev) => [...prev, rule]);
    setExpandedRules((prev) => new Set([...prev, rule.id]));
  };

  const updateRule = (id, partial) => {
    setRules((prev) => prev.map((rule) => (rule.id === id ? { ...rule, ...partial } : rule)));
  };

  const removeRule = (id) => {
    setRules((prev) => prev.filter((rule) => rule.id !== id));
    setExpandedRules((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const duplicateRule = (id) => {
    setRules((prev) => {
      const original = prev.find((r) => r.id === id);
      if (!original) return prev;
      const copy = deepClone(original);
      delete copy.id;
      const duplicated = normalizeRule({ ...copy, name: `${original.name} (cópia)` });
      setExpandedRules((expanded) => new Set([...expanded, duplicated.id]));
      return [...prev, duplicated];
    });
  };

  const toggleAllRules = (enabled) => {
    setRules((prev) => prev.map((rule) => ({ ...rule, enabled })));
  };

  const toggleRuleExpanded = (id) => {
    setExpandedRules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearStream = () => {
    setEvents([]);
    setHighlightedEventId(null);
    setFrozenEvents(null);
    setStreamPaused(false);
  };

  const clearLogsAndCounters = () => {
    setActionLog([]);
    setCounters({});
  };

  const filteredEvents = useMemo(() => {
    const search = streamSearch.trim().toLowerCase();
    return events.filter((event) => {
      if (streamFilterSource && !event.source.toLowerCase().includes(streamFilterSource.toLowerCase())) return false;
      if (streamFilterEvent && !event.event.toLowerCase().includes(streamFilterEvent.toLowerCase())) return false;
      if (search) {
        const haystack = `${event.source} ${event.event} ${JSON.stringify(event.payload)}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [events, streamFilterSource, streamFilterEvent, streamSearch]);

  const displayEvents = streamPaused && frozenEvents !== null ? frozenEvents : filteredEvents;

  const eventChain = useMemo(
    () => (highlightedEventId ? buildEventChain(events, highlightedEventId) : new Set()),
    [events, highlightedEventId]
  );

  const handleTogglePause = () => {
    if (!streamPaused) {
      setFrozenEvents(filteredEvents);
      setStreamPaused(true);
    } else {
      setStreamPaused(false);
      setFrozenEvents(null);
    }
  };

  const handleEventClick = (eventId) => {
    setHighlightedEventId((prev) => (prev === eventId ? null : eventId));
  };

  const normalizedUrl = normalizeServerUrl(serverUrl);
  const hookEndpoints = SOURCE_PRESETS.map((s) => `${normalizedUrl}/hooks/${s}`);

  return (
    <div className="layout">
      <header className="hero">
        <h1>Loop Lab de Hooks</h1>
        <p>
          Laboratório didático para receber webhooks (Codex, Claude, Cursor, Antigravity),
          configurar regras e observar cadeias de eventos em tempo real.
        </p>
      </header>

      {/* Live region for status and feedback */}
      <div className="sr-live" aria-live="polite" aria-atomic="true">
        {status === 'conectado' ? 'Conexão SSE ativa.' : null}
        {connectionError ? connectionError : null}
        {sendSuccess ? sendSuccess : null}
        {copyFeedback ? copyFeedback : null}
      </div>

      <section className="panel">
        <h2>Conexão com o servidor</h2>
        <p className="small">Conecte-se ao servidor de webhooks para receber eventos via SSE.</p>

        <label htmlFor="server-url">
          URL do servidor
          <input
            id="server-url"
            type="text"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="http://localhost:4000"
          />
        </label>

        <div className="connection-bar">
          <StatusBadge status={status} />
          {status === 'desconectado' && (
            <button type="button" className="reconnect-btn" onClick={handleReconnect}>
              Reconectar
            </button>
          )}
        </div>

        {portDetectedNotice && <p className="notice">{portDetectedNotice}</p>}
        {connectionError && status === 'desconectado' && (
          <p className="error" role="alert">{connectionError}</p>
        )}

        <div className="hook-urls">
          <strong>Endpoints de webhook</strong>
          <ul className="endpoint-list">
            {hookEndpoints.map((url) => (
              <li key={url}>
                <code>{url}</code>
                <CopyButton text={url} label="Copiar" />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="panel">
        <h2>Enviar evento de teste</h2>
        <p className="small">Simule um webhook manualmente para testar regras e observar o stream.</p>

        <form onSubmit={sendManualEvent} className="manual-form">
          <div className="source-row">
            <label htmlFor="manual-source">
              source
              {!useCustomSource ? (
                <select
                  id="manual-source"
                  value={manualSource}
                  onChange={(e) => setManualSource(e.target.value)}
                >
                  {SOURCE_PRESETS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <input
                  id="manual-source"
                  value={customSource}
                  onChange={(e) => setCustomSource(e.target.value)}
                  placeholder="source customizado"
                />
              )}
            </label>
            <label className="toggle custom-source-toggle">
              <input
                type="checkbox"
                checked={useCustomSource}
                onChange={(e) => setUseCustomSource(e.target.checked)}
              />
              source customizado
            </label>
          </div>

          <label htmlFor="manual-event">
            event
            <input
              id="manual-event"
              value={manualEventName}
              onChange={(e) => setManualEventName(e.target.value)}
              list="event-presets"
            />
            <datalist id="event-presets">
              {Object.keys(EVENT_PRESETS).map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>

          <div className="preset-row">
            <span className="small">Presets rápidos:</span>
            {Object.keys(EVENT_PRESETS).map((name) => (
              <button key={name} type="button" className="preset-btn" onClick={() => applyEventPreset(name)}>
                {name}
              </button>
            ))}
          </div>

          <label htmlFor="manual-payload">
            payload (JSON)
            <textarea
              id="manual-payload"
              value={manualPayload}
              onChange={(e) => setManualPayload(e.target.value)}
              className={jsonValidationError ? 'input-error' : ''}
              aria-invalid={!!jsonValidationError}
              aria-describedby={jsonValidationError ? 'json-error' : undefined}
            />
          </label>

          {jsonValidationError && (
            <p id="json-error" className="error" role="alert">
              JSON inválido: {jsonValidationError}
            </p>
          )}

          <div className="row-actions">
            <button type="button" className="ghost" onClick={formatJson}>Formatar JSON</button>
            <button type="submit" disabled={isSending || !!jsonValidationError}>
              {isSending ? 'Enviando…' : 'Enviar evento'}
            </button>
          </div>

          {manualError && <p className="error" role="alert">{manualError}</p>}
          {sendSuccess && <p className="success" role="status">{sendSuccess}</p>}
        </form>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Regras de ação</h2>
          <div className="panel-actions">
            <button type="button" className="ghost" onClick={() => toggleAllRules(true)}>Ativar todas</button>
            <button type="button" className="ghost" onClick={() => toggleAllRules(false)}>Desativar todas</button>
            <button type="button" onClick={addRule}>Nova regra</button>
          </div>
        </div>
        <p className="small">Defina o que acontece quando um evento corresponde a uma regra.</p>

        {rules.map((rule) => {
          const isExpanded = expandedRules.has(rule.id);
          const isMatched = lastMatchedRuleIds.includes(rule.id);
          const actionMeta = ACTION_LABELS[rule.action] || { label: rule.action, icon: '•' };

          return (
            <article
              className={`rule ${isMatched ? 'rule-matched' : ''} ${!rule.enabled ? 'rule-disabled' : ''}`}
              key={rule.id}
            >
              <div className="rule-summary" onClick={() => toggleRuleExpanded(rule.id)} role="button" tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && toggleRuleExpanded(rule.id)}
                aria-expanded={isExpanded}
              >
                <label className="toggle" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) => updateRule(rule.id, { enabled: e.target.checked })}
                  />
                  ativa
                </label>
                <span className={`action-badge action-${rule.action}`}>
                  {actionMeta.icon} {actionMeta.label}
                </span>
                <span className="rule-summary-name">{rule.name}</span>
                <span className="rule-summary-patterns">
                  {rule.sourcePattern} → {rule.eventPattern}
                </span>
                {isMatched && <span className="matched-badge">casou</span>}
                <span className="expand-icon" aria-hidden="true">{isExpanded ? '▾' : '▸'}</span>
              </div>

              {isExpanded && (
                <div className="rule-body">
                  <div className="rule-head">
                    <input
                      type="text"
                      value={rule.name}
                      className="rule-name"
                      onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                      aria-label="Nome da regra"
                    />
                    <button type="button" className="ghost" onClick={() => duplicateRule(rule.id)}>Duplicar</button>
                    <button type="button" className="ghost" onClick={() => removeRule(rule.id)}>Remover</button>
                  </div>

                  <div className="rule-grid">
                    <label>
                      Fonte (wildcard)
                      <input
                        value={rule.sourcePattern}
                        onChange={(e) => updateRule(rule.id, { sourcePattern: e.target.value })}
                      />
                    </label>
                    <label>
                      Evento (wildcard)
                      <input
                        value={rule.eventPattern}
                        onChange={(e) => updateRule(rule.id, { eventPattern: e.target.value })}
                      />
                    </label>
                    <label>
                      Ação
                      <select
                        value={rule.action}
                        onChange={(e) => updateRule(rule.id, { action: e.target.value })}
                      >
                        <option value="note">Adicionar anotação no log</option>
                        <option value="counter">Incrementar contador</option>
                        <option value="emit">Emitir evento sintético</option>
                      </select>
                    </label>
                    {rule.action === 'emit' && (
                      <label>
                        Máximo de profundidade
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={rule.maxDepth}
                          onChange={(e) => updateRule(rule.id, { maxDepth: Number(e.target.value) || 1 })}
                        />
                      </label>
                    )}
                  </div>

                  {rule.action === 'note' && (
                    <label>
                      Template da anotação
                      <input
                        value={rule.noteTemplate}
                        onChange={(e) => updateRule(rule.id, { noteTemplate: e.target.value })}
                      />
                    </label>
                  )}

                  {rule.action === 'counter' && (
                    <label>
                      Nome do contador
                      <input
                        value={rule.counterName}
                        onChange={(e) => updateRule(rule.id, { counterName: e.target.value })}
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
                            onChange={(e) => updateRule(rule.id, { emitSourceTemplate: e.target.value })}
                          />
                        </label>
                        <label>
                          Nome do evento sintético
                          <input
                            value={rule.emitEventTemplate}
                            onChange={(e) => updateRule(rule.id, { emitEventTemplate: e.target.value })}
                          />
                        </label>
                        <label>
                          Atraso (ms)
                          <input
                            type="number"
                            min={0}
                            value={rule.emitDelayMs}
                            onChange={(e) => updateRule(rule.id, { emitDelayMs: Number(e.target.value) || 0 })}
                          />
                        </label>
                      </div>
                      <p className="small">
                        Templates: {'{{source}}'}, {'{{event}}'}, {'{{payload.message}}'}, {'{{id}}'}, {'{{depth}}'}
                      </p>
                    </>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </section>

      <section className="grid-two">
        <article className="panel">
          <div className="panel-head">
            <h2>Stream de eventos</h2>
            <div className="panel-actions">
              <button type="button" className="ghost" onClick={handleTogglePause}>
                {streamPaused ? 'Retomar' : 'Pausar'}
              </button>
              <button type="button" className="ghost" onClick={clearStream}>Limpar stream</button>
            </div>
          </div>
          <p className="small">
            Eventos recebidos e emitidos por regras.
            {streamPaused && <span className="paused-badge"> Pausado — novos eventos não atualizam a lista.</span>}
          </p>

          <div className="stream-filters">
            <label>
              Filtrar source
              <input
                value={streamFilterSource}
                onChange={(e) => setStreamFilterSource(e.target.value)}
                placeholder="ex: cursor"
              />
            </label>
            <label>
              Filtrar event
              <input
                value={streamFilterEvent}
                onChange={(e) => setStreamFilterEvent(e.target.value)}
                placeholder="ex: task.*"
              />
            </label>
            <label>
              Buscar
              <input
                value={streamSearch}
                onChange={(e) => setStreamSearch(e.target.value)}
                placeholder="texto no payload…"
              />
            </label>
          </div>

          <div className="log pre" role="log" aria-label="Stream de eventos">
            {displayEvents.length === 0 ? (
              <p className="small">Ainda sem eventos. Envie um evento de teste ou dispare um webhook.</p>
            ) : null}
            {displayEvents.map((event) => {
              const inChain = eventChain.has(event.id);
              const isHighlighted = highlightedEventId === event.id;
              return (
                <div
                  key={event.id}
                  className={`log-item event-item ${event.synthetic ? 'event-synthetic' : 'event-webhook'} ${inChain ? 'event-in-chain' : ''} ${isHighlighted ? 'event-highlighted' : ''}`}
                  onClick={() => handleEventClick(event.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleEventClick(event.id)}
                  aria-label={`Evento ${event.source}/${event.event}${event.parentEventId ? ', filho de ' + event.parentEventId : ''}`}
                >
                  <div className="event-header">
                    <strong>{new Date(event.receivedAt).toLocaleTimeString()}</strong>
                    <span className={`origin-badge ${event.synthetic ? 'origin-synthetic' : 'origin-webhook'}`}>
                      {event.synthetic ? '⚡ sintético' : '📡 webhook'}
                    </span>
                    <span className="badge">{event.source}</span>
                    <span className="badge">{event.event}</span>
                    {event.depth > 0 && <span className="depth-badge">depth {event.depth}</span>}
                    {event.parentEventId && (
                      <button
                        type="button"
                        className="parent-link"
                        onClick={(e) => { e.stopPropagation(); handleEventClick(event.parentEventId); }}
                      >
                        ↑ pai
                      </button>
                    )}
                    <CopyButton text={JSON.stringify(event, null, 2)} label="Copiar" />
                  </div>
                  <pre>{JSON.stringify(event.payload, null, 2)}</pre>
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h2>Ações simuladas</h2>
            <button type="button" className="ghost" onClick={clearLogsAndCounters}>Limpar logs</button>
          </div>

          <div className="log pre" role="log" aria-label="Log de ações">
            {actionLog.length === 0 ? <p className="small">Ainda sem ação registrada.</p> : null}
            {actionLog.map((line, i) => (
              <div key={`${line}-${i}`} className="log-item log-action">{line}</div>
            ))}
          </div>

          <h3>Contadores</h3>
          <div className="counters-grid">
            {Object.entries(counters).length === 0 ? (
              <p className="small">Ainda sem contador.</p>
            ) : (
              Object.entries(counters).map(([name, value]) => (
                <div key={name} className="counter-card">
                  <span className="counter-name">{name}</span>
                  <span className="counter-value">{value}</span>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <footer className="footer">
        <p>
          <strong>Dica de aula:</strong> ative a regra &quot;Simular cadeia em Cursor&quot;, envie um evento
          <code> task.started</code> com source <code>cursor</code> e profundidade baixa (2–3) para
          observar visualmente o loop pai → filho no stream.
        </p>
      </footer>
    </div>
  );
}
