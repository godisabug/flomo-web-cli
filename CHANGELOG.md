# Changelog

## [Unreleased]

## 0.1.6

- Write user configuration and the memo cache through atomic private-file replacement.
- Preserve the previous local state and clean temporary files when a write fails.
- Centralize private-file permission hardening and document local-state terminology.
- Refresh the development dependency lockfile to pass the release security audit.

## 0.1.5

- Preserve memo line breaks and richer text layout when parsing flomo HTML content.
- Prefer full memo content over flattened summaries.
- Repair cached memo text from stored HTML when cached content was previously flattened.

## 0.1.4

- Add `flomo-web random` to refresh memos by default and show one random memo.
- Support `random --no-sync`, `--tag`, `--exclude-tag`, and JSON refresh metadata.
- Document the random memo workflow in Chinese and English READMEs.

## 0.1.3

- Fix `flomo-web sync` for image-only and attachment-only memos with empty text content.
- Preserve parsed memo file metadata in sync results and the local cache.
- Refresh the lockfile so CI's moderate-or-higher npm audit gate passes.

## 0.1.2

- Fix `flomo-web --version` to read the package version instead of using a stale hardcoded value.

## 0.1.1

- Restore source, tests, and TypeScript project files for GitHub development.
- Add GitHub CI, contribution guide, security policy, and issue/PR templates.
- Add npm repository metadata and a repeatable full verification script.
- Add automated npm publishing through GitHub Actions Trusted Publishing.
- Fix human-readable memo timestamps to honor the configured timezone.
- Fix cross-platform CI test failures on Ubuntu runners.

## 0.1.0

- Add independent `flomo-web` CLI package.
- Add list, search, sync, get, create, and config commands.
- Add human output by default and `--json` for automation.
- Add persistent sync cache for all-notes search and get.
