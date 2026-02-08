---
name: read-docs-first
description: >
  Before writing or introducing any new code, Claude reads the project's ./docs folder to understand
  the existing architecture, components, data-fetching patterns, routing, deployment setup, and
  conventions. Use this skill whenever the user asks Claude to write, add, modify, or generate code
  in a project that has a ./docs directory. This includes requests like "add a new component",
  "build a feature", "refactor this", "fix this bug", "create an endpoint", "wire up a page", or
  any task that will result in new or changed code. Even if the user doesn't mention docs, Claude
  should check for ./docs and consult it before coding. The only exception is trivial one-line fixes
  where docs clearly wouldn't be relevant.
---

# Read Docs First

When the user asks you to write or modify code in a project, your first step is to check for and
read the relevant project documentation before producing any code. This matters because projects
have specific conventions, architectural patterns, and design decisions that are easy to violate
if you jump straight into coding. Getting aligned with the docs first saves everyone time.

## Workflow

### 1. Discover docs

Check if a `./docs` directory exists at the project root. If it does, list its contents to see
what documentation is available.

Typical files you might find:

| File | Tells you about |
|------|----------------|
| README.md | Project overview, setup, high-level purpose |
| GETTING_STARTED.md | Dev environment, dependencies, running locally |
| ARCHITECTURE.md | System design, folder structure, key patterns |
| COMPONENTS.md | UI component conventions, naming, composition |
| DATA-FETCHING.md | How data is loaded, cached, and managed |
| ROUTING.md | Page structure, navigation patterns, route config |
| DEPLOYMENT.md | Build pipeline, environments, deploy process |
| FILE_REFERENCE.md | File/folder map and what lives where |

The user's project may have all, some, or different docs — adapt accordingly.

### 2. Decide which docs to read

You don't need to read every doc for every task. Match the task to the relevant docs:

- **Adding a new component** → COMPONENTS.md, ARCHITECTURE.md, and possibly FILE_REFERENCE.md
- **Adding a new page/route** → ROUTING.md, COMPONENTS.md, ARCHITECTURE.md
- **Wiring up data fetching** → DATA-FETCHING.md, ARCHITECTURE.md
- **Fixing a bug** → ARCHITECTURE.md and FILE_REFERENCE.md to understand the area, plus any domain-specific doc
- **Deployment or CI changes** → DEPLOYMENT.md
- **General feature work** → ARCHITECTURE.md + whichever docs cover the relevant layers
- **Not sure** → Start with ARCHITECTURE.md and FILE_REFERENCE.md, they usually give enough context to decide what else to read

When in doubt, read more rather than less — it's cheaper to read an extra doc than to rewrite
misaligned code.

### 3. Absorb and apply

As you read, pay attention to:

- **Naming conventions** — how files, components, functions, and variables are named
- **Folder structure** — where new files should go
- **Patterns in use** — state management approach, data fetching strategy, component composition style
- **Explicit rules** — anything the docs call out as "always do X" or "never do Y"

Then write your code in a way that's consistent with what the docs describe. If the docs say
components go in `src/components/ui/` and use PascalCase, do that. If data fetching uses a
specific hook or pattern, follow it.

### 4. Mention what you read

When you present your code to the user, briefly note which docs you consulted and any key
decisions they informed. For example: "I read COMPONENTS.md and ARCHITECTURE.md — following
your pattern of colocating component styles, I put the new stylesheet next to the component."

This builds trust and makes it easy for the user to course-correct if you misread something.

## Edge cases

- **No ./docs folder**: Skip this workflow. Mention to the user that you didn't find project docs, and proceed normally.
- **Docs are outdated or contradictory**: Follow the docs as written but flag the inconsistency to the user. Don't silently ignore docs because you think they might be stale.
- **Trivial changes**: For genuine one-liners (fixing a typo, changing a constant), you can skip the doc read. Use your judgment — if there's any chance the change touches architecture or conventions, read first.
- **Docs folder is very large**: If there are many files, list them first, read the most relevant 2-3, and mention which others you skipped and why.