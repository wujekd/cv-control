import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

export interface TectonicResult {
  available: boolean;
  pdfBase64?: string;
  log: string;
  error?: string;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveTectonicBinary(): Promise<string> {
  const candidates = [
    process.env.TECTONIC_BIN,
    "/opt/homebrew/bin/tectonic",
    "/usr/local/bin/tectonic",
    "tectonic"
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (!candidate.includes("/")) {
      return candidate;
    }

    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return "tectonic";
}

async function getTectonicCacheDir(): Promise<string> {
  const serviceDir = path.dirname(fileURLToPath(import.meta.url));
  const cacheDir =
    process.env.TECTONIC_CACHE_DIR ?? path.resolve(serviceDir, "../../../data/tectonic-cache");
  await fs.mkdir(cacheDir, { recursive: true });
  return cacheDir;
}

async function runCommand(
  command: string,
  args: string[],
  cwd: string,
  extraEnv?: Record<string, string>
): Promise<{ code: number | null; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        ...extraEnv
      }
    });
    let output = "";

    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });

    child.on("error", (error) => {
      resolve({ code: 127, output: error.message });
    });

    child.on("close", (code) => {
      resolve({ code, output });
    });
  });
}

export async function compileLatexWithTectonic(latexSource: string): Promise<TectonicResult> {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "cv-control-"));
  const texFile = path.join(workspace, "main.tex");

  try {
    await fs.writeFile(texFile, latexSource, "utf8");
    const tectonicBinary = await resolveTectonicBinary();
    const cacheDir = await getTectonicCacheDir();
    const result = await runCommand(tectonicBinary, ["main.tex"], workspace, {
      TECTONIC_CACHE_DIR: cacheDir
    });
    if (result.code !== 0) {
      return {
        available: result.code !== 127,
        log: result.output,
        error:
          result.code === 127
            ? `Tectonic is not installed on the server. Checked ${tectonicBinary}.`
            : `Tectonic compilation failed using ${tectonicBinary}.`
      };
    }

    const pdfBuffer = await fs.readFile(path.join(workspace, "main.pdf"));
    return {
      available: true,
      pdfBase64: pdfBuffer.toString("base64"),
      log: result.output
    };
  } catch (error) {
    return {
      available: false,
      log: error instanceof Error ? error.message : "Unknown Tectonic error",
      error: error instanceof Error ? error.message : "Unknown Tectonic error"
    };
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}
