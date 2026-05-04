import { BearerFlomoReadClient } from "../core/clients/flomoReadClient.js";
import { BearerFlomoWriteClient } from "../core/clients/flomoWriteClient.js";
import { FlomoHttpClient } from "../core/clients/http.js";
import { CliError, toPublicError } from "../core/errors.js";
import { loadDotenvFile, loadEnvConfig } from "../config/env.js";
import { resolveConfig } from "../config/resolvedConfig.js";
import { readUserConfig } from "../config/userConfig.js";
import { formatJson } from "../formatters/json.js";
import { getNoteCachePath, getUserConfigPath } from "../utils/filesystem.js";
import { runConfigCommand } from "../commands/config.js";
import { runCreateCommand } from "../commands/create.js";
import { runGetCommand } from "../commands/get.js";
import { runListCommand } from "../commands/list.js";
import { runSearchCommand } from "../commands/search.js";
import { runSyncCommand } from "../commands/sync.js";
import { createProgram } from "./parser.js";
const defaultIo = {
    stdout: process.stdout,
    stderr: process.stderr
};
export async function runCli(argv, io = defaultIo) {
    let parsedCommand;
    let parserStdout = "";
    let parserStderr = "";
    const program = createProgram((command) => {
        parsedCommand = command;
    });
    configureParser(program, {
        writeOut: (text) => {
            parserStdout += text;
        },
        writeErr: (text) => {
            parserStderr += text;
        }
    });
    try {
        await program.parseAsync(argv);
    }
    catch (error) {
        const exitCode = commandExitCode(error);
        if (exitCode !== 0 && wantsJsonOutput(argv)) {
            if (parserStdout) {
                io.stdout.write(parserStdout);
            }
            io.stderr.write(withNewline(formatJson({ ok: false, error: parserPublicError(error, parserStderr) })));
            return exitCode;
        }
        if (parserStdout) {
            io.stdout.write(parserStdout);
        }
        if (parserStderr) {
            io.stderr.write(parserStderr);
        }
        return exitCode;
    }
    if (parserStdout) {
        io.stdout.write(parserStdout);
    }
    if (parserStderr) {
        io.stderr.write(parserStderr);
    }
    if (!parsedCommand) {
        return 0;
    }
    try {
        const result = await dispatch(parsedCommand);
        writeResult(result, io);
        return result.exitCode;
    }
    catch (error) {
        const publicError = toCliPublicError(error);
        const stderr = isJsonMode(parsedCommand) ? formatJson({ ok: false, error: publicError }) : `${publicError.code}: ${publicError.message}`;
        io.stderr.write(withNewline(stderr));
        return 1;
    }
}
async function dispatch(command) {
    if (command.name === "config:set" || command.name === "config:get" || command.name === "config:unset" || command.name === "config:list") {
        return runConfigCommand(buildConfigContext(), configOptions(command));
    }
    const context = await buildContext(command.options);
    switch (command.name) {
        case "list":
            return runListCommand(context, {
                json: booleanOption(command.options.json),
                limit: numberOption(command.options.limit)
            });
        case "search":
            return runSearchCommand(context, {
                json: booleanOption(command.options.json),
                query: command.args[0] ?? "",
                limit: numberOption(command.options.limit),
                scope: scopeOption(command.options.scope)
            });
        case "sync":
            return runSyncCommand(context, {
                json: booleanOption(command.options.json),
                pageSize: numberOption(command.options.pageSize),
                maxPages: numberOption(command.options.maxPages)
            });
        case "get":
            return runGetCommand(context, {
                json: booleanOption(command.options.json),
                slug: command.args[0] ?? "",
                scope: scopeOption(command.options.scope)
            });
        case "create":
            return runCreateCommand(context, {
                json: booleanOption(command.options.json),
                content: command.args.join(" "),
                tags: stringArrayOption(command.options.tag),
                stdin: booleanOption(command.options.stdin)
            });
        default:
            throw new CliError("BAD_REQUEST", `Unsupported command: ${command.name}`);
    }
}
async function buildContext(options) {
    loadDotenvFile();
    const configPath = getUserConfigPath();
    const cachePath = getNoteCachePath();
    const userConfig = await readUserConfig(configPath);
    const envConfig = loadEnvConfig();
    const config = resolveConfig({
        user: userConfig,
        env: envConfig,
        cli: cliConfig(options)
    });
    const httpClient = new FlomoHttpClient(config);
    return {
        configPath,
        cachePath,
        readClient: new BearerFlomoReadClient(config, httpClient),
        writeClient: new BearerFlomoWriteClient(config, httpClient)
    };
}
function buildConfigContext() {
    return {
        configPath: getUserConfigPath()
    };
}
function configOptions(command) {
    const json = booleanOption(command.options.json);
    switch (command.name) {
        case "config:set":
            return { action: "set", key: command.args[0] ?? "", value: command.args[1] ?? "", json };
        case "config:get":
            return { action: "get", key: command.args[0] ?? "", json };
        case "config:unset":
            return { action: "unset", key: command.args[0] ?? "", json };
        case "config:list":
            return { action: "list", json };
        default:
            throw new CliError("BAD_REQUEST", `Unsupported config command: ${command.name}`);
    }
}
function cliConfig(options) {
    return {
        authorization: stringOption(options.authorization)
    };
}
function numberOption(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
function scopeOption(value) {
    if (value === undefined || value === "recent") {
        return "recent";
    }
    if (value === "all") {
        return "all";
    }
    throw new CliError("BAD_REQUEST", "scope 必须是 recent 或 all。");
}
function booleanOption(value) {
    return typeof value === "boolean" ? value : undefined;
}
function stringOption(value) {
    return typeof value === "string" ? value : undefined;
}
function stringArrayOption(value) {
    return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : undefined;
}
function isJsonMode(command) {
    return command.options.json === true;
}
function wantsJsonOutput(argv) {
    return argv.includes("--json");
}
function writeResult(result, io) {
    if (result.stdout) {
        io.stdout.write(withNewline(result.stdout));
    }
    if (result.stderr) {
        io.stderr.write(withNewline(result.stderr));
    }
}
function withNewline(text) {
    return text.endsWith("\n") ? text : `${text}\n`;
}
function commandExitCode(error) {
    if (typeof error === "object" && error !== null && "exitCode" in error && typeof error.exitCode === "number") {
        return error.exitCode;
    }
    return 1;
}
function parserPublicError(error, parserStderr) {
    return {
        code: "BAD_REQUEST",
        message: parserErrorMessage(error, parserStderr)
    };
}
function parserErrorMessage(error, parserStderr) {
    const stderrMessage = stripCommanderErrorPrefix(parserStderr);
    if (stderrMessage) {
        return stderrMessage;
    }
    if (error instanceof Error) {
        const errorMessage = stripCommanderErrorPrefix(error.message);
        if (errorMessage) {
            return errorMessage;
        }
    }
    return "CLI 参数无效。";
}
function stripCommanderErrorPrefix(text) {
    return text.trim().replace(/^error:\s*/i, "").trim();
}
function toCliPublicError(error) {
    const publicError = toPublicError(error);
    if (publicError.code === "UNKNOWN") {
        return {
            code: "UNKNOWN",
            message: "未知错误。"
        };
    }
    return publicError;
}
function configureParser(program, output) {
    program.exitOverride();
    program.configureOutput(output);
    for (const command of program.commands) {
        configureParser(command, output);
    }
}
