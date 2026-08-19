# Report Builder Frontend

SPA React, TypeScript e Vite do Report Builder.

## Desenvolvimento

```bash
npm ci
npm run dev
```

Configure `VITE_API_URL` em `.env`; o valor de produção é
`https://reportsapi.fabricasistemas.com.br`.

## Verificações

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

## Deploy

Releases de produção são imagens imutáveis publicadas no GHCR por tags
`vX.Y.Z`. Consulte [docs/cicd-centos-stream-9.md](docs/cicd-centos-stream-9.md)
para provisionamento, configuração do GitHub e rollback.
