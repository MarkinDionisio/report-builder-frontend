# Frontend guidelines

## Required project context

- Before changes, read the backend's [permanent engineering guidelines](../report-builder-backend/docs/engineering-guidelines.md) and [PROGRESS.md](../report-builder-backend/PROGRESS.md) for shared authorization, data contracts, and implementation history. The frontend interface guide remains the authority for UI behavior.
- Treat generator prompts and old progress entries as historical context, not a standing backlog or proof of current support. Follow current contracts and verify relevant implementation claims.
- If the backend checkout is unavailable, continue frontend-only work using local instructions and contracts. Identify the missing source when an API-dependent decision requires it; do not invent backend behavior.

## Interface and behavior

- Before implementing/changing screens, read and apply [docs/ui-patterns.md](docs/ui-patterns.md), required for new features and interface changes throughout the project.
- For organization screens, also consult [docs/organization-layout.md](docs/organization-layout.md); for data sources, [docs/data-source-configuration.md](docs/data-source-configuration.md).
- Reuse existing components/styles. Apply standards to the modified portion of a screen without expanding into unrelated screen redesigns.
- Include the guide's checklist in validation and run checks proportional to the change. Report checks and limitations.
- Add explicitly approved new standards to the central guide. Do not turn a one-off choice into a global rule without approval.

These versioned instructions guide future work, conversations, and checkouts. They do not override explicit user instructions or independently authorize commit, push, or publishing.

## Language

- Use English for technical identifiers, comments, logs, test descriptions, API diagnostics, documentation, and agent instructions.
- Present UI, accessibility text, local validation, and notifications in Brazilian Portuguese, regardless of browser language. Keep presentation resources separate from technical diagnostics.
- Translate known API/diagnostic codes through src/shared/presentation/messages.ts. Use Portuguese contextual fallbacks for unknown/missing codes; never render raw technical title/detail/validation strings.
- Preserve raw API objects for diagnosis without displaying technical text. Preserve public properties, routes, existing codes/enums/IDs, user-entered data, physical names, and report content. Do not translate generated files/dependencies or historical migrations merely for language changes.

## Joins and templates

- Reports use organization-owned join models (joinModelId); global templates are independent snapshots for local models. The current source is a compatibility reference, and local models can serve other compatible organization sources.
- Manual management is root-only. Authorized global report import can automatically create local models without grants or creator/administrator management access. Show planned models in previews and preserve report aliases.
- Show dependencies/restrictions for models in use and offer duplication. Follow [the source workflow](docs/data-source-configuration.md).
