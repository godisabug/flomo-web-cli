import type { Readable } from "node:stream";

export async function readStdin(stream: NodeJS.ReadStream | Readable = process.stdin): Promise<string> {
  stream.setEncoding("utf8");
  let value = "";

  for await (const chunk of stream) {
    value += chunk;
  }

  return value;
}
