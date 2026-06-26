#!/usr/bin/env node
/**
 * Receives Codex hook JSON on stdin and POSTs to Hook Loop Lab server.
 * Fails open (exit 0) so agent hooks never block Codex.
 */

import { appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const HOOK_NAME_ARG = process.argv[2] || 'unknown';
const SERVER_URL = (process.env.HOOK_LOOP_SERVER_URL || 'http://localhost:4000').replace(/\/$/, '');
const SOURCE = process.env.HOOK_LOOP_SOURCE || 'codex';
const LOG_FILE = process.env.CODEX_HOOK_LOG_FILE || join(__dirname, '..', 'hooks-log.txt');
const TIMEOUT_MS = Number(process.env.HOOK_LOOP_DISPATCH_TIMEOUT_MS || 5000);
const LOCAL_PORTS = Array.from({ length: 11 }, (_, i) => 4000 + i);

const readStdin = () =>
  new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
  });

const appendLog = (hookName, rawInput, dispatchResult) => {
  try {
    appendFileSync(
      LOG_FILE,
      `===== ${new Date().toISOString()} [${hookName}] =====\n${rawInput}\n[dispatch] ${JSON.stringify(dispatchResult)}\n\n`
    );
  } catch {
    // Logging must not break hook execution.
  }
};

const parseInput = (raw) => {
  if (!raw.trim()) return { hook_event_name: HOOK_NAME_ARG };
  try {
    return JSON.parse(raw);
  } catch {
    return { hook_event_name: HOOK_NAME_ARG, raw_input: raw };
  }
};

const eventNameFromInput = (input) => {
  const base = input.hook_event_name || HOOK_NAME_ARG;
  if (base === 'PostToolUse' && input.tool_name) {
    return `${base}.${input.tool_name}`;
  }
  if (base === 'PreToolUse' && input.tool_name) {
    return `${base}.${input.tool_name}`;
  }
  return base;
};

const discoverServer = async () => {
  const candidates = [
    SERVER_URL,
    ...LOCAL_PORTS.map((port) => `http://localhost:${port}`).filter((url) => url !== SERVER_URL)
  ];

  for (const base of candidates) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 700);
    try {
      const res = await fetch(`${base}/health`, { signal: controller.signal });
      if (res.ok) return base;
    } catch {
      // try next port
    } finally {
      clearTimeout(timer);
    }
  }

  return SERVER_URL;
};

const dispatch = async (serverUrl, eventName, payload) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${serverUrl}/hooks/${SOURCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: SOURCE,
        event: eventName,
        payload
      }),
      signal: controller.signal
    });

    const body = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      status: response.status,
      serverUrl,
      eventId: body.eventId || null
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message || 'dispatch failed',
      serverUrl
    };
  } finally {
    clearTimeout(timer);
  }
};

const main = async () => {
  const raw = await readStdin();
  const input = parseInput(raw);
  const hookName = input.hook_event_name || HOOK_NAME_ARG;
  const eventName = eventNameFromInput(input);

  const payload = {
    ...input,
    hook_event_name: hookName,
    dispatchedAt: new Date().toISOString()
  };

  const serverUrl = await discoverServer();
  const result = await dispatch(serverUrl, eventName, payload);
  appendLog(hookName, raw.trim() || '{}', result);

  process.exit(0);
};

main().catch(() => process.exit(0));
