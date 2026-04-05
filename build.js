// build.js — Compile le JSX et produit un index.html sans Babel
const fs   = require('fs');
const path = require('path');
const babel = require('@babel/core');

console.log('🏔️  Sherpas Sales Center — Build V5');
console.log('📦 Lecture de src/index.html...');

const src = fs.readFileSync(path.join(__dirname, 'src', 'index.html'), 'utf8');

// ── 1. Extraire le bloc JSX ───────────────────────────────────────
const JSX_START = '<script type="text/jsx-source" id="app-source">';
const JSX_END   = '</script>';

const jsxStartIdx = src.indexOf(JSX_START);
if (jsxStartIdx === -1) {
  console.error('❌ Bloc JSX introuvable dans src/index.html');
  process.exit(1);
}

const jsxCodeStart = jsxStartIdx + JSX_START.length;
const jsxCodeEnd   = src.indexOf(JSX_END, jsxCodeStart);
const jsxCode      = src.slice(jsxCodeStart, jsxCodeEnd);

console.log(`📝 JSX extrait : ${jsxCode.length.toLocaleString()} caractères`);

// ── 2. Compiler avec Babel ────────────────────────────────────────
console.log('⚙️  Compilation Babel...');
const result = babel.transformSync(jsxCode, {
  presets: [
    ['@babel/preset-react', { runtime: 'classic' }]
  ],
  plugins: ['@babel/plugin-transform-class-properties'],
  compact: true,         // minifie le code
  comments: false,       // supprime les commentaires
});

const compiled = result.code;
console.log(`✅ Compilé : ${compiled.length.toLocaleString()} caractères`);

// ── 3. Construire le HTML final ───────────────────────────────────
// Supprimer le bloc JSX source
let out = src.slice(0, jsxStartIdx) + src.slice(jsxCodeEnd + JSX_END.length);

// Supprimer la balise Babel CDN (inutile en production)
out = out.replace(
  /\n?<script[^>]*babel\.min\.js[^>]*><\/script>/g,
  ''
);
out = out.replace(
  /\n?<link[^>]*babel\.min\.js[^>]*\/>/g,
  ''
);

// Supprimer le système de cache localStorage (inutile car déjà compilé)
const CACHE_SCRIPT_START = '\n<!-- Cache check';
const CACHE_SCRIPT_END   = '})();\n</script>';
const cacheIdx = out.indexOf(CACHE_SCRIPT_START);
if (cacheIdx !== -1) {
  const cacheEndIdx = out.indexOf(CACHE_SCRIPT_END, cacheIdx) + CACHE_SCRIPT_END.length;
  out = out.slice(0, cacheIdx) + out.slice(cacheEndIdx);
}

// Supprimer le lanceur (remplacé par le script compilé direct)
const LAUNCHER_START = '\n<!-- Lanceur intelligent';
const LAUNCHER_END   = '})();\n</script>';
const launchIdx = out.indexOf(LAUNCHER_START);
if (launchIdx !== -1) {
  const launchEndIdx = out.indexOf(LAUNCHER_END, launchIdx) + LAUNCHER_END.length;
  out = out.slice(0, launchIdx) + out.slice(launchEndIdx);
}

// Mettre à jour le message de chargement (plus besoin de mentionner Babel)
out = out.replace(
  "if(window.__compiledJS) {\n  if(msgEl) msgEl.textContent = 'Démarrage instantané…';\n  if(badgeEl){ badgeEl.textContent = '⚡ Cache actif'; badgeEl.style.display='inline-block'; }\n} else {\n  if(msgEl) msgEl.textContent = 'Première ouverture — compilation en cours…';\n  if(badgeEl){ badgeEl.textContent = '⏳ Compilation (une seule fois)'; badgeEl.style.display='inline-block'; }\n}",
  "if(msgEl) msgEl.textContent = 'Chargement…';"
);

// Injecter le JS compilé avant </body>
const INJECT_BEFORE = '</body>';
const compiledBlock = `\n<script>\n${compiled}\n</script>\n`;
out = out.replace(INJECT_BEFORE, compiledBlock + INJECT_BEFORE);

// ── 4. Écrire le fichier final ────────────────────────────────────
fs.writeFileSync(path.join(__dirname, 'index.html'), out, 'utf8');

const srcSize  = (src.length / 1024).toFixed(0);
const outSize  = (out.length / 1024).toFixed(0);
console.log(`\n✅ index.html généré`);
console.log(`   Source  : ${srcSize} KB`);
console.log(`   Produit : ${outSize} KB`);
console.log(`   Babel   : ❌ plus présent dans le fichier déployé`);
console.log('\n🚀 Prêt pour GitHub Pages !');
