# Security Policy

## Supported Versions

Security fixes are handled on the current `0.1.x` line.

## Reporting a Vulnerability

Open a private advisory on GitHub or contact the repository owner through GitHub. Do not post secrets, tokens, cookies, memo content, HAR files, or raw flomo responses in public issues.

## Credential Handling

`flomo-web-cli` uses your own flomo Web session credentials. Treat `FLOMO_AUTHORIZATION`, `FLOMO_COOKIE`, local config files, shell history, and cache files as sensitive.

This project is not an official flomo project. It depends on private flomo Web endpoints that may change or reject requests without notice.
