import { randomBytes } from "node:crypto";
import { chmod, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { ensureParentDirectory } from "./filesystem.js";

const PRIVATE_FILE_MODE = 0o600;

export async function writePrivateTextFile(filePath: string, text: string): Promise<void> {
  await ensureParentDirectory(filePath);
  const tempFilePath = getTempFilePath(filePath);

  try {
    await writeFile(tempFilePath, text, { mode: PRIVATE_FILE_MODE });
    await hardenFileMode(tempFilePath);
    await rename(tempFilePath, filePath);
  } catch (error) {
    await removeTempFile(tempFilePath);
    throw error;
  }
}

function getTempFilePath(filePath: string): string {
  return join(dirname(filePath), `.${basename(filePath)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

async function hardenFileMode(filePath: string): Promise<void> {
  try {
    await chmod(filePath, PRIVATE_FILE_MODE);
  } catch (error) {
    if (isIgnorableChmodError(error)) {
      return;
    }

    throw error;
  }
}

function isIgnorableChmodError(error: unknown): boolean {
  return isNodeError(error) &&
    (process.platform === "win32" || error.code === "ENOSYS" || error.code === "ENOTSUP" || error.code === "EOPNOTSUPP");
}

async function removeTempFile(filePath: string): Promise<void> {
  try {
    await rm(filePath, { force: true });
  } catch {
    return;
  }
}
