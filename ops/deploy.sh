#!/usr/bin/env bash
set -Eeuo pipefail

readonly APP_HOME="${REPORT_BUILDER_FRONTEND_HOME:-/opt/report-builder-frontend}"
readonly REPO_DIR="$APP_HOME/repo"
readonly SHARED_DIR="$APP_HOME/shared"
readonly STATE_DIR="$APP_HOME/state"
readonly ENV_FILE="$SHARED_DIR/.env"
readonly COMPOSE_PROJECT="report-builder-frontend"

log() { printf '[deploy] %s\n' "$*"; }
fail() { printf '[deploy] ERROR: %s\n' "$*" >&2; return 1; }

[[ $# -eq 3 ]] || fail "usage: deploy.sh <vX.Y.Z> <commit-sha> <image@sha256:digest>"

readonly RELEASE_TAG="$1"
readonly RELEASE_SHA="$2"
readonly IMAGE_REF="$3"

[[ "$RELEASE_TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "invalid release tag"
[[ "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]] || fail "invalid commit SHA"
[[ "$IMAGE_REF" =~ ^ghcr\.io/[a-z0-9._/-]+@sha256:[0-9a-f]{64}$ ]] || fail "invalid immutable image reference"
[[ -d "$REPO_DIR/.git" ]] || fail "repository not found at $REPO_DIR"
[[ -f "$ENV_FILE" ]] || fail "production environment file not found at $ENV_FILE"
[[ -d "$STATE_DIR" ]] || fail "state directory is missing"

exec 9>"$APP_HOME/deploy.lock"
flock --exclusive --nonblock 9 || fail "another deployment is running"

compose() {
  REPORT_BUILDER_FRONTEND_IMAGE="$1" docker compose \
    --project-name "$COMPOSE_PROJECT" \
    --env-file "$ENV_FILE" \
    --file "$REPO_DIR/compose.yaml" \
    "${@:2}"
}

previous_sha=""
previous_image=""
if [[ -f "$STATE_DIR/current" ]]; then
  mapfile -t previous_state < "$STATE_DIR/current"
  previous_sha="${previous_state[1]:-}"
  previous_image="${previous_state[2]:-}"
fi

deployment_completed=false
rollback() {
  local exit_code=$?
  trap - ERR
  if [[ "$deployment_completed" == "false" && -n "$previous_sha" && -n "$previous_image" ]]; then
    log "deployment failed; restoring frontend image $previous_image"
    git -C "$REPO_DIR" checkout --detach --force "$previous_sha" || true
    compose "$previous_image" up --detach --no-deps --no-build --wait --wait-timeout 120 frontend || true
  fi
  exit "$exit_code"
}
trap rollback ERR

log "fetching $RELEASE_TAG"
git -C "$REPO_DIR" fetch --force origin "refs/tags/$RELEASE_TAG:refs/tags/$RELEASE_TAG"
resolved_sha="$(git -C "$REPO_DIR" rev-parse "$RELEASE_TAG^{commit}")"
[[ "$resolved_sha" == "$RELEASE_SHA" ]] || fail "tag does not resolve to the expected commit"
git -C "$REPO_DIR" checkout --detach --force "$RELEASE_SHA"

log "validating deployment configuration"
compose "$IMAGE_REF" config --quiet

log "pulling immutable frontend image"
docker pull "$IMAGE_REF"

log "starting frontend"
compose "$IMAGE_REF" up --detach --no-deps --no-build --wait --wait-timeout 120 frontend
frontend_endpoint="$(compose "$IMAGE_REF" port frontend 8080)"
[[ "$frontend_endpoint" =~ ^127\.0\.0\.1:[0-9]+$ ]] || fail "frontend is not bound to IPv4 loopback"
curl --fail --silent --show-error "http://$frontend_endpoint/health"

state_tmp="$STATE_DIR/current.tmp"
printf '%s\n%s\n%s\n%s\n' \
  "$RELEASE_TAG" "$RELEASE_SHA" "$IMAGE_REF" "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
  > "$state_tmp"
chmod 600 "$state_tmp"
mv -- "$state_tmp" "$STATE_DIR/current"

deployment_completed=true
trap - ERR
log "release $RELEASE_TAG deployed successfully"

