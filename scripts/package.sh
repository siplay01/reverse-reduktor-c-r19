#!/bin/bash
# Production package for Russian shared hosting: builds for the real domain, drops the git-based admin (useless there), adds .htaccess, zips.
# Usage: scripts/package.sh [domain] [index]   e.g. scripts/package.sh revers22.ru        (noindex, for review)
#                                                    scripts/package.sh revers22.ru 1      (open to Yandex/Google)
set -euo pipefail
cd "$(dirname "$0")/.."
DOMAIN="${1:-revers22.ru}"; IDX="${2:-0}"
SITE_URL="https://$DOMAIN" BASE="" INDEX="$IDX" node build.mjs
OUT="../hosting-package/$DOMAIN"; rm -rf "$OUT"; mkdir -p "$OUT"
cp -R dist/. "$OUT/"
rm -rf "$OUT/admin" "$OUT/admin-decap" "$OUT/admin-sveltia"
cat > "$OUT/.htaccess" <<'H'
Options -Indexes
AddDefaultCharset UTF-8
ErrorDocument 404 /404.html
# after the SSL certificate is issued, uncomment to force https:
# RewriteEngine On
# RewriteCond %{HTTPS} off
# RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]
<IfModule mod_deflate.c>
AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml
</IfModule>
<IfModule mod_expires.c>
ExpiresActive On
ExpiresByType image/webp "access plus 1 year"
ExpiresByType font/woff2 "access plus 1 year"
ExpiresByType text/css "access plus 1 week"
ExpiresByType application/javascript "access plus 1 week"
ExpiresByType text/html "access plus 10 minutes"
</IfModule>
H
(cd "$(dirname "$OUT")" && rm -f "$DOMAIN.zip" && zip -qr "$DOMAIN.zip" "$DOMAIN")
echo "package: $OUT ($(find "$OUT" -type f | wc -l | tr -d ' ') files), zip: $(du -h "$OUT.zip" | cut -f1)  index=$IDX"
