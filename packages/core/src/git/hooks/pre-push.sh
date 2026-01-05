#!/bin/sh
# CodeGateway hook - Pre-push analysis
# Analyzes all commits being pushed

# Configuration (replaced at install time)
BLOCK_ON_CRITICAL={{BLOCK_ON_CRITICAL}}
MIN_SEVERITY="{{MIN_SEVERITY}}"

# Colors
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

while read local_ref local_sha remote_ref remote_sha; do
  if [ "$local_sha" = "0000000000000000000000000000000000000000" ]; then
    # Branch is being deleted
    continue
  fi

  if [ "$remote_sha" = "0000000000000000000000000000000000000000" ]; then
    # New branch, analyze all commits
    RANGE="$local_sha"
  else
    # Existing branch, analyze new commits
    RANGE="$remote_sha..$local_sha"
  fi

  # Get changed files in the range
  CHANGED_FILES=$(git diff --name-only "$RANGE" 2>/dev/null | grep -E '\.(ts|tsx|js|jsx)$')

  if [ -n "$CHANGED_FILES" ]; then
    echo "${BLUE}CodeGateway: Analyzing changes in $local_ref...${NC}"

    # Run analysis on current working directory
    if command -v codegateway &> /dev/null; then
      RESULT=$(codegateway analyze . --json --severity "$MIN_SEVERITY" 2>/dev/null)
    else
      echo "${YELLOW}CodeGateway CLI not found, skipping analysis${NC}"
      continue
    fi

    CRITICAL_COUNT=$(echo "$RESULT" | grep -o '"critical":[0-9]*' | grep -o '[0-9]*' || echo "0")

    if [ "$BLOCK_ON_CRITICAL" = "1" ] && [ "$CRITICAL_COUNT" -gt 0 ]; then
      echo "${RED}Push blocked: $CRITICAL_COUNT critical issue(s) found${NC}"
      echo "${YELLOW}Run 'codegateway analyze' to see details, or use --no-verify to bypass${NC}"
      exit 1
    fi
  fi
done

echo "${GREEN}CodeGateway: Analysis complete${NC}"
exit 0
