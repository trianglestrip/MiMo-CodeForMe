import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { tool } from "@mimo-ai/plugin"

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PY_REL = path.join("python", "python.exe")

// Resolve the embedded interpreter robustly, so it works no matter what the
// session cwd is or which packaging layout is in use.
//
// Priority:
//   1. MIMO_PYTHON_EXE env var (absolute, or relative to the mimo process cwd).
//   2. Known relative layouts next to this tool file:
//      - dev-home:  <config>/tool/python.ts  -> <config>/skill/python_env/python/python.exe
//      - dist:      <dist>/mimo/.dev-home/config/tool/python.ts -> <dist>/python_env/python/python.exe
//   3. MIMOCODE_HOME-relative fallbacks (home = <config>/.. and dist = home/../..).
// The first existing candidate wins; if none exist, candidate #1 (or a best
// guess) is returned so the error message points somewhere sensible.
function resolvePythonExe(): string {
  const candidates: string[] = []
  const env = process.env.MIMO_PYTHON_EXE
  if (env) {
    candidates.push(path.isAbsolute(env) ? env : path.resolve(process.cwd(), env))
    if (!path.isAbsolute(env)) candidates.push(path.resolve(HERE, env))
  }
  candidates.push(path.resolve(HERE, "..", "skill", "python_env", PY_REL)) // dev-home layout
  candidates.push(path.resolve(HERE, "..", "..", "..", "..", "python_env", PY_REL)) // dist layout
  const home = process.env.MIMOCODE_HOME
  if (home) {
    candidates.push(path.resolve(home, "config", "skill", "python_env", PY_REL))
    candidates.push(path.resolve(home, "..", "..", "python_env", PY_REL))
  }
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return candidates[0] ?? path.resolve(HERE, "..", "skill", "python_env", PY_REL)
}

const PYTHON_EXE = resolvePythonExe()

const DEFAULT_TIMEOUT_MS = 120_000
const PIP_TIMEOUT_MS = 300_000
const MAX_STREAM_CHARS = 30_000

type RunOptions = {
  cwd?: string
  input?: string
  timeoutMs?: number
  signal?: AbortSignal
}

type RunResult = {
  code: number | null
  signal: NodeJS.Signals | null
  stdout: string
  stderr: string
  timedOut: boolean
  spawnError?: string
}

function truncate(text: string): string {
  if (text.length <= MAX_STREAM_CHARS) return text
  const omitted = text.length - MAX_STREAM_CHARS
  return `${text.slice(0, MAX_STREAM_CHARS)}\n...[truncated ${omitted} chars]`
}

function runPython(pyArgs: string[], opts: RunOptions = {}): Promise<RunResult> {
  return new Promise((resolve) => {
    if (!existsSync(PYTHON_EXE)) {
      resolve({
        code: null,
        signal: null,
        stdout: "",
        stderr: `Embedded Python not found at "${PYTHON_EXE}". Set the MIMO_PYTHON_EXE env var to override the interpreter path.`,
        timedOut: false,
        spawnError: "interpreter_missing",
      })
      return
    }

    const child = spawn(PYTHON_EXE, pyArgs, {
      cwd: opts.cwd,
      env: {
        ...process.env,
        // Force UTF-8 so Windows console code pages don't garble output.
        PYTHONUTF8: "1",
        PYTHONIOENCODING: "utf-8",
      },
      windowsHide: true,
    })

    let stdout = ""
    let stderr = ""
    let timedOut = false
    let settled = false

    const timer = setTimeout(() => {
      timedOut = true
      child.kill()
    }, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)

    const onAbort = () => child.kill()
    if (opts.signal) {
      if (opts.signal.aborted) child.kill()
      else opts.signal.addEventListener("abort", onAbort, { once: true })
    }

    const cleanup = () => {
      clearTimeout(timer)
      opts.signal?.removeEventListener("abort", onAbort)
    }

    const finish = (result: Omit<RunResult, "stdout" | "stderr" | "timedOut">) => {
      if (settled) return
      settled = true
      cleanup()
      resolve({ ...result, stdout, stderr, timedOut })
    }

    child.stdout?.on("data", (d) => {
      stdout += d.toString()
    })
    child.stderr?.on("data", (d) => {
      stderr += d.toString()
    })
    child.on("error", (err) => {
      stderr += `\n[spawn error] ${err instanceof Error ? err.message : String(err)}`
      finish({ code: null, signal: null, spawnError: "spawn_failed" })
    })
    child.on("close", (code, signal) => finish({ code, signal }))

    if (opts.input != null) child.stdin?.write(opts.input)
    child.stdin?.end()
  })
}

function formatResult(command: string, res: RunResult) {
  const lines: string[] = []
  lines.push(`$ ${command}`)
  if (res.spawnError) {
    lines.push(`error: ${res.spawnError}`)
  }
  lines.push(
    `exit_code: ${res.code === null ? "null" : res.code}` +
      (res.timedOut ? " (timed out)" : "") +
      (res.signal ? ` (signal ${res.signal})` : ""),
  )
  const out = truncate(res.stdout).trimEnd()
  const err = truncate(res.stderr).trimEnd()
  if (out) lines.push("--- stdout ---", out)
  if (err) lines.push("--- stderr ---", err)
  if (!out && !err) lines.push("(no output)")

  return {
    output: lines.join("\n"),
    metadata: {
      exit_code: res.code,
      timed_out: res.timedOut,
      error: res.spawnError !== undefined || res.timedOut || (res.code !== null && res.code !== 0),
    },
  }
}

function resolveCwd(argCwd: string | undefined, directory: string): string {
  if (!argCwd) return directory
  return path.isAbsolute(argCwd) ? argCwd : path.resolve(directory, argCwd)
}

export const run = tool({
  description: [
    "Execute a Python SCRIPT FILE with the embedded CAD Python interpreter (Python 3.11).",
    "Use this to run .py files produced by other skills/agents. The interpreter path is resolved automatically,",
    "so you do NOT need to cd into any skill directory or know the interpreter location.",
    "Output is UTF-8; stdout, stderr and the exit code are returned.",
    "",
    "Example: { script: 'C:/work/gen/plot.py', args: ['--out', 'result.json'] }",
  ].join("\n"),
  args: {
    script: tool.schema
      .string()
      .describe("Path to the .py file to run. Absolute, or relative to `cwd` (defaults to the project directory)."),
    args: tool.schema.array(tool.schema.string()).optional().describe("Command-line arguments passed to the script."),
    cwd: tool.schema.string().optional().describe("Working directory for the process. Defaults to the project directory."),
    stdin: tool.schema.string().optional().describe("Text piped to the script's standard input."),
    timeout_ms: tool.schema
      .number()
      .optional()
      .describe(`Kill the process after this many milliseconds (default ${DEFAULT_TIMEOUT_MS}).`),
  },
  async execute(args, ctx) {
    const cwd = resolveCwd(args.cwd, ctx.directory)
    const script = path.isAbsolute(args.script) ? args.script : path.resolve(cwd, args.script)
    if (!existsSync(script)) {
      return {
        output: `Script not found: "${script}"`,
        metadata: { error: true },
      }
    }
    const res = await runPython([script, ...(args.args ?? [])], {
      cwd,
      input: args.stdin,
      timeoutMs: args.timeout_ms,
      signal: ctx.abort,
    })
    return formatResult(`python "${path.basename(script)}"`, res)
  },
})

export const exec = tool({
  description: [
    "Execute an inline Python CODE snippet with the embedded interpreter (no file needed).",
    "The code is written to a temp file and run, so multi-line code and quotes are safe.",
    "Prefer `python_run` when a script file already exists.",
    "",
    "Example: { code: 'import json,sys; print(json.dumps({\"ok\": True}))' }",
  ].join("\n"),
  args: {
    code: tool.schema.string().describe("Python source code to execute."),
    args: tool.schema.array(tool.schema.string()).optional().describe("Values exposed to the code via sys.argv[1:]."),
    cwd: tool.schema.string().optional().describe("Working directory. Defaults to the project directory."),
    stdin: tool.schema.string().optional().describe("Text piped to standard input."),
    timeout_ms: tool.schema
      .number()
      .optional()
      .describe(`Kill the process after this many milliseconds (default ${DEFAULT_TIMEOUT_MS}).`),
  },
  async execute(args, ctx) {
    const cwd = resolveCwd(args.cwd, ctx.directory)
    const tmpFile = path.join(os.tmpdir(), `mimo_py_${Date.now()}_${Math.random().toString(36).slice(2)}.py`)
    await fs.writeFile(tmpFile, args.code, "utf-8")
    try {
      const res = await runPython([tmpFile, ...(args.args ?? [])], {
        cwd,
        input: args.stdin,
        timeoutMs: args.timeout_ms,
        signal: ctx.abort,
      })
      return formatResult("python -c <inline>", res)
    } finally {
      await fs.rm(tmpFile, { force: true }).catch(() => {})
    }
  },
})

export const info = tool({
  description: [
    "Report the embedded Python environment: interpreter path, version, and installed packages.",
    "Call this to verify a package is available before relying on it.",
  ].join("\n"),
  args: {},
  async execute(_args, ctx) {
    const version = await runPython(
      ["-c", "import sys; print(sys.version); print('executable:', sys.executable)"],
      { signal: ctx.abort, timeoutMs: 30_000 },
    )
    const packages = await runPython(["-m", "pip", "list", "--format=freeze"], {
      signal: ctx.abort,
      timeoutMs: 60_000,
    })
    const lines = [
      `interpreter: ${PYTHON_EXE}`,
      "",
      version.stdout.trim() || version.stderr.trim(),
      "",
      "--- installed packages (pip freeze) ---",
      truncate(packages.stdout).trim() || packages.stderr.trim(),
    ]
    return {
      output: lines.join("\n"),
      metadata: { interpreter: PYTHON_EXE, error: version.code !== 0 },
    }
  },
})

export const pip = tool({
  description: [
    "Install one or more packages into the embedded Python environment via pip.",
    "SIDE EFFECTS: this modifies the shared environment and requires network access.",
    "Only use it when `python_info` shows a required package is missing.",
    "",
    "Example: { packages: ['numpy'], upgrade: false }",
  ].join("\n"),
  args: {
    packages: tool.schema.array(tool.schema.string()).describe("Package specifiers to install, e.g. ['numpy', 'pandas==2.2.0']."),
    upgrade: tool.schema.boolean().optional().describe("Pass --upgrade to pip. Defaults to false."),
  },
  async execute(args, ctx) {
    if (!args.packages.length) {
      return { output: "No packages specified.", metadata: { error: true } }
    }
    const pipArgs = ["-m", "pip", "install", ...(args.upgrade ? ["--upgrade"] : []), ...args.packages]
    const res = await runPython(pipArgs, { signal: ctx.abort, timeoutMs: PIP_TIMEOUT_MS })
    return formatResult(`pip install ${args.packages.join(" ")}`, res)
  },
})
