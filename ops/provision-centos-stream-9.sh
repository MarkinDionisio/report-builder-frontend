#!/usr/bin/env bash
set -Eeuo pipefail

readonly APP_HOME="/opt/report-builder-frontend"
readonly DEPLOY_USER="report-builder-frontend-deploy"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR

usage() {
  printf '%s\n' "Usage: sudo bash ./ops/provision-centos-stream-9.sh --repository git@github.com:OWNER/REPOSITORY.git --repository-key PATH --github-known-hosts PATH --actions-public-key PATH"
}

repository=""; repository_key=""; github_known_hosts=""; actions_public_key=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --repository) repository="${2:-}"; shift 2 ;;
    --repository-key) repository_key="${2:-}"; shift 2 ;;
    --github-known-hosts) github_known_hosts="${2:-}"; shift 2 ;;
    --actions-public-key) actions_public_key="${2:-}"; shift 2 ;;
    --help) usage; exit 0 ;;
    *) usage >&2; exit 64 ;;
  esac
done

[[ $EUID -eq 0 ]] || { printf 'Run this script as root.\n' >&2; exit 1; }
[[ "$repository" =~ ^git@github\.com:[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+\.git$ ]] || { printf 'Invalid repository URL.\n' >&2; exit 1; }
[[ -f "$repository_key" && -f "$github_known_hosts" && -f "$actions_public_key" ]] || { printf 'One or more key files do not exist.\n' >&2; exit 1; }
grep -Eq '^github\.com[ ,]' "$github_known_hosts" || { printf 'known_hosts does not contain github.com.\n' >&2; exit 1; }
grep -Eq '^(ssh-ed25519|ecdsa-sha2-nistp256|ssh-rsa) ' "$actions_public_key" || { printf 'Unsupported Actions public key.\n' >&2; exit 1; }

command -v docker >/dev/null 2>&1 || { printf 'Docker must already be installed.\n' >&2; exit 1; }
command -v git >/dev/null 2>&1 || dnf install --assumeyes git
command -v curl >/dev/null 2>&1 || dnf install --assumeyes curl

id "$DEPLOY_USER" >/dev/null 2>&1 || useradd --create-home --shell /bin/bash "$DEPLOY_USER"
usermod --append --groups docker "$DEPLOY_USER"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 750 "$APP_HOME" "$APP_HOME/bin" "$APP_HOME/shared" "$APP_HOME/state"
install -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 750 "$SCRIPT_DIR/deploy.sh" "$APP_HOME/bin/deploy"
install -o root -g root -m 755 "$SCRIPT_DIR/ssh-command.sh" "$APP_HOME/bin/ssh-command"

install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 700 "/home/$DEPLOY_USER/.ssh"
install -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 600 "$repository_key" "/home/$DEPLOY_USER/.ssh/repository_key"
install -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 600 "$github_known_hosts" "/home/$DEPLOY_USER/.ssh/known_hosts"

if [[ ! -d "$APP_HOME/repo/.git" ]]; then
  sudo -u "$DEPLOY_USER" env \
    GIT_SSH_COMMAND="ssh -i /home/$DEPLOY_USER/.ssh/repository_key -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes" \
    git clone "$repository" "$APP_HOME/repo"
fi
sudo -u "$DEPLOY_USER" git -C "$APP_HOME/repo" config core.sshCommand "ssh -i /home/$DEPLOY_USER/.ssh/repository_key -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_HOME/repo"

if [[ ! -f "$APP_HOME/shared/.env" ]]; then
  printf 'FRONTEND_PORT=8081\n' > "$APP_HOME/shared/.env"
fi
chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_HOME/shared/.env"
chmod 600 "$APP_HOME/shared/.env"

public_key="$(cat "$actions_public_key")"
printf 'restrict,command="%s/bin/ssh-command" %s\n' "$APP_HOME" "$public_key" > "/home/$DEPLOY_USER/.ssh/authorized_keys"
chown "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh/authorized_keys"
chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"

printf 'Provisioning complete. Configure GHCR login, Nginx, TLS, and GitHub environment secrets.\n'
