#!/usr/bin/env bash
# Run on the Oracle VM from inside the cloned repo: ./deploy.sh
# Pulls the latest code from GitHub, tests it, and publishes it to nginx.
set -euo pipefail

cd "$(dirname "$0")"
echo "==> Pulling latest code"
git pull --ff-only

if command -v node >/dev/null 2>&1; then
  echo "==> Running tests"
  node test.js
else
  echo "==> Node not installed, skipping tests"
fi

echo "==> Publishing to /var/www/calc-hub"
sudo mkdir -p /var/www/calc-hub
sudo cp index.html style.css app.js calc.js /var/www/calc-hub/
sudo nginx -t
sudo systemctl reload nginx
echo "==> Done. Open http://$(curl -s ifconfig.me) in your browser"
