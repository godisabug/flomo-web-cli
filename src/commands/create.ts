import { CliError } from "../core/errors.js";
import { formatCreatedMemo } from "../formatters/human.js";
import { formatJson } from "../formatters/json.js";
import { readStdin } from "../utils/stdin.js";
import type { CommandContext, CommandResult } from "./types.js";
import { ok } from "./types.js";

export interface CreateCommandOptions {
  json?: boolean;
  content?: string;
  tags?: string[];
  stdin?: boolean;
}

export async function runCreateCommand(context: CommandContext, options: CreateCommandOptions): Promise<CommandResult> {
  const parts = [options.content];
  if (options.stdin) {
    parts.push(await readStdin());
  }

  const content = parts.join("\n").trim();
  if (!content) {
    throw new CliError("BAD_REQUEST", "memo content 不能为空。请传入内容或使用 --stdin。");
  }

  const memo = await context.writeClient.create({
    content,
    tags: options.tags
  });

  return ok(options.json ? formatJson({ ok: true, memo }) : formatCreatedMemo(memo));
}
