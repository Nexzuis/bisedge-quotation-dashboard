# WORKFLOW.md

# How We Build — Multi-Model Development Process

-----

## HOW THIS PROJECT WORKS

Two AI agents collaborate on this project:

- **Claude** (Claude Code CLI / VS Code extension) — plans and builds
- **Codex** (Codex CLI) — independently reviews Claude's work

They don't work at the same time. They communicate through markdown files in this project. The human operator directs the workflow and switches between them.

The reason we use two different AI models is adversarial review — different models have different blind spots, so one catches what the other misses.

-----

## THE DOCUMENTS

### Permanent Files

**CLAUDE.md** — Project memory. Rules, architecture decisions, current status, known issues, patterns. Claude reads this automatically at the start of every session. Updated after every completed phase.

**SPEC.md** — What we're building. Features, database schema, API endpoints, tech stack, validation rules. This is the source of truth for what the software should do.

**PLAN.md** — How we're building it. Phased roadmap with testable milestones. Each phase builds on the last.

**WORKFLOW.md** — This file. How the agents collaborate and what the documents are for.

**TECH-DEBT.md** — Non-critical issues to fix later. Created when needed.

### Per-Phase Files

**CURRENT-PLAN.md** — Claude's detailed plan for the active phase. What files to create/modify, order of operations, risks, how to test. Created fresh for each phase.

**PLAN-REVIEW.md** — Codex's review of Claude's plan. What's missing, what contradicts the spec, what could go wrong. Created by Codex after reading CURRENT-PLAN.md.

**BUILD-REVIEW.md** — Codex's review of Claude's code after building. Bugs found, security issues, spec mismatches, ranked by severity (CRITICAL / IMPORTANT / MINOR). Created by Codex after Claude builds.

After each phase is complete, these three files get archived into `reviews/phase-[X]/` to keep the project root clean.

-----

## THE PROCESS

Every feature or change follows this flow:

```
1. Human describes what to build
2. Claude plans it → CURRENT-PLAN.md
3. Codex reviews the plan → PLAN-REVIEW.md
4. Claude incorporates feedback, human approves
5. Claude builds and commits
6. Codex reviews the code → BUILD-REVIEW.md
7. Claude fixes flagged issues, Codex re-reviews until approved
8. Human tests in browser, reports any bugs
9. Bugs get fixed, phase gets committed
10. Claude updates CLAUDE.md, archives phase files
```

For small bug fixes or quick changes, the full cycle isn't always necessary — the human will tell you what level of process to follow.

-----

## WHAT EACH AGENT DOES

### Claude (Builder)

- Reads CLAUDE.md, SPEC.md, PLAN.md, and WORKFLOW.md at the start of each session
- Creates CURRENT-PLAN.md when planning a phase
- Reads PLAN-REVIEW.md and incorporates Codex's feedback
- Implements the plan, runs tests, commits to git
- Reads BUILD-REVIEW.md and fixes flagged issues
- Updates CLAUDE.md after each completed phase
- Archives phase review files when done

### Codex (Reviewer)

- Reads SPEC.md, PLAN.md, CLAUDE.md, and WORKFLOW.md for context
- Reviews CURRENT-PLAN.md and writes PLAN-REVIEW.md with findings
- Reviews Claude's code after building and writes BUILD-REVIEW.md with findings
- Ranks issues by severity: CRITICAL / IMPORTANT / MINOR
- Re-reviews after Claude fixes issues until satisfied, then marks BUILD-REVIEW.md as APPROVED

-----

## KEY PRINCIPLES

- **SPEC.md is the source of truth.** If work contradicts the spec, the spec wins unless the human says otherwise.
- **Don't build without a plan.** CURRENT-PLAN.md comes before code.
- **Don't skip reviews.** The whole point is catching what one model misses.
- **Git commit after meaningful changes.** Commits are checkpoints and safety nets.
- **Keep CLAUDE.md current.** Future sessions depend on it being accurate — decisions, patterns, known issues.
- **When in doubt, ask the human.**
