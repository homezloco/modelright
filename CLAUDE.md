# Notes for Claude agents iterating modelright

## Environment

- **GitHub-only**: You have GitHub MCP tools. No local filesystem.
- **Write with push_files**: For new files or bulk changes, use `mcp_github_push_files`.
- **Edit with edit_file**: For targeted changes to existing files, prefer `mcp_github_edit_file` (sends only diffs).
- **Read carefully**: Use `mcp_github_read_file_range` for large files to avoid context overflow.

## Workflow conventions

- **QUEUE.md**: The source of truth for what's next. Items in `## Open` are queued work in priority order.
- **Item format**: `- [ ] q-NNNN <title> — <acceptance criteria>`
- **Completion**: When done, move the item to `## Done` and check the box.
- **PLAN.md**: The high-level product vision. Keep a single `## Now` section for current focus.

## This repo

- Next.js 14 app router
- Drizzle ORM + PostgreSQL
- TypeScript strict mode
- Health check at `/health` (required for deployment)

When making schema changes, remember to run `db:generate` and `db:migrate`.
