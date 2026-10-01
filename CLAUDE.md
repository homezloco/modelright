# Notes for Claude

## Environment

- **GitHub-MCP only**: You work through GitHub MCP tools. You have no local filesystem.
- **Write with push_files or edit_file**: Never narrate changes — make the tool calls.
- **QUEUE.md conventions**: Open items are `- [ ] q-NNNN <title> — <acceptance>`. Done items move to `## Done` with `- [x]` and a resolution note.

## Workflow

1. Check QUEUE.md for the next open item.
2. Implement it.
3. Move it to Done with a resolution comment.
4. Commit and push.

The product loop iterates this repo — keep PLAN.md and QUEUE.md up to date.
