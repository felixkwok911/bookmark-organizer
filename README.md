# Bookmark Organizer

Automatic browser bookmark cleanup for macOS.

This tool scans local browser bookmark stores, cleans URLs, removes duplicates, checks for dead links, and writes a sorted export plus a short audit report.

For the Chinese version, see [README-zh.md](./README-zh.md).

## What it does

- Finds Chromium-family bookmark files on your Mac automatically
- Normalizes URLs by stripping common tracking parameters
- Deduplicates bookmarks across profiles
- Groups results by domain for a cleaner export
- Checks bookmarks for broken links
- Writes a report instead of modifying your browser data in place
- Surfaces top folders, top domains, duplicate examples, and browser profile coverage

## Output

The default run writes three files:

- `out/bookmarks-cleaned.html` for re-importing or archiving
- `out/bookmarks.json` for downstream scripting
- `out/report.md` for a quick summary

## Usage

```bash
npm install
npm start
```

## Options

- `--no-write` print the report only
- `--out <dir>` choose a different output directory
- `--skip-link-check` skip network checks for dead links
- `--limit <n>` cap the number of bookmarks checked for link status
- `--json` emit the full summary as JSON

## Design Notes

- It only reads local browser data and never edits your profile files directly.
- URL normalization removes common tracking parameters while leaving the rest intact.
- Dead-link checks are best-effort and can be skipped if you want a fully offline run.
- It is intentionally one-directional: read, clean, export.

## Example report

```md
- Sources scanned: 4
- Bookmarks discovered: 1,842
- Unique bookmarks kept: 1,221
- Duplicates removed: 621
- Dead links: 18
```

## Supported sources

- Google Chrome
- Chromium
- Microsoft Edge
- Brave Browser
- Vivaldi
- Opera
