import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { readStdin } from "../src/utils/stdin.js";

describe("readStdin", () => {
  it("reads utf8 stream content", async () => {
    await expect(readStdin(Readable.from(["hello", " world"]))).resolves.toBe("hello world");
  });

  it("reads empty stream content", async () => {
    await expect(readStdin(Readable.from([]))).resolves.toBe("");
  });

  it("propagates stream errors", async () => {
    const stream = new Readable({
      read() {
        this.destroy(new Error("stream failed"));
      }
    });

    await expect(readStdin(stream)).rejects.toThrow("stream failed");
  });
});
