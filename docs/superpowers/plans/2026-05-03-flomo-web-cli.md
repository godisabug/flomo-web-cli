# Flomo Web CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an independent Node.js 20 TypeScript CLI named `flomo-web` that mirrors the `flomo-web-mcp` read, search, sync, get, create, and config capabilities with human and JSON output.

**Architecture:** The CLI is layered: `core` owns flomo Web clients and parsing, `config` resolves runtime settings, `cache` persists synced memos, `commands` implement command behavior, and `cli` handles parsing, dispatch, and exit codes. The implementation ports the proven flomo Web logic from the sibling `../flomo-web-mcp` project while changing MCP-specific memory cache behavior into CLI persistent cache behavior.

**Tech Stack:** Node.js 20, TypeScript ESM, Vitest, built-in `fetch`, `dotenv`, `zod`, and `commander`.

---

## File Map

- Create `package.json`: npm metadata, bin name, dependencies, scripts.
- Create `tsconfig.json`: TypeScript ESM build config.
- Create `tsconfig.test.json`: test typecheck config including tests.
- Create `.gitignore`: ignore build output, dependencies, env files, and local cache artifacts.
- Create `.env.example`: empty credential template.
- Create `README.md`: setup, command usage, risks, cache and security notes.
- Create `CHANGELOG.md`: initial release notes.
- Create `LICENSE`: MIT license.
- Create `src/index.ts`: executable entrypoint.
- Create `src/cli/parser.ts`: commander parser and option normalization.
- Create `src/cli/run.ts`: dispatch, stdout/stderr, exit code handling.
- Create `src/commands/list.ts`: recent memo list command.
- Create `src/commands/search.ts`: recent or cached search command.
- Create `src/commands/sync.ts`: sync command that writes persistent cache.
- Create `src/commands/get.ts`: get memo by slug from recent or cache.
- Create `src/commands/create.ts`: create memo from argv or stdin.
- Create `src/commands/config.ts`: user config get/set/unset/list commands.
- Create `src/core/models/memo.ts`: `Memo` model.
- Create `src/core/types/flomo.ts`: client, cursor, sync, and scope types.
- Create `src/core/errors.ts`: public error classes and mapping.
- Create `src/core/clients/flomoWeb.ts`: endpoint query helpers.
- Create `src/core/clients/http.ts`: authenticated flomo HTTP JSON client.
- Create `src/core/clients/flomoReadClient.ts`: list, search, get, and paged sync.
- Create `src/core/clients/flomoWriteClient.ts`: create memo client and content formatting.
- Create `src/core/parsers/memoParser.ts`: raw memo parser.
- Create `src/core/parsers/tagParser.ts`: tag normalization.
- Create `src/config/env.ts`: env and `.env` loading.
- Create `src/config/userConfig.ts`: user config file read/write and masking.
- Create `src/config/resolvedConfig.ts`: merge config sources and build clients.
- Create `src/cache/noteCache.ts`: persistent sync cache schema and IO.
- Create `src/formatters/human.ts`: human output formatting.
- Create `src/formatters/json.ts`: JSON output formatting.
- Create `src/utils/filesystem.ts`: config and cache directory helpers.
- Create `src/utils/stdin.ts`: stdin reader.
- Create `tests/*.test.ts`: focused tests for core, config, cache, commands, and CLI parser.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.test.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`
- Create: `CHANGELOG.md`
- Create: `LICENSE`
- Create: `src/index.ts`
- Create: `tests/smoke.test.ts`

- [ ] **Step 1: Write the failing smoke test**

Create `tests/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("project scaffold", () => {
  it("exposes the CLI package name", async () => {
    const packageJson = await import("../package.json", { with: { type: "json" } });
    expect(packageJson.default.name).toBe("flomo-web-cli");
    expect(packageJson.default.bin["flomo-web"]).toBe("./dist/index.js");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm test -- tests/smoke.test.ts
```

Expected: command fails because `package.json` and the test runner are not installed yet.

- [ ] **Step 3: Add package metadata and build config**

Create `package.json`:

```json
{
  "name": "flomo-web-cli",
  "version": "0.1.0",
  "type": "module",
  "description": "Third-party flomo command line tool based on flomo Web session credentials.",
  "license": "MIT",
  "keywords": [
    "flomo",
    "cli",
    "typescript",
    "notes"
  ],
  "bin": {
    "flomo-web": "./dist/index.js"
  },
  "files": [
    "dist",
    ".env.example",
    "README.md",
    "LICENSE",
    "CHANGELOG.md"
  ],
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "typecheck:test": "tsc -p tsconfig.test.json --noEmit",
    "verify": "npm run typecheck && npm run typecheck:test && npm test && npm run build"
  },
  "engines": {
    "node": ">=20"
  },
  "dependencies": {
    "commander": "^12.1.0",
    "dotenv": "^16.4.7",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@types/node": "^22.13.0",
    "tsx": "^4.19.2",
    "typescript": "^5.7.3",
    "vitest": "^4.1.5"
  }
}
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "resolveJsonModule": true,
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "rootDir": "src",
    "outDir": "dist",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"]
}
```

Create `tsconfig.test.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": ".",
    "noEmit": true
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

Create `.gitignore`:

```gitignore
node_modules/
dist/
coverage/
.env
.env.*
!.env.example
*.log
```

Create `.env.example`:

```dotenv
FLOMO_AUTHORIZATION=
FLOMO_COOKIE=
FLOMO_USER_AGENT=Mozilla/5.0
FLOMO_DEVICE_ID=
FLOMO_DEVICE_MODEL=Other
FLOMO_WEB_PLATFORM=Web
FLOMO_BASE_URL=https://flomoapp.com
FLOMO_WEB_BASE_URL=https://v.flomoapp.com
FLOMO_TIMEZONE=Asia/Shanghai
FLOMO_REQUEST_TIMEOUT_MS=30000
FLOMO_READ_ENDPOINT=
FLOMO_SYNC_ENDPOINT=
FLOMO_WRITE_ENDPOINT=
```

Create initial docs with real project content:

`README.md`:

```md
# flomo-web-cli

Third-party flomo CLI based on flomo Web session credentials.

This is not an official flomo project. It depends on flomo Web internal endpoints and may break if those endpoints change.

## Status

Initial development version.
```

`CHANGELOG.md`:

```md
# Changelog

## 0.1.0

- Initial development version.
```

`LICENSE`:

```text
MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Create `src/index.ts`:

```ts
#!/usr/bin/env node

console.log("flomo-web-cli development scaffold");
```

- [ ] **Step 4: Install dependencies**

Run:

```powershell
npm install
```

Expected: `package-lock.json` is created and dependencies install successfully.

- [ ] **Step 5: Run scaffold checks**

Run:

```powershell
npm test -- tests/smoke.test.ts
npm run typecheck
npm run build
```

Expected: all commands pass and `dist/index.js` is generated.

- [ ] **Step 6: Commit scaffold**

Run:

```powershell
git add package.json package-lock.json tsconfig.json tsconfig.test.json .gitignore .env.example README.md CHANGELOG.md LICENSE src/index.ts tests/smoke.test.ts
git commit -m "chore: scaffold flomo web cli package"
```

Expected: commit succeeds.

---

### Task 2: Core Models, Errors, Parsers, and Text Helpers

**Files:**
- Create: `src/core/models/memo.ts`
- Create: `src/core/types/flomo.ts`
- Create: `src/core/errors.ts`
- Create: `src/core/parsers/tagParser.ts`
- Create: `src/core/parsers/memoParser.ts`
- Create: `src/core/utils/text.ts`
- Test: `tests/parsers.test.ts`

- [ ] **Step 1: Write parser and error tests**

Create `tests/parsers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { toPublicError, FlomoRequestError } from "../src/core/errors.js";
import { parseMemo } from "../src/core/parsers/memoParser.js";
import { normalizeTags } from "../src/core/parsers/tagParser.js";

describe("tag parser", () => {
  it("normalizes tags with a leading hash", () => {
    expect(normalizeTags(["work", "#daily", "  idea  ", ""])).toEqual(["#work", "#daily", "#idea"]);
  });

  it("deduplicates normalized tags", () => {
    expect(normalizeTags(["work", "#work", "Work"])).toEqual(["#work", "#Work"]);
  });
});

describe("memo parser", () => {
  it("parses common flomo memo fields", () => {
    const memo = parseMemo(
      {
        slug: "abc123",
        content: "<p>Hello #tag</p>",
        tags: ["tag"],
        created_at: "2026-05-03T10:00:00.000Z",
        updated_at: "2026-05-03T11:00:00.000Z"
      },
      "https://v.flomoapp.com"
    );

    expect(memo).toEqual({
      slug: "abc123",
      content: "Hello #tag",
      html: "<p>Hello #tag</p>",
      tags: ["#tag"],
      url: "https://v.flomoapp.com/memo/abc123",
      createdAt: "2026-05-03T10:00:00.000Z",
      updatedAt: "2026-05-03T11:00:00.000Z"
    });
  });
});

describe("public errors", () => {
  it("maps known flomo errors", () => {
    const error = new FlomoRequestError("BAD_REQUEST", "bad input");
    expect(toPublicError(error)).toEqual({ code: "BAD_REQUEST", message: "bad input" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm test -- tests/parsers.test.ts
```

Expected: FAIL because the `src/core` files do not exist.

- [ ] **Step 3: Add core types and errors**

Create `src/core/models/memo.ts`:

```ts
export interface Memo {
  slug: string;
  content: string;
  html?: string;
  tags: string[];
  url: string;
  createdAt: string;
  updatedAt: string;
}
```

Create `src/core/types/flomo.ts`:

```ts
import type { Memo } from "../models/memo.js";

export type NotesScopeSource = "recent_notes" | "all_synced_notes";

export interface MemoPageCursor {
  latestUpdatedAt: number;
  latestSlug: string;
}

export interface SyncNotesOptions {
  pageSize?: number;
  maxPages?: number;
}

export interface SyncNotesResult {
  synced: number;
  totalCached: number;
  pages: number;
  complete: boolean;
  syncedAt: string;
  nextCursor?: MemoPageCursor;
  items: Memo[];
}

export interface SyncNotesStatus {
  synced: boolean;
  totalCached: number;
  complete: boolean;
  syncedAt?: string;
  nextCursor?: MemoPageCursor;
}

export interface FlomoReadClient {
  list(limit?: number): Promise<Memo[]>;
  search(query: string, limit?: number): Promise<Memo[]>;
  getBySlug(slug: string): Promise<Memo | null>;
  getRecentBatch(cursor?: string): Promise<Memo[]>;
  syncAll(options?: SyncNotesOptions): Promise<SyncNotesResult>;
}

export interface FlomoWriteClient {
  create(input: { content: string; tags?: string[] }): Promise<Memo>;
}

export type RawFlomoMemo = Record<string, unknown>;
```

Create `src/core/errors.ts`:

```ts
export type FlomoErrorCode =
  | "AUTH_EXPIRED"
  | "BAD_REQUEST"
  | "SIGN_INVALID"
  | "PARSER_FAILED"
  | "RATE_LIMITED"
  | "REQUEST_TIMEOUT"
  | "REMOTE_CHANGED";

export type PublicErrorCode = FlomoErrorCode | "CACHE_MISSING" | "CACHE_INVALID" | "CONFIG_INVALID" | "UNKNOWN";

export class FlomoError extends Error {
  readonly code: FlomoErrorCode;
  readonly status?: number;

  constructor(code: FlomoErrorCode, message: string, options?: { status?: number; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = "FlomoError";
    this.code = code;
    this.status = options?.status;
  }
}

export class FlomoAuthError extends FlomoError {
  constructor(message = "flomo 登录态失效或权限不足，请重新抓取 Authorization。", options?: { status?: number; cause?: unknown }) {
    super("AUTH_EXPIRED", message, options);
    this.name = "FlomoAuthError";
  }
}

export class FlomoRequestError extends FlomoError {
  constructor(code: FlomoErrorCode, message: string, options?: { status?: number; cause?: unknown }) {
    super(code, message, options);
    this.name = "FlomoRequestError";
  }
}

export class FlomoParseError extends FlomoError {
  constructor(message = "flomo 返回结构解析失败，内部接口可能已经变化。", options?: { cause?: unknown }) {
    super("PARSER_FAILED", message, options);
    this.name = "FlomoParseError";
  }
}

export class CliError extends Error {
  readonly code: PublicErrorCode;

  constructor(code: PublicErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = "CliError";
    this.code = code;
  }
}

export function toPublicError(error: unknown): { code: PublicErrorCode; message: string } {
  if (error instanceof FlomoError || error instanceof CliError) {
    return {
      code: error.code,
      message: error.message
    };
  }

  return {
    code: "UNKNOWN",
    message: error instanceof Error ? error.message : "未知错误。"
  };
}
```

- [ ] **Step 4: Add text and parser implementation**

Create `src/core/utils/text.ts`:

```ts
export function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

export function summarize(value: string, maxLength = 80): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}
```

Create `src/core/parsers/tagParser.ts`:

```ts
export function normalizeTags(tags: string[] | undefined): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const tag of tags ?? []) {
    const trimmed = tag.trim();
    if (!trimmed) {
      continue;
    }

    const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    if (!seen.has(withHash)) {
      seen.add(withHash);
      normalized.push(withHash);
    }
  }

  return normalized;
}

export function extractInlineTags(content: string): string[] {
  const matches = content.match(/#[^\s#]+/g);
  return normalizeTags(matches ?? []);
}
```

Create `src/core/parsers/memoParser.ts`:

```ts
import type { Memo } from "../models/memo.js";
import { FlomoParseError } from "../errors.js";
import { stripHtml } from "../utils/text.js";
import { extractInlineTags, normalizeTags } from "./tagParser.js";

export function parseMemo(raw: unknown, webBaseUrl: string): Memo {
  if (!isRecord(raw)) {
    throw new FlomoParseError("memo 数据不是对象。");
  }

  const slug = pickString(raw, ["slug", "memo_slug", "memo_id", "id"]);
  if (!slug) {
    throw new FlomoParseError("memo 缺少 slug。");
  }

  const html = pickString(raw, ["content", "html"]);
  const plainText = pickString(raw, ["text", "plain_text", "plainText"]);
  const content = plainText ?? (html ? stripHtml(html) : "");
  const createdAt = normalizeDate(raw.created_at ?? raw.createdAt ?? raw.created_time ?? raw.created) ?? "";
  const updatedAt = normalizeDate(raw.updated_at ?? raw.updatedAt ?? raw.updated_time ?? raw.modified_at ?? raw.modified) ?? createdAt;
  const rawTags = pickStringArray(raw, ["tags", "tag_list"]);
  const tags = normalizeTags(rawTags.length > 0 ? rawTags : extractInlineTags(content));

  return {
    slug,
    content,
    ...(html ? { html } : {}),
    tags,
    url: `${webBaseUrl.replace(/\/+$/, "")}/memo/${encodeURIComponent(slug)}`,
    createdAt,
    updatedAt
  };
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return undefined;
}

function pickStringArray(record: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string");
    }
  }

  return [];
}

function normalizeDate(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const millis = value < 1_000_000_000_000 ? value * 1000 : value;
    return new Date(millis).toISOString();
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
```

- [ ] **Step 5: Run parser tests**

Run:

```powershell
npm test -- tests/parsers.test.ts
npm run typecheck:test
```

Expected: tests and test typecheck pass.

- [ ] **Step 6: Commit core parsing**

Run:

```powershell
git add src/core tests/parsers.test.ts
git commit -m "feat: add flomo core parsers"
```

Expected: commit succeeds.

---

### Task 3: Configuration Loading and Filesystem Paths

**Files:**
- Create: `src/utils/filesystem.ts`
- Create: `src/config/env.ts`
- Create: `src/config/userConfig.ts`
- Create: `src/config/resolvedConfig.ts`
- Test: `tests/config.test.ts`

- [ ] **Step 1: Write configuration tests**

Create `tests/config.test.ts`:

```ts
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadEnvConfig } from "../src/config/env.js";
import { maskConfigValue, readUserConfig, writeUserConfig } from "../src/config/userConfig.js";
import { resolveConfig } from "../src/config/resolvedConfig.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "flomo-web-cli-test-"));
  tempDirs.push(dir);
  return dir;
}

describe("env config", () => {
  it("loads defaults and validates positive timeout", () => {
    const config = loadEnvConfig({ FLOMO_REQUEST_TIMEOUT_MS: "15000" });
    expect(config.requestTimeoutMs).toBe(15000);
    expect(config.baseUrl).toBe("https://flomoapp.com");
    expect(config.webBaseUrl).toBe("https://v.flomoapp.com");
  });
});

describe("user config", () => {
  it("writes and reads whitelisted keys", async () => {
    const dir = await tempDir();
    const file = join(dir, "config.json");
    await writeUserConfig(file, { authorization: "Bearer secret", timezone: "Asia/Shanghai" });
    await expect(readFile(file, "utf8")).resolves.toContain("Bearer secret");
    await expect(readUserConfig(file)).resolves.toEqual({ authorization: "Bearer secret", timezone: "Asia/Shanghai" });
  });

  it("masks sensitive values", () => {
    expect(maskConfigValue("authorization", "Bearer abcdefghijklmnop")).toBe("Bearer abcd...mnop");
    expect(maskConfigValue("timezone", "Asia/Shanghai")).toBe("Asia/Shanghai");
  });
});

describe("resolved config", () => {
  it("uses CLI options before env before user config before defaults", () => {
    const resolved = resolveConfig({
      cli: { authorization: "Bearer cli" },
      env: { authorization: "Bearer env", timezone: "UTC" },
      user: { authorization: "Bearer user", timezone: "Asia/Shanghai" }
    });

    expect(resolved.authorization).toBe("Bearer cli");
    expect(resolved.timezone).toBe("UTC");
    expect(resolved.userAgent).toBe("Mozilla/5.0");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm test -- tests/config.test.ts
```

Expected: FAIL because config modules do not exist.

- [ ] **Step 3: Add filesystem path helpers**

Create `src/utils/filesystem.ts`:

```ts
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

export function getUserConfigPath(env: NodeJS.ProcessEnv = process.env, platform: NodeJS.Platform = process.platform): string {
  if (platform === "win32") {
    const base = env.APPDATA ?? join(env.USERPROFILE ?? process.cwd(), "AppData", "Roaming");
    return join(base, "flomo-web-cli", "config.json");
  }

  if (platform === "darwin") {
    const home = env.HOME ?? process.cwd();
    return join(home, "Library", "Application Support", "flomo-web-cli", "config.json");
  }

  const base = env.XDG_CONFIG_HOME ?? join(env.HOME ?? process.cwd(), ".config");
  return join(base, "flomo-web-cli", "config.json");
}

export function getNoteCachePath(env: NodeJS.ProcessEnv = process.env, platform: NodeJS.Platform = process.platform): string {
  if (platform === "win32") {
    const base = env.LOCALAPPDATA ?? join(env.USERPROFILE ?? process.cwd(), "AppData", "Local");
    return join(base, "flomo-web-cli", "cache", "notes.json");
  }

  if (platform === "darwin") {
    const home = env.HOME ?? process.cwd();
    return join(home, "Library", "Caches", "flomo-web-cli", "notes.json");
  }

  const base = env.XDG_CACHE_HOME ?? join(env.HOME ?? process.cwd(), ".cache");
  return join(base, "flomo-web-cli", "notes.json");
}

export async function ensureParentDirectory(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}
```

- [ ] **Step 4: Add env config module**

Create `src/config/env.ts`:

```ts
import { config as loadDotenv } from "dotenv";
import { randomUUID } from "node:crypto";
import { z } from "zod";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface RuntimeConfig {
  authorization?: string;
  cookie?: string;
  userAgent: string;
  baseUrl: string;
  webBaseUrl: string;
  timezone: string;
  logLevel: LogLevel;
  readEndpoint?: string;
  syncEndpoint?: string;
  writeEndpoint?: string;
  deviceId: string;
  deviceModel: string;
  webPlatform: string;
  requestTimeoutMs: number;
}

export type PartialRuntimeConfig = Partial<RuntimeConfig>;

const EnvSchema = z.object({
  FLOMO_AUTHORIZATION: z.string().optional(),
  FLOMO_COOKIE: z.string().optional(),
  FLOMO_USER_AGENT: z.string().optional(),
  FLOMO_BASE_URL: z.string().url().optional(),
  FLOMO_WEB_BASE_URL: z.string().url().optional(),
  FLOMO_TIMEZONE: z.string().optional(),
  LOG_LEVEL: z.string().optional(),
  FLOMO_READ_ENDPOINT: z.string().optional(),
  FLOMO_SYNC_ENDPOINT: z.string().optional(),
  FLOMO_WRITE_ENDPOINT: z.string().optional(),
  FLOMO_DEVICE_ID: z.string().optional(),
  FLOMO_DEVICE_MODEL: z.string().optional(),
  FLOMO_WEB_PLATFORM: z.string().optional(),
  FLOMO_REQUEST_TIMEOUT_MS: z.string().optional()
});

export function loadDotenvFile(): void {
  loadDotenv();
}

export function loadEnvConfig(env: NodeJS.ProcessEnv = process.env): PartialRuntimeConfig {
  const parsed = EnvSchema.parse(env);

  return {
    authorization: emptyToUndefined(parsed.FLOMO_AUTHORIZATION),
    cookie: emptyToUndefined(parsed.FLOMO_COOKIE),
    userAgent: emptyToUndefined(parsed.FLOMO_USER_AGENT),
    baseUrl: trimTrailingSlash(parsed.FLOMO_BASE_URL),
    webBaseUrl: trimTrailingSlash(parsed.FLOMO_WEB_BASE_URL),
    timezone: emptyToUndefined(parsed.FLOMO_TIMEZONE),
    logLevel: parseLogLevel(parsed.LOG_LEVEL),
    readEndpoint: emptyToUndefined(parsed.FLOMO_READ_ENDPOINT),
    syncEndpoint: emptyToUndefined(parsed.FLOMO_SYNC_ENDPOINT),
    writeEndpoint: emptyToUndefined(parsed.FLOMO_WRITE_ENDPOINT),
    deviceId: emptyToUndefined(parsed.FLOMO_DEVICE_ID),
    deviceModel: emptyToUndefined(parsed.FLOMO_DEVICE_MODEL),
    webPlatform: emptyToUndefined(parsed.FLOMO_WEB_PLATFORM),
    requestTimeoutMs: parsePositiveInteger(parsed.FLOMO_REQUEST_TIMEOUT_MS, "FLOMO_REQUEST_TIMEOUT_MS")
  };
}

export function defaultRuntimeConfig(): RuntimeConfig {
  return {
    userAgent: "Mozilla/5.0",
    baseUrl: "https://flomoapp.com",
    webBaseUrl: "https://v.flomoapp.com",
    timezone: "Asia/Shanghai",
    logLevel: "info",
    deviceId: randomUUID(),
    deviceModel: "Other",
    webPlatform: "Web",
    requestTimeoutMs: 30_000
  };
}

function parseLogLevel(value: string | undefined): LogLevel | undefined {
  const trimmed = emptyToUndefined(value);
  if (trimmed === "debug" || trimmed === "info" || trimmed === "warn" || trimmed === "error") {
    return trimmed;
  }

  return undefined;
}

function parsePositiveInteger(value: string | undefined, name: string): number | undefined {
  const trimmed = emptyToUndefined(value);
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} 必须是正整数毫秒数。`);
  }

  return parsed;
}

function emptyToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function trimTrailingSlash(value: string | undefined): string | undefined {
  const trimmed = emptyToUndefined(value);
  return trimmed?.replace(/\/+$/, "");
}
```

- [ ] **Step 5: Add user config and resolver modules**

Create `src/config/userConfig.ts`:

```ts
import { readFile, rm, writeFile } from "node:fs/promises";
import { z } from "zod";
import { CliError } from "../core/errors.js";
import { ensureParentDirectory } from "../utils/filesystem.js";
import type { PartialRuntimeConfig } from "./env.js";

export const userConfigKeys = [
  "authorization",
  "cookie",
  "userAgent",
  "baseUrl",
  "webBaseUrl",
  "timezone",
  "logLevel",
  "readEndpoint",
  "syncEndpoint",
  "writeEndpoint",
  "deviceId",
  "deviceModel",
  "webPlatform",
  "requestTimeoutMs"
] as const;

export type UserConfigKey = (typeof userConfigKeys)[number];
export type UserConfig = Partial<Pick<PartialRuntimeConfig, UserConfigKey>>;

const UserConfigSchema = z.object({
  authorization: z.string().optional(),
  cookie: z.string().optional(),
  userAgent: z.string().optional(),
  baseUrl: z.string().url().optional(),
  webBaseUrl: z.string().url().optional(),
  timezone: z.string().optional(),
  logLevel: z.enum(["debug", "info", "warn", "error"]).optional(),
  readEndpoint: z.string().optional(),
  syncEndpoint: z.string().optional(),
  writeEndpoint: z.string().optional(),
  deviceId: z.string().optional(),
  deviceModel: z.string().optional(),
  webPlatform: z.string().optional(),
  requestTimeoutMs: z.number().int().positive().optional()
}).strict();

export function isUserConfigKey(key: string): key is UserConfigKey {
  return (userConfigKeys as readonly string[]).includes(key);
}

export async function readUserConfig(filePath: string): Promise<UserConfig> {
  let text: string;
  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return {};
    }
    throw error;
  }

  try {
    return UserConfigSchema.parse(JSON.parse(text));
  } catch (error) {
    throw new CliError("CONFIG_INVALID", `用户配置文件无效：${filePath}`, { cause: error });
  }
}

export async function writeUserConfig(filePath: string, config: UserConfig): Promise<void> {
  await ensureParentDirectory(filePath);
  const parsed = UserConfigSchema.parse(config);
  await writeFile(filePath, `${JSON.stringify(parsed, null, 2)}\n`, { mode: 0o600 });
}

export async function unsetUserConfigFile(filePath: string): Promise<void> {
  await rm(filePath, { force: true });
}

export function maskConfigValue(key: string, value: unknown): string {
  if (value === undefined) {
    return "";
  }

  const text = String(value);
  if (key !== "authorization" && key !== "cookie") {
    return text;
  }

  if (text.length <= 12) {
    return "********";
  }

  return `${text.slice(0, 11)}...${text.slice(-4)}`;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
```

Create `src/config/resolvedConfig.ts`:

```ts
import { CliError } from "../core/errors.js";
import { defaultRuntimeConfig, type PartialRuntimeConfig, type RuntimeConfig } from "./env.js";

export interface ConfigSources {
  cli?: PartialRuntimeConfig;
  env?: PartialRuntimeConfig;
  user?: PartialRuntimeConfig;
}

export function resolveConfig(sources: ConfigSources): RuntimeConfig {
  const resolved: RuntimeConfig = {
    ...defaultRuntimeConfig(),
    ...definedOnly(sources.user),
    ...definedOnly(sources.env),
    ...definedOnly(sources.cli)
  };

  validateTimezone(resolved.timezone);
  return resolved;
}

export function requireAuthorization(config: RuntimeConfig): string {
  const authorization = config.authorization?.trim();
  if (!authorization) {
    throw new CliError("CONFIG_INVALID", "缺少 flomo Authorization。请设置 FLOMO_AUTHORIZATION 或运行 flomo-web config set authorization <value>。");
  }

  return authorization;
}

function definedOnly<T extends Record<string, unknown>>(value: T | undefined): Partial<T> {
  if (!value) {
    return {};
  }

  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== "")) as Partial<T>;
}

function validateTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
  } catch (error) {
    throw new CliError("CONFIG_INVALID", `timezone 不是有效的 IANA timezone：${timezone}`, { cause: error });
  }
}
```

- [ ] **Step 6: Run configuration tests**

Run:

```powershell
npm test -- tests/config.test.ts
npm run typecheck:test
```

Expected: tests and test typecheck pass.

- [ ] **Step 7: Commit configuration**

Run:

```powershell
git add src/config src/utils/filesystem.ts tests/config.test.ts
git commit -m "feat: add cli configuration handling"
```

Expected: commit succeeds.

---

### Task 4: Flomo Web HTTP and Read Client

**Files:**
- Create: `src/core/clients/flomoWeb.ts`
- Create: `src/core/clients/http.ts`
- Create: `src/core/clients/flomoReadClient.ts`
- Test: `tests/httpClient.test.ts`
- Test: `tests/readClient.test.ts`

- [ ] **Step 1: Write HTTP client tests**

Create `tests/httpClient.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { FlomoAuthError, FlomoRequestError } from "../src/core/errors.js";
import { FlomoHttpClient } from "../src/core/clients/http.js";
import type { RuntimeConfig } from "../src/config/env.js";

const config: RuntimeConfig = {
  authorization: "Bearer test",
  userAgent: "TestAgent",
  baseUrl: "https://flomoapp.com",
  webBaseUrl: "https://v.flomoapp.com",
  timezone: "Asia/Shanghai",
  logLevel: "info",
  deviceId: "device-id",
  deviceModel: "Other",
  webPlatform: "Web",
  requestTimeoutMs: 30000
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FlomoHttpClient", () => {
  it("adds flomo web headers and parses JSON", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const client = new FlomoHttpClient(config);

    await expect(client.requestJson("/api/test")).resolves.toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(url).toBe("https://flomoapp.com/api/test");
    expect(headers.get("Authorization")).toBe("Bearer test");
    expect(headers.get("Origin")).toBe("https://v.flomoapp.com");
    expect(headers.get("platform")).toBe("Web");
  });

  it("maps auth failures", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 401 }));
    const client = new FlomoHttpClient(config);
    await expect(client.requestJson("/api/test")).rejects.toBeInstanceOf(FlomoAuthError);
  });

  it("rejects absolute endpoints from another origin", async () => {
    const client = new FlomoHttpClient(config);
    await expect(client.requestJson("https://example.com/api/test")).rejects.toBeInstanceOf(FlomoRequestError);
  });
});
```

- [ ] **Step 2: Write read client tests**

Create `tests/readClient.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { BearerFlomoReadClient, filterMemos } from "../src/core/clients/flomoReadClient.js";
import type { FlomoHttpClient } from "../src/core/clients/http.js";
import type { RuntimeConfig } from "../src/config/env.js";
import type { Memo } from "../src/core/models/memo.js";

const config: RuntimeConfig = {
  authorization: "Bearer test",
  userAgent: "TestAgent",
  baseUrl: "https://flomoapp.com",
  webBaseUrl: "https://v.flomoapp.com",
  timezone: "Asia/Shanghai",
  logLevel: "info",
  deviceId: "device-id",
  deviceModel: "Other",
  webPlatform: "Web",
  requestTimeoutMs: 30000
};

function memo(slug: string, content: string): Memo {
  return { slug, content, tags: [], url: `https://v.flomoapp.com/memo/${slug}`, createdAt: "", updatedAt: "" };
}

describe("filterMemos", () => {
  it("searches content and tags with limit", () => {
    const items = [
      { ...memo("1", "alpha"), tags: ["#work"] },
      memo("2", "beta alpha"),
      memo("3", "gamma")
    ];

    expect(filterMemos(items, "alpha", 1).map((item) => item.slug)).toEqual(["1"]);
    expect(filterMemos(items, "work", 10).map((item) => item.slug)).toEqual(["1"]);
  });
});

describe("BearerFlomoReadClient", () => {
  it("lists recent memos from common response shape", async () => {
    const httpClient = {
      requestJson: async () => ({
        data: [
          { slug: "abc", content: "<p>Hello</p>", created_at: 1710000000, updated_at: 1710000000 }
        ]
      })
    } as Pick<FlomoHttpClient, "requestJson"> as FlomoHttpClient;
    const client = new BearerFlomoReadClient(config, httpClient);

    await expect(client.list()).resolves.toMatchObject([{ slug: "abc", content: "Hello" }]);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```powershell
npm test -- tests/httpClient.test.ts tests/readClient.test.ts
```

Expected: FAIL because client modules do not exist.

- [ ] **Step 4: Add flomo query helper**

Create `src/core/clients/flomoWeb.ts`:

```ts
export function appendQueryString(endpoint: string, params: Record<string, unknown>): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      query.set(key, JSON.stringify(value));
    } else {
      query.set(key, String(value));
    }
  }

  const queryString = query.toString();
  if (!queryString) {
    return endpoint;
  }

  return `${endpoint}${endpoint.includes("?") ? "&" : "?"}${queryString}`;
}

export function buildFlomoWebQuery(params: Record<string, unknown>): Record<string, unknown> {
  return params;
}

export function getFlomoTz(timezone: string): string {
  return timezone;
}
```

- [ ] **Step 5: Add HTTP client**

Create `src/core/clients/http.ts`:

```ts
import type { RuntimeConfig } from "../../config/env.js";
import { requireAuthorization } from "../../config/resolvedConfig.js";
import { FlomoAuthError, FlomoParseError, FlomoRequestError } from "../errors.js";

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

export class FlomoHttpClient {
  constructor(private readonly config: RuntimeConfig) {}

  async requestJson<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
    const url = this.toUrl(endpoint);
    const abort = this.buildAbortSignal(init.signal);
    let response: Response;
    let text: string;

    try {
      response = await fetch(url, {
        ...init,
        headers: this.buildHeaders(init.headers),
        signal: abort.signal
      });
      text = await response.text();
    } catch (error) {
      if (isAbortError(error)) {
        throw new FlomoRequestError("REQUEST_TIMEOUT", "flomo 请求超时，请稍后重试。", { cause: error });
      }

      if (error instanceof FlomoRequestError || error instanceof FlomoAuthError) {
        throw error;
      }

      throw new FlomoRequestError("REMOTE_CHANGED", "flomo 请求失败，网络请求未完成。", { cause: error });
    } finally {
      abort.cleanup();
    }

    if (!response.ok) {
      throwHttpError(response.status, text);
    }

    if (!text) {
      return undefined as T;
    }

    try {
      const parsed = JSON.parse(text) as T;
      validateFlomoApiResponse(parsed);
      return parsed;
    } catch (error) {
      if (error instanceof FlomoRequestError || error instanceof FlomoAuthError) {
        throw error;
      }
      throw new FlomoParseError("flomo 返回的响应不是合法 JSON。", { cause: error });
    }
  }

  private buildHeaders(headersInit: HeadersInit | undefined): Headers {
    const headers = new Headers(headersInit);
    headers.set("Accept", "application/json, text/plain, */*");
    headers.set("Authorization", requireAuthorization(this.config));
    headers.set("User-Agent", this.config.userAgent);
    headers.set("Origin", this.config.webBaseUrl);
    headers.set("Referer", `${this.config.webBaseUrl}/`);
    headers.set("X-Timezone", this.config.timezone);
    headers.set("platform", this.config.webPlatform);
    headers.set("device-model", this.config.deviceModel);
    headers.set("device-id", this.config.deviceId);

    if (this.config.cookie) {
      headers.set("Cookie", this.config.cookie);
    }

    return headers;
  }

  private toUrl(endpoint: string): string {
    if (/^https?:\/\//i.test(endpoint)) {
      const url = new URL(endpoint);
      const baseUrl = new URL(this.config.baseUrl);
      if (url.origin !== baseUrl.origin) {
        throw new FlomoRequestError("BAD_REQUEST", "FLOMO endpoint 必须是相对路径或与 FLOMO_BASE_URL 同源。");
      }

      return url.toString();
    }

    const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${this.config.baseUrl}${normalizedEndpoint}`;
  }

  private buildAbortSignal(inputSignal: AbortSignal | null | undefined): { signal: AbortSignal; cleanup: () => void } {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, this.requestTimeoutMs);

    let removeInputListener = (): void => undefined;
    if (inputSignal) {
      if (inputSignal.aborted) {
        controller.abort(inputSignal.reason);
      } else {
        const abortFromInput = (): void => {
          controller.abort(inputSignal.reason);
        };
        inputSignal.addEventListener("abort", abortFromInput, { once: true });
        removeInputListener = () => inputSignal.removeEventListener("abort", abortFromInput);
      }
    }

    return {
      signal: controller.signal,
      cleanup: () => {
        clearTimeout(timeout);
        removeInputListener();
      }
    };
  }

  private get requestTimeoutMs(): number {
    const configured = this.config.requestTimeoutMs;
    return Number.isFinite(configured) && configured > 0 ? Math.trunc(configured) : DEFAULT_REQUEST_TIMEOUT_MS;
  }
}

function throwHttpError(status: number, body: string): never {
  if (status === 401 || status === 403) {
    throw new FlomoAuthError("flomo 登录态失效或权限不足，请重新抓取 Authorization。", { status });
  }

  if (status === 400) {
    const message = extractResponseMessage(body) ?? "flomo 请求体不符合当前接口要求。";
    const code = looksLikeSignError(message) ? "SIGN_INVALID" : "BAD_REQUEST";
    throw new FlomoRequestError(code, message, { status });
  }

  if (status === 429) {
    throw new FlomoRequestError("RATE_LIMITED", "flomo 请求过于频繁，请稍后再试。", { status });
  }

  const message = body ? `flomo 请求失败，HTTP ${status}。` : `flomo 请求失败，HTTP ${status}，无响应体。`;
  throw new FlomoRequestError("REMOTE_CHANGED", message, { status });
}

function validateFlomoApiResponse(value: unknown): void {
  if (!isRecord(value) || typeof value.code !== "number" || value.code === 0) {
    return;
  }

  const message = typeof value.message === "string" && value.message.trim() ? value.message : "flomo 返回业务错误。";
  if (value.code === -20 || looksLikeSignError(message)) {
    throw new FlomoRequestError("SIGN_INVALID", message);
  }

  if (value.code === -1) {
    throw new FlomoRequestError("BAD_REQUEST", message);
  }

  throw new FlomoRequestError("REMOTE_CHANGED", message);
}

function extractResponseMessage(body: string): string | undefined {
  if (!body) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(body) as unknown;
    if (isRecord(parsed) && typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message;
    }
  } catch {
    return body;
  }

  return body;
}

function looksLikeSignError(message: string): boolean {
  return /sign|signature|签名/i.test(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
```

- [ ] **Step 6: Add read client**

Create `src/core/clients/flomoReadClient.ts`:

```ts
import type { RuntimeConfig } from "../../config/env.js";
import type { Memo } from "../models/memo.js";
import { parseMemo } from "../parsers/memoParser.js";
import type { FlomoReadClient, MemoPageCursor, SyncNotesOptions, SyncNotesResult } from "../types/flomo.js";
import { FlomoRequestError } from "../errors.js";
import { appendQueryString, buildFlomoWebQuery, getFlomoTz } from "./flomoWeb.js";
import type { FlomoHttpClient } from "./http.js";

const CACHE_TTL_MS = 45_000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_SYNC_PAGE_SIZE = 200;
const MAX_SYNC_PAGE_SIZE = 200;
const DEFAULT_SYNC_MAX_PAGES = 50;
const MAX_SYNC_MAX_PAGES = 100;
const DEFAULT_READ_ENDPOINT = "/api/v1/memo/latest_updated_desc";
const DEFAULT_SYNC_ENDPOINT = "/api/v1/memo/updated/";

export class BearerFlomoReadClient implements FlomoReadClient {
  private cache?: { expiresAt: number; items: Memo[] };

  constructor(
    private readonly config: RuntimeConfig,
    private readonly httpClient: FlomoHttpClient
  ) {}

  async list(limit = DEFAULT_LIMIT): Promise<Memo[]> {
    const items = await this.getRecentBatch();
    return items.slice(0, normalizeLimit(limit));
  }

  async search(query: string, limit = DEFAULT_LIMIT): Promise<Memo[]> {
    const items = await this.getRecentBatch();
    return filterMemos(items, query, normalizeLimit(limit));
  }

  async getBySlug(slug: string): Promise<Memo | null> {
    const items = await this.getRecentBatch();
    return items.find((item) => item.slug === slug) ?? null;
  }

  async getRecentBatch(_cursor?: string): Promise<Memo[]> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.items;
    }

    const endpoint = this.buildReadEndpoint(this.config.readEndpoint ?? DEFAULT_READ_ENDPOINT);
    const raw = await this.httpClient.requestJson<unknown>(endpoint);
    const rawItems = extractMemoArray(raw);
    const items = rawItems.map((item) => parseMemo(item, this.config.webBaseUrl));
    this.cache = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      items
    };
    return items;
  }

  async syncAll(options: SyncNotesOptions = {}): Promise<SyncNotesResult> {
    const pageSize = normalizeBoundedInteger(options.pageSize, DEFAULT_SYNC_PAGE_SIZE, MAX_SYNC_PAGE_SIZE);
    const maxPages = normalizeBoundedInteger(options.maxPages, DEFAULT_SYNC_MAX_PAGES, MAX_SYNC_MAX_PAGES);
    const bySlug = new Map<string, Memo>();
    let cursor: MemoPageCursor | undefined = { latestUpdatedAt: 0, latestSlug: "" };
    let nextCursor: MemoPageCursor | undefined;
    let complete = false;
    let pages = 0;

    while (pages < maxPages) {
      const page = await this.getSyncPage(cursor, pageSize);
      pages += 1;

      for (const item of page.items) {
        bySlug.set(item.slug, item);
      }

      nextCursor = page.nextCursor;
      if (page.rawCount === 0 || page.rawCount < pageSize || !nextCursor) {
        complete = true;
        nextCursor = undefined;
        break;
      }

      cursor = nextCursor;
    }

    const items = [...bySlug.values()];
    const syncedAt = new Date().toISOString();
    return {
      synced: items.length,
      totalCached: items.length,
      pages,
      complete,
      syncedAt,
      ...(nextCursor ? { nextCursor } : {}),
      items
    };
  }

  private buildReadEndpoint(endpoint: string): string {
    if (/[?&]sign=/.test(endpoint)) {
      return endpoint;
    }

    return appendQueryString(endpoint, buildFlomoWebQuery({ tz: getFlomoTz(this.config.timezone) }));
  }

  private async getSyncPage(cursor: MemoPageCursor | undefined, pageSize: number): Promise<{
    items: Memo[];
    rawCount: number;
    nextCursor?: MemoPageCursor;
  }> {
    const endpoint = this.buildSyncEndpoint(this.config.syncEndpoint ?? DEFAULT_SYNC_ENDPOINT, cursor, pageSize);
    const raw = await this.httpClient.requestJson<unknown>(endpoint);
    const rawItems = extractMemoArray(raw);

    return {
      items: rawItems
        .filter((item) => !isDeletedMemo(item))
        .map((item) => parseMemo(item, this.config.webBaseUrl)),
      rawCount: rawItems.length,
      nextCursor: extractNextCursor(rawItems)
    };
  }

  private buildSyncEndpoint(endpoint: string, cursor: MemoPageCursor | undefined, pageSize: number): string {
    if (/[?&]sign=/.test(endpoint)) {
      return endpoint;
    }

    return appendQueryString(
      endpoint,
      buildFlomoWebQuery({
        limit: pageSize,
        latest_updated_at: cursor?.latestUpdatedAt ?? 0,
        latest_slug: cursor?.latestSlug ?? "",
        tz: getFlomoTz(this.config.timezone)
      })
    );
  }
}

export function filterMemos(items: Memo[], query: string, limit = DEFAULT_LIMIT): Memo[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  return items
    .filter((item) => {
      const haystack = `${item.content}\n${item.tags.join(" ")}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    })
    .slice(0, normalizeLimit(limit));
}

function extractMemoArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }

  if (!isRecord(raw)) {
    throw new FlomoRequestError("PARSER_FAILED", "读取接口返回体不是对象或数组。");
  }

  const candidates = [raw.memos, raw.memo_list, raw.items, raw.list, raw.data, raw.result];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }

    if (isRecord(candidate)) {
      const nested = tryExtractMemoArray(candidate);
      if (nested) {
        return nested;
      }
    }
  }

  throw new FlomoRequestError("PARSER_FAILED", "读取接口返回体中找不到 memo 数组字段。");
}

function tryExtractMemoArray(raw: Record<string, unknown>): unknown[] | undefined {
  const candidates = [raw.memos, raw.memo_list, raw.items, raw.list, raw.data, raw.result];
  return candidates.find(Array.isArray);
}

function normalizeLimit(limit: number): number {
  return normalizeBoundedInteger(limit, DEFAULT_LIMIT, MAX_LIMIT);
}

function normalizeBoundedInteger(value: number | undefined, fallback: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.min(max, Math.trunc(value)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDeletedMemo(raw: unknown): boolean {
  if (!isRecord(raw) || !Object.hasOwn(raw, "deleted_at")) {
    return false;
  }

  const deletedAt = raw.deleted_at;
  return deletedAt !== null && deletedAt !== undefined && String(deletedAt).trim() !== "";
}

function extractNextCursor(rawItems: unknown[]): MemoPageCursor | undefined {
  const raw = rawItems.at(-1);
  if (!isRecord(raw)) {
    return undefined;
  }

  const latestSlug = pickString(raw, ["slug", "memo_slug", "memo_id", "id"]);
  const latestUpdatedAt = pickUnixSeconds(raw.updated_at ?? raw.updatedAt ?? raw.updated_time ?? raw.modified_at ?? raw.modified);
  if (!latestSlug || latestUpdatedAt === undefined) {
    return undefined;
  }

  return {
    latestUpdatedAt,
    latestSlug
  };
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return undefined;
}

function pickUnixSeconds(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1_000_000_000_000 ? Math.trunc(value) : Math.trunc(value / 1000);
  }

  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return pickUnixSeconds(numeric);
    }

    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed / 1000);
    }
  }

  return undefined;
}
```

- [ ] **Step 7: Run HTTP and read client tests**

Run:

```powershell
npm test -- tests/httpClient.test.ts tests/readClient.test.ts
npm run typecheck:test
```

Expected: tests and test typecheck pass.

- [ ] **Step 8: Commit read client**

Run:

```powershell
git add src/core/clients tests/httpClient.test.ts tests/readClient.test.ts
git commit -m "feat: add flomo read client"
```

Expected: commit succeeds.

---

### Task 5: Flomo Write Client

**Files:**
- Create: `src/core/clients/flomoWriteClient.ts`
- Test: `tests/writeClient.test.ts`

- [ ] **Step 1: Write write client tests**

Create `tests/writeClient.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { RuntimeConfig } from "../src/config/env.js";
import { BearerFlomoWriteClient, formatCreateContent, formatFlomoLocalDateTime } from "../src/core/clients/flomoWriteClient.js";
import type { FlomoHttpClient } from "../src/core/clients/http.js";

const config: RuntimeConfig = {
  authorization: "Bearer test",
  userAgent: "TestAgent",
  baseUrl: "https://flomoapp.com",
  webBaseUrl: "https://v.flomoapp.com",
  timezone: "Asia/Shanghai",
  logLevel: "info",
  deviceId: "device-id",
  deviceModel: "Other",
  webPlatform: "Web",
  requestTimeoutMs: 30000
};

describe("formatCreateContent", () => {
  it("escapes paragraphs and appends tags", () => {
    expect(formatCreateContent("Hello <world>\nSecond", ["work"])).toBe("<p>Hello &lt;world&gt;</p><p>Second</p><p>#work</p>");
  });
});

describe("formatFlomoLocalDateTime", () => {
  it("formats a timezone-local timestamp", () => {
    expect(formatFlomoLocalDateTime("UTC", new Date("2026-05-03T01:02:03.000Z"))).toBe("2026-05-03 01:02:03");
  });
});

describe("BearerFlomoWriteClient", () => {
  it("creates a memo and parses the response", async () => {
    const httpClient = {
      requestJson: async (_endpoint: string, init?: RequestInit) => {
        expect(init?.method).toBe("PUT");
        expect(init?.body).toContain("Hello");
        return {
          memo: {
            slug: "created",
            content: "<p>Hello</p>",
            created_at: "2026-05-03T00:00:00.000Z",
            updated_at: "2026-05-03T00:00:00.000Z"
          }
        };
      }
    } as Pick<FlomoHttpClient, "requestJson"> as FlomoHttpClient;

    const client = new BearerFlomoWriteClient(config, httpClient);
    await expect(client.create({ content: "Hello" })).resolves.toMatchObject({ slug: "created", content: "Hello" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm test -- tests/writeClient.test.ts
```

Expected: FAIL because `flomoWriteClient.ts` does not exist.

- [ ] **Step 3: Add write client**

Create `src/core/clients/flomoWriteClient.ts`:

```ts
import type { RuntimeConfig } from "../../config/env.js";
import type { Memo } from "../models/memo.js";
import { parseMemo } from "../parsers/memoParser.js";
import { normalizeTags } from "../parsers/tagParser.js";
import type { FlomoWriteClient } from "../types/flomo.js";
import { FlomoRequestError } from "../errors.js";
import { buildFlomoWebQuery, getFlomoTz } from "./flomoWeb.js";
import type { FlomoHttpClient } from "./http.js";

const DEFAULT_WRITE_ENDPOINT = "/api/v1/memo";

export class BearerFlomoWriteClient implements FlomoWriteClient {
  constructor(
    private readonly config: RuntimeConfig,
    private readonly httpClient: FlomoHttpClient
  ) {}

  async create(input: { content: string; tags?: string[] }): Promise<Memo> {
    if (!input.content.trim()) {
      throw new FlomoRequestError("BAD_REQUEST", "memo content 不能为空。");
    }

    const content = formatCreateContent(input.content, input.tags);
    const payload = buildFlomoWebQuery({
      content,
      created_at: formatFlomoLocalDateTime(this.config.timezone),
      source: "web",
      memo_from: "human",
      file_ids: [],
      tz: getFlomoTz(this.config.timezone)
    });

    const raw = await this.httpClient.requestJson<unknown>(this.config.writeEndpoint ?? DEFAULT_WRITE_ENDPOINT, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    return parseMemo(extractCreatedMemo(raw), this.config.webBaseUrl);
  }
}

export function formatCreateContent(content: string, tags: string[] | undefined): string {
  const normalizedTags = normalizeTags(tags);
  const trimmedContent = formatContentHtml(content);
  if (normalizedTags.length === 0) {
    return trimmedContent;
  }

  return `${trimmedContent}<p>${escapeHtml(normalizedTags.join(" "))}</p>`;
}

export function formatFlomoLocalDateTime(timezone: string, date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const values = new Map(parts.map((part) => [part.type, part.value]));
  return [values.get("year"), values.get("month"), values.get("day")].join("-") + ` ${values.get("hour")}:${values.get("minute")}:${values.get("second")}`;
}

function extractCreatedMemo(raw: unknown): unknown {
  if (isMemoLike(raw)) {
    return raw;
  }

  if (!isRecord(raw)) {
    throw new FlomoRequestError("PARSER_FAILED", "写入接口返回体不是对象。");
  }

  const candidates = [raw.memo, raw.data, raw.item, raw.result];
  for (const candidate of candidates) {
    if (isMemoLike(candidate)) {
      return candidate;
    }
    if (isRecord(candidate)) {
      const nested = [candidate.memo, candidate.data, candidate.item, candidate.result].find(isMemoLike);
      if (nested) {
        return nested;
      }
    }
  }

  throw new FlomoRequestError("PARSER_FAILED", "写入接口返回体中找不到创建后的 memo 对象。");
}

function isMemoLike(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && ("content" in value || "text" in value || "html" in value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function formatContentHtml(content: string): string {
  const trimmed = content.trim();
  const paragraphs = trimmed
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`);

  return paragraphs.join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
```

- [ ] **Step 4: Run write client tests**

Run:

```powershell
npm test -- tests/writeClient.test.ts
npm run typecheck:test
```

Expected: tests and test typecheck pass.

- [ ] **Step 5: Commit write client**

Run:

```powershell
git add src/core/clients/flomoWriteClient.ts tests/writeClient.test.ts
git commit -m "feat: add flomo write client"
```

Expected: commit succeeds.

---

### Task 6: Persistent Note Cache

**Files:**
- Create: `src/cache/noteCache.ts`
- Test: `tests/cache.test.ts`

- [ ] **Step 1: Write cache tests**

Create `tests/cache.test.ts`:

```ts
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CliError } from "../src/core/errors.js";
import { readNoteCache, writeNoteCache } from "../src/cache/noteCache.js";
import type { Memo } from "../src/core/models/memo.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

async function tempFile(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "flomo-web-cli-cache-"));
  tempDirs.push(dir);
  return join(dir, "notes.json");
}

function memo(slug: string): Memo {
  return {
    slug,
    content: "content",
    tags: ["#tag"],
    url: `https://v.flomoapp.com/memo/${slug}`,
    createdAt: "2026-05-03T00:00:00.000Z",
    updatedAt: "2026-05-03T00:00:00.000Z"
  };
}

describe("note cache", () => {
  it("writes and reads versioned cache", async () => {
    const file = await tempFile();
    await writeNoteCache(file, {
      syncedAt: "2026-05-03T00:00:00.000Z",
      complete: true,
      items: [memo("a")]
    });

    await expect(readNoteCache(file)).resolves.toMatchObject({
      version: 1,
      complete: true,
      items: [{ slug: "a" }]
    });
  });

  it("distinguishes missing cache", async () => {
    await expect(readNoteCache(join(await tempFile(), "missing.json"))).rejects.toMatchObject({
      code: "CACHE_MISSING"
    } satisfies Partial<CliError>);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm test -- tests/cache.test.ts
```

Expected: FAIL because `noteCache.ts` does not exist.

- [ ] **Step 3: Add note cache implementation**

Create `src/cache/noteCache.ts`:

```ts
import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { CliError } from "../core/errors.js";
import type { Memo } from "../core/models/memo.js";
import type { MemoPageCursor } from "../core/types/flomo.js";
import { ensureParentDirectory } from "../utils/filesystem.js";

export const NOTE_CACHE_VERSION = 1;

export interface NoteCache {
  version: 1;
  syncedAt: string;
  complete: boolean;
  nextCursor?: MemoPageCursor;
  items: Memo[];
}

export interface WriteNoteCacheInput {
  syncedAt: string;
  complete: boolean;
  nextCursor?: MemoPageCursor;
  items: Memo[];
}

const MemoSchema = z.object({
  slug: z.string(),
  content: z.string(),
  html: z.string().optional(),
  tags: z.array(z.string()),
  url: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

const CursorSchema = z.object({
  latestUpdatedAt: z.number(),
  latestSlug: z.string()
});

const NoteCacheSchema = z.object({
  version: z.literal(NOTE_CACHE_VERSION),
  syncedAt: z.string(),
  complete: z.boolean(),
  nextCursor: CursorSchema.optional(),
  items: z.array(MemoSchema)
});

export async function readNoteCache(filePath: string): Promise<NoteCache> {
  let text: string;
  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      throw new CliError("CACHE_MISSING", `未找到全量缓存。请先运行 flomo-web sync。`);
    }
    throw error;
  }

  try {
    const parsed = JSON.parse(text) as unknown;
    if (isRecord(parsed) && typeof parsed.version === "number" && parsed.version !== NOTE_CACHE_VERSION) {
      throw new CliError("CACHE_INVALID", `不支持的缓存版本：${parsed.version}。请重新运行 flomo-web sync。`);
    }
    return NoteCacheSchema.parse(parsed);
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }
    throw new CliError("CACHE_INVALID", `缓存文件无效。请重新运行 flomo-web sync。`, { cause: error });
  }
}

export async function writeNoteCache(filePath: string, input: WriteNoteCacheInput): Promise<NoteCache> {
  const cache: NoteCache = {
    version: NOTE_CACHE_VERSION,
    syncedAt: input.syncedAt,
    complete: input.complete,
    ...(input.nextCursor ? { nextCursor: input.nextCursor } : {}),
    items: input.items
  };
  await ensureParentDirectory(filePath);
  await writeFile(filePath, `${JSON.stringify(cache, null, 2)}\n`, { mode: 0o600 });
  return cache;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
```

- [ ] **Step 4: Run cache tests**

Run:

```powershell
npm test -- tests/cache.test.ts
npm run typecheck:test
```

Expected: tests and test typecheck pass.

- [ ] **Step 5: Commit cache**

Run:

```powershell
git add src/cache tests/cache.test.ts
git commit -m "feat: add persistent note cache"
```

Expected: commit succeeds.

---

### Task 7: Formatters and Stdin Utility

**Files:**
- Create: `src/formatters/json.ts`
- Create: `src/formatters/human.ts`
- Create: `src/utils/stdin.ts`
- Test: `tests/formatters.test.ts`
- Test: `tests/stdin.test.ts`

- [ ] **Step 1: Write formatter and stdin tests**

Create `tests/formatters.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatJson } from "../src/formatters/json.js";
import { formatMemoList, formatCreatedMemo } from "../src/formatters/human.js";
import type { Memo } from "../src/core/models/memo.js";

const memo: Memo = {
  slug: "abc",
  content: "A long memo body that should be shown in a compact way",
  tags: ["#work"],
  url: "https://v.flomoapp.com/memo/abc",
  createdAt: "2026-05-03T00:00:00.000Z",
  updatedAt: "2026-05-03T00:00:00.000Z"
};

describe("formatJson", () => {
  it("prints stable pretty JSON", () => {
    expect(formatJson({ ok: true })).toBe("{\n  \"ok\": true\n}");
  });
});

describe("human formatters", () => {
  it("formats memo lists", () => {
    expect(formatMemoList([memo])).toContain("abc");
    expect(formatMemoList([memo])).toContain("#work");
  });

  it("formats created memo", () => {
    expect(formatCreatedMemo(memo)).toContain("Created");
    expect(formatCreatedMemo(memo)).toContain("https://v.flomoapp.com/memo/abc");
  });
});
```

Create `tests/stdin.test.ts`:

```ts
import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { readStdin } from "../src/utils/stdin.js";

describe("readStdin", () => {
  it("reads utf8 stream content", async () => {
    await expect(readStdin(Readable.from(["hello", " world"]))).resolves.toBe("hello world");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm test -- tests/formatters.test.ts tests/stdin.test.ts
```

Expected: FAIL because formatter and stdin modules do not exist.

- [ ] **Step 3: Add formatter modules**

Create `src/formatters/json.ts`:

```ts
export function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
```

Create `src/formatters/human.ts`:

```ts
import type { NoteCache } from "../cache/noteCache.js";
import type { Memo } from "../core/models/memo.js";
import type { SyncNotesResult } from "../core/types/flomo.js";
import { summarize } from "../core/utils/text.js";

export function formatMemoList(items: Memo[]): string {
  if (items.length === 0) {
    return "No memos found.";
  }

  return items.map(formatMemoSummary).join("\n\n");
}

export function formatMemoDetail(memo: Memo | null): string {
  if (!memo) {
    return "Memo not found.";
  }

  const tags = memo.tags.length ? `\nTags: ${memo.tags.join(" ")}` : "";
  return [
    `Slug: ${memo.slug}`,
    `URL: ${memo.url}`,
    `Created: ${memo.createdAt}`,
    `Updated: ${memo.updatedAt}${tags}`,
    "",
    memo.content
  ].join("\n");
}

export function formatSyncResult(result: SyncNotesResult | NoteCache): string {
  const synced = "synced" in result ? result.synced : result.items.length;
  const pages = "pages" in result ? `\nPages: ${result.pages}` : "";
  const completeMessage = result.complete ? "Complete: yes" : "Complete: no, more memos may remain beyond the configured page limit.";
  return [`Synced: ${synced}`, `Cached: ${result.items.length}`, `Synced at: ${result.syncedAt}`, completeMessage + pages].join("\n");
}

export function formatCreatedMemo(memo: Memo): string {
  return [`Created: ${memo.slug}`, `URL: ${memo.url}`, `Summary: ${summarize(memo.content)}`].join("\n");
}

export function formatConfigEntries(entries: Array<{ key: string; value: string }>): string {
  if (entries.length === 0) {
    return "No user config values set.";
  }

  return entries.map((entry) => `${entry.key}=${entry.value}`).join("\n");
}

function formatMemoSummary(memo: Memo): string {
  const tags = memo.tags.length ? ` ${memo.tags.join(" ")}` : "";
  return [`${memo.createdAt || "unknown"} ${memo.slug}${tags}`, summarize(memo.content)].join("\n");
}
```

- [ ] **Step 4: Add stdin utility**

Create `src/utils/stdin.ts`:

```ts
import type { Readable } from "node:stream";

export async function readStdin(stream: NodeJS.ReadStream | Readable = process.stdin): Promise<string> {
  stream.setEncoding("utf8");
  let value = "";

  for await (const chunk of stream) {
    value += chunk;
  }

  return value;
}
```

- [ ] **Step 5: Run formatter and stdin tests**

Run:

```powershell
npm test -- tests/formatters.test.ts tests/stdin.test.ts
npm run typecheck:test
```

Expected: tests and test typecheck pass.

- [ ] **Step 6: Commit formatters**

Run:

```powershell
git add src/formatters src/utils/stdin.ts tests/formatters.test.ts tests/stdin.test.ts
git commit -m "feat: add cli output formatters"
```

Expected: commit succeeds.

---

### Task 8: Command Implementations

**Files:**
- Create: `src/commands/types.ts`
- Create: `src/commands/list.ts`
- Create: `src/commands/search.ts`
- Create: `src/commands/sync.ts`
- Create: `src/commands/get.ts`
- Create: `src/commands/create.ts`
- Create: `src/commands/config.ts`
- Test: `tests/commands.test.ts`

- [ ] **Step 1: Write command tests**

Create `tests/commands.test.ts`:

```ts
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCreateCommand } from "../src/commands/create.js";
import { runGetCommand } from "../src/commands/get.js";
import { runListCommand } from "../src/commands/list.js";
import { runSearchCommand } from "../src/commands/search.js";
import { runSyncCommand } from "../src/commands/sync.js";
import { runConfigCommand } from "../src/commands/config.js";
import type { CommandContext } from "../src/commands/types.js";
import type { Memo } from "../src/core/models/memo.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

async function createContext(): Promise<CommandContext> {
  const dir = await mkdtemp(join(tmpdir(), "flomo-web-cli-command-"));
  tempDirs.push(dir);
  const cachePath = join(dir, "notes.json");
  const configPath = join(dir, "config.json");
  const items = [memo("a", "alpha #work"), memo("b", "beta")];

  return {
    configPath,
    cachePath,
    readClient: {
      list: async () => items,
      search: async (query: string) => items.filter((item) => item.content.includes(query)),
      getBySlug: async (slug: string) => items.find((item) => item.slug === slug) ?? null,
      getRecentBatch: async () => items,
      syncAll: async () => ({
        synced: items.length,
        totalCached: items.length,
        pages: 1,
        complete: true,
        syncedAt: "2026-05-03T00:00:00.000Z",
        items
      })
    },
    writeClient: {
      create: async ({ content }) => memo("created", content)
    }
  };
}

function memo(slug: string, content: string): Memo {
  return {
    slug,
    content,
    tags: content.includes("#work") ? ["#work"] : [],
    url: `https://v.flomoapp.com/memo/${slug}`,
    createdAt: "2026-05-03T00:00:00.000Z",
    updatedAt: "2026-05-03T00:00:00.000Z"
  };
}

describe("commands", () => {
  it("lists memos as JSON", async () => {
    const result = await runListCommand(await createContext(), { json: true, limit: 20 });
    expect(result.stdout).toContain("\"items\"");
    expect(result.stdout).toContain("\"recent_notes\"");
  });

  it("syncs memos into cache", async () => {
    const context = await createContext();
    const result = await runSyncCommand(context, { json: false, pageSize: 200, maxPages: 50 });
    expect(result.stdout).toContain("Synced: 2");
    await expect(runSearchCommand(context, { json: true, query: "alpha", limit: 20, scope: "all" })).resolves.toMatchObject({
      exitCode: 0
    });
  });

  it("gets a recent memo", async () => {
    await expect(runGetCommand(await createContext(), { json: false, slug: "a", scope: "recent" })).resolves.toMatchObject({
      stdout: expect.stringContaining("alpha")
    });
  });

  it("creates a memo", async () => {
    await expect(runCreateCommand(await createContext(), { json: false, content: "hello", tags: [], stdin: false })).resolves.toMatchObject({
      stdout: expect.stringContaining("Created")
    });
  });

  it("sets and lists masked config", async () => {
    const context = await createContext();
    await runConfigCommand(context, { action: "set", key: "authorization", value: "Bearer abcdefghijklmnop" });
    const result = await runConfigCommand(context, { action: "list" });
    expect(result.stdout).toContain("Bearer abcd...mnop");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm test -- tests/commands.test.ts
```

Expected: FAIL because command modules do not exist.

- [ ] **Step 3: Add command types**

Create `src/commands/types.ts`:

```ts
import type { FlomoReadClient, FlomoWriteClient } from "../core/types/flomo.js";

export interface CommandContext {
  configPath: string;
  cachePath: string;
  readClient: FlomoReadClient;
  writeClient: FlomoWriteClient;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export function ok(stdout: string): CommandResult {
  return { stdout, stderr: "", exitCode: 0 };
}
```

- [ ] **Step 4: Add list, search, sync, and get commands**

Create `src/commands/list.ts`:

```ts
import { formatMemoList } from "../formatters/human.js";
import { formatJson } from "../formatters/json.js";
import type { CommandContext, CommandResult } from "./types.js";
import { ok } from "./types.js";

export async function runListCommand(context: CommandContext, options: { json?: boolean; limit?: number }): Promise<CommandResult> {
  const items = await context.readClient.list(options.limit);
  const payload = {
    ok: true,
    items,
    scope: {
      source: "recent_notes",
      complete: false,
      description: "Results are limited to the recent memo batch returned by flomo Web."
    }
  };
  return ok(options.json ? formatJson(payload) : formatMemoList(items));
}
```

Create `src/commands/search.ts`:

```ts
import { readNoteCache } from "../cache/noteCache.js";
import { filterMemos } from "../core/clients/flomoReadClient.js";
import { formatMemoList } from "../formatters/human.js";
import { formatJson } from "../formatters/json.js";
import type { CommandContext, CommandResult } from "./types.js";
import { ok } from "./types.js";

export async function runSearchCommand(
  context: CommandContext,
  options: { json?: boolean; query: string; limit?: number; scope?: "recent" | "all" }
): Promise<CommandResult> {
  if (options.scope === "all") {
    const cache = await readNoteCache(context.cachePath);
    const items = filterMemos(cache.items, options.query, options.limit);
    const payload = {
      ok: true,
      items,
      scope: {
        source: "all_synced_notes",
        complete: cache.complete,
        syncedAt: cache.syncedAt,
        description: cache.complete
          ? "Results come from the locally synced flomo cache."
          : "Results come from the locally synced flomo cache, but the sync stopped before reaching the end."
      }
    };
    return ok(options.json ? formatJson(payload) : formatMemoList(items));
  }

  const items = await context.readClient.search(options.query, options.limit);
  const payload = {
    ok: true,
    items,
    scope: {
      source: "recent_notes",
      complete: false,
      description: "Results are limited to the recent memo batch returned by flomo Web."
    }
  };
  return ok(options.json ? formatJson(payload) : formatMemoList(items));
}
```

Create `src/commands/sync.ts`:

```ts
import { writeNoteCache } from "../cache/noteCache.js";
import { formatSyncResult } from "../formatters/human.js";
import { formatJson } from "../formatters/json.js";
import type { CommandContext, CommandResult } from "./types.js";
import { ok } from "./types.js";

export async function runSyncCommand(
  context: CommandContext,
  options: { json?: boolean; pageSize?: number; maxPages?: number }
): Promise<CommandResult> {
  const result = await context.readClient.syncAll({ pageSize: options.pageSize, maxPages: options.maxPages });
  const cache = await writeNoteCache(context.cachePath, {
    syncedAt: result.syncedAt,
    complete: result.complete,
    nextCursor: result.nextCursor,
    items: result.items
  });
  const payload = {
    ok: true,
    synced: result.synced,
    totalCached: cache.items.length,
    pages: result.pages,
    complete: cache.complete,
    syncedAt: cache.syncedAt,
    nextCursor: cache.nextCursor,
    scope: {
      source: "all_synced_notes",
      complete: cache.complete,
      syncedAt: cache.syncedAt
    }
  };
  return ok(options.json ? formatJson(payload) : formatSyncResult(result));
}
```

Create `src/commands/get.ts`:

```ts
import { readNoteCache } from "../cache/noteCache.js";
import { formatMemoDetail } from "../formatters/human.js";
import { formatJson } from "../formatters/json.js";
import type { CommandContext, CommandResult } from "./types.js";
import { ok } from "./types.js";

export async function runGetCommand(
  context: CommandContext,
  options: { json?: boolean; slug: string; scope?: "recent" | "all" }
): Promise<CommandResult> {
  if (options.scope === "all") {
    const cache = await readNoteCache(context.cachePath);
    const memo = cache.items.find((item) => item.slug === options.slug) ?? null;
    const payload = {
      ok: true,
      memo,
      scope: {
        source: "all_synced_notes",
        complete: cache.complete,
        syncedAt: cache.syncedAt
      }
    };
    return ok(options.json ? formatJson(payload) : formatMemoDetail(memo));
  }

  const memo = await context.readClient.getBySlug(options.slug);
  const payload = {
    ok: true,
    memo,
    scope: {
      source: "recent_notes",
      complete: false
    }
  };
  return ok(options.json ? formatJson(payload) : formatMemoDetail(memo));
}
```

- [ ] **Step 5: Add create and config commands**

Create `src/commands/create.ts`:

```ts
import { formatCreatedMemo } from "../formatters/human.js";
import { formatJson } from "../formatters/json.js";
import { readStdin } from "../utils/stdin.js";
import { CliError } from "../core/errors.js";
import type { CommandContext, CommandResult } from "./types.js";
import { ok } from "./types.js";

export async function runCreateCommand(
  context: CommandContext,
  options: { json?: boolean; content?: string; tags?: string[]; stdin?: boolean }
): Promise<CommandResult> {
  const stdinContent = options.stdin ? await readStdin() : "";
  const content = [options.content, stdinContent].filter(Boolean).join("\n").trim();
  if (!content) {
    throw new CliError("BAD_REQUEST", "memo content 不能为空。请传入内容或使用 --stdin。");
  }

  const memo = await context.writeClient.create({ content, tags: options.tags });
  const payload = { ok: true, memo };
  return ok(options.json ? formatJson(payload) : formatCreatedMemo(memo));
}
```

Create `src/commands/config.ts`:

```ts
import { CliError } from "../core/errors.js";
import { formatConfigEntries } from "../formatters/human.js";
import { formatJson } from "../formatters/json.js";
import { isUserConfigKey, maskConfigValue, readUserConfig, writeUserConfig, type UserConfigKey } from "../config/userConfig.js";
import type { CommandContext, CommandResult } from "./types.js";
import { ok } from "./types.js";

export type ConfigCommandOptions =
  | { action: "set"; key: string; value: string; json?: boolean }
  | { action: "get"; key: string; json?: boolean }
  | { action: "unset"; key: string; json?: boolean }
  | { action: "list"; json?: boolean };

export async function runConfigCommand(context: CommandContext, options: ConfigCommandOptions): Promise<CommandResult> {
  const config = await readUserConfig(context.configPath);

  if (options.action === "set") {
    const key = parseKey(options.key);
    const next = { ...config, [key]: parseValue(key, options.value) };
    await writeUserConfig(context.configPath, next);
    return ok(options.json ? formatJson({ ok: true, key }) : `Set ${key}.`);
  }

  if (options.action === "get") {
    const key = parseKey(options.key);
    const value = config[key];
    const masked = maskConfigValue(key, value);
    return ok(options.json ? formatJson({ ok: true, key, value: masked }) : `${key}=${masked}`);
  }

  if (options.action === "unset") {
    const key = parseKey(options.key);
    const next = { ...config };
    delete next[key];
    await writeUserConfig(context.configPath, next);
    return ok(options.json ? formatJson({ ok: true, key }) : `Unset ${key}.`);
  }

  const entries = Object.entries(config).map(([key, value]) => ({ key, value: maskConfigValue(key, value) }));
  return ok(options.json ? formatJson({ ok: true, items: entries }) : formatConfigEntries(entries));
}

function parseKey(key: string): UserConfigKey {
  if (!isUserConfigKey(key)) {
    throw new CliError("CONFIG_INVALID", `不支持的配置键：${key}`);
  }

  return key;
}

function parseValue(key: UserConfigKey, value: string): string | number {
  if (key === "requestTimeoutMs") {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new CliError("CONFIG_INVALID", "requestTimeoutMs 必须是正整数。");
    }
    return parsed;
  }

  return value;
}
```

- [ ] **Step 6: Run command tests**

Run:

```powershell
npm test -- tests/commands.test.ts
npm run typecheck:test
```

Expected: tests and test typecheck pass.

- [ ] **Step 7: Commit commands**

Run:

```powershell
git add src/commands tests/commands.test.ts
git commit -m "feat: add cli commands"
```

Expected: commit succeeds.

---

### Task 9: CLI Parser, Runtime Wiring, and Entrypoint

**Files:**
- Create: `src/cli/parser.ts`
- Create: `src/cli/run.ts`
- Modify: `src/index.ts`
- Test: `tests/cli.test.ts`

- [ ] **Step 1: Write CLI parser tests**

Create `tests/cli.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createProgram } from "../src/cli/parser.js";

describe("CLI parser", () => {
  it("parses list options", () => {
    const program = createProgram();
    program.exitOverride();
    program.parse(["node", "flomo-web", "list", "--limit", "5", "--json"]);
    const command = program.commands.find((item) => item.name() === "list");
    expect(command?.opts()).toMatchObject({ limit: 5, json: true });
  });

  it("has the expected command names", () => {
    const names = createProgram().commands.map((command) => command.name());
    expect(names).toEqual(["list", "search", "sync", "get", "create", "config"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm test -- tests/cli.test.ts
```

Expected: FAIL because CLI modules do not exist.

- [ ] **Step 3: Add parser**

Create `src/cli/parser.ts`:

```ts
import { Command } from "commander";

export interface ParsedCommand {
  name: string;
  args: unknown[];
  options: Record<string, unknown>;
}

export function createProgram(onCommand?: (command: ParsedCommand) => void): Command {
  const program = new Command();
  program
    .name("flomo-web")
    .description("Third-party flomo CLI based on flomo Web session credentials.")
    .version("0.1.0");

  program
    .command("list")
    .description("List recent flomo memos.")
    .option("--authorization <value>", "flomo Authorization header")
    .option("--limit <number>", "maximum memo count", parseInteger, 20)
    .option("--json", "print JSON output", false)
    .action((options) => onCommand?.({ name: "list", args: [], options }));

  program
    .command("search")
    .description("Search flomo memos.")
    .argument("<query>", "search query")
    .option("--authorization <value>", "flomo Authorization header")
    .option("--limit <number>", "maximum memo count", parseInteger, 20)
    .option("--scope <scope>", "recent or all", "recent")
    .option("--json", "print JSON output", false)
    .action((query, options) => onCommand?.({ name: "search", args: [query], options }));

  program
    .command("sync")
    .description("Sync flomo memos into the local cache.")
    .option("--authorization <value>", "flomo Authorization header")
    .option("--page-size <number>", "page size", parseInteger, 200)
    .option("--max-pages <number>", "maximum pages", parseInteger, 50)
    .option("--json", "print JSON output", false)
    .action((options) => onCommand?.({ name: "sync", args: [], options }));

  program
    .command("get")
    .description("Get one flomo memo by slug.")
    .argument("<slug>", "memo slug")
    .option("--authorization <value>", "flomo Authorization header")
    .option("--scope <scope>", "recent or all", "recent")
    .option("--json", "print JSON output", false)
    .action((slug, options) => onCommand?.({ name: "get", args: [slug], options }));

  program
    .command("create")
    .description("Create a flomo memo.")
    .argument("[content...]", "memo content")
    .option("--authorization <value>", "flomo Authorization header")
    .option("--tag <tag>", "tag to append", collect, [])
    .option("--stdin", "read memo content from stdin", false)
    .option("--json", "print JSON output", false)
    .action((content, options) => onCommand?.({ name: "create", args: [content], options }));

  const config = program.command("config").description("Manage user configuration.");
  config.command("set").argument("<key>").argument("<value>").option("--json", "print JSON output", false).action((key, value, options) => onCommand?.({ name: "config:set", args: [key, value], options }));
  config.command("get").argument("<key>").option("--json", "print JSON output", false).action((key, options) => onCommand?.({ name: "config:get", args: [key], options }));
  config.command("unset").argument("<key>").option("--json", "print JSON output", false).action((key, options) => onCommand?.({ name: "config:unset", args: [key], options }));
  config.command("list").option("--json", "print JSON output", false).action((options) => onCommand?.({ name: "config:list", args: [], options }));

  return program;
}

function parseInteger(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected positive integer, received ${value}`);
  }
  return parsed;
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}
```

- [ ] **Step 4: Add runtime wiring**

Create `src/cli/run.ts`:

```ts
import { getNoteCachePath, getUserConfigPath } from "../utils/filesystem.js";
import { loadDotenvFile, loadEnvConfig, type PartialRuntimeConfig } from "../config/env.js";
import { readUserConfig } from "../config/userConfig.js";
import { resolveConfig } from "../config/resolvedConfig.js";
import { FlomoHttpClient } from "../core/clients/http.js";
import { BearerFlomoReadClient } from "../core/clients/flomoReadClient.js";
import { BearerFlomoWriteClient } from "../core/clients/flomoWriteClient.js";
import { toPublicError } from "../core/errors.js";
import { formatJson } from "../formatters/json.js";
import { runListCommand } from "../commands/list.js";
import { runSearchCommand } from "../commands/search.js";
import { runSyncCommand } from "../commands/sync.js";
import { runGetCommand } from "../commands/get.js";
import { runCreateCommand } from "../commands/create.js";
import { runConfigCommand } from "../commands/config.js";
import type { CommandContext, CommandResult } from "../commands/types.js";
import { createProgram, type ParsedCommand } from "./parser.js";

export async function runCli(argv: string[], io: { stdout: NodeJS.WriteStream; stderr: NodeJS.WriteStream } = { stdout: process.stdout, stderr: process.stderr }): Promise<number> {
  let parsed: ParsedCommand | undefined;
  const program = createProgram((command) => {
    parsed = command;
  });

  try {
    program.parse(argv);
    if (!parsed) {
      return 0;
    }

    const result = await dispatch(parsed);
    writeIfPresent(io.stdout, result.stdout);
    writeIfPresent(io.stderr, result.stderr);
    return result.exitCode;
  } catch (error) {
    const wantsJson = Boolean(parsed?.options.json);
    const publicError = toPublicError(error);
    const text = wantsJson ? formatJson({ ok: false, error: publicError }) : `${publicError.code}: ${publicError.message}`;
    io.stderr.write(`${text}\n`);
    return 1;
  }
}

async function dispatch(parsed: ParsedCommand): Promise<CommandResult> {
  const context = await buildContext(parsed.options);

  if (parsed.name === "list") {
    return runListCommand(context, { json: Boolean(parsed.options.json), limit: numberOption(parsed.options.limit) });
  }

  if (parsed.name === "search") {
    return runSearchCommand(context, {
      json: Boolean(parsed.options.json),
      query: String(parsed.args[0]),
      limit: numberOption(parsed.options.limit),
      scope: scopeOption(parsed.options.scope)
    });
  }

  if (parsed.name === "sync") {
    return runSyncCommand(context, {
      json: Boolean(parsed.options.json),
      pageSize: numberOption(parsed.options.pageSize),
      maxPages: numberOption(parsed.options.maxPages)
    });
  }

  if (parsed.name === "get") {
    return runGetCommand(context, {
      json: Boolean(parsed.options.json),
      slug: String(parsed.args[0]),
      scope: scopeOption(parsed.options.scope)
    });
  }

  if (parsed.name === "create") {
    const contentArg = Array.isArray(parsed.args[0]) ? parsed.args[0].join(" ") : undefined;
    return runCreateCommand(context, {
      json: Boolean(parsed.options.json),
      content: contentArg,
      tags: Array.isArray(parsed.options.tag) ? parsed.options.tag.map(String) : [],
      stdin: Boolean(parsed.options.stdin)
    });
  }

  if (parsed.name === "config:set") {
    return runConfigCommand(context, { action: "set", key: String(parsed.args[0]), value: String(parsed.args[1]), json: Boolean(parsed.options.json) });
  }

  if (parsed.name === "config:get") {
    return runConfigCommand(context, { action: "get", key: String(parsed.args[0]), json: Boolean(parsed.options.json) });
  }

  if (parsed.name === "config:unset") {
    return runConfigCommand(context, { action: "unset", key: String(parsed.args[0]), json: Boolean(parsed.options.json) });
  }

  if (parsed.name === "config:list") {
    return runConfigCommand(context, { action: "list", json: Boolean(parsed.options.json) });
  }

  return { stdout: "", stderr: `Unknown command: ${parsed.name}`, exitCode: 1 };
}

async function buildContext(options: Record<string, unknown>): Promise<CommandContext> {
  loadDotenvFile();
  const configPath = getUserConfigPath();
  const cachePath = getNoteCachePath();
  const user = await readUserConfig(configPath);
  const env = loadEnvConfig();
  const cli: PartialRuntimeConfig = {
    authorization: typeof options.authorization === "string" ? options.authorization : undefined
  };
  const config = resolveConfig({ user, env, cli });
  const httpClient = new FlomoHttpClient(config);
  const readClient = new BearerFlomoReadClient(config, httpClient);
  const writeClient = new BearerFlomoWriteClient(config, httpClient);
  return { configPath, cachePath, readClient, writeClient };
}

function writeIfPresent(stream: NodeJS.WriteStream, value: string): void {
  if (value) {
    stream.write(`${value}\n`);
  }
}

function numberOption(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function scopeOption(value: unknown): "recent" | "all" {
  return value === "all" ? "all" : "recent";
}
```

- [ ] **Step 5: Replace entrypoint**

Modify `src/index.ts`:

```ts
#!/usr/bin/env node

import { runCli } from "./cli/run.js";

const exitCode = await runCli(process.argv);
process.exitCode = exitCode;
```

- [ ] **Step 6: Run CLI tests and build**

Run:

```powershell
npm test -- tests/cli.test.ts
npm run typecheck:test
npm run build
node dist/index.js --help
node dist/index.js list --help
```

Expected: tests, typecheck, and build pass. Help commands print usage for the root command and `list`.

- [ ] **Step 7: Commit CLI wiring**

Run:

```powershell
git add src/cli src/index.ts tests/cli.test.ts
git commit -m "feat: wire cli parser and runtime"
```

Expected: commit succeeds.

---

### Task 10: Full README, Help Verification, and Release Polish

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Test: `tests/readmeExamples.test.ts`

- [ ] **Step 1: Write docs smoke test**

Create `tests/readmeExamples.test.ts`:

```ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("README", () => {
  it("documents required commands and security notes", async () => {
    const readme = await readFile("README.md", "utf8");
    expect(readme).toContain("flomo-web list");
    expect(readme).toContain("flomo-web search");
    expect(readme).toContain("flomo-web sync");
    expect(readme).toContain("flomo-web get");
    expect(readme).toContain("flomo-web create");
    expect(readme).toContain("flomo-web config");
    expect(readme).toContain("Authorization");
    expect(readme).toContain("cache");
    expect(readme).not.toContain("Bearer real");
  });
});
```

- [ ] **Step 2: Run docs test to verify it fails**

Run:

```powershell
npm test -- tests/readmeExamples.test.ts
```

Expected: FAIL because README does not yet document all commands.

- [ ] **Step 3: Expand README**

Replace `README.md` with:

```md
# flomo-web-cli

`flomo-web-cli` is a third-party local CLI for flomo. It uses your own flomo Web session credentials to list, search, sync, get, and create memos.

This is not an official flomo project. It depends on flomo Web internal endpoints and may break if those endpoints change. Use it only in local environments you trust.

## Requirements

- Node.js 20 or newer
- npm
- Your own flomo Web `Authorization` header

## Install

```bash
npm install -g flomo-web-cli
```

The global command is:

```bash
flomo-web
```

## Configure

Use environment variables, `.env`, or user config. Environment variables and `.env` override user config.

```bash
flomo-web config set authorization "Bearer your-token-here"
flomo-web config set timezone Asia/Shanghai
```

Sensitive values such as `authorization` and `cookie` are masked by display commands:

```bash
flomo-web config list
flomo-web config get authorization
```

You can also use `.env`:

```dotenv
FLOMO_AUTHORIZATION=Bearer your-token-here
FLOMO_BASE_URL=https://flomoapp.com
FLOMO_WEB_BASE_URL=https://v.flomoapp.com
FLOMO_TIMEZONE=Asia/Shanghai
```

## Commands

```bash
flomo-web list --limit 20
flomo-web list --json
```

```bash
flomo-web search "keyword" --limit 20
flomo-web search "keyword" --scope all
flomo-web search "keyword" --json
```

```bash
flomo-web sync --page-size 200 --max-pages 50
flomo-web sync --json
```

```bash
flomo-web get memo-slug
flomo-web get memo-slug --scope all
flomo-web get memo-slug --json
```

```bash
flomo-web create "memo content #tag"
echo "memo content" | flomo-web create --stdin
flomo-web create "memo content" --tag work --tag daily
flomo-web create "memo content" --json
```

```bash
flomo-web config set authorization "Bearer your-token-here"
flomo-web config get authorization
flomo-web config unset cookie
flomo-web config list
```

## JSON Output

Data commands support `--json`. JSON output is written to stdout as one JSON object. Errors are written to stderr as:

```json
{
  "ok": false,
  "error": {
    "code": "AUTH_EXPIRED",
    "message": "..."
  }
}
```

## Cache

`flomo-web sync` writes a persistent note cache so later commands can use `--scope all`.

On Windows, the cache is stored under:

```text
%LOCALAPPDATA%\flomo-web-cli\cache\notes.json
```

The cache contains memo content. Do not upload it, share it, or commit it.

## Getting Authorization

1. Log in to flomo Web in your browser.
2. Open DevTools and inspect Network requests.
3. Refresh the page.
4. Find a flomo XHR or fetch request.
5. Copy the `Authorization: Bearer ...` request header.
6. Store it with `flomo-web config set authorization "Bearer ..."` or `FLOMO_AUTHORIZATION`.

## Security Notes

- Do not commit `.env`, real credentials, or cache files.
- Do not paste credentials into public issues or online debugging tools.
- The CLI masks sensitive config values in display commands, but you are still responsible for protecting local files.
- flomo Web internal endpoints can change without notice.

## License

MIT
```

- [ ] **Step 4: Update changelog**

Replace `CHANGELOG.md` with:

```md
# Changelog

## 0.1.0

- Add independent `flomo-web` CLI package.
- Add list, search, sync, get, create, and config commands.
- Add human output by default and `--json` for automation.
- Add persistent sync cache for all-notes search and get.
```

- [ ] **Step 5: Run docs and full verification**

Run:

```powershell
npm test -- tests/readmeExamples.test.ts
npm run verify
node dist/index.js --help
node dist/index.js list --help
node dist/index.js search --help
node dist/index.js sync --help
node dist/index.js get --help
node dist/index.js create --help
node dist/index.js config --help
```

Expected: all tests, typechecks, build, and help commands pass.

- [ ] **Step 6: Commit docs polish**

Run:

```powershell
git add README.md CHANGELOG.md tests/readmeExamples.test.ts
git commit -m "docs: document flomo web cli usage"
```

Expected: commit succeeds.

---

## Final Verification

- [ ] **Step 1: Check worktree**

Run:

```powershell
git status --short
```

Expected: no output.

- [ ] **Step 2: Run complete verification**

Run:

```powershell
npm run verify
```

Expected: typecheck, test typecheck, tests, and build all pass.

- [ ] **Step 3: Verify CLI help from built output**

Run:

```powershell
node dist/index.js --help
node dist/index.js list --help
node dist/index.js search --help
node dist/index.js sync --help
node dist/index.js get --help
node dist/index.js create --help
node dist/index.js config --help
```

Expected: each command prints usage without throwing.

- [ ] **Step 4: Review sensitive examples**

Run:

```powershell
rg -n "Bearer real|Bearer [A-Za-z0-9_-]{20,}|FLOMO_AUTHORIZATION=.*[A-Za-z0-9_-]{20,}" README.md .env.example tests src
```

Expected: no real-looking credential examples.

- [ ] **Step 5: Summarize implementation**

Provide the user with:

```text
Implemented flomo-web CLI with list/search/sync/get/create/config.
Verification: npm run verify passed.
Built help checked with node dist/index.js --help and command help pages.
```
