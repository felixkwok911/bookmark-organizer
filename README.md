# Bookmark Organizer

Automatically scans local browser bookmark stores, cleans the URLs, removes duplicates, checks for dead links, and writes a sorted export plus a short audit report.

## What it does

- Finds Chromium-family bookmark files on your Mac automatically
- Normalizes URLs by stripping common tracking parameters
- Deduplicates bookmarks across profiles
- Groups results by domain for a cleaner export
- Checks bookmarks for broken links
- Writes a report instead of modifying your browser data in place

## Usage

```bash
npm install
npm start
```

Outputs are written to `out/` by default:

- `out/bookmarks-cleaned.html`
- `out/bookmarks.json`
- `out/report.md`

## Options

- `--no-write` print the report only
- `--out <dir>` choose a different output directory
- `--skip-link-check` skip network checks for dead links
- `--limit <n>` cap the number of bookmarks checked for link status

## Supported sources

- Google Chrome
- Chromium
- Microsoft Edge
- Brave Browser
- Vivaldi
- Opera

