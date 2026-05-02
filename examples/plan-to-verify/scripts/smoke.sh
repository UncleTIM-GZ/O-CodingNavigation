#!/usr/bin/env bash
# Plan-to-verify smoke script (SOP 0.2.0).
#
# Walks the example end-to-end against a temporary OCN project, exercising
# all 19 wired SOP 0.2.0 steps from `step_project_brief` through
# `step_final_build_verdict`. Uses the repo's built CLI
# (`dist/cli/index.js`) so it does NOT require a global npm install and
# does NOT pollute any user environment.
#
# Stops cleanly when `ocn advance` reports the terminal step has been
# reached. After the loop, the script asserts the final state is
# `state_verify` / `step_final_build_verdict`.
#
# This smoke is the SOP 0.2.0 sibling of `examples/discovery-to-plan/scripts/smoke.sh`
# (which only walks docs 00-09 under the legacy 0.1.0 wired step set).

set -euo pipefail

# Resolve repo root (this script lives at examples/plan-to-verify/scripts/smoke.sh).
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
TMP_PROJECT="$(mktemp -d -t ocn-plan-to-verify-XXXXXX)"
trap 'rm -rf "$TMP_PROJECT"' EXIT
echo "Temp project: $TMP_PROJECT"

# 1. ocn init — fresh DISCOVERY state (SOP 0.2.0).
echo
echo "=== ocn init ==="
( cd "$TMP_PROJECT" && OCN init --tier minimal )

# 1a. Assert the project is on SOP 0.2.0.
STATE_JSON="$TMP_PROJECT/.ocoding/state.json"
if [ ! -f "$STATE_JSON" ]; then
  echo "ERROR: $STATE_JSON not produced by \`ocn init\`." >&2
  exit 65
fi

INIT_VERSION="$(node -e '
  const fs = require("node:fs");
  const j = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  process.stdout.write(j.project?.sopProfileVersion ?? "");
' "$STATE_JSON")"

if [ "$INIT_VERSION" != "0.2.0" ]; then
  echo "ERROR: expected sopProfileVersion=0.2.0 but got '$INIT_VERSION'" >&2
  exit 66
fi

echo "init wrote sopProfileVersion=$INIT_VERSION"

# 2. Copy this example's docs/ into the temp project.
echo
echo "=== copy example docs into temp project ==="
mkdir -p "$TMP_PROJECT/docs"
cp "$EXAMPLE_DIR/docs/"*.md "$TMP_PROJECT/docs/"
ls "$TMP_PROJECT/docs/"

# 3. Initial status.
echo
echo "=== ocn status (initial) ==="
( cd "$TMP_PROJECT" && OCN status )

# 4. Walk all 19 wired steps. Each iteration:
#    a) status snapshot for visibility,
#    b) check (must exit 0 — required sections present),
#    c) gate (must exit 0 — same engine, distinct exit code),
#    d) advance (expected to succeed for steps 1..18; the final advance
#       past step_final_build_verdict is expected to fail with
#       ERR_STATE_MACHINE per the runtime cutover contract).
EXPECTED_STEPS=19
i=0
prev_step=""
while [ $i -lt $EXPECTED_STEPS ]; do
  i=$((i + 1))
  echo
  echo "=== iteration $i — ocn status ==="
  ( cd "$TMP_PROJECT" && OCN status )

  echo
  echo "=== iteration $i — ocn check ==="
  if ! ( cd "$TMP_PROJECT" && OCN check --json ); then
    echo "ERROR: ocn check failed at iteration $i" >&2
    exit 67
  fi

  echo
  echo "=== iteration $i — ocn gate ==="
  if ! ( cd "$TMP_PROJECT" && OCN gate --json ); then
    echo "ERROR: ocn gate failed at iteration $i" >&2
    exit 68
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
    echo "ERROR: advance did not move past $current_step (no-op detected)" >&2
    exit 69
  fi
  prev_step="$current_step"

  if [ $i -lt $EXPECTED_STEPS ]; then
    echo
    echo "=== iteration $i — ocn advance (from $current_step) ==="
    if ! ( cd "$TMP_PROJECT" && OCN advance --json ); then
      echo "ERROR: ocn advance failed at iteration $i (step=$current_step)" >&2
      exit 70
    fi
  else
    # Terminal iteration — advance past step_final_build_verdict must fail
    # cleanly with ERR_STATE_MACHINE. Capture both stdout and exit code.
    echo
    echo "=== iteration $i — ocn advance (terminal; expected ERR_STATE_MACHINE) ==="
    set +e
    TERMINAL_STDOUT="$( cd "$TMP_PROJECT" && OCN advance --json )"
    TERMINAL_EXIT=$?
    set -e
    echo "$TERMINAL_STDOUT"
    if [ $TERMINAL_EXIT -ne 3 ]; then
      echo "ERROR: expected exit code 3 (ERR_STATE_MACHINE) at terminal advance, got $TERMINAL_EXIT" >&2
      exit 71
    fi
    TERMINAL_CODE="$(node -e '
      let buf = process.argv[1] ?? "";
      try {
        const j = JSON.parse(buf);
        process.stdout.write(j.code ?? "");
      } catch {
        process.stdout.write("");
      }
    ' "$TERMINAL_STDOUT")"
    if [ "$TERMINAL_CODE" != "ERR_STATE_MACHINE" ]; then
      echo "ERROR: expected code=ERR_STATE_MACHINE at terminal advance, got '$TERMINAL_CODE'" >&2
      exit 72
    fi
  fi
done

# 5. Final status — must be state_verify / step_final_build_verdict.
echo
echo "=== ocn status (final) ==="
( cd "$TMP_PROJECT" && OCN status )

FINAL_STATE="$( cd "$TMP_PROJECT" && OCN status --json | node -e '
  let buf = "";
  process.stdin.on("data", (c) => { buf += c; });
  process.stdin.on("end", () => {
    try {
      const j = JSON.parse(buf);
      process.stdout.write(`${j.data?.currentStateId ?? ""}/${j.data?.currentStepId ?? ""}`);
    } catch {
      process.stdout.write("");
    }
  });
' )"

if [ "$FINAL_STATE" != "state_verify/step_final_build_verdict" ]; then
  echo "ERROR: expected final state state_verify/step_final_build_verdict, got '$FINAL_STATE'" >&2
  exit 73
fi

echo
echo "Plan-to-verify smoke completed"
