#!/usr/bin/env bash
# Discovery-to-plan smoke script.
#
# Walks the example end-to-end against a temporary project. Uses the repo's
# built CLI (`dist/cli/index.js`) so it does NOT require a global npm install
# and does NOT pollute any user environment.
#
# Stops when `ocn advance` reports there is no further step in the active SOP
# profile (i.e. when the terminal state-stub is reached). Always prints the
# final state / step before exiting.
#
# Validated with Claude Desktop on Windows with WSL2 (DEC-017). Cursor and
# Cline are not yet verified (DEC-019). The smoke does not validate any MCP
# Host — it exercises the CLI surface only.

set -euo pipefail

# Resolve repo root (this script lives at examples/discovery-to-plan/scripts/smoke.sh).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXAMPLE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$EXAMPLE_DIR/../.." && pwd)"
DIST_CLI="$REPO_ROOT/dist/cli/index.js"

if [ ! -f "$DIST_CLI" ]; then
  echo "ERROR: $DIST_CLI not found." >&2
  echo "Run \`npm run build\` from $REPO_ROOT first, then re-run this script." >&2
  exit 64
fi

OCN() { node "$DIST_CLI" "$@"; }

# Allocate a hermetic temp project. Cleaned on exit.
TMP_PROJECT="$(mktemp -d -t ocn-discovery-to-plan-XXXXXX)"
trap 'rm -rf "$TMP_PROJECT"' EXIT
echo "Temp project: $TMP_PROJECT"

# 1. ocn init — fresh DISCOVERY state.
echo
echo "=== ocn init ==="
( cd "$TMP_PROJECT" && OCN init --tier minimal )

# 2. Copy the example's docs/ into the temp project, replacing the bundle's
#    templates with the example's known-good content.
echo
echo "=== copy example docs into temp project ==="
mkdir -p "$TMP_PROJECT/docs"
cp "$EXAMPLE_DIR/docs/"*.md "$TMP_PROJECT/docs/"
ls "$TMP_PROJECT/docs/"

# 3. Initial status.
echo
echo "=== ocn status (initial) ==="
( cd "$TMP_PROJECT" && OCN status )

# 4. Walk through every step the SOP profile knows about. Each iteration:
#    a) checks the current step's artifact (read-only),
#    b) runs the gate (read-only),
#    c) advances on pass.
#    Stops when advance reports the project has reached a terminal step.
MAX_STEPS=12
i=0
prev_step=""
while [ $i -lt $MAX_STEPS ]; do
  i=$((i + 1))
  echo
  echo "=== iteration $i — ocn check ==="
  if ! ( cd "$TMP_PROJECT" && OCN check --json ); then
    echo "(check returned non-zero — stopping the walk)"
    break
  fi

  echo
  echo "=== iteration $i — ocn gate ==="
  if ! ( cd "$TMP_PROJECT" && OCN gate --json ); then
    echo "(gate returned non-zero — stopping the walk)"
    break
  fi

  # Capture the step BEFORE advancing so we can detect a no-op.
  current_step="$( cd "$TMP_PROJECT" && OCN status --json | node -e '
    let buf = "";
    process.stdin.on("data", (c) => { buf += c; });
    process.stdin.on("end", () => {
      try {
        const j = JSON.parse(buf);
        process.stdout.write(j.data?.currentStepId ?? "");
      } catch {
        process.stdout.write("");
      }
    });
  ' )"

  if [ "$current_step" = "$prev_step" ] && [ -n "$current_step" ]; then
    echo "(advance did not move past $current_step — stopping the walk)"
    break
  fi
  prev_step="$current_step"

  echo
  echo "=== iteration $i — ocn advance (from $current_step) ==="
  if ! ( cd "$TMP_PROJECT" && OCN advance --json ); then
    echo "(advance returned non-zero — likely terminal step reached, stopping)"
    break
  fi
done

# 5. Final status.
echo
echo "=== ocn status (final) ==="
( cd "$TMP_PROJECT" && OCN status )

echo
echo "Discovery-to-plan smoke completed."
