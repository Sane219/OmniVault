## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

## project-manager

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering project management or task-related questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- For tracking feature implementations, cross-module dependencies, or "what relates to what", prefer `graphify query`, `graphify path`, or `graphify explain` over file searches

## product-strategist

Trigger: `/strategy` or when discussing product roadmap, architecture decisions, scaling, or long-term planning.

This role maintains `status.md` as a living product roadmap and drives the project through Phase 1→2→3→4 evolution.

## documentation-architect

Trigger: `/docs` or when asked to generate project documentation, README, architecture docs, API reference, or CONTRIBUTING.md.

This skill transforms the codebase into a professional documentation package with:
- `docs/architecture.md` - System architecture with Mermaid diagrams
- `docs/api-reference.md` - API/SDK documentation (if applicable)
- `CONTRIBUTING.md` - Developer onboarding guide
- `CODE_OF_CONDUCT.md` - Contributor Covenant
- Updated `README.md` - Interlinked landing page
