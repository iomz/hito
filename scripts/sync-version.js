#!/usr/bin/env node

/**
 * Syncs version from package.json to src-tauri/Cargo.toml
 * This ensures both files have the same version number.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Read version from package.json
const packageJsonPath = join(rootDir, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const version = packageJson.version;

if (!version) {
  console.error('Error: No version found in package.json');
  process.exit(1);
}

// Read Cargo.toml
const cargoTomlPath = join(rootDir, 'src-tauri', 'Cargo.toml');
const cargoToml = readFileSync(cargoTomlPath, 'utf-8');

// Update version in Cargo.toml
// Match: version = "x.y.z" and replace with new version
const versionRegex = /^version\s*=\s*"[^"]*"/m;
const updatedCargoToml = cargoToml.replace(versionRegex, `version = "${version}"`);

if (updatedCargoToml === cargoToml) {
  console.log(`Version already synced: ${version}`);
} else {
  writeFileSync(cargoTomlPath, updatedCargoToml, 'utf-8');
  console.log(`✓ Synced version ${version} to Cargo.toml`);
}

