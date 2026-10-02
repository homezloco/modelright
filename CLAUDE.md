# Claude Notes

Guidance for agents iterating this repository.

## Environment

- **GitHub-MCP-only**: All writes go through GitHub MCP tools (push_files, edit_file). No local filesystem.
- **push_files**: Prefer for new files or wholesale rewrites.
- **edit_file**: Strongly prefer for changing existing files — only edited fragments are sent.
- **No local operations**: Do not assume you can read/write files locally.

## Workflow conventions

- **QUEUE.md**: Task list with `- [ ] q-NNNN <title> — <acceptance>` format.
  - Open section: pending work
  - Done section: completed items (moved after merge)
- **PLAN.md**: Product planning document with Now/Next/Later sections.

## Best practices

1. Always fetch current file content before editing (get_file_contents or read_file_range).
2. Use exact-string replacement with edit_file — matches must be EXACT.
3. Run typecheck before submitting changes.
4. Keep commits atomic and well-described.
