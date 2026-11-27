// Envoltorio de los hooks de graphify (`graphify hook-guard <modo>`).
// Si graphify no está instalado en este PC, sale con 0 en silencio, en vez
// de fallar en cada Bash, Grep, Read o Glob. Si está, le pasa la entrada del
// hook tal cual y devuelve su salida y su código de salida, así un bloqueo
// del guard (código 2) sigue funcionando.
// Uso: node .claude/hooks/graphify.mjs search|read
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';

const modo = process.argv[2];
let raw = '';
for await (const chunk of process.stdin) raw += chunk;

// Busca el ejecutable en el PATH (en Windows, con las extensiones de PATHEXT).
const exts = process.platform === 'win32'
  ? ['', ...(process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';').map((e) => e.toLowerCase())]
  : [''];
const graphify = (process.env.PATH || '').split(delimiter).filter(Boolean)
  .flatMap((dir) => exts.map((ext) => join(dir, 'graphify' + ext)))
  .find((p) => existsSync(p));
if (!graphify || !modo) process.exit(0);

// .cmd y .bat necesitan shell en Windows.
const r = spawnSync(graphify, ['hook-guard', modo], {
  input: raw,
  encoding: 'utf8',
  shell: /\.(cmd|bat)$/i.test(graphify)
});
if (r.error) process.exit(0); // no se pudo lanzar: se salta igual
if (r.stdout) process.stdout.write(r.stdout);
if (r.stderr) process.stderr.write(r.stderr);
process.exit(r.status ?? 0);
