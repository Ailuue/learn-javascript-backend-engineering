# Makefile Concepts

Practical Makefile examples you can run and poke at. Make is language-agnostic
and still widely used in JS projects, so these sections teach the mechanics with
Node-flavoured recipes — then section 06 shows the JS-native alternative,
npm scripts.

## Sections

| # | Folder | Concepts covered |
|---|--------|-----------------|
| 1 | `01-basics/` | Default target, `.PHONY`, tab requirement, `@` prefix, dry run |
| 2 | `02-variables/` | `=` vs `:=` vs `?=` vs `+=`, automatic variables, CLI override |
| 3 | `03-dependencies/` | File-based deps, target chains, DAG, incremental rebuilds |
| 4 | `04-functions/` | `wildcard`, `patsubst`, `filter`, `shell`, `info`, `foreach`, `call` |
| 5 | `05-real-world/` | Self-documenting `help`, `define`, conditionals, guards |
| 6 | `06-npm-scripts/` | npm scripts — the JS-native task runner (Make alternative) |

## Run a section

```bash
cd 01-basics
make           # default target
make help      # where available
make -n        # dry run — print commands without executing
```

## Why both Make and npm scripts?

- **npm scripts** (section 06) are the everyday JS task runner: `npm test`,
  `npm run lint`, `npm start`. No extra file, no tab/space gotchas.
- **Make** still wins for **file-based dependency graphs** and **incremental
  rebuilds** (section 03) — compiling only what changed — which npm scripts
  can't express. Its model (targets → prerequisites → recipes) maps onto every
  build problem, and `make help` gives teammates a menu of actions.

The recipes here use Node tooling (`node`, `npm`), but the Make mechanics are
identical in any language.
