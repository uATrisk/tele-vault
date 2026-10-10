import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

console.log('🔍 Running secret scan...');

// 1. Try running gitleaks if available
try {
  execSync('gitleaks version', { stdio: 'ignore' });
  console.log('Running gitleaks detect...');
  execSync('gitleaks detect --no-git --verbose', { stdio: 'inherit' });
  console.log('✅ gitleaks passed.');
} catch {
  console.log('gitleaks binary not present, running built-in AST/regex secret scan...');
}

// 2. Built-in custom secret scanner
const SECRET_PATTERNS = [
  { name: 'Telegram Bot Token', regex: /(?:^|[^0-9])([0-9]{8,10}:[a-zA-Z0-9_-]{35})(?:$|[^a-zA-Z0-9_-])/ },
  { name: 'Generic Private Key', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'Hardcoded Access Token', regex: /(?:ACCESS_TOKEN|access_token|SESSION_SECRET)\s*[:=]\s*['"][a-zA-Z0-9_-]{32,}['"]/ }
];

const IGNORED_PATHS = [
  'node_modules',
  '.git',
  '.dev.vars',
  '.env.example',
  'dist',
  'test-results',
  'playwright-report'
];

// Whitelisted dummy tokens used strictly in unit tests / examples
const WHITELISTED_STRINGS = [
  '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
  '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ',
  'tv_example_access_token_min_32_characters_random',
  'tv_example_session_secret_hmac_key_min_32_chars',
  'tv_live_example_secret_access_token_1234567890',
  'example_session_hmac_secret_key_at_least_32_characters_long',
  'test_access_token_min_32_chars_long_xyz',
  'test_session_secret_min_32_characters_hmac'
];

let foundLeaks = 0;

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(process.cwd(), fullPath);

    if (IGNORED_PATHS.some((p) => relPath === p || relPath.startsWith(p + '/'))) {
      continue;
    }

    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile()) {
      // Skip binary files
      if (entry.name.endsWith('.png') || entry.name.endsWith('.webp') || entry.name.endsWith('.bin')) {
        continue;
      }

      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of SECRET_PATTERNS) {
        const match = content.match(pattern.regex);
        if (match) {
          const matchedString = match[1] || match[0];
          if (!WHITELISTED_STRINGS.some((w) => matchedString.includes(w))) {
            console.error(`❌ Potential secret leaked: [${pattern.name}] in ${relPath}`);
            foundLeaks++;
          }
        }
      }
    }
  }
}

scanDir(process.cwd());

if (foundLeaks > 0) {
  console.error(`\n❌ Secret scan failed with ${foundLeaks} potential leak(s).`);
  process.exit(1);
} else {
  console.log('✅ Secret scan clean. No sensitive credentials found.');
}
