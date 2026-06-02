# Troubleshooting

If the organizer does not find any bookmark stores, check the browser profile paths on your Mac and make sure the browser has been opened at least once.

Common causes:

- The browser is installed in a non-default location.
- The active profile is not stored under the usual `Default` or `Profile N` directory.
- Browser sync has not created a local `Bookmarks` file yet.

If the link checker reports too many failures, re-run with `--skip-link-check` first and then inspect the output HTML manually. Some sites block automated requests or require cookies, so a failed check does not always mean the bookmark itself is bad.
