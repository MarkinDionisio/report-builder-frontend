# CI/CD do frontend no CentOS Stream 9

O frontend é compilado com a API pública
`https://reportsapi.fabricasistemas.com.br`, servido por Nginx em container e
publicado em `https://reports.fabricasistemas.com.br`. O Nginx do host termina
TLS e encaminha para `127.0.0.1:8081`.

## Fluxo de release

Pushes e pull requests para `main` executam lint, testes unitários, build e
Playwright. A imagem final também passa por um gate do Trivy que rejeita
vulnerabilidades `HIGH` ou `CRITICAL` com correção disponível. Uma tag
`vX.Y.Z` pertencente a `main` repete as verificações,
publica a imagem no GHCR e aguarda aprovação do environment `production`.
Após a aprovação, o runner entra no tailnet e solicita o deploy por SSH. O
servidor aceita somente imagem por digest e restaura a versão anterior se o
health check falhar.

## Provisionamento

Crie uma deploy key somente leitura para o servidor clonar este repositório e
uma chave para o GitHub Actions solicitar deploys. A chave de Actions pode ser
o mesmo par usado pelo backend, mas será instalada para um usuário separado.

No servidor, a partir de uma cópia deste repositório:

```bash
sudo bash ./ops/provision-centos-stream-9.sh \
  --repository git@github.com:MarkinDionisio/report-builder-frontend.git \
  --repository-key /root/report-builder-frontend-repository-key \
  --github-known-hosts /root/github-known-hosts \
  --actions-public-key /root/report-builder-frontend-actions.pub
```

O script cria `report-builder-frontend-deploy`, instala a forced command e
prepara `/opt/report-builder-frontend`. Em seguida, autentique esse usuário no
GHCR com um token que possua somente `read:packages`:

```bash
sudo -iu report-builder-frontend-deploy
printf '%s' "$GHCR_READ_TOKEN" | docker login ghcr.io -u GITHUB_USERNAME --password-stdin
exit
```

O arquivo `/opt/report-builder-frontend/shared/.env` contém
`FRONTEND_PORT=8081`. A porta é publicada apenas no loopback.

## GitHub

Crie o environment `production`, restrinja-o às tags `v*`, adicione revisores
obrigatórios e configure a variable:

| Variable | Valor |
| --- | --- |
| `PRODUCTION_URL` | `https://reports.fabricasistemas.com.br` |

Configure estes environment secrets:

| Secret | Conteúdo |
| --- | --- |
| `TS_OAUTH_CLIENT_ID` | Client ID da identidade federada do Tailscale |
| `TS_AUDIENCE` | Audience da identidade federada |
| `PROD_TAILSCALE_HOST` | Nome MagicDNS do servidor |
| `PROD_SSH_PORT` | `22` |
| `PROD_SSH_USER` | `report-builder-frontend-deploy` |
| `PROD_SSH_PRIVATE_KEY` | Chave privada correspondente à chave instalada |
| `PROD_SSH_KNOWN_HOSTS` | Entrada ED25519 verificada do servidor |

A política do tailnet deve permitir `tag:github-actions` acessar somente
`tcp:22` do servidor, como no deploy do backend.

## DNS, TLS e Nginx

Aponte `reports.fabricasistemas.com.br` para o servidor, emita o certificado e
instale `ops/nginx/report-builder-frontend.conf.example` após revisar os
caminhos. Valide e recarregue manualmente:

```bash
sudo nginx -t
sudo systemctl reload nginx
curl --fail https://reports.fabricasistemas.com.br/health
```

O pipeline não altera Nginx, DNS, certificados ou firewall.

## Publicação e rollback

```bash
git tag v1.0.0
git push origin v1.0.0
```

Para reverter, execute manualmente o workflow `rollback` e informe uma tag já
publicada. Ele resolve novamente o digest e o SHA gravado nos labels da imagem.
O estado implantado fica em `/opt/report-builder-frontend/state/current`.
