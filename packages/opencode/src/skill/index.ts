import os from "os"
import path from "path"
import { pathToFileURL } from "url"
import z from "zod"
import { Effect, Layer, Context } from "effect"
import { NamedError } from "@mimo-ai/shared/util/error"
import type { Agent } from "@/agent/agent"
import { Bus } from "@/bus"
import { InstanceState } from "@/effect"
import { Flag } from "@/flag/flag"
import { Global } from "@/global"
import { Permission } from "@/permission"
import { AppFileSystem } from "@mimo-ai/shared/filesystem"
import { Config } from "../config"
import { ConfigMarkdown } from "../config"
import { Glob } from "@mimo-ai/shared/util/glob"
import { Log } from "../util"
import { Discovery } from "./discovery"
import { extractComposeBundle } from "./compose/extract"
import { extractBuiltinBundle, OFFICIAL_SKILL_NAMES } from "./builtin/extract"

const log = Log.create({ service: "skill" })
const EXTERNAL_DIRS = [".claude", ".agents", ".codex", ".opencode"]
const EXTERNAL_SKILL_PATTERN = "skills/**/SKILL.md"
const MIMOCODE_SKILL_PATTERN = "{skill,skills}/**/SKILL.md"
const SKILL_PATTERN = "**/SKILL.md"
const BUILTIN_SKILL_PATTERN = "skills/*/SKILL.md"

export const Info = z.object({
  name: z.string(),
  description: z.string(),
  aliases: z.array(z.string()).optional(),
  location: z.string(),
  content: z.string(),
  // Model reachability, distinct from authorization. When true the model never
  // sees the skill (no system-prompt catalog entry, no skill tool description
  // entry, no skill_search hit) and the skill tool refuses to load it; a user
  // slash invocation still works. Authorization stays with permission.skill,
  // where `deny` means unusable by anyone.
  disable_model_invocation: z.boolean().optional(),
  bundled: z.boolean().optional(),
})
export type Info = z.infer<typeof Info>

// Kebab-case in frontmatter to match Claude Code and the agentskills.io open
// standard, so a skill folder stays portable in both directions.
const Frontmatter = Info.pick({ name: true, description: true, aliases: true }).extend({
  "disable-model-invocation": z.boolean().optional(),
})

export const InvalidError = NamedError.create(
  "SkillInvalidError",
  z.object({
    path: z.string(),
    message: z.string().optional(),
    issues: z.custom<z.core.$ZodIssue[]>().optional(),
  }),
)

export const NameMismatchError = NamedError.create(
  "SkillNameMismatchError",
  z.object({
    path: z.string(),
    expected: z.string(),
    actual: z.string(),
  }),
)

type State = {
  skills: Record<string, Info>
  dirs: Set<string>
}

type DiscoveryState = {
  matches: string[]
  dirs: string[]
  bundledRoots: string[]
}

type ScanState = {
  matches: Set<string>
  dirs: Set<string>
}

export interface Interface {
  readonly get: (name: string) => Effect.Effect<Info | undefined>
  readonly all: () => Effect.Effect<Info[]>
  readonly dirs: () => Effect.Effect<string[]>
  readonly available: (agent?: Agent.Info) => Effect.Effect<Info[]>
  readonly modelInvocable: (agent?: Agent.Info) => Effect.Effect<Info[]>
  readonly reload: () => Effect.Effect<void>
}

const add = Effect.fnUntraced(function* (state: State, match: string, bundledRoots: string[], bus: Bus.Interface) {
  const md = yield* Effect.tryPromise({
    try: () => ConfigMarkdown.parse(match),
    catch: (err) => err,
  }).pipe(
    Effect.catch(
      Effect.fnUntraced(function* (err) {
        const message = ConfigMarkdown.FrontmatterError.isInstance(err)
          ? err.data.message
          : `Failed to parse skill ${match}`
        const { Session } = yield* Effect.promise(() => import("@/session"))
        yield* bus.publish(Session.Event.Error, { error: new NamedError.Unknown({ message }).toObject() })
        log.error("failed to load skill", { skill: match, err })
        return undefined
      }),
    ),
  )

  if (!md) return

  const parsed = Frontmatter.safeParse(md.data)
  if (!parsed.success) return

  const isBundled = bundledRoots.some((root) => match.startsWith(root))
  const existing = state.skills[parsed.data.name]

  if (existing) {
    // User overrides always win: bundled must not overwrite non-bundled
    if (isBundled && !existing.bundled) return
    if (!isBundled && existing.bundled) {
      log.info("user skill overrides bundled", { name: parsed.data.name, location: match })
    } else {
      log.warn("duplicate skill name", {
        name: parsed.data.name,
        existing: existing.location,
        duplicate: match,
      })
    }
  }

  state.dirs.add(path.dirname(match))
  state.skills[parsed.data.name] = {
    name: parsed.data.name,
    description: parsed.data.description,
    aliases: parsed.data.aliases,
    location: match,
    content: md.content,
    disable_model_invocation: parsed.data["disable-model-invocation"],
    bundled: isBundled || undefined,
  }
})

const scan = Effect.fnUntraced(function* (
  state: ScanState,
  root: string,
  pattern: string,
  opts?: { dot?: boolean; scope?: string },
) {
  const matches = yield* Effect.tryPromise({
    try: () =>
      Glob.scan(pattern, {
        cwd: root,
        absolute: true,
        include: "file",
        symlink: true,
        dot: opts?.dot,
      }),
    catch: (error) => error,
  }).pipe(
    Effect.catch((error) => {
      if (!opts?.scope) return Effect.die(error)
      log.error(`failed to scan ${opts.scope} skills`, { dir: root, error })
      return Effect.succeed([] as string[])
    }),
  )

  for (const match of matches) {
    state.matches.add(match)
    state.dirs.add(path.dirname(match))
  }
})

// Directory-independent skill discovery: builtin + compose bundles and the home
// external dirs. These inputs are process-constant (version-keyed bundles whose
// extraction is marker-guarded, immutable feature flags, a fixed home dir), so
// the result is computed once per process and shared across every directory.
// This is the dominant redundant cost when the frontend disposes all instances
// and then re-queries /agent for several directories in a burst: without this
// cache each directory bootstrap re-scans the ~38 builtin skills and re-runs the
// bundle extraction checks. The cache intentionally survives Instance.disposeAll
// (it is not tied to a per-directory lifecycle); only a process restart, which
// re-reads the bundles, clears it.
let globalDiscoveryCache: DiscoveryState | undefined

const discoverGlobalSkills = Effect.fnUntraced(function* (fsys: AppFileSystem.Interface) {
  if (globalDiscoveryCache) return globalDiscoveryCache
  const state: ScanState = { matches: new Set(), dirs: new Set() }
  const bundledRoots: string[] = []

  // Extract builtin skills to disk first (user skills with same name override)
  if (!Flag.MIMOCODE_DISABLE_BUILTIN_SKILLS) {
    const builtinSkillRoot = yield* extractBuiltinBundle(fsys).pipe(
      Effect.catch(() => Effect.succeed(undefined)),
    )
    if (builtinSkillRoot && (yield* fsys.isDir(builtinSkillRoot))) {
      bundledRoots.push(builtinSkillRoot)
      yield* scan(state, builtinSkillRoot, BUILTIN_SKILL_PATTERN, { scope: "builtin" })
      if (Flag.MIMOCODE_DISABLE_OFFICIAL_SKILLS) {
        const skillsRoot = path.join(builtinSkillRoot, "skills")
        for (const name of OFFICIAL_SKILL_NAMES) {
          const prefix = path.join(skillsRoot, name) + path.sep
          for (const match of state.matches) {
            if (match.startsWith(prefix)) {
              state.matches.delete(match)
              state.dirs.delete(path.dirname(match))
            }
          }
        }
      }
    }
  }

  // Extract compose skills to disk (user skills with same name override)
  if (!Flag.MIMOCODE_DISABLE_COMPOSE_SKILLS) {
    const composeSkillRoot = yield* extractComposeBundle(fsys).pipe(
      Effect.catch(() => Effect.succeed(undefined)),
    )
    if (composeSkillRoot && (yield* fsys.isDir(composeSkillRoot))) {
      bundledRoots.push(composeSkillRoot)
      yield* scan(state, composeSkillRoot, SKILL_PATTERN, { scope: "compose" })
    }
  }

  if (!Flag.MIMOCODE_DISABLE_EXTERNAL_SKILLS) {
    const externalDirs = EXTERNAL_DIRS.filter((dir) => {
      if (dir === ".claude" && Flag.MIMOCODE_DISABLE_CLAUDE_CODE_SKILLS) return false
      if (dir === ".codex" && Flag.MIMOCODE_DISABLE_CODEX_SKILLS) return false
      if (dir === ".opencode" && Flag.MIMOCODE_DISABLE_OPENCODE_SKILLS) return false
      return true
    })

    for (const dir of externalDirs) {
      const root = path.join(Global.Path.home, dir)
      if (!(yield* fsys.isDir(root))) continue
      yield* scan(state, root, EXTERNAL_SKILL_PATTERN, { dot: true, scope: "global" })
    }
  }

  globalDiscoveryCache = {
    matches: Array.from(state.matches),
    dirs: Array.from(state.dirs),
    bundledRoots,
  }
  return globalDiscoveryCache
})

const discoverSkills = Effect.fnUntraced(function* (
  config: Config.Interface,
  discovery: Discovery.Interface,
  fsys: AppFileSystem.Interface,
  directory: string,
  worktree: string,
) {
  const cached = yield* discoverGlobalSkills(fsys)
  const state: ScanState = {
    matches: new Set(cached.matches),
    dirs: new Set(cached.dirs),
  }
  const bundledRoots = [...cached.bundledRoots]

  if (!Flag.MIMOCODE_DISABLE_EXTERNAL_SKILLS) {
    const externalDirs = EXTERNAL_DIRS.filter((dir) => {
      if (dir === ".claude" && Flag.MIMOCODE_DISABLE_CLAUDE_CODE_SKILLS) return false
      if (dir === ".codex" && Flag.MIMOCODE_DISABLE_CODEX_SKILLS) return false
      if (dir === ".opencode" && Flag.MIMOCODE_DISABLE_OPENCODE_SKILLS) return false
      return true
    })

    const upDirs = yield* fsys
      .up({ targets: externalDirs, start: directory, stop: worktree })
      .pipe(Effect.catch(() => Effect.succeed([] as string[])))

    for (const root of upDirs) {
      yield* scan(state, root, EXTERNAL_SKILL_PATTERN, { dot: true, scope: "project" })
    }
  }

  const configDirs = yield* config.directories()
  for (const dir of configDirs) {
    yield* scan(state, dir, MIMOCODE_SKILL_PATTERN)
  }

  const cfg = yield* config.get()
  for (const item of cfg.skills?.paths ?? []) {
    const expanded = item.startsWith("~/") ? path.join(os.homedir(), item.slice(2)) : item
    const dir = path.isAbsolute(expanded) ? expanded : path.join(directory, expanded)
    if (!(yield* fsys.isDir(dir))) {
      log.warn("skill path not found", { path: dir })
      continue
    }

    yield* scan(state, dir, SKILL_PATTERN)
  }

  for (const url of cfg.skills?.urls ?? []) {
    const pulledDirs = yield* discovery.pull(url)
    for (const dir of pulledDirs) {
      yield* scan(state, dir, SKILL_PATTERN)
    }
  }

  return {
    matches: Array.from(state.matches),
    dirs: Array.from(state.dirs),
    bundledRoots,
  }
})

const loadSkills = Effect.fnUntraced(function* (state: State, discovered: DiscoveryState, bus: Bus.Interface) {
  yield* Effect.forEach(discovered.matches, (match) => add(state, match, discovered.bundledRoots, bus), {
    concurrency: "unbounded",
    discard: true,
  })

  log.info("init", { count: Object.keys(state.skills).length })
})

export class Service extends Context.Service<Service, Interface>()("@opencode/Skill") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const discovery = yield* Discovery.Service
    const config = yield* Config.Service
    const bus = yield* Bus.Service
    const fsys = yield* AppFileSystem.Service
    const computeState = () =>
      Effect.gen(function* () {
        const ctx = yield* InstanceState.context
        const disc = yield* discoverSkills(config, discovery, fsys, ctx.directory, ctx.worktree)
        const s: State = { skills: {}, dirs: new Set() }
        yield* loadSkills(s, disc, bus)
        return s
      })

    // Cached variant: a single prompt loop calls Skill.available/modelInvocable
    // repeatedly (resolveTools, fork agents, checkpoint-writer, …), and each call
    // previously re-discovered and re-loaded every skill file. Skills are
    // effectively static within a session, so memoize per (directory, worktree)
    // with a TTL. The TTL bounds staleness: newly added skills become visible at
    // the next refresh, while a single turn reuses the snapshot.
    //
    // TTL sizing (learned the hard way): a full computeState() scan + SKILL.md
    // parse takes ~15s on Windows (thousands of bundled skill files, AV
    // real-time scanning), and consecutive prompt-loop steps are separated by
    // LLM calls of 5–20s+. A 10s TTL therefore expired before every reuse —
    // the cache never hit and every step re-scanned (log: repeated
    // "init count=N"). 60s keeps every step of a turn on the same snapshot
    // while still picking up newly added skills within a minute.
    const stateCache = new Map<string, { state: State; at: number }>()
    const STATE_CACHE_TTL_MS = 60_000
    const cachedComputeState = () =>
      Effect.gen(function* () {
        const ctx = yield* InstanceState.context
        const key = `${ctx.directory}|${ctx.worktree}`
        const hit = stateCache.get(key)
        const now = Date.now()
        if (hit && now - hit.at < STATE_CACHE_TTL_MS) return hit.state
        const s = yield* computeState()
        stateCache.set(key, { state: s, at: now })
        // Bounded memory: many directories over a long-lived server.
        if (stateCache.size > 64) stateCache.clear()
        return s
      })

    const computeDiscovered = () =>
      Effect.gen(function* () {
        const ctx = yield* InstanceState.context
        return yield* discoverSkills(config, discovery, fsys, ctx.directory, ctx.worktree)
      })

    const get = Effect.fn("Skill.get")(function* (name: string) {
      const s = yield* cachedComputeState()
      return s.skills[name]
    })

    const all = Effect.fn("Skill.all")(function* () {
      const s = yield* cachedComputeState()
      return Object.values(s.skills)
    })

    const dirs = Effect.fn("Skill.dirs")(function* () {
      const disc = yield* computeDiscovered()
      return disc.dirs
    })

    // Authorization only: `deny` means unusable by anyone, so this is also the
    // set a user slash invocation resolves against.
    const available = Effect.fn("Skill.available")(function* (agent?: Agent.Info) {
      const s = yield* cachedComputeState()
      let list: Info[] = Object.values(s.skills)

      list = list.toSorted((a, b) => a.name.localeCompare(b.name))
      if (!agent) return list
      return list.filter((skill) => Permission.evaluate("skill", skill.name, agent.permission).action !== "deny")
    })

    // Everything the model is allowed to see or act on. Anything the model can
    // reach must come from here, never from `available` or `all`.
    const modelInvocable = Effect.fn("Skill.modelInvocable")(function* (agent?: Agent.Info) {
      return (yield* available(agent)).filter((skill) => !skill.disable_model_invocation)
    })
    const reload = Effect.fn("Skill.reload")(function* () {
      // No-op: state is always computed fresh on each access; kept for interface compatibility
    })

    return Service.of({ get, all, dirs, available, modelInvocable, reload })
  }),
)

export const defaultLayer = layer.pipe(
  Layer.provide(Discovery.defaultLayer),
  Layer.provide(Config.defaultLayer),
  Layer.provide(Bus.layer),
  Layer.provide(AppFileSystem.defaultLayer),
)

export function fmt(list: Info[], opts: { verbose: boolean }) {
  if (list.length === 0) return "No skills are currently available."
  if (opts.verbose) {
    return [
      "<available_skills>",
      ...list
        .sort((a, b) => a.name.localeCompare(b.name))
        .flatMap((skill) => [
          "  <skill>",
          `    <name>${skill.name}</name>`,
          `    <description>${skill.description}</description>`,
          `    <location>${pathToFileURL(skill.location).href}</location>`,
          "  </skill>",
        ]),
      "</available_skills>",
    ].join("\n")
  }

  return [
    "## Available Skills",
    ...list
      .toSorted((a, b) => a.name.localeCompare(b.name))
      .map((skill) => `- **${skill.name}**: ${skill.description}`),
  ].join("\n")
}

export * as Skill from "."
