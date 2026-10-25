#!/usr/bin/env bash
# One-shot deploy of the prototype to auther.co.uk on an Ubuntu/Debian server with nginx.
# Safe to re-run: it pulls, rebuilds and restarts. It never edits any other site's config.
#
#   sudo CERTBOT_EMAIL=you@example.com bash deploy/setup.sh
#
set -euo pipefail

DOMAIN=auther.co.uk
APP_DIR=/srv/kerfmark
PORT=3005
REPO=${REPO:-https://github.com/Kojixai/Kerfmark.git}
BRANCH=${BRANCH:-main}
HERE=$(cd "$(dirname "$0")" && pwd)

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
die() { printf '\n\033[31mStopped: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" = 0 ] || die "run with sudo"
command -v nginx >/dev/null || die "nginx not found. If the server uses Caddy, add: $DOMAIN, www.$DOMAIN { reverse_proxy 127.0.0.1:$PORT }"

say "Checking Node.js (need 20 or newer)"
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v

say "Making sure nothing else is serving $DOMAIN or using port $PORT"
other=$(grep -rlE "server_name[^;]*([[:space:]]|^)(www\.)?${DOMAIN//./\\.}([[:space:];]|$)" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null | grep -v "/$DOMAIN\$" || true)
[ -z "$other" ] || die "$DOMAIN is already named in: $other. Remove it from that file first (leave auther.app alone)."
if ss -ltn "sport = :$PORT" | grep -q LISTEN && ! systemctl is-active --quiet kerfmark; then
  die "port $PORT is taken by something else. Change PORT in this script, kerfmark.service and the nginx file."
fi

say "Fetching the code into $APP_DIR"
id kerfmark >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin kerfmark
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch --quiet origin "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  git clone --quiet --branch "$BRANCH" "$REPO" "$APP_DIR"
fi
chown -R kerfmark:kerfmark "$APP_DIR"

say "Installing and building"
sudo -u kerfmark -H bash -c "cd '$APP_DIR' && npm ci --no-audit --no-fund && npm run build"

say "Starting the app"
cp "$HERE/kerfmark.service" /etc/systemd/system/kerfmark.service
systemctl daemon-reload
systemctl enable --quiet kerfmark
systemctl restart kerfmark
for i in $(seq 1 30); do curl -fsS -o /dev/null "http://127.0.0.1:$PORT/" && break; sleep 1; done
curl -fsS -o /dev/null "http://127.0.0.1:$PORT/" || die "app did not start. See: journalctl -u kerfmark -n 50"

say "Configuring nginx for $DOMAIN"
if [ ! -f "/etc/nginx/sites-available/$DOMAIN" ] || ! grep -q "ssl_certificate" "/etc/nginx/sites-available/$DOMAIN"; then
  cp "$HERE/$DOMAIN.nginx" "/etc/nginx/sites-available/$DOMAIN"
fi
ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
nginx -t
systemctl reload nginx

say "HTTPS certificate"
command -v certbot >/dev/null || apt-get install -y certbot python3-certbot-nginx
if [ -n "${CERTBOT_EMAIL:-}" ]; then mail=(-m "$CERTBOT_EMAIL"); else mail=(--register-unsafely-without-email); fi
certbot --nginx --non-interactive --agree-tos --redirect "${mail[@]}" -d "$DOMAIN" -d "www.$DOMAIN" \
  || echo "Certificate not issued. Check both $DOMAIN and www.$DOMAIN have A records pointing at this server, then re-run."

say "Done: https://$DOMAIN"
