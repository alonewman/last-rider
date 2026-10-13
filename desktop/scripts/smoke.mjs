// Launches the desktop app headlessly (Linux + Xvfb), presses Enter on the title and checks the run started.
// Usage: npm run smoke            (dev build)
//        npm run smoke -- "dist/Last Rider-linux-x64/Last Rider"   (packaged build)
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const dir = path.resolve(import.meta.dirname, '..');
const exe = process.argv[2] ? path.resolve(dir, process.argv[2]) : path.join(dir, 'node_modules', '.bin', 'electron');
const args = process.argv[2] ? [] : ['.'];
const out = path.join(mkdtempSync(path.join(tmpdir(), 'lr-')), 'smoke.png');
const home = mkdtempSync(path.join(tmpdir(), 'lr-home-')); // fresh profile: no save
const r = spawnSync('xvfb-run', ['-a', '-s', '-screen 0 1920x1080x24', exe, ...args, '--no-sandbox', '--disable-gpu'],
  { cwd: dir, env: { ...process.env, LR_SMOKE: out, HOME: home, XDG_CONFIG_HOME: path.join(home, '.config') }, timeout: 60000 });
let res; try { res = JSON.parse(readFileSync(out + '.json', 'utf8')); } catch { res = { error: 'no result', status: r.status, stderr: String(r.stderr).slice(-800) }; }
rmSync(home, { recursive: true, force: true });
const ok = res.boot && res.boot.state === 'title' && res.boot.desktop && res.boot.font && res.run.state === 'intro' && res.run.ls === '1';
console.log(JSON.stringify(res));
console.log(ok ? `SMOKE OK (screenshot: ${out})` : 'SMOKE FAILED');
process.exit(ok ? 0 : 1);
