#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_root"

version="$(node -p "require('./manifest.json').version")"
output_dir="$project_root/dist"
staging_dir="$(mktemp -d)"
trap 'rm -rf "$staging_dir"' EXIT

files=(
  background.js
  compare.css
  compare.html
  compare.js
  full-page-capture.js
  icons/icon-16.png
  icons/icon-32.png
  icons/icon-48.png
  icons/icon-128.png
  icons/icon.svg
  fonts/GEIST-LICENSE.txt
  fonts/Geist-Variable.woff2
  fonts/GeistMono-Variable.woff2
  manifest.json
  page.css
  popup.css
  popup.html
  popup.js
  privacy.html
  scroll-sync.js
  settings-data.js
  settings.html
  settings.js
  site-access.js
  support.html
  theme.css
  url-parity.js
  viewport-sizing.js
  welcome.html
  welcome.js
)

for file in "${files[@]}"; do
  if [[ ! -f "$file" || -L "$file" ]]; then
    echo "Packaging refused: missing file or symlink: $file" >&2
    exit 1
  fi
  mkdir -p "$staging_dir/$(dirname "$file")"
  cp "$file" "$staging_dir/$file"
  touch -t 202601010000 "$staging_dir/$file"
done

mkdir -p "$output_dir"
chrome_zip="$output_dir/parity-scrollr-chrome-v${version}.zip"
edge_zip="$output_dir/parity-scrollr-edge-v${version}.zip"
rm -f "$chrome_zip" "$edge_zip" "$output_dir/SHA256SUMS" "$output_dir/CONTENTS.txt"

(
  cd "$staging_dir"
  find . -type f -print | LC_ALL=C sort | zip -X -q "$chrome_zip" -@
)
cp "$chrome_zip" "$edge_zip"
unzip -tq "$chrome_zip"
unzip -tq "$edge_zip"
unzip -Z1 "$chrome_zip" | LC_ALL=C sort > "$output_dir/CONTENTS.txt"
(
  cd "$output_dir"
  shasum -a 256 "$(basename "$chrome_zip")" "$(basename "$edge_zip")" > SHA256SUMS
)

echo "Created:"
echo "  $chrome_zip"
echo "  $edge_zip"
echo "  $output_dir/SHA256SUMS"
echo "  $output_dir/CONTENTS.txt"
