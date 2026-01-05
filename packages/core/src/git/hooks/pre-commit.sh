#!/bin/sh
# CodeGateway hook - AI Code Review Trust Layer
# This hook analyzes staged files for AI-generated code patterns

# Configuration (replaced at install time)
BLOCK_ON_CRITICAL={{BLOCK_ON_CRITICAL}}
BLOCK_ON_WARNING={{BLOCK_ON_WARNING}}
SHOW_CHECKPOINT={{SHOW_CHECKPOINT}}
MIN_SEVERITY="{{MIN_SEVERITY}}"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Check if CodeGateway CLI is available
if ! command -v codegateway &> /dev/null; then
  # Try using bunx/npx
  if command -v bunx &> /dev/null; then
    CODEGATEWAY="bunx @codegateway/cli"
  elif command -v npx &> /dev/null; then
    CODEGATEWAY="npx @codegateway/cli"
  else
    echo "${YELLOW}CodeGateway CLI not found, skipping analysis${NC}"
    exit 0
  fi
else
  CODEGATEWAY="codegateway"
fi

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$')

if [ -z "$STAGED_FILES" ]; then
  # No relevant files staged
  exit 0
fi

echo "${BLUE}CodeGateway: Analyzing staged files...${NC}"

# Create temp directory for staged content
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Extract staged content to temp directory
for FILE in $STAGED_FILES; do
  # Create directory structure
  mkdir -p "$TEMP_DIR/$(dirname "$FILE")"
  # Get staged version of file
  git show ":$FILE" > "$TEMP_DIR/$FILE" 2>/dev/null || true
done

# Run analysis
RESULT=$($CODEGATEWAY analyze "$TEMP_DIR" --json --severity "$MIN_SEVERITY" 2>/dev/null)

if [ $? -ne 0 ]; then
  echo "${YELLOW}CodeGateway analysis failed, proceeding with commit${NC}"
  exit 0
fi

# Parse results
CRITICAL_COUNT=$(echo "$RESULT" | grep -o '"critical":[0-9]*' | grep -o '[0-9]*' || echo "0")
WARNING_COUNT=$(echo "$RESULT" | grep -o '"warning":[0-9]*' | grep -o '[0-9]*' || echo "0")
INFO_COUNT=$(echo "$RESULT" | grep -o '"info":[0-9]*' | grep -o '[0-9]*' || echo "0")

# Report findings
if [ "$CRITICAL_COUNT" -gt 0 ] || [ "$WARNING_COUNT" -gt 0 ] || [ "$INFO_COUNT" -gt 0 ]; then
  echo ""
  echo "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo "${BLUE}  CodeGateway Analysis Results${NC}"
  echo "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

  if [ "$CRITICAL_COUNT" -gt 0 ]; then
    echo "${RED}  ● Critical: $CRITICAL_COUNT issues${NC}"
  fi
  if [ "$WARNING_COUNT" -gt 0 ]; then
    echo "${YELLOW}  ● Warnings: $WARNING_COUNT issues${NC}"
  fi
  if [ "$INFO_COUNT" -gt 0 ]; then
    echo "${BLUE}  ● Info: $INFO_COUNT issues${NC}"
  fi

  echo "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
fi

# Decide whether to block
if [ "$BLOCK_ON_CRITICAL" = "1" ] && [ "$CRITICAL_COUNT" -gt 0 ]; then
  echo "${RED}Commit blocked: $CRITICAL_COUNT critical issue(s) found${NC}"
  echo "${YELLOW}Run 'codegateway analyze' to see details, or use --no-verify to bypass${NC}"
  exit 1
fi

if [ "$BLOCK_ON_WARNING" = "1" ] && [ "$WARNING_COUNT" -gt 0 ]; then
  echo "${YELLOW}Commit blocked: $WARNING_COUNT warning(s) found${NC}"
  echo "${YELLOW}Run 'codegateway analyze' to see details, or use --no-verify to bypass${NC}"
  exit 1
fi

# If checkpoint is enabled and there are issues, prompt for confirmation
if [ "$SHOW_CHECKPOINT" = "1" ] && [ "$CRITICAL_COUNT" -gt 0 ] || [ "$WARNING_COUNT" -gt 0 ]; then
  # Check if we're in interactive mode
  if [ -t 0 ]; then
    echo "${YELLOW}Do you understand the flagged issues? (y/n)${NC}"
    read -r RESPONSE
    if [ "$RESPONSE" != "y" ] && [ "$RESPONSE" != "Y" ]; then
      echo "${RED}Commit aborted. Review the issues before committing.${NC}"
      exit 1
    fi
  fi
fi

echo "${GREEN}CodeGateway: Analysis complete, proceeding with commit${NC}"
exit 0
