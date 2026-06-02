#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const TRACKING_PARAMS = new Set([
  'fbclid',
  'gclid',
  'igshid',
  'mc_cid',
  'mc_eid',
  'ref',
  'source',
  'utm_campaign',
  'utm_content',
  'utm_medium',
  'utm_source',
  'utm_term',
]);

const BROWSER_ROOTS = [
  ['Google Chrome', '~/Library/Application Support/Google/Chrome'],
  ['Chromium', '~/Library/Application Support/Chromium'],
  ['Microsoft Edge', '~/Library/Application Support/Microsoft Edge'],
  ['Brave Browser', '~/Library/Application Support/BraveSoftware/Brave-Browser'],
  ['Vivaldi', '~/Library/Application Support/Vivaldi'],
  ['Opera', '~/Library/Application Support/com.operasoftware.Opera'],
];

function expandHome(value) {
  return value.replace(/^~(?=$|\/)/, os.homedir());
}

function parseArgs(argv) {
  const args = {
    outDir: path.resolve('out'),
    write: true,
    skipLinkCheck: false,
    limit: Infinity,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === '--out' && argv[i + 1]) {
      args.outDir = path.resolve(argv[i + 1]);
      i += 1;
    } else if (current === '--no-write') {
      args.write = false;
    } else if (current === '--skip-link-check') {
      args.skipLinkCheck = true;
    } else if (current === '--limit' && argv[i + 1]) {
      args.limit = Number(argv[i + 1]) || Infinity;
      i += 1;
    } else if (current === '--help') {
      args.help = true;
    }
  }

  return args;
}

function discoverSources() {
  const sources = [];
  for (const [browser, rootPath] of BROWSER_ROOTS) {
    const root = expandHome(rootPath);
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const profilePath = path.join(root, entry.name, 'Bookmarks');
      if (fs.existsSync(profilePath)) {
        sources.push({
          browser,
          profile: entry.name,
          filePath: profilePath,
        });
      }
    }
  }
  return sources;
}

function parseBookmarkFile(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const items = [];

  const walk = (node, folderTrail) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'url' && node.url) {
      items.push({
        title: node.name?.trim() || node.url,
        url: node.url.trim(),
        folderTrail: folderTrail.slice(),
        dateAdded: chromiumTimeToDate(node.date_added),
      });
      return;
    }

    if (Array.isArray(node.children)) {
      const nextTrail = node.name && node.name.trim() ? [...folderTrail, node.name.trim()] : folderTrail;
      for (const child of node.children) {
        walk(child, nextTrail);
      }
    }
  };

  for (const rootKey of ['bookmark_bar', 'other', 'synced']) {
    walk(raw?.roots?.[rootKey], [rootKey.replace(/_/g, ' ')]);
  }

  return items;
}

function chromiumTimeToDate(value) {
  if (!value) return null;
  const micros = Number(value);
  if (!Number.isFinite(micros)) return null;
  const epochDiffMs = 11644473600000;
  return new Date(micros / 1000 - epochDiffMs);
}

function normalizeUrl(input) {
  try {
    const url = new URL(input);
    url.hash = '';
    const params = url.searchParams;
    for (const key of [...params.keys()]) {
      if (TRACKING_PARAMS.has(key) || key.startsWith('utm_')) {
        params.delete(key);
      }
    }
    url.search = params.toString() ? `?${params}` : '';
    if ((url.protocol === 'http:' && url.port === '80') || (url.protocol === 'https:' && url.port === '443')) {
      url.port = '';
    }
    return url.toString();
  } catch {
    return input.trim();
  }
}

function hostFromUrl(urlString) {
  try {
    return new URL(urlString).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return 'unknown';
  }
}

function sourceScore(source) {
  const profile = source.profile.toLowerCase();
  if (profile === 'default') return 3;
  if (profile.startsWith('profile ')) return 2;
  return 1;
}

function pickCanonical(existing, candidate) {
  const existingScore = scoreBookmark(existing);
  const candidateScore = scoreBookmark(candidate);
  return candidateScore > existingScore ? candidate : existing;
}

function scoreBookmark(bookmark) {
  let score = 0;
  if (bookmark.title && bookmark.title !== bookmark.url) score += 2;
  if (bookmark.folderTrail.length > 1) score += 1;
  if (bookmark.dateAdded) score += 1;
  score += bookmark.sourcePriority;
  return score;
}

async function checkLink(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  const tryFetch = async (method) => {
    const response = await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
    });
    return { ok: response.ok, status: response.status, finalUrl: response.url };
  };

  try {
    let result = await tryFetch('HEAD');
    if (result.status === 405 || result.status === 501 || result.status === 403) {
      result = await tryFetch('GET');
    }
    clearTimeout(timeout);
    return { status: result.status, ok: result.ok, finalUrl: result.finalUrl };
  } catch (error) {
    clearTimeout(timeout);
    return { status: 0, ok: false, error: error?.name === 'AbortError' ? 'timeout' : 'network-error' };
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderBookmarksHtml(groups) {
  const lines = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
    '  <DT><H3 ADD_DATE="0">Organized Bookmarks</H3>',
    '  <DL><p>',
  ];

  for (const [host, items] of groups) {
    lines.push(`    <DT><H3 ADD_DATE="0">${escapeHtml(host)}</H3>`);
    lines.push('    <DL><p>');
    for (const item of items) {
      lines.push(
        `      <DT><A HREF="${escapeHtml(item.normalizedUrl)}" ADD_DATE="0">${escapeHtml(item.title)}</A>`,
      );
    }
    lines.push('    </DL><p>');
  }

  lines.push('  </DL><p>');
  lines.push('</DL><p>');
  return lines.join('\n');
}

function renderReport(summary) {
  const lines = [];
  lines.push('# Bookmark Organizer Report');
  lines.push('');
  lines.push(`- Sources scanned: ${summary.sources.length}`);
  lines.push(`- Bookmarks discovered: ${summary.discovered}`);
  lines.push(`- Unique bookmarks kept: ${summary.unique}`);
  lines.push(`- Duplicates removed: ${summary.duplicatesRemoved}`);
  lines.push(`- Dead links: ${summary.deadLinks.length}`);
  lines.push(`- Output directory: \`${summary.outDir}\``);
  lines.push('');
  lines.push('## Sources');
  for (const source of summary.sources) {
    lines.push(`- ${source.browser} / ${source.profile} - \`${source.filePath}\``);
  }
  lines.push('');
  lines.push('## Top Domains');
  for (const [host, count] of summary.topDomains.slice(0, 12)) {
    lines.push(`- ${host}: ${count}`);
  }
  if (summary.deadLinks.length > 0) {
    lines.push('');
    lines.push('## Dead Links');
    for (const item of summary.deadLinks.slice(0, 20)) {
      lines.push(`- ${item.title} - ${item.normalizedUrl} (${item.status || item.error})`);
    }
  }
  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log([
      'Usage: bookmark-organizer [--out <dir>] [--no-write] [--skip-link-check] [--limit <n>]',
      '',
      'By default the tool scans Chromium-family bookmark stores on macOS and writes a cleaned export to out/.',
    ].join('\n'));
    return;
  }

  const sources = discoverSources();
  if (sources.length === 0) {
    console.error('No browser bookmark files were found.');
    process.exit(1);
  }

  const discovered = [];
  for (const source of sources) {
    const items = parseBookmarkFile(source.filePath);
    const sourcePriority = sourceScore(source);
    for (const item of items) {
      discovered.push({
        ...item,
        source,
        sourcePriority,
        normalizedUrl: normalizeUrl(item.url),
        host: hostFromUrl(item.url),
      });
    }
  }

  const deduped = new Map();
  for (const item of discovered) {
    const existing = deduped.get(item.normalizedUrl);
    if (!existing) {
      deduped.set(item.normalizedUrl, item);
      continue;
    }
    deduped.set(item.normalizedUrl, pickCanonical(existing, item));
  }

  const unique = [...deduped.values()].sort((a, b) => a.host.localeCompare(b.host) || a.title.localeCompare(b.title));

  const groups = new Map();
  for (const item of unique) {
    if (!groups.has(item.host)) groups.set(item.host, []);
    groups.get(item.host).push(item);
  }

  const deadLinks = [];
  if (!args.skipLinkCheck) {
    const toCheck = unique.slice(0, Number.isFinite(args.limit) ? args.limit : unique.length);
    let index = 0;
    const concurrency = 6;
    async function worker() {
      while (index < toCheck.length) {
        const currentIndex = index;
        index += 1;
        const item = toCheck[currentIndex];
        const result = await checkLink(item.normalizedUrl);
        if (!result.ok) {
          deadLinks.push({ ...item, ...result });
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, toCheck.length) }, () => worker()));
  }

  const topDomains = [...groups.entries()]
    .map(([host, items]) => [host, items.length])
    .sort((a, b) => b[1] - a[1]);

  const summary = {
    sources,
    discovered: discovered.length,
    unique: unique.length,
    duplicatesRemoved: discovered.length - unique.length,
    deadLinks,
    topDomains,
    outDir: args.outDir,
  };

  const report = renderReport(summary);
  if (args.write) {
    fs.mkdirSync(args.outDir, { recursive: true });
    fs.writeFileSync(path.join(args.outDir, 'bookmarks-cleaned.html'), renderBookmarksHtml(groups));
    fs.writeFileSync(path.join(args.outDir, 'bookmarks.json'), JSON.stringify(unique, null, 2));
    fs.writeFileSync(path.join(args.outDir, 'report.md'), `${report}\n`);
    console.log(`Wrote cleaned bookmarks to ${path.join(args.outDir, 'bookmarks-cleaned.html')}`);
    console.log(`Wrote report to ${path.join(args.outDir, 'report.md')}`);
  }

  console.log(report);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
