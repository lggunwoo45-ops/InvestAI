#!/bin/sh
set -eu
umask 077

# Railway mounts its volume as root. Prepare only this application's directory,
# then drop privileges before starting the HTTP server and background workers.
if [ "$(id -u)" = "0" ]; then
  if [ -n "${INVESTAI_CLOUD_DIRECTORY:-}" ]; then
    if [ "${RAILWAY_VOLUME_MOUNT_PATH:-}" != "/data" ] || [ "$INVESTAI_CLOUD_DIRECTORY" != "/data/investai" ]; then
      echo "Member storage requires the /data volume and /data/investai directory." >&2
      exit 1
    fi
    if [ -L /data ] || [ -L /data/investai ]; then
      echo "Member storage must not be a symbolic link." >&2
      exit 1
    fi
    mkdir -p /data/investai
    chown node:node /data/investai
    chmod 0700 /data/investai
  fi
  exec su-exec node "$@"
fi

exec "$@"
