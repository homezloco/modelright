# Claude Agent Notes

You work on this repo through **GitHub MCP tools only** — no local filesystem.

- **push_files** for new files or bulk changes
- **edit_file** (preferred) for surgical edits to existing files
- **read_file_range** for large files

## Conventions

- **QUEUE.md** tracks work items in `q-NNNN` format under `## Open` and `## Done`
- **PLAN.md** holds product direction; keep a single `## Now` section focused
- Always commit with clear messages referencing queue items when applicable

## Stack

- Next.js 14 app router
- TypeScript strict mode
- Drizzle ORM + PostgreSQL
- Deployed on Railway (DATABASE_URL injected)
