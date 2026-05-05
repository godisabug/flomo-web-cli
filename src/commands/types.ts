import type { FlomoReadClient, FlomoWriteClient } from "../core/types/flomo.js";

export interface CommandContext {
  configPath: string;
  cachePath: string;
  timezone: string;
  readClient: FlomoReadClient;
  writeClient: FlomoWriteClient;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export function ok(stdout: string): CommandResult {
  return {
    stdout,
    stderr: "",
    exitCode: 0
  };
}
