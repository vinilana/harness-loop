import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_HOOK_SERVER = 'http://localhost:4000';
const SERVER_STORAGE_KEY = 'harness-loop-server-url';
const LOCAL_SERVER_CANDIDATES = Array.from({ length: 11 }, (_, i) => `http://localhost:${4000 + i}`);
const FLASH_MS = 1700;
const LOG_PER_NODE = 60;

/* ------------------------------------------------------------------ *
 * Lifecycle model — matches the harness hook diagram.
 * `tone` drives the node colour. `hooks` lists the hook event names
 * (as emitted by the dispatcher) that should light this node up.
 * ------------------------------------------------------------------ */
const NODES = [
  { id: 'SessionStart', label: 'Session Start', tone: 'green', hooks: ['SessionStart'] },
  { id: 'UserPromptSubmit', label: 'UserPromptSubmit', tone: 'plain', hooks: ['UserPromptSubmit'] },
  { id: 'PreToolUse', label: 'PreToolUse', tone: 'loop', hooks: ['PreToolUse'] },
  { id: 'PermissionRequest', label: 'PermissionRequest', tone: 'loop', hooks: ['PermissionRequest'] },
  { id: 'ToolExecutes', label: '[tool executes]', tone: 'tool', hooks: ['ToolExecutes', 'ToolExecute'] },
  { id: 'PostToolUse', label: 'PostToolUse / PostToolUseFailure', tone: 'loop', hooks: ['PostToolUse', 'PostToolUseFailure'] },
  { id: 'PostToolBatch', label: 'PostToolBatch', tone: 'loop', hooks: ['PostToolBatch'] },
  { id: 'Subagent', label: 'SubagentStart / SubagentStop', tone: 'loop', hooks: ['SubagentStart', 'SubagentStop'] },
  { id: 'TaskCreated', label: 'TaskCreated', tone: 'loop', hooks: ['TaskCreated'] },
  { id: 'TaskCompleted', label: 'TaskCompleted', tone: 'loop', hooks: ['TaskCompleted'] },
  { id: 'Stop', label: 'Stop / StopFailure', tone: 'red', hooks: ['Stop', 'StopFailure'] },
  { id: 'TeammateIdle', label: 'TeammateIdle', tone: 'plain', hooks: ['TeammateIdle'] },
  { id: 'PreCompact', label: 'PreCompact', tone: 'plain', hooks: ['PreCompact'] },
  { id: 'PostCompact', label: 'PostCompact', tone: 'plain', hooks: ['PostCompact'] },
  { id: 'SessionEnd', label: 'SessionEnd', tone: 'plain', hooks: ['SessionEnd'] }
];

const RAIL = [
  { id: 'Setup', label: 'Setup', sub: '(Opt-in)', gap: 2, hooks: ['Setup'] },
  { id: 'UserPromptExpansion', label: 'UserPrompt Expansion', sub: '(slash commands)', gap: 14, hooks: ['UserPromptExpansion'] },
  { id: 'PermissionDenied', label: 'Permission Denied', sub: '(auto-mode deny)', gap: 92, hooks: ['PermissionDenied'] },
  { id: 'Elicitation', label: 'Elicitation', sub: '(MCP input)', gap: 8, hooks: ['Elicitation'] },
  { id: 'ElicitationResult', label: 'ElicitationResult', sub: '(MCP input)', gap: 8, hooks: ['ElicitationResult'] },
  { id: 'Notification', label: 'Notification', sub: '(Async)', gap: 214, hooks: ['Notification'] },
  { id: 'ConfigChange', label: 'ConfigChange', sub: '(Async)', gap: 10, hooks: ['ConfigChange'] },
  { id: 'WorktreeCreate', label: 'WorktreeCreate', sub: '(Isolation)', gap: 8, hooks: ['WorktreeCreate'] },
  { id: 'WorktreeRemove', label: 'WorktreeRemove', sub: '(Teardown)', gap: 8, hooks: ['WorktreeRemove'] },
  { id: 'CwdChanged', label: 'CwdChanged FileChanged', sub: '(Env reactive)', gap: 8, hooks: ['CwdChanged', 'FileChanged'] },
  { id: 'InstructionsLoaded', label: 'InstructionsLoaded', sub: '(Async)', gap: 8, hooks: ['InstructionsLoaded'] },
  { id: 'MessageDisplay', label: 'MessageDisplay', sub: '(Display)', gap: 8, hooks: ['MessageDisplay'] }
];

/* Lookup: hook name (and node id) -> canonical node/rail id. */
const norm = (s) => String(s || '').trim().toLowerCase();
const META = {};
const HOOK_INDEX = {};
for (const item of [...NODES, ...RAIL]) {
  META[item.id] = item;
  HOOK_INDEX[norm(item.id)] = item.id;
  for (const h of item.hooks || []) HOOK_INDEX[norm(h)] = item.id;
}

const ALL_HOOK_NAMES = Array.from(
  new Set([...NODES, ...RAIL].flatMap((n) => n.hooks || []))
).sort();

function resolveId(eventName) {
  const raw = norm(eventName);
  if (HOOK_INDEX[raw]) return HOOK_INDEX[raw];
  const base = raw.split('.')[0];
  return HOOK_INDEX[base] || null;
}

/* ------------------------------------------------------------------ *
 * Ready-to-use hooks.json per harness. Every config dispatches to the
 * same lab server through .codex/dispatch-hook.sh, tagging the events
 * with the right source so each harness lights up the diagram.
 * ------------------------------------------------------------------ */
const cmd = (source, hook) => `HOOK_LOOP_SOURCE=${source} .codex/dispatch-hook.sh ${hook}`;
const cmdHook = (source, hook, withMatcher) => ({
  ...(withMatcher ? { matcher: '*' } : {}),
  hooks: [{ type: 'command', command: cmd(source, hook), timeout: 15 }]
});

const HARNESS_CONFIGS = {
  antigravity: {
    label: 'Antigravity',
    filename: 'hooks.json',
    path: '.antigravity/hooks.json',
    note: 'Esquema de command-hooks. Ajuste os nomes conforme sua versão do Antigravity.',
    config: {
      hooks: {
        SessionStart: [cmdHook('antigravity', 'SessionStart')],
        UserPromptSubmit: [cmdHook('antigravity', 'UserPromptSubmit')],
        PreToolUse: [cmdHook('antigravity', 'PreToolUse', true)],
        PostToolUse: [cmdHook('antigravity', 'PostToolUse', true)],
        Stop: [cmdHook('antigravity', 'Stop')]
      }
    }
  },
  'claude-code': {
    label: 'Claude Code',
    filename: 'hooks.json',
    path: '.claude/settings.json (cole a chave "hooks")',
    note: 'No Claude Code os hooks moram no settings.json. Cole o objeto "hooks" abaixo.',
    config: {
      hooks: {
        SessionStart: [cmdHook('claude', 'SessionStart')],
        UserPromptSubmit: [cmdHook('claude', 'UserPromptSubmit')],
        PreToolUse: [cmdHook('claude', 'PreToolUse', true)],
        PostToolUse: [cmdHook('claude', 'PostToolUse', true)],
        SubagentStop: [cmdHook('claude', 'SubagentStop')],
        Stop: [cmdHook('claude', 'Stop')],
        SessionEnd: [cmdHook('claude', 'SessionEnd')]
      }
    }
  },
  codex: {
    label: 'Codex',
    filename: 'hooks.json',
    path: '.codex/hooks.json',
    note: 'Já incluso neste repositório — fonte padrão "codex".',
    config: {
      hooks: {
        SessionStart: [cmdHook('codex', 'SessionStart', true)],
        UserPromptSubmit: [cmdHook('codex', 'UserPromptSubmit')],
        PreToolUse: [cmdHook('codex', 'PreToolUse', true)],
        PostToolUse: [cmdHook('codex', 'PostToolUse', true)],
        PermissionRequest: [cmdHook('codex', 'PermissionRequest', true)],
        Stop: [cmdHook('codex', 'Stop')],
        SessionEnd: [cmdHook('codex', 'SessionEnd')]
      }
    }
  },
  cursor: {
    label: 'Cursor',
    filename: 'hooks.json',
    path: '.cursor/hooks.json',
    note: 'Hooks nativos do Cursor (camelCase, campo "command").',
    config: {
      version: 1,
      hooks: {
        beforeSubmitPrompt: [{ command: cmd('cursor', 'UserPromptSubmit') }],
        beforeShellExecution: [{ command: cmd('cursor', 'PreToolUse') }],
        beforeReadFile: [{ command: cmd('cursor', 'PreToolUse') }],
        afterFileEdit: [{ command: cmd('cursor', 'PostToolUse') }],
        stop: [{ command: cmd('cursor', 'Stop') }]
      }
    }
  }
};

const HARNESS_ORDER = ['antigravity', 'claude-code', 'codex', 'cursor'];

const normalizeServerUrl = (url) => (url || DEFAULT_HOOK_SERVER).trim().replace(/\/$/, '');

const discoverServerUrl = async (preferredUrl) => {
  const normalized = normalizeServerUrl(preferredUrl);
  const candidates = [normalized, ...LOCAL_SERVER_CANDIDATES.filter((u) => u !== normalized)];
  for (const candidate of candidates) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 700);
    try {
      const response = await fetch(`${candidate}/health`, { signal: controller.signal });
      if (response.ok) return candidate;
    } catch {
      /* try next port */
    } finally {
      clearTimeout(timeout);
    }
  }
  return normalized;
};

/* ------------------------------------------------------------------ *
 * Presentational pieces
 * ------------------------------------------------------------------ */
function Node({ node, nonce, count, selected, onSelect }) {
  const [lit, setLit] = useState(false);
  useEffect(() => {
    if (!nonce) return undefined;
    setLit(true);
    const t = setTimeout(() => setLit(false), FLASH_MS);
    return () => clearTimeout(t);
  }, [nonce]);

  return (
    <div
      id={`node-${node.id}`}
      className={`node node--${node.tone} ${lit ? 'is-active' : ''} ${selected ? 'is-selected' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      title={`Ver log de ${node.label}`}
      onClick={() => onSelect(node.id)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(node.id))}
    >
      <span className="node__label">{node.label}</span>
      {count > 0 && <span className="node__count" title={`${count} ativação(ões)`}>{count}</span>}
      {lit && <span className="node__live" aria-hidden="true">● ativo</span>}
    </div>
  );
}

function RailBox({ item, nonce, count, selected, onSelect }) {
  const [lit, setLit] = useState(false);
  useEffect(() => {
    if (!nonce) return undefined;
    setLit(true);
    const t = setTimeout(() => setLit(false), FLASH_MS);
    return () => clearTimeout(t);
  }, [nonce]);

  return (
    <div
      className={`rail-box ${lit ? 'is-active' : ''} ${selected ? 'is-selected' : ''}`}
      style={{ marginTop: item.gap }}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      title={`Ver log de ${item.label}`}
      onClick={() => onSelect(item.id)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(item.id))}
    >
      <span className="rail-box__label">{item.label}</span>
      <span className="rail-box__sub">{item.sub}</span>
      {count > 0 && <span className="rail-box__count">{count}</span>}
      <span className="rail-box__wire" aria-hidden="true" />
    </div>
  );
}

const Down = () => (
  <div className="down" aria-hidden="true">
    <span className="down__line" />
    <span className="down__head" />
  </div>
);

function LogEntry({ entry }) {
  const [open, setOpen] = useState(false);
  const hasPayload = entry.payload !== undefined && entry.payload !== null;
  const time = new Date(entry.at).toLocaleTimeString();
  return (
    <li className="logentry">
      <button type="button" className="logentry__head" onClick={() => setOpen((o) => !o)}>
        <span className="logentry__time">{time}</span>
        <span className="logentry__event">{entry.event}</span>
        <span className="logentry__source">{entry.source}</span>
        {hasPayload && <span className="logentry__chev">{open ? '▾' : '▸'}</span>}
      </button>
      {open && hasPayload && (
        <pre className="logentry__payload">{JSON.stringify(entry.payload, null, 2)}</pre>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ *
 * App
 * ------------------------------------------------------------------ */
export default function App() {
  const [serverUrl, setServerUrl] = useState(
    () => localStorage.getItem(SERVER_STORAGE_KEY) || DEFAULT_HOOK_SERVER
  );
  const [status, setStatus] = useState('desconectado');
  const [connectionError, setConnectionError] = useState('');
  const [reconnectKey, setReconnectKey] = useState(0);

  const [flashes, setFlashes] = useState({});
  const [counts, setCounts] = useState({});
  const [logByNode, setLogByNode] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [banner, setBanner] = useState(null);
  const [recent, setRecent] = useState([]);
  const [simHook, setSimHook] = useState('SessionStart');
  const [showConfigs, setShowConfigs] = useState(false);
  const [harness, setHarness] = useState('codex');
  const [cfgCopied, setCfgCopied] = useState(false);

  const bannerTimer = useRef(null);
  const seq = useRef(0);

  const fitRef = useRef(null);
  const boardRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [fitHeight, setFitHeight] = useState(undefined);

  // Scale the diagram so it always fits the viewport height.
  useLayoutEffect(() => {
    const compute = () => {
      const fit = fitRef.current;
      const board = boardRef.current;
      if (!fit || !board) return;
      const natural = board.scrollHeight; // unaffected by CSS transform
      const top = fit.getBoundingClientRect().top;
      const available = window.innerHeight - top - 14;
      const next = Math.max(0.45, Math.min(1, available / natural));
      setScale(next);
      setFitHeight(natural * next);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [showConfigs, recent.length]);

  useEffect(() => {
    localStorage.setItem(SERVER_STORAGE_KEY, serverUrl);
  }, [serverUrl]);

  // Deep-link: open a hook's log via #log=<hookId>
  useEffect(() => {
    const match = window.location.hash.match(/log=([A-Za-z]+)/);
    if (match && META[match[1]]) setSelectedId(match[1]);
  }, []);

  const activate = useCallback((evt) => {
    const eventName = evt.event;
    const id = resolveId(eventName);
    if (!id) return;
    const meta = META[id];
    const source = evt.source || 'desconhecido';
    const entry = {
      key: `e-${(seq.current += 1)}`,
      event: eventName,
      source,
      payload: evt.payload,
      at: evt.at || new Date().toISOString()
    };

    setFlashes((f) => ({ ...f, [id]: (f[id] || 0) + 1 }));
    setCounts((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
    setLogByNode((m) => ({ ...m, [id]: [entry, ...(m[id] || [])].slice(0, LOG_PER_NODE) }));
    setBanner({ id, label: meta.label, tone: meta.tone, event: eventName, source });
    setRecent((r) => [{ key: entry.key, label: meta.label, event: eventName, source }, ...r].slice(0, 6));
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 2400);
  }, []);

  /* SSE connection */
  useEffect(() => {
    let source;
    let cancelled = false;

    const connect = async () => {
      setConnectionError('');
      setStatus('conectando');

      const activeServerUrl = await discoverServerUrl(serverUrl);
      if (cancelled) return;

      const normalized = normalizeServerUrl(serverUrl);
      if (activeServerUrl !== normalized) {
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
        setConnectionError(`Sem conexão SSE em ${target}. Rode o servidor com "npm run dev:api".`);
      });
      source.addEventListener('message', (evt) => {
        if (!evt.data) return;
        try {
          const payload = JSON.parse(evt.data);
          if (payload.type === 'connected') return;
          activate({
            event: payload.event || payload.name,
            source: payload.source || 'webhook',
            payload: payload.payload !== undefined ? payload.payload : payload,
            at: payload.receivedAt
          });
        } catch {
          /* ignore malformed frames */
        }
      });
    };

    connect();
    return () => {
      cancelled = true;
      if (source) source.close();
      setStatus('desconectado');
    };
  }, [serverUrl, reconnectKey, activate]);

  const statusLabel = { conectado: 'Conectado', conectando: 'Conectando…', desconectado: 'Desconectado' };

  const nonce = (id) => flashes[id] || 0;
  const count = (id) => counts[id] || 0;
  const railById = useMemo(() => Object.fromEntries(RAIL.map((r) => [r.id, r])), []);
  const toggleSelect = useCallback((id) => setSelectedId((cur) => (cur === id ? null : id)), []);

  const spineNode = (id) => {
    const node = NODES.find((n) => n.id === id);
    return (
      <Node
        node={node}
        nonce={nonce(id)}
        count={count(id)}
        selected={selectedId === id}
        onSelect={toggleSelect}
      />
    );
  };

  const selectedMeta = selectedId ? META[selectedId] : null;
  const selectedLog = (selectedId && logByNode[selectedId]) || [];

  const activeCfg = HARNESS_CONFIGS[harness];
  const cfgText = useMemo(() => JSON.stringify(activeCfg.config, null, 2), [activeCfg]);

  const copyCfg = async () => {
    try {
      await navigator.clipboard.writeText(cfgText);
      setCfgCopied(true);
      setTimeout(() => setCfgCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const downloadCfg = () => {
    const blob = new Blob([cfgText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeCfg.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app">
      {/* Activation banner */}
      <div className="sr-live" aria-live="polite">
        {banner ? `Hook ativado: ${banner.event}` : ''}
      </div>
      {banner && (
        <div className={`banner banner--${banner.tone}`} role="status" key={`${banner.id}-${counts[banner.id]}`}>
          <span className="banner__bolt" aria-hidden="true">⚡</span>
          <span className="banner__main">
            <strong>{banner.event}</strong>
            <span className="banner__sub">{banner.label} · origem: {banner.source}</span>
          </span>
        </div>
      )}

      {/* Top bar */}
      <header className="topbar">
        <div className="topbar__title">
          <h1>Harness Loop — Mapa de Hooks</h1>
          <p>Cada hook acende seu bloco no diagrama quando é disparado.</p>
        </div>
        <div className="topbar__controls">
          <span className={`pill pill--${status}`}>
            <span className="pill__dot" /> {statusLabel[status]}
          </span>
          {status === 'desconectado' && (
            <button type="button" className="btn" onClick={() => setReconnectKey((k) => k + 1)}>
              Reconectar
            </button>
          )}
          <button
            type="button"
            className={`btn ${showConfigs ? 'btn--on' : ''}`}
            onClick={() => setShowConfigs((s) => !s)}
            aria-expanded={showConfigs}
          >
            ⬇ hooks.json
          </button>
          <label className="sim">
            <select value={simHook} onChange={(e) => setSimHook(e.target.value)} aria-label="Hook para simular">
              {ALL_HOOK_NAMES.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn--accent"
              onClick={() => activate({ event: simHook, source: 'simulado', payload: { simulated: true, hook: simHook } })}
            >
              Simular
            </button>
          </label>
        </div>
      </header>

      {connectionError && <p className="error" role="alert">{connectionError}</p>}

      {recent.length > 0 && (
        <div className="ticker" aria-hidden="true">
          <span className="ticker__label">Recentes:</span>
          {recent.map((r) => (
            <span key={r.key} className="ticker__item">{r.event}</span>
          ))}
        </div>
      )}

      {/* hooks.json per-harness config */}
      {showConfigs && (
        <section className="cfg" aria-label="Configurações de hooks por harness">
          <div className="cfg__tabs" role="tablist">
            {HARNESS_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={harness === id}
                className={`cfg__tab ${harness === id ? 'is-active' : ''}`}
                onClick={() => setHarness(id)}
              >
                {HARNESS_CONFIGS[id].label}
              </button>
            ))}
          </div>

          <div className="cfg__meta">
            <span className="cfg__path">📁 {activeCfg.path}</span>
            <div className="cfg__actions">
              <button type="button" className="btn" onClick={copyCfg}>
                {cfgCopied ? '✓ Copiado' : 'Copiar'}
              </button>
              <button type="button" className="btn btn--accent" onClick={downloadCfg}>
                Baixar hooks.json
              </button>
            </div>
          </div>

          <p className="cfg__note">{activeCfg.note}</p>
          <pre className="cfg__code">{cfgText}</pre>
        </section>
      )}

      {/* Diagram board (auto-scaled to fit the viewport) */}
      <div className="fit" ref={fitRef} style={{ height: fitHeight }}>
      <div className="board fit__inner" ref={boardRef} style={{ transform: `scale(${scale})` }}>
        {/* Left annotation rail */}
        <aside className="rail">
          {RAIL.map((item) => (
            <RailBox
              key={item.id}
              item={railById[item.id]}
              nonce={nonce(item.id)}
              count={count(item.id)}
              selected={selectedId === item.id}
              onSelect={toggleSelect}
            />
          ))}
        </aside>

        {/* Main lifecycle spine */}
        <main className="flow">
          {/* Resumed-sessions outer return path */}
          <div className="resumed" aria-hidden="true">
            <span className="resumed__label">Resumed Sessions</span>
            <span className="resumed__head" />
          </div>

          {spineNode('SessionStart')}
          <Down />

          <section className="box each-turn">
            <span className="box__label box__label--blue">EACH TURN</span>
            <div className="loop-rail loop-rail--blue" aria-hidden="true" />

            {spineNode('UserPromptSubmit')}
            <Down />

            <section className="box agentic">
              <span className="box__label box__label--orange">AGENTIC LOOP</span>
              <div className="loop-rail loop-rail--orange" aria-hidden="true" />

              {spineNode('PreToolUse')}
              <Down />
              {spineNode('PermissionRequest')}
              <Down />
              {spineNode('ToolExecutes')}
              <Down />
              {spineNode('PostToolUse')}
              <Down />
              {spineNode('PostToolBatch')}
              <Down />
              {spineNode('Subagent')}
              <Down />
              {spineNode('TaskCreated')}
              <Down />
              {spineNode('TaskCompleted')}
            </section>

            <Down />
            {spineNode('Stop')}
          </section>

          <Down />
          {spineNode('TeammateIdle')}
          <Down />
          {spineNode('PreCompact')}
          <Down />
          {spineNode('PostCompact')}
          <Down />
          {spineNode('SessionEnd')}
        </main>
      </div>
      </div>

      {/* Per-hook event log panel */}
      {selectedMeta && (
        <>
          <div className="drawer-scrim" onClick={() => setSelectedId(null)} />
          <aside className="drawer" role="dialog" aria-label={`Log do hook ${selectedMeta.label}`}>
            <header className="drawer__head">
              <div>
                <h2 className="drawer__title">{selectedMeta.label}</h2>
                <p className="drawer__meta">
                  {count(selectedId)} ativação(ões) · hooks: {(selectedMeta.hooks || [selectedMeta.id]).join(', ')}
                </p>
              </div>
              <button type="button" className="drawer__close" onClick={() => setSelectedId(null)} aria-label="Fechar">
                ✕
              </button>
            </header>

            <div className="drawer__body">
              {selectedLog.length === 0 ? (
                <p className="drawer__empty">
                  Nenhum evento registrado ainda para este hook. Dispare-o (ou use “Simular”) para ver o log aqui.
                </p>
              ) : (
                <ul className="drawer__list">
                  {selectedLog.map((entry) => (
                    <LogEntry key={entry.key} entry={entry} />
                  ))}
                </ul>
              )}
            </div>

            {selectedLog.length > 0 && (
              <footer className="drawer__foot">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setLogByNode((m) => ({ ...m, [selectedId]: [] }))}
                >
                  Limpar log deste hook
                </button>
              </footer>
            )}
          </aside>
        </>
      )}
    </div>
  );
}
