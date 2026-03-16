# Autronis Dashboard — Prompt Shortcuts

Use these phrases when helpful.

## Minimal scope
- Only inspect files required for this task.
- Do not scan the whole repository.
- Do not re-analyze unrelated files.

## Safe implementation
- Prefer modifying existing code over rewriting files.
- Do not regenerate large sections unless necessary.
- Do not refactor unrelated modules.

## Workflow
- First propose a short plan.
- Implement only step 1.
- Summarize changed files after implementation.

## Architecture constraints
- Keep the current SQLite + Drizzle architecture.
- Do not migrate the database.
- Stay within the current Next.js App Router structure.