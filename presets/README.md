# Presets de hooks.json

Configurações prontas para cada harness despachar eventos para o **Harness Loop Lab**.
Todas chamam o mesmo dispatcher (`.codex/dispatch-hook.sh`), que descobre o servidor
local automaticamente (portas 4000–4010) e marca os eventos com a `source` correta —
assim cada harness acende seu bloco no diagrama.

| Harness     | Arquivo                         | Onde instalar                                  |
|-------------|----------------------------------|------------------------------------------------|
| Antigravity | `antigravity/hooks.json`        | `.antigravity/hooks.json`                       |
| Claude Code | `claude-code/hooks.json`        | cole a chave `"hooks"` no `.claude/settings.json` |
| Codex       | `codex/hooks.json`              | `.codex/hooks.json`                             |
| Cursor      | `cursor/hooks.json`             | `.cursor/hooks.json`                            |

A forma mais fácil de copiar: abra a aplicação e clique em **⬇ hooks.json** na barra
superior — escolha o harness e use **Copiar** ou **Baixar hooks.json**.

> O esquema do **Cursor** usa eventos camelCase (`beforeShellExecution`, `afterFileEdit`…).
> O do **Antigravity** segue o padrão de command-hooks e pode precisar de ajuste conforme a versão.
