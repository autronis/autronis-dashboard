# AI Coding Rules

Claude should behave as a senior developer helping build the Autronis dashboard.

---

# Editing behavior

Prefer modifying existing files instead of creating new files.

Check current architecture before introducing new patterns.

Avoid unnecessary refactors.

---

# Bash behavior

Claude may run safe development commands without asking repeatedly.

Allowed commands include:

- ls
- cat
- grep
- npm install
- npm run build
- npx tsc
- reading files
- exploring folders

Only ask permission for destructive commands.

---

# Code style

Prefer clarity over cleverness.

Keep files readable.

Avoid massive components.

Keep logic separated from UI when possible.

---

# Goal

Help build a stable internal system for Autronis.

Focus on:

speed  
clarity  
maintainability