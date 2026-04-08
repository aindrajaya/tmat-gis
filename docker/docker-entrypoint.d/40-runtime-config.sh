#!/bin/sh
set -eu

cat <<EOF >/usr/share/nginx/html/runtime-config.js
window.__APP_CONFIG__ = {
  apiMode: "${APP_API_MODE:-prod}",
  prodApiUrl: "${APP_PROD_API_URL:-http://127.0.0.1:1880}",
  devApiUrl: "${APP_DEV_API_URL:-http://127.0.0.1:4000}",
  appName: "${APP_NAME:-TMAT Monitor}"
};
EOF
