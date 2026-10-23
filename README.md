# Report Builder Frontend

Report Builder SPA using React, TypeScript, and Vite.

## Development

```bash
npm ci
npm run dev
```

Configure VITE_API_URL in .env; production uses https://reportsapi.fabricasistemas.com.br.

## Checks

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

## Deployment

Production releases are immutable GHCR images tagged vX.Y.Z. See [CI/CD](docs/cicd-centos-stream-9.md) for provisioning, GitHub configuration, and rollback.

## Global report imports

In the organization creator area, open Catálogo de relatórios globais and choose a template under Escolher relatório. Configurar importação selects an active/read-verified source, adjusts title, and checks compatibility. Import creates an independent private copy and opens the editor. Creators/administrators may import; viewers need access to local copies. Only root executes global originals.

Backend global-templates, report-import-data-sources, import-check, and import endpoints must precede this frontend version. Copies do not automatically update when templates change.

Route: /organizations/:organizationId/creator/global-reports. Direct access preserves destination organization/creator permissions. Title search queries the full paginated catalog. Desktop/mobile share the two-step flow. Trocar relatório preserves search/page/configuration; choosing another resets title and requires a fresh check. A fixed footer keeps actions accessible while content scrolls.

## Data source administration

Use Organizações → organização → Fontes de dados → Configurar fonte. See [configuration](docs/data-source-configuration.md) for steps/models/permissions and [administration layout](docs/organization-layout.md) for headers/navigation/spacing/modals/validation.

## Interface and language standards

Before screen changes, read [UI standards](docs/ui-patterns.md) and [agent guidelines](AGENTS.md). They cover layout/navigation/actions/loading/errors/bulk selection/permissions/desktop/mobile validation. Technical code, diagnostics, tests, comments, logs, and documentation use English. Presentation remains Brazilian Portuguese. Shared presentation messages translate stable codes with contextual Portuguese fallbacks; never render raw technical server errors.
