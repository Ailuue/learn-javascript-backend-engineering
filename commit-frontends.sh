#!/usr/bin/env bash
#
# commit-frontends.sh
# -------------------
# Commits each uncommitted file under frontends/ INDIVIDUALLY (never a whole
# directory), in order of file-creation time, with a semantic commit message.
# For every file it runs, in order:
#     git add <file>
#     git commit -m "<semantic message>" -- <file>
#     git push origin HEAD
# and waits a random 1–3 minutes between files.
#
# Notes:
#   * `git commit … -- <file>` records ONLY that one file, so unrelated staged
#     changes (e.g. the directory-rename work) are never swept in.
#   * GIT_TERMINAL_PROMPT=0 makes a push fail fast instead of hanging on a
#     credential prompt; commits stay local and you can push later if so.

set -u
cd "$(dirname "$0")" || exit 1
export GIT_TERMINAL_PROMPT=0

LOG="commit-frontends.log"
log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG"; }

# Build the work list: untracked, non-ignored files under frontends/, ordered
# by creation (birth) time. node_modules/dist are excluded via .gitignore.
LIST="$(mktemp)"
git ls-files --others --exclude-standard -- frontends/ \
  | while IFS= read -r f; do printf '%s\t%s\n' "$(stat -f '%B' "$f")" "$f"; done \
  | sort -n | cut -f2- > "$LIST"

total=$(wc -l < "$LIST" | tr -d ' ')
log "Starting: $total file(s) to commit individually from frontends/"

# Map a file path to a conventional-commit message.
message_for() {
  local f="$1" rel scope sub base type
  rel="${f#frontends/}"
  if [[ "$rel" == */* ]]; then
    scope="${rel%%/*}"      # app folder, e.g. web-framework-tutorial
    sub="${rel#*/}"         # path within the app, e.g. src/App.jsx
  else
    scope="frontends"       # file directly under frontends/
    sub="$rel"
  fi
  base="$(basename "$f")"
  case "$base" in
    *.md)                                   type="docs"  ;;
    *.css)                                  type="style" ;;
    *.jsx|*.tsx|*.js|*.ts|*.html)           type="feat"  ;;
    package.json|tsconfig*.json|*.config.js|*.config.ts|vite.config.*|*.json|\
    .gitignore|.dockerignore|Dockerfile|nginx.conf|yarn.lock|package-lock.json) type="chore" ;;
    *)                                      type="chore" ;;
  esac
  printf '%s(%s): add %s' "$type" "$scope" "$sub"
}

n=0
first=1
while IFS= read -r file; do
  [ -z "$file" ] && continue
  n=$((n + 1))

  # Random 1–3 minute pause between files (not before the first).
  if [ "$first" -eq 0 ]; then
    wait_s=$(( RANDOM % 121 + 60 ))   # 60–180 seconds
    log "Waiting ${wait_s}s before next file…"
    sleep "$wait_s"
  fi
  first=0

  msg="$(message_for "$file")"
  log "($n/$total) $file"
  log "    \$ git add -- $file"
  git add -- "$file" 2>&1 | sed 's/^/    /' | tee -a "$LOG"

  log "    \$ git commit -m \"$msg\" -- $file"
  if git commit -m "$msg" -- "$file" 2>&1 | sed 's/^/    /' | tee -a "$LOG"; then
    log "    \$ git push origin HEAD"
    if git push origin HEAD 2>&1 | sed 's/^/    /' | tee -a "$LOG"; then
      log "    ✓ pushed"
    else
      log "    ⚠ push failed (commit is local; push later)"
    fi
  else
    log "    ⚠ commit skipped/failed for $file"
  fi
done < "$LIST"

rm -f "$LIST"
log "Done: processed $n file(s)."
