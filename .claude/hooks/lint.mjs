import { execSync } from 'node:child_process';
import { relative, sep } from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
let raw = '';
for await (const chunk of process.stdin) raw += chunk;

let file;
try {
  const data = JSON.parse(raw);
  file = data.tool_input?.file_path;
} catch { process.exit(0); }

if (!file || !file.endsWith('.js')) process.exit(0);
const rel = relative(root, file).split(sep).join('/');
if (!rel.startsWith('js/') || rel.startsWith('js/vendor/')) process.exit(0);

try {
  execSync(`npx -y eslint@8 --no-eslintrc --env browser,es2022 --parser-options=sourceType:module --rule "no-undef:error" "${rel}"`,
    { cwd: root, stdio: 'pipe', encoding: 'utf8' });
} catch (err) {
  process.stderr.write(`ESLint encontró errores en ${rel}:\n${err.stdout || ''}${err.stderr || ''}`);
  process.exit(2);
}
