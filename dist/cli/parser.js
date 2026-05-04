import { Command, InvalidArgumentError, Option } from "commander";
export function createProgram(onCommand) {
    const program = new Command();
    program.name("flomo-web").description("Third-party flomo command line tool based on flomo Web session credentials.").version("0.1.0");
    program
        .command("list")
        .description("List recent flomo memos.")
        .option("--authorization <authorization>", "flomo Authorization header override.")
        .option("--limit <number>", "Maximum number of memos to show.", parsePositiveInteger, 20)
        .option("--json", "Print JSON output.", false)
        .action((options) => {
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
        .action((query, options) => {
        onCommand?.({ name: "search", args: [query], options });
    });
    program
        .command("sync")
        .description("Sync flomo memos into the local cache.")
        .option("--authorization <authorization>", "flomo Authorization header override.")
        .option("--page-size <number>", "Page size for sync requests.", parsePositiveInteger, 200)
        .option("--max-pages <number>", "Maximum number of pages to sync.", parsePositiveInteger, 50)
        .option("--json", "Print JSON output.", false)
        .action((options) => {
        onCommand?.({ name: "sync", args: [], options });
    });
    program
        .command("get")
        .description("Get a memo by slug.")
        .argument("<slug>", "Memo slug.")
        .option("--authorization <authorization>", "flomo Authorization header override.")
        .addOption(new Option("--scope <scope>", "Lookup scope.").choices(["recent", "all"]).default("recent"))
        .option("--json", "Print JSON output.", false)
        .action((slug, options) => {
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
        .action((content, options) => {
        onCommand?.({ name: "create", args: content, options });
    });
    const config = program.command("config").description("Manage flomo-web CLI configuration.");
    config
        .command("set")
        .description("Set a config value.")
        .argument("<key>", "Config key.")
        .argument("<value>", "Config value.")
        .option("--json", "Print JSON output.", false)
        .action((key, value, options) => {
        onCommand?.({ name: "config:set", args: [key, value], options });
    });
    config
        .command("get")
        .description("Get a masked config value.")
        .argument("<key>", "Config key.")
        .option("--json", "Print JSON output.", false)
        .action((key, options) => {
        onCommand?.({ name: "config:get", args: [key], options });
    });
    config
        .command("unset")
        .description("Unset a config value.")
        .argument("<key>", "Config key.")
        .option("--json", "Print JSON output.", false)
        .action((key, options) => {
        onCommand?.({ name: "config:unset", args: [key], options });
    });
    config
        .command("list")
        .description("List masked config values.")
        .option("--json", "Print JSON output.", false)
        .action((options) => {
        onCommand?.({ name: "config:list", args: [], options });
    });
    return program;
}
function parsePositiveInteger(value) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new InvalidArgumentError("must be a positive integer");
    }
    return parsed;
}
function collectOption(value, previous) {
    return [...previous, value];
}
