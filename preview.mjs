import { fileURLToPath } from 'node:url';

process.env.PORT ||= '8101';
process.env.RACEPOINT_PREVIEW_ROOT = fileURLToPath(new URL('.', import.meta.url));
process.env.RACEPOINT_PREVIEW_HOME = '/entwuerfe/codex-2026-10/prototype/varianten/';
await import('./entwuerfe/codex-2026-10/prototype/preview.mjs');
console.log(`Alle Prototypen: http://127.0.0.1:${process.env.PORT}/`);
