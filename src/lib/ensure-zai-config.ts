/**
 * Ensures the z-ai-web-dev-sdk config file exists.
 *
 * Locally: the file is at /etc/.z-ai-config (provided by the sandbox).
 * On Vercel: the config comes from Z_AI_CONFIG env var (set in Vercel dashboard).
 *            This function writes it to every location the SDK might check.
 */

import { writeFileSync, existsSync } from 'fs';
import { tmpdir, homedir } from 'os';
import { join } from 'path';

let ensured = false;

export function ensureZaiConfig(): void {
  if (ensured) return;

  // If the config already exists anywhere the SDK looks, we're done
  const checkPaths = [
    '/etc/.z-ai-config',
    join(process.cwd(), '.z-ai-config'),
    join(homedir(), '.z-ai-config'),
  ];

  for (const p of checkPaths) {
    if (existsSync(p)) {
      console.log(`[ensureZaiConfig] Found at ${p}`);
      ensured = true;
      return;
    }
  }

  // Otherwise, create it from the Z_AI_CONFIG environment variable
  const configJson = process.env.Z_AI_CONFIG;
  if (!configJson) {
    console.error(
      '[ensureZaiConfig] z-ai config not found and Z_AI_CONFIG env var is not set. ' +
      'Go to Vercel → Settings → Environment Variables and add Z_AI_CONFIG.'
    );
    return; // Don't throw — let the SDK show its own error
  }

  // Validate it's valid JSON
  try {
    JSON.parse(configJson);
  } catch {
    console.error('[ensureZaiConfig] Z_AI_CONFIG env var is not valid JSON');
    return;
  }

  // Write to every location the SDK might check
  const writePaths = [
    join(process.cwd(), '.z-ai-config'),
    join(homedir(), '.z-ai-config'),
  ];

  for (const p of writePaths) {
    try {
      writeFileSync(p, configJson, 'utf-8');
      console.log(`[ensureZaiConfig] Wrote config to ${p}`);
    } catch (err) {
      console.warn(`[ensureZaiConfig] Could not write to ${p}:`, err);
    }
  }

  ensured = true;
}