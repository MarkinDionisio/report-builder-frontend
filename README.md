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

## Importação de relatórios globais

Na área de criação de uma organização, acesse **Catálogo de relatórios globais**, escolha
um modelo e uma fonte de dados ativa e verificada, ajuste o título e verifique
a compatibilidade. A importação cria uma cópia privada independente e abre o
editor. Creators e administradores podem importar; viewers precisam receber
acesso a uma cópia local. Somente root executa o modelo global original.

O backend deve disponibilizar os endpoints `global-templates`,
`report-import-data-sources`, `import-check` e `import` antes desta versão do
frontend. Não há atualização automática das cópias quando o modelo muda.

O catálogo possui rota própria: `/organizations/:organizationId/creator/global-reports`.
Ela pode ser aberta diretamente, mantendo a organização de destino e as permissões
da área de criação. A busca por título consulta todo o catálogo com paginação.
