import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CORE_DIR = path.join(ROOT_DIR, 'src', 'core');

const FORBIDDEN_IMPORT_PATTERNS = [
  /^react($|\/)/i,
  /^react-dom($|\/)/i,
  /^express($|\/)/i,
  /^hono($|\/)/i,
  /^firebase($|\/)/i,
  /^@firebase\//i,
  /^@cloudflare\//i,
  /^@google-cloud\//i,
  /^cashfree/i,
  /^node:/i,
  /^(fs|path|http|https|crypto|net|tls|child_process|os|process)$/,
  /lucide-react/i,
];

const FORBIDDEN_GLOBAL_PATTERNS = [
  /\bwindow\.(location|localStorage|sessionStorage|fetch|addEventListener|document|navigator)\b/,
  /\bdocument\.(createElement|getElementById|querySelector|querySelectorAll|body|head|cookie|addEventListener|title|location|write)\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bfetch\s*\(/,
  /\bprocess\.env\b/,
  /\bDate\.now\s*\(/,
  /\bMath\.random\s*\(/,
];

function collectTsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      files.push(full);
    }
  }
  return files;
}

function extractImports(source) {
  const imports = [];
  const staticRegex = /\b(?:import|export)\s+(?:type\s+)?[\s\S]*?\bfrom\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = staticRegex.exec(source)) !== null) {
    imports.push(match[1]);
  }
  const sideEffectRegex = /\bimport\s+['"]([^'"]+)['"]/g;
  while ((match = sideEffectRegex.exec(source)) !== null) {
    imports.push(match[1]);
  }
  const dynamicRegex = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dynamicRegex.exec(source)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

function resolveRelativeTs(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec.replace(/\.js$/, '.ts'));
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  const withTs = `${base}.ts`;
  if (fs.existsSync(withTs) && fs.statSync(withTs).isFile()) return withTs;
  const indexTs = path.join(base, 'index.ts');
  if (fs.existsSync(indexTs) && fs.statSync(indexTs).isFile()) return indexTs;
  return null;
}

const files = collectTsFiles(CORE_DIR);
const errors = [];
const graph = new Map();

for (const file of files) {
  const rel = path.relative(ROOT_DIR, file);
  const content = fs.readFileSync(file, 'utf8');
  const imports = extractImports(content);
  const edges = [];

  for (const spec of imports) {
    if (FORBIDDEN_IMPORT_PATTERNS.some((rx) => rx.test(spec))) {
      errors.push(`[FORBIDDEN_IMPORT] ${rel} imports "${spec}"`);
      continue;
    }
    if (spec.startsWith('.')) {
      const target = resolveRelativeTs(file, spec);
      if (!target) {
        errors.push(`[UNRESOLVED_IMPORT] ${rel} imports unresolved relative "${spec}"`);
      } else if (!target.startsWith(CORE_DIR + path.sep) && target !== path.join(CORE_DIR, 'index.ts')) {
        errors.push(`[BOUNDARY_ESCAPE] ${rel} imports outside src/core: "${spec}"`);
      } else {
        edges.push(target);
      }
    } else {
      errors.push(`[EXTERNAL_DEPENDENCY] ${rel} imports external package "${spec}" (core must be zero-dependency)`);
    }
  }

  for (const rx of FORBIDDEN_GLOBAL_PATTERNS) {
    if (rx.test(content)) {
      errors.push(`[NON_DETERMINISTIC_OR_ENV_API] ${rel} matches forbidden pattern ${rx}`);
    }
  }

  graph.set(file, edges);
}

// Detect circular dependencies via DFS
const visiting = new Set();
const visited = new Set();

function dfs(node, stack) {
  if (visiting.has(node)) {
    const cycleStart = stack.indexOf(node);
    const cycle = [...stack.slice(cycleStart), node].map((p) => path.relative(ROOT_DIR, p));
    errors.push(`[CIRCULAR_DEPENDENCY] ${cycle.join(' -> ')}`);
    return;
  }
  if (visited.has(node)) return;
  visiting.add(node);
  stack.push(node);
  for (const next of graph.get(node) ?? []) {
    dfs(next, stack);
  }
  stack.pop();
  visiting.delete(node);
  visited.add(node);
}

for (const file of files) {
  dfs(file, []);
}

if (errors.length > 0) {
  console.error('Core boundary & purity check FAILED:');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log(`Core boundary check passed: ${files.length} modules verified, 0 forbidden imports, 0 cycles.`);
