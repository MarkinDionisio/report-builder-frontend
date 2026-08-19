#!/usr/bin/env bash
set -Eeuo pipefail

readonly DEPLOY_SCRIPT="${REPORT_BUILDER_FRONTEND_HOME:-/opt/report-builder-frontend}/bin/deploy"

read -r command release_tag release_sha image_ref extra <<< "${SSH_ORIGINAL_COMMAND:-}"

if [[ "$command" != "deploy" || -n "${extra:-}" ]]; then
  printf 'Only the deploy command is allowed.\n' >&2
  exit 64
fi

exec "$DEPLOY_SCRIPT" "$release_tag" "$release_sha" "$image_ref"

