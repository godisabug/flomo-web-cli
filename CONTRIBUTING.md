# Contributing

This project is a third-party CLI for flomo Web. It is not affiliated with flomo.

## Local Setup

```bash
npm install
npm run build
npm run verify
```

Use Node.js 20.19.0 or newer.

## Development Workflow

- Keep runtime changes in `src/` and tests in `tests/`.
- Run `npm run verify` before opening a pull request.
- Do not commit `.env`, tokens, cookies, memo cache files, or raw flomo responses.
- Keep README examples aligned with the implemented CLI commands.
- Prefer small pull requests with a clear problem statement and verification notes.

## Package Boundary

The GitHub repository contains source, tests, and maintenance files. The npm package is intentionally limited by `package.json#files` to runtime files and user-facing docs.

## Release Publishing

npm publishing is handled by `.github/workflows/publish.yml` when a `v*` tag is pushed. The workflow verifies the package, checks that the tag matches `package.json#version`, checks that the version is not already published, and then runs `npm publish --access public`.

Before the first automated release, configure npm Trusted Publishing for this package:

- Package: `flomo-web-cli`
- Repository: `godisabug/flomo-web-cli`
- Workflow: `publish.yml`

To publish a new version:

```bash
npm version patch
git push origin master --follow-tags
```

Use `minor` or `major` instead of `patch` when the release scope requires it.
