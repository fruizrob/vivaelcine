# Contributing

## Working on a change

- Before coding, read [AGENTS.md](AGENTS.md), [README.md](README.md), relevant
  docs, and the originating issue. Inspect Git status/diff and
  [package scripts](package.json); preserve unrelated work.
- Use a dedicated Git worktree for each feature; reuse it across sessions
  working on the same feature.
- Keep changes focused and follow existing patterns. Apply the
  [simplicity and craft standard](AGENTS.md#product-standard-simplicity-and-craft),
  including keyboard access and preserving existing URLs.
- Use small Conventional Commits (`feat:`, `fix:`, `docs:`, etc.). Commit
  generated data updates separately from code changes so each diff remains
  easy to review.

## Issues

- Describe the concrete problem, expected behavior, scope, and verifiable
  acceptance criteria. Include implementation context, dependencies, and
  sources when relevant.
- Creating an issue includes its right-panel metadata. Inspect repository
  conventions, then set applicable labels/tags, issue type, project fields
  (including status and priority), milestone, and assignee when ownership is
  known. Use existing options and context; leave unsupported choices unset.
- Read back the created issue and verify its metadata before reporting success.
  Report any applicable fields that could not be set.
- Before closing an issue, post a completion comment describing what changed,
  verification results, and remaining limitations. Confirm the comment was
  posted successfully, then close the issue.
- Use `Refs #N` for partial work. Reserve `Closes #N` for work that fully
  completes the issue; post and verify the completion comment before a merge
  triggers automatic closure.

## Pull requests

- Fill the [PR template](.github/pull_request_template.md):
  - **Summary:** the problem and resulting behavior, issue reference, and scope.
    State standalone scope when there is no associated issue.
  - **Validation:** commands actually run and their results. For UI changes,
    include viewport sizes and interactions checked.
  - **Notes:** relevant sources, previews/screenshots, tradeoffs, or untested
    behavior. Remove this section when unnecessary.
- Run relevant regression checks and `npm test`; follow the
  [development instructions](README.md#development). Update docs when behavior
  changes. For UI work, check desktop/mobile and keyboard use. Distinguish
  automated checks, browser observations, and untested device/external-app
  handoffs.
- Integrate current `main` before requesting another review. Resolve shared-file
  conflicts by preserving both features, including current cache versions and
  sharing behavior. Respond to review findings with the change and its
  verification.
