/**
 * Locale quality checker with optional Ollama LLM review.
 *
 * Usage:
 *   npx tsx scripts/check-locale-quality.ts                    # All languages, LLM enabled
 *   npx tsx scripts/check-locale-quality.ts --skip-llm         # Deterministic checks only
 *   npx tsx scripts/check-locale-quality.ts --language=de      # Single language
 *   npx tsx scripts/check-locale-quality.ts --batch-size=30    # Smaller batches for LLM
 *   npx tsx scripts/check-locale-quality.ts --verbose          # Show all checked keys
 */

import { readFileSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename_ = fileURLToPath(import.meta.url);
const __dirname_ = path.dirname(__filename_);

// ─── Configuration ───────────────────────────────────────────────────────────

const OLLAMA_URL = 'http://localhost:11434/api/chat';
const MODEL = 'qwen3:32b';
const BATCH_PAUSE_MS = 2_000;
const REQUEST_TIMEOUT_MS = 120_000;

const LOCALES_DIR = path.resolve(__dirname_, '../src/locales');
const ALL_LANGUAGES = ['de', 'es', 'fr', 'ja', 'ko', 'ru', 'uk', 'zh', 'pl', 'cs', 'it'] as const;
const CJK_LANGUAGES = new Set(['ja', 'ko', 'zh']);

// Keys whose values are proper nouns, brand names, or acronyms that are
// legitimately identical across all languages.
const PROPER_NOUN_KEYS = new Set([
  'plugins.CatalogBrowserPlugin.entries.css',
  'plugins.CatalogBrowserPlugin.entries.hulianwang',
  'plugins.CatalogBrowserPlugin.entries.iridiumNext',
  'plugins.CatalogBrowserPlugin.entries.astSpaceMobile',
  'plugins.CatalogBrowserPlugin.entries.sbas',
  'SatInfoBoxLinks.Heavens_Above.title',
  'plugins.DopsPlugin.toast.dopValues',
  'pluginDrawer.modeExperimental',
  'plugins.TocaPocaPlugin.labels.headerDistance',
]);

// ─── CLI argument parsing ────────────────────────────────────────────────────

interface CliArgs {
  skipLlm: boolean;
  language: string | null;
  batchSize: number;
  verbose: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = { skipLlm: false, language: null, batchSize: 50, verbose: false };

  for (const arg of args) {
    if (arg === '--skip-llm') {
      result.skipLlm = true;
    } else if (arg === '--verbose') {
      result.verbose = true;
    } else if (arg.startsWith('--language=')) {
      result.language = arg.split('=')[1];
    } else if (arg.startsWith('--batch-size=')) {
      result.batchSize = parseInt(arg.split('=')[1], 10);
    }
  }

  return result;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface Issue {
  key: string;
  category: string;
  enValue: string;
  langValue: string;
  reason: string;
}

function flattenKeys(obj: Record<string, unknown>, prefix = ''): [string, string][] {
  const result: [string, string][] = [];

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];

    if (typeof val === 'object' && val !== null) {
      result.push(...flattenKeys(val as Record<string, unknown>, fullKey));
    } else if (typeof val === 'string') {
      result.push([fullKey, val]);
    }
  }

  return result;
}

function loadLocale(lang: string): Map<string, string> {
  const filePath = path.join(LOCALES_DIR, `${lang}.json`);
  const json = JSON.parse(readFileSync(filePath, 'utf8'));

  return new Map(flattenKeys(json));
}

function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{(\w+)\}/gu);

  return matches ? matches.sort() : [];
}

function extractHtmlTags(text: string): string[] {
  const matches = text.match(/<\/?[a-z][a-z0-9]*[^>]*>/giu);

  return matches ? matches.sort() : [];
}

// ─── Phase 1: Deterministic checks ──────────────────────────────────────────

function runDeterministicChecks(enMap: Map<string, string>, langMap: Map<string, string>, lang: string): Issue[] {
  const issues: Issue[] = [];

  for (const [key, enVal] of enMap) {
    const langVal = langMap.get(key);

    if (langVal === undefined) {
      // 0. Missing key — not present in compiled locale file
      issues.push({
        key, category: 'missing-key',
        enValue: enVal.substring(0, 80), langValue: '(missing)',
        reason: 'Key exists in English but missing from this language',
      });
      continue;
    }

    // 1. Placeholder consistency
    const enPlaceholders = extractPlaceholders(enVal);
    const langPlaceholders = extractPlaceholders(langVal);

    if (enPlaceholders.length > 0 && JSON.stringify(enPlaceholders) !== JSON.stringify(langPlaceholders)) {
      issues.push({
        key, category: 'placeholder',
        enValue: enVal, langValue: langVal,
        reason: `Placeholders mismatch: en=${enPlaceholders.join(',')} ${lang}=${langPlaceholders.join(',')}`,
      });
    }

    // 2. HTML tag consistency
    const enTags = extractHtmlTags(enVal);
    const langTags = extractHtmlTags(langVal);

    if (enTags.length > 0 && JSON.stringify(enTags) !== JSON.stringify(langTags)) {
      issues.push({
        key, category: 'html-tags',
        enValue: enVal.substring(0, 80), langValue: langVal.substring(0, 80),
        reason: `HTML tags differ: en has ${enTags.length} tags, ${lang} has ${langTags.length}`,
      });
    }

    // 3. Empty translations
    if (enVal.trim().length >= 4 && langVal.trim().length === 0) {
      issues.push({
        key, category: 'empty',
        enValue: enVal, langValue: '(empty)',
        reason: 'Translation is empty',
      });
    }

    // 4. Untranslated strings (identical to English)
    if (enVal.length > 10 && enVal === langVal && !key.startsWith('countries.') && !PROPER_NOUN_KEYS.has(key) && !(/^[A-Z0-9\-_.:/]+$/u).test(enVal)) {
      issues.push({
        key, category: 'untranslated',
        enValue: enVal.substring(0, 80), langValue: langVal.substring(0, 80),
        reason: 'Identical to English (possibly untranslated)',
      });
    }

    // 5. Suspiciously short
    if (enVal.length >= 20 && !key.startsWith('countries.')) {
      const isCjk = CJK_LANGUAGES.has(lang);
      const minRatio = isCjk ? 0.15 : 0.25;
      const ratio = langVal.length / enVal.length;

      if (ratio < minRatio && langVal.trim().length > 0) {
        issues.push({
          key, category: 'too-short',
          enValue: enVal.substring(0, 80), langValue: langVal,
          reason: `Only ${(ratio * 100).toFixed(0)}% of English length`,
        });
      }
    }
  }

  return issues;
}

// ─── Phase 2: LLM quality review ────────────────────────────────────────────

async function queryOllama(prompt: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as { message?: { content?: string } };

    return data?.message?.content ?? '';
  } finally {
    clearTimeout(timeout);
  }
}

function buildLlmPrompt(lang: string, batch: [string, string, string][]): string {
  const langNames: Record<string, string> = {
    de: 'German', es: 'Spanish', fr: 'French', ja: 'Japanese',
    ko: 'Korean', ru: 'Russian', uk: 'Ukrainian', zh: 'Chinese (Simplified)',
  };
  const langName = langNames[lang] ?? lang;

  const entries = batch.map(([key, en, tr]) => `KEY: ${key}\nEN: ${en}\n${lang.toUpperCase()}: ${tr}`).join('\n\n');

  return `You are a translation quality reviewer for a space tracking application called KeepTrack.
Review the following English → ${langName} translations. Flag ONLY entries with clear problems:
- Wrong or misleading translation
- Truncated or incomplete text
- Placeholder text or lorem ipsum left in
- Wrong formality level for the context
- Obviously machine-translated gibberish

For each problematic entry, respond with exactly:
ISSUE: <key> | <brief reason>

If all translations look acceptable, respond with exactly:
ALL_OK

Do NOT flag minor stylistic differences. Do NOT flag technical terms kept in English (these are intentional in space/satellite software). Do NOT flag HTML tags or placeholders.

${entries}`;
}

async function runLlmReview(
  enMap: Map<string, string>,
  langMap: Map<string, string>,
  lang: string,
  batchSize: number,
): Promise<Issue[]> {
  const issues: Issue[] = [];

  // Build batches of [key, enValue, langValue]
  const entries: [string, string, string][] = [];

  for (const [key, enVal] of enMap) {
    const langVal = langMap.get(key);

    if (langVal === undefined || langVal.trim().length === 0) {
      continue;
    }
    // Skip very short strings and country codes
    if (enVal.length < 10 || key.startsWith('countries.')) {
      continue;
    }
    entries.push([key, enVal, langVal]);
  }

  const totalBatches = Math.ceil(entries.length / batchSize);

  process.stdout.write(`  LLM review: ${entries.length} entries in ${totalBatches} batches\n`);

  for (let i = 0; i < entries.length; i += batchSize) {
    const batchNum = Math.floor(i / batchSize) + 1;
    const batch = entries.slice(i, i + batchSize);

    process.stdout.write(`  Batch ${batchNum}/${totalBatches}...`);

    try {
      const prompt = buildLlmPrompt(lang, batch);
      const response = await queryOllama(prompt);

      if (!response.includes('ALL_OK')) {
        const lines = response.split('\n').filter((l) => l.startsWith('ISSUE:'));

        for (const line of lines) {
          const match = (/^ISSUE:\s*(.+?)\s*\|\s*(.+)$/u).exec(line);

          if (match) {
            const [, flaggedKey, reason] = match;
            const enVal = enMap.get(flaggedKey) ?? '';
            const langVal = langMap.get(flaggedKey) ?? '';

            issues.push({
              key: flaggedKey, category: 'llm-quality',
              enValue: enVal.substring(0, 80), langValue: langVal.substring(0, 80),
              reason,
            });
          }
        }

        process.stdout.write(` ${lines.length} issue(s)\n`);
      } else {
        process.stdout.write(' OK\n');
      }
    } catch (err) {
      process.stdout.write(` ERROR: ${(err as Error).message}\n`);
    }

    // Pause between batches
    if (i + batchSize < entries.length) {
      await new Promise((resolve) => {
        setTimeout(resolve, BATCH_PAUSE_MS);
      });
    }
  }

  return issues;
}

// ─── Phase 3: Report ─────────────────────────────────────────────────────────

function printReport(allIssues: Map<string, Issue[]>): void {
  process.stdout.write('\n# Locale Quality Report\n\n');

  // Summary table
  const categories = ['missing-key', 'placeholder', 'html-tags', 'empty', 'untranslated', 'too-short', 'llm-quality'];

  process.stdout.write('| Language |');
  for (const cat of categories) {
    process.stdout.write(` ${cat} |`);
  }
  process.stdout.write(' Total |\n');

  process.stdout.write('|----------|');
  for (const _cat of categories) {
    process.stdout.write('--------|');
  }
  process.stdout.write('-------|\n');

  let totalIssues = 0;

  for (const [lang, issues] of allIssues) {
    const counts = new Map<string, number>();

    for (const issue of issues) {
      counts.set(issue.category, (counts.get(issue.category) ?? 0) + 1);
    }

    process.stdout.write(`| ${lang} |`);
    for (const cat of categories) {
      const count = counts.get(cat) ?? 0;

      process.stdout.write(` ${count > 0 ? `**${count}**` : '0'} |`);
    }
    process.stdout.write(` ${issues.length} |\n`);
    totalIssues += issues.length;
  }

  process.stdout.write(`\n**Total issues: ${totalIssues}**\n\n`);

  // Detailed issues
  if (totalIssues > 0) {
    process.stdout.write('## Details\n\n');

    for (const [lang, issues] of allIssues) {
      if (issues.length === 0) {
        continue;
      }
      process.stdout.write(`### ${lang} (${issues.length} issues)\n\n`);
      for (const issue of issues) {
        process.stdout.write(`- **[${issue.category}]** \`${issue.key}\`\n`);
        process.stdout.write(`  EN: ${issue.enValue}\n`);
        process.stdout.write(`  ${lang.toUpperCase()}: ${issue.langValue}\n`);
        process.stdout.write(`  Reason: ${issue.reason}\n\n`);
      }
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs();
  const languages = args.language && args.language !== 'all' ? [args.language] : [...ALL_LANGUAGES];

  process.stdout.write('Loading locale files...\n');
  const enMap = loadLocale('en');

  process.stdout.write(`English: ${enMap.size} keys\n\n`);

  const allIssues = new Map<string, Issue[]>();

  for (const lang of languages) {
    process.stdout.write(`Checking ${lang}...\n`);
    const langMap = loadLocale(lang);

    // Phase 1
    const deterministicIssues = runDeterministicChecks(enMap, langMap, lang);

    process.stdout.write(`  Deterministic: ${deterministicIssues.length} issue(s)\n`);

    // Phase 2
    let llmIssues: Issue[] = [];

    if (!args.skipLlm) {
      try {
        llmIssues = await runLlmReview(enMap, langMap, lang, args.batchSize);
      } catch (err) {
        process.stdout.write(`  LLM unavailable: ${(err as Error).message}\n`);
        process.stdout.write('  Skipping LLM review. Run with --skip-llm to suppress this.\n');
      }
    }

    allIssues.set(lang, [...deterministicIssues, ...llmIssues]);
  }

  printReport(allIssues);

  // Exit with error code if issues found
  const totalIssues = [...allIssues.values()].reduce((sum, issues) => sum + issues.length, 0);

  process.exit(totalIssues > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(2);
});
