# Repository guidance

## Product standard: simplicity and craft

Apply to every change. Aim for the clarity and polish of Linear and Apple Notes.

- **Purpose:** give each screen one clear job and an obvious next action.
- **Design:** make behavior self-evident through layout, hierarchy, spacing,
  and familiar controls.
- **Copy:** remove redundant taglines, helper text, and labels. When a screen
  needs explanation, improve its structure and interaction first. Preserve
  essential content, accessible names, and actionable errors.
- **Code:** choose the smallest complete solution. Follow existing patterns;
  keep changes local, boundaries clear, and data flow explicit. Add abstractions
  and dependencies only when they reduce overall complexity.
- **Quality:** improve these together:
  - UX: easy to understand, fast to use, accessible.
  - DX: easy to maintain, test, and debug.
  - AX: easy for agents to discover, reason about, and safely modify.
- **Compatibility:** preserve working behavior, contracts, and data.

Done means the feature is clear without explanation, the code is easy to
navigate, and affected flows and relevant checks pass. Surface and resolve
conflicts between these goals before adding complexity.
