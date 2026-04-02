---
name: adr
description: >
  Read, create, or supersede Architecture Decision Records (ADRs) in this
  project. Trigger on any of: "/adr", "create ADR", "add ADR", "update ADR",
  "read ADR", "record design decision", "architecture decision".

  IMPORTANT — also trigger AUTOMATICALLY (without waiting for user instruction)
  in these situations:
  - BEFORE discussing or proposing any design/spec decision.
  - BEFORE writing any code (even a single line of implementation).
  - After implementing or committing any of the following types of changes:
    new library/dependency added, algorithm changed, data structure changed
    (e.g. new field added to a core interface), public API added/changed/removed,
    output format changed, detection heuristic changed.
  This is a non-negotiable rule. Never skip the ADR check.
  When triggered automatically, run the "proactive-check" operation below.
---

# ADR Skill

ADR files are stored in `docs/adr/`. Always read `docs/adr/README.md` before
performing any operation to confirm the current highest number and statuses.

## Subcommands and Arguments

Infer the user's intent and execute one of the following:

| Example invocation | Operation to perform |
|---|---|
| `/adr list` | Show list |
| `/adr read 0008` | Display the specified ADR |
| `/adr new "Title"` | Create a new ADR |
| `/adr supersede 0003 "New title"` | Supersede an existing ADR and create a new one |
| `/adr delete 0003` | Delete a superseded ADR |

---

## Operation: proactive-check

**Run this after every task that involves code changes**, before sending the final reply to the user.
Complete this check before responding. If an ADR is required, create or update it and include it in the commit before replying.

### Step 1 — Classify the change

Review the preceding implementation or commit and use the table below to determine whether an ADR is needed.

| Type of change | Action |
|---|---|
| New library / dependency added | New ADR |
| Algorithm changed | New ADR (or supersede existing) |
| Core interface (type definition) changed | New ADR |
| Public API added / changed / removed | New ADR |
| Output format changed | New ADR |
| Detection heuristic changed | New ADR |
| Bug fix (no design change) | No ADR needed |
| Tests or documentation only | No ADR needed |
| Refactoring within scope of existing decision | No ADR needed |

### Step 2 — Check against existing ADRs

Read `docs/adr/README.md` and check whether an ADR already covers the change.
- Exists → No ADR needed (comment only)
- Does not exist → Proceed to Step 3

### Step 3 — Create or update the ADR

- New design decision → Run "Operation: new"
- Change that overrides an existing decision → Run "Operation: supersede"

> **Important**: Include ADR creation/updates in the same commit as the code.
> Do not reply to the user in a state where you forgot to update the ADR after completing the task.

---

## Operation: list

1. Read `docs/adr/README.md`
2. Display its contents as-is

---

## Operation: read <number>

1. Glob `docs/adr/` to locate the file (prefix match on the number)
2. Read and display the file contents

---

## Operation: new <title>

### Step 1 — Assign a number

Read the current highest number from the list in `docs/adr/README.md` and
determine a zero-padded 4-digit number `NNNN` by adding 1.

### Step 2 — Create the file

Path: `docs/adr/NNNN-<title-in-kebab-case>.md`

Template:

```markdown
# ADR-NNNN: Title

## Status

Accepted

## Context

<!-- Background, requirements, and constraints that led to this decision -->

## Decision

<!-- What was chosen. Including a comparison of alternatives is recommended -->

## Consequences

<!-- Trade-offs, constraints, and future improvement points resulting from this decision -->
```

If the user provides content, fill in the sections. Otherwise create from the
template and prompt the user to edit.

### Step 3 — Update the index

Append a row to the table in `docs/adr/README.md`:

```
| [NNNN](NNNN-filename.md) | Title | Accepted |
```

---

## Operation: supersede <old-number> <new-title>

### Step 1 — Update the old ADR status

Read `docs/adr/<old-number>-*.md` and replace the status line with:

```
Superseded (by [ADR-NNNN](NNNN-new-filename.md))
```

`NNNN` is the new number determined in the next step.

### Step 2 — Create a new ADR

Follow the same procedure as "Operation: new". In the Context section, note
the relationship to the old ADR:

```
ADR-<old-number> adopted <something>, but a change became necessary because <reason>.
```

### Step 3 — Update the index

Update the old number's status to "Superseded (by NNNN)" in `docs/adr/README.md`
and add the new number's row.

---

## Operation: delete <number>

Delete a superseded ADR file and remove it from the index.

### Step 1 — Prerequisite check

Confirm that the target ADR's status is "Superseded".
Do not delete an "Accepted" ADR (ask the user for confirmation).

### Step 2 — Delete the file

Delete `docs/adr/<number>-*.md`.

### Step 3 — Update the index

Remove the corresponding row from `docs/adr/README.md`.

---

## Common Rules

- After any operation, always git commit the changed files (example message: `docs: add ADR-NNNN ...`)
- After committing, ask the user whether to push
- The single source of truth for ADR list and statuses is `docs/adr/README.md`. Do not record ADR indexes in CLAUDE.md
- Do not over-write ADR content. If the context is unclear, ask the user
- Kebab-case conversion for titles: translate Japanese titles to English before converting to kebab-case
