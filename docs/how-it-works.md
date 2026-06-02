# How It Works

## Scan

The tool searches the common Chromium-family bookmark locations on macOS and reads each `Bookmarks` file it finds.

## Clean

URLs are normalized by removing common tracking parameters, trimming hashes, and collapsing default ports.

## Deduplicate

When two bookmarks point to the same normalized URL, the tool keeps the one with the better metadata signal.

## Report

The output includes a cleaned HTML export, a JSON snapshot, and a Markdown report for quick review.

