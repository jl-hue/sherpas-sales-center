// build.js — Compile JSX → JS natif, supprime Babel du fichier final
const fs    = require('fs');
const babel = require('@babel/core');

console.log('🏔️  Sherpas Sales Center — Build');

// Cherche le fichier source : src/index.html ou index.html
let srcPath = 'src/index.html';
if (!fs.existsSync(srcPath)) {
  srcPath = 'index.html';
}
console.log('📄 Source :', srcPath);

let src = fs.readFileSync(srcPath, 'utf8');

// ── Extraire le bloc JSX ─────────────────────────────────────────
const MARKERS = [
  ['<script type="text/jsx-source" id="app-source">', '</script>'],
  ['<script type="text/babel" data-presets="react" data-plugins="transform-class-properties">', '</script>'],
  ['<script type="text/babel">', '</script>'],
];

let jsxCode = null, blockStart = -1, blockEnd = -1;

for (const [open, close] of MARKERS) {
  const idx = src.indexOf(open);
  if (idx !== -1) {
    blockStart = idx;
    const codeStart = idx + open.length;
    const codeEnd   = src.indexOf(close, codeStart);
    blockEnd   = codeEnd + close.length;
    jsxCode    = src.slice(codeStart, codeEnd);
    console.log('✅ Bloc JSX trouvé (' + jsxCode.length + ' chars)');
    break;
  }
}

if (!jsxCode) {
  console.error('❌ Aucun bloc JSX trouvé dans', srcPath);
  process.exit(1);
}

// ── Compiler ─────────────────────────────────────────────────────
console.log('⚙️  Compilation Babel...');
let compiled;
try {
  compiled = babel.transformSync(jsxCode, {
    presets:  [['@babel/preset-react', { runtime: 'classic' }]],
    plugins:  ['@babel/plugin-transform-class-properties'],
    compact:  true,
    comments: false,
  }).code;
  console.log('✅ Compilation OK (' + compiled.length + ' chars)');
} catch(e) {
  console.error('❌ Erreur Babel :', e.message);
  process.exit(1);
}

// ── Construire le HTML final ─────────────────────────────────────
let out = src;

// Remplacer le bloc JSX par le JS compilé
out = out.slice(0, blockStart)
  + '<script>\n' + compiled + '\n</script>'
  + out.slice(blockEnd);

// Supprimer les balises Babel CDN
out = out.replace(/<script[^>]*babel\.min\.js[^>]*><\/script>\n?/g, '');
out = out.replace(/<link[^>]*babel\.min\.js[^>]*\/>\n?/g, '');

// Supprimer le bloc cache localStorage
const cacheStart = out.indexOf('<!-- Cache check');
const cacheEnd   = out.indexOf('})();\n</script>', cacheStart);
if (cacheStart !== -1 && cacheEnd !== -1) {
  out = out.slice(0, cacheStart) + out.slice(cacheEnd + '})();\n</script>'.length);
}

// Supprimer le lanceur intelligent
const launchStart = out.indexOf('<!-- Lanceur intelligent');
const launchEnd   = out.indexOf('})();\n</script>', launchStart);
if (launchStart !== -1 && launchEnd !== -1) {
  out = out.slice(0, launchStart) + out.slice(launchEnd + '})();\n</script>'.length);
}

fs.writeFileSync('index.html', out, 'utf8');

console.log('');
console.log('✅ index.html prêt pour GitHub Pages');
console.log('   Taille : ' + (out.length / 1024).toFixed(0) + ' KB');
console.log('   Babel  : absent ✓');
