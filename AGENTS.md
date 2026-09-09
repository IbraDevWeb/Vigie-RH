# Vigie RH — AI coding guide

## Product invariant
Vigie RH is a compliance decision-support product for French employers managing foreign workers. It does **not** let an LLM invent legal conclusions.

## Architecture invariant
- `src/domain/**`: pure business/legal logic. No React, no Next.js, no network.
- `src/application/**`: use-cases orchestrating domain logic and repositories.
- `src/infrastructure/**`: data sources, persistence, external APIs.
- `src/components/**`: UI only.
- `src/app/**`: routes and composition.

## Legal invariant
Every legal rule exposed to users must have:
1. a stable rule id;
2. an effective date;
3. at least one source id;
4. a review date;
5. explicit handling of uncertainty (`review_required`) instead of guessing.

## Coding conventions
- TypeScript strict mode.
- No business rule in React components.
- Prefer small pure functions.
- Keep demo data clearly marked as demo.
- Add tests for every new legal branch.
