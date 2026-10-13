// Copies the web game (single index.html + bundled fonts) into desktop/game/.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..', '..');
const out = path.resolve(import.meta.dirname, '..', 'game');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(path.join(root, 'index.html'), path.join(out, 'index.html'));
cpSync(path.join(root, 'fonts'), path.join(out, 'fonts'), { recursive: true });
console.log('game copied to', out);
