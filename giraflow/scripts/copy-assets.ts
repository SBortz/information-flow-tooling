/**
 * Cross-platform script to copy assets for the public build.
 * Copies schema, AI instructions, and all example wireframes.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(rootDir, '..');
const publicDir = path.join(rootDir, 'public');
const examplesSourceDir = path.join(repoRoot, 'example-giraflows');
const examplesDestDir = path.join(publicDir, 'examples');

function copyFileSync(src: string, dest: string): void {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

function copyDirRecursive(src: string, dest: string): void {
  if (!fs.existsSync(src)) return;

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('Copying assets for public build...\n');

// 1. Copy schema
const schemaSource = path.join(repoRoot, 'giraflow.schema.json');
const schemaDest = path.join(publicDir, 'giraflow.schema.json');
if (fs.existsSync(schemaSource)) {
  copyFileSync(schemaSource, schemaDest);
  console.log('  ✓ giraflow.schema.json');
} else {
  console.warn('  ⚠ giraflow.schema.json not found');
}

// 2. Copy AI instructions
const aiSource = path.join(rootDir, 'giraflow-ai-instructions.md');
const aiDest = path.join(publicDir, 'giraflow-ai-instructions.md');
if (fs.existsSync(aiSource)) {
  copyFileSync(aiSource, aiDest);
  console.log('  ✓ giraflow-ai-instructions.md');
} else {
  console.warn('  ⚠ giraflow-ai-instructions.md not found');
}

// 3. Copy all example wireframes dynamically
if (fs.existsSync(examplesSourceDir)) {
  // Clean existing examples directory
  if (fs.existsSync(examplesDestDir)) {
    fs.rmSync(examplesDestDir, { recursive: true });
  }
  fs.mkdirSync(examplesDestDir, { recursive: true });

  const entries = fs.readdirSync(examplesSourceDir, { withFileTypes: true });
  const giraflowDirs = entries.filter(
    e => e.isDirectory() && e.name.endsWith('.giraflow')
  );

  console.log(`\n  Found ${giraflowDirs.length} example(s):`);

  for (const dir of giraflowDirs) {
    const exampleName = dir.name.replace('.giraflow', '');
    const srcDir = path.join(examplesSourceDir, dir.name);
    const destDir = path.join(examplesDestDir, exampleName);

    // Copy all files from the .giraflow folder (wireframes, images, etc.)
    copyDirRecursive(srcDir, destDir);

    // Count copied files
    const countFiles = (dir: string): number => {
      if (!fs.existsSync(dir)) return 0;
      let count = 0;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          count += countFiles(path.join(dir, entry.name));
        } else {
          count++;
        }
      }
      return count;
    };

    const fileCount = countFiles(destDir);
    console.log(`    ✓ ${exampleName} (${fileCount} files)`);
  }
} else {
  console.warn('\n  ⚠ example-giraflows directory not found');
}

console.log('\nDone!\n');
