/**
 * FBX → GLB Konvertierungsscript für Ready Player Me Animationen
 *
 * Voraussetzung: npm install -g fbx2gltf
 *
 * Nutzung:
 *   1. Klone https://github.com/readyplayerme/animation-library
 *   2. Kopiere die gewünschten FBX-Dateien in ./rpm-animations/
 *   3. node scripts/convert-animations.js
 *   4. Die GLB-Dateien landen in public/animations/
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const inputDir = path.resolve(__dirname, '../rpm-animations');
const outputDir = path.resolve(__dirname, '../public/animations');

if (!fs.existsSync(inputDir)) {
  console.log('❌ Quellordner nicht gefunden:', inputDir);
  console.log('');
  console.log('Bitte erstelle den Ordner und lege FBX-Dateien hinein:');
  console.log('  mkdir rpm-animations');
  console.log('  # Kopiere FBX-Dateien aus der RPM Animation Library hierhin');
  console.log('');
  console.log('Erwartete Dateien:');
  console.log('  idle.fbx, dance_basic.fbx, dance_hiphop.fbx,');
  console.log('  dance_breakdance.fbx, dance_freestyle.fbx, miss.fbx');
  process.exit(1);
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const files = fs.readdirSync(inputDir).filter(f => f.toLowerCase().endsWith('.fbx'));

if (files.length === 0) {
  console.log('⚠️ Keine .fbx Dateien gefunden in', inputDir);
  process.exit(1);
}

console.log(`🎬 Konvertiere ${files.length} FBX-Dateien...\n`);

let success = 0;
let failed = 0;

files.forEach(file => {
  const input = path.join(inputDir, file);
  const output = path.join(outputDir, file.replace(/\.fbx$/i, '.glb'));

  console.log(`  Converting: ${file}`);
  try {
    execSync(`fbx2gltf -i "${input}" -o "${output}"`, { stdio: 'pipe' });
    console.log(`  ✅ → ${path.basename(output)}`);
    success++;
  } catch (e) {
    console.error(`  ❌ Fehlgeschlagen: ${file} — ${e.message}`);
    failed++;
  }
});

console.log(`\n🏁 Fertig: ${success} konvertiert, ${failed} fehlgeschlagen`);
console.log(`   Ausgabe: ${outputDir}`);
