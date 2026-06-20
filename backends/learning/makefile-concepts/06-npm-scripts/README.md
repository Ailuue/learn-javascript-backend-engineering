# 06 · npm scripts — the JS-native task runner

Make is still common in JS projects (and the earlier sections show its mechanics
with Node recipes). But the idiomatic 2026 JS task runner is the `scripts` block
in `package.json`. It covers the common "one command per task" use of a Makefile
without a separate file or the tab-vs-spaces footgun.

## Run

```bash
npm run lint        # any script: npm run <name>
npm test            # shorthand for npm run test
npm start           # shorthand for npm run start
npm run test -- --coverage   # pass args after --
```

## Make → npm scripts

| Make | npm scripts |
|------|-------------|
| `make test` | `npm test` / `npm run test` |
| `.PHONY` (all targets are "phony") | every script is a command, never a file |
| target chain `a: b c` | `"ci": "npm run lint && npm test && npm run build"` |
| `make -n` (dry run) | no built-in dry run (scripts are just shell) |
| variables (`=`, `:=`, `?=`) | env vars + `process.env`, or a `.env` + dotenv |
| pattern rules / file deps / incremental rebuilds | NOT covered — this is where Make still wins |
| `pre`/`post` build hooks | `pretest`, `prebuild` run automatically around the script |

## When to use which

- **npm scripts**: day-to-day dev/CI commands (lint, test, build, start). Zero
  extra tooling, discoverable via `npm run`.
- **Make** (sections 01–05): file-based dependency graphs and incremental
  rebuilds (compile only what changed) — npm scripts have no equivalent. Many
  JS monorepos use a Makefile or a task runner (Turborepo, Nx) for that.
