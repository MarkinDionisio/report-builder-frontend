# Frontend CI/CD on CentOS Stream 9

Build with API https://reportsapi.fabricasistemas.com.br, serve through container Nginx at https://reports.fabricasistemas.com.br. Host Nginx terminates TLS and proxies 127.0.0.1:8081.

## Release flow

Pushes/PRs to main run lint, unit tests, build, and Playwright. Trivy rejects fixable HIGH/CRITICAL vulnerabilities in the final image. vX.Y.Z tags belonging to main repeat checks, publish GHCR, and await production environment approval. The runner then enters the tailnet and requests SSH deployment. The server accepts only digest images and restores the previous version on health failure.

## Provisioning

Create a read-only repository deploy key and an Actions deployment key. Actions may use the backend's pair but installs for a separate user. From a repository copy on the server:

```bash
sudo bash ./ops/provision-centos-stream-9.sh \
  --repository git@github.com:MarkinDionisio/report-builder-frontend.git \
  --repository-key /root/report-builder-frontend-repository-key \
  --github-known-hosts /root/github-known-hosts \
  --actions-public-key /root/report-builder-frontend-actions.pub
```

The script creates report-builder-frontend-deploy, installs a forced command, and prepares /opt/report-builder-frontend. Authenticate this user to GHCR using read:packages only:

```bash
sudo -iu report-builder-frontend-deploy
printf '%s' "$GHCR_READ_TOKEN" | docker login ghcr.io -u GITHUB_USERNAME --password-stdin
exit
```

/opt/report-builder-frontend/shared/.env sets FRONTEND_PORT=8081, published on loopback only.

## GitHub

Create production environment restricted to v* with required reviewers. Variable PRODUCTION_URL=https://reports.fabricasistemas.com.br.

| Secret | Content |
|---|---|
| TS_OAUTH_CLIENT_ID | Tailscale federated identity Client ID |
| TS_AUDIENCE | Federated Audience |
| PROD_TAILSCALE_HOST | Server MagicDNS name |
| PROD_SSH_PORT | 22 |
| PROD_SSH_USER | report-builder-frontend-deploy |
| PROD_SSH_PRIVATE_KEY | Private key matching the installed key |
| PROD_SSH_KNOWN_HOSTS | Verified server ED25519 entry |

Tailnet policy allows tag:github-actions only to server tcp:22, as for backend deployment.

## DNS, TLS, and Nginx

Point reports.fabricasistemas.com.br to the server, issue certificates, and install ops/nginx/report-builder-frontend.conf.example after reviewing paths. Validate/reload manually:

```bash
sudo nginx -t
sudo systemctl reload nginx
curl --fail https://reports.fabricasistemas.com.br/health
```

The pipeline changes neither Nginx, DNS, certificates, nor firewall.

## Publishing and rollback

```bash
git tag v1.0.0
git push origin v1.0.0
```

Run rollback manually with a published tag. It resolves the digest and SHA from image labels. Deployment state: /opt/report-builder-frontend/state/current.
