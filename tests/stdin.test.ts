import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { readStdin } from "../src/utils/stdin.js";

describe("readStdin", () => {
  it("reads utf8 stream content", async () => {
    await expect(readStdin(Readable.from(["hello", " world"]))).resolves.toBe("hello world");
  });
});
