import { readFileSync } from "node:fs";
import { Command, InvalidArgumentError, Option } from "commander";

export interface ParsedCommand {
  name: string;
  args: string[];
  options: Record<string, unknown>;
}

const packageVersion = readPackageVersion();

export function createProgram(onCommand?: (command: ParsedCommand) => void): Command {
  const program = new Command();
  program.name("flomo-web").description("Third-party flomo command line tool based on flomo Web session credentials.").version(packageVersion);

  program
    .command("list")
    .description("List recent flomo memos.")
    .option("--authorization <authorization>", "flomo Authorization header override.")
    .option("--limit <number>", "Maximum number of memos to show.", parsePositiveInteger, 20)
    .option("--json", "Print JSON output.", false)
    .action((options: Record<string, unknown>) => {
      onCommand?.({ name: "list", args: [], options });
    });

  program
    .command("search")
    .description("Search flomo memos.")
    .argument("<query>", "Search query.")
    .option("--authorization <authorization>", "flomo Authorization header override.")
    .option("--limit <number>", "Maximum number of memos to show.", parsePositiveInteger, 20)
    .addOption(new Option("--scope <scope>", "Search scope.").choices(["recent", "all"]).default("recent"))
    .option("--json", "Print JSON output.", false)
    .action((query: string, options: Record<string, unknown>) => {
      onCommand?.({ name: "search", args: [query], options });
    });

  program
    .command("sync")
    .description("Sync flomo memos into the local cache.")
    .option("--authorization <authorization>", "flomo Authorization header override.")
    .option("--page-size <number>", "Page size for sync requests.", parsePositiveInteger, 200)
    .option("--max-pages <number>", "Maximum number of pages to sync.", parsePositiveInteger, 50)
    .option("--json", "Print JSON output.", false)
    .action((options: Record<string, unknown>) => {
      onCommand?.({ name: "sync", args: [], options });
    });

  program
    .command("get")
    .description("Get a memo by slug.")
    .argument("<slug>", "Memo slug.")
    .option("--authorization <authorization>", "flomo Authorization header override.")
    .addOption(new Option("--scope <scope>", "Lookup scope.").choices(["recent", "all"]).default("recent"))
    .option("--json", "Print JSON output.", false)
    .action((slug: string, options: Record<string, unknown>) => {
      onCommand?.({ name: "get", args: [slug], options });
    });

  program
    .command("create")
    .description("Create a flomo memo.")
    .argument("[content...]", "Memo content.")
    .option("--authorization <authorization>", "flomo Authorization header override.")
    .option("--tag <tag>", "Tag to append to the memo.", collectOption, [])
    .option("--stdin", "Read additional content from stdin.", false)
    .option("--json", "Print JSON output.", false)
    .action((content: string[], options: Record<string, unknown>) => {
      onCommand?.({ name: "create", args: content, options });
    });

  const config = program.command("config").description("Manage flomo-web CLI configuration.");

  config
    .command("set")
    .description("Set a config value.")
    .argument("<key>", "Config key.")
    .argument("<value>", "Config value.")
    .option("--json", "Print JSON output.", false)
    .action((key: string, value: string, options: Record<string, unknown>) => {
      onCommand?.({ name: "config:set", args: [key, value], options });
    });

  config
    .command("get")
    .description("Get a masked config value.")
    .argument("<key>", "Config key.")
    .option("--json", "Print JSON output.", false)
    .action((key: string, options: Record<string, unknown>) => {
      onCommand?.({ name: "config:get", args: [key], options });
    });

  config
    .command("unset")
    .description("Unset a config value.")
    .argument("<key>", "Config key.")
    .option("--json", "Print JSON output.", false)
    .action((key: string, options: Record<string, unknown>) => {
      onCommand?.({ name: "config:unset", args: [key], options });
    });

  config
    .command("list")
    .description("List masked config values.")
    .option("--json", "Print JSON output.", false)
    .action((options: Record<string, unknown>) => {
      onCommand?.({ name: "config:list", args: [], options });
    });

  return program;
}

function parsePositiveInteger(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new InvalidArgumentError("must be a positive integer");
  }

  return parsed;
}

function collectOption(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function readPackageVersion(): string {
  const packageJsonUrl = new URL("../../package.json", import.meta.url);
  const packageJson = JSON.parse(readFileSync(packageJsonUrl, "utf8")) as { version?: unknown };

  if (typeof packageJson.version !== "string" || packageJson.version.length === 0) {
    throw new Error("package.json version must be a non-empty string");
  }

  return packageJson.version;
}
