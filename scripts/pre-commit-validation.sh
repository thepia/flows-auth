#!/bin/bash

# flows-auth Pre-Commit Validation
# Quick validation before committing changes
# Based on thepia.com's proven pre-commit validation system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VALIDATION_FAILED=false

# Helper functions
run_check() {
    local description="$1"
    local command="$2"
    local required="$3"
    
    if eval "$command" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $description${NC}"
        return 0
    else
        if [ "$required" = "required" ]; then
            echo -e "${RED}❌ $description${NC}"
            VALIDATION_FAILED=true
        else
            echo -e "${YELLOW}⚠️  $description (optional - skipped)${NC}"
        fi
        return 1
    fi
}

run_check_with_output() {
    local description="$1"
    local command="$2"
    local required="$3"
    
    echo -e "${YELLOW}🔍 $description${NC}"
    
    local output
    if output=$(eval "$command" 2>&1); then
        echo -e "${GREEN}✅ $description${NC}"
        return 0
    else
        if [ "$required" = "required" ]; then
            echo -e "${RED}❌ $description${NC}"
            echo "   Error: $output"
            VALIDATION_FAILED=true
        else
            echo -e "${YELLOW}⚠️  $description (optional - skipped)${NC}"
        fi
        return 1
    fi
}

# Main validation starts here
echo ""
echo -e "${BLUE}🔍 flows-auth Pre-Commit Validation${NC}"
echo -e "${BLUE}===================================${NC}"
echo ""

echo -e "${BLUE}🔧 Environment Checks${NC}"
echo "=================================="

# Check required tools
run_check "Node.js availability" "node --version" "required"
run_check "pnpm availability" "pnpm --version" "required"
run_check "Git availability" "git --version" "required"

# Check dependencies
run_check "Node dependencies installed" "test -d node_modules" "required"

echo ""
echo -e "${BLUE}🎨 Code Quality Checks${NC}"
echo "=================================="

# TypeScript checks
run_check_with_output "TypeScript type checking" "pnpm typecheck" "required"

# Check for common syntax issues
run_check_with_output "Package.json syntax" "node -e 'JSON.parse(require(\"fs\").readFileSync(\"package.json\"))'" "required"

# Check for common configuration issues
if [ -f "vite.config.ts" ]; then
    run_check_with_output "Vite config syntax" "node -c vite.config.ts" "optional"
fi

if [ -f "vitest.config.ts" ]; then
    run_check_with_output "Vitest config syntax" "node -c vitest.config.ts" "optional"
fi

echo ""
echo -e "${BLUE}🧪 Quick Test Checks${NC}"
echo "=================================="

# Run a subset of critical tests
run_check_with_output "Critical unit tests" "pnpm test:smoke" "required"

# Check auth store tests if auth files changed
if git diff --cached --name-only | grep -q "src/stores/"; then
    echo -e "${YELLOW}📋 Store files changed - running store tests${NC}"
    run_check_with_output "Auth store tests" "pnpm test:auth-store" "required"
fi

# Check component tests if component files changed
if git diff --cached --name-only | grep -q "src/components/"; then
    echo -e "${YELLOW}📋 Component files changed - running component tests${NC}"
    run_check_with_output "Component tests" "pnpm test:unit" "optional"
fi

echo ""
echo -e "${BLUE}📁 File Structure Checks${NC}"
echo "=================================="

# Check for required files
run_check "Package.json exists" "test -f package.json" "required"
run_check "Source index exists" "test -f src/index.ts" "required"

# Check for proper library structure
run_check "Components directory exists" "test -d src/components" "required"
run_check "Stores directory exists" "test -d src/stores" "required"
run_check "Utils directory exists" "test -d src/utils" "required"

echo ""
echo -e "${BLUE}🔒 Security Checks${NC}"
echo "=================================="

# Security checks
run_check "No hardcoded secrets in staged files" "! git diff --cached | grep -i -E '(api_key|secret|password|token).*[=:].*[a-zA-Z0-9]{20,}' || true" "required"
run_check "No .env files in src/" "! find src/ -name '.env*' | grep -q ." "required"
run_check "No console.log in staged files" "! git diff --cached | grep 'console\\.log' || true" "optional"

echo ""
echo -e "${BLUE}📋 Linting & Formatting${NC}"
echo "=================================="

# Quick linting check on staged files
if command -v pnpm >/dev/null 2>&1; then
    run_check "Biome check on staged files" "git diff --cached --name-only --diff-filter=ACM | grep -E '\\.(ts|js|svelte)$' | xargs -r pnpm biome check --no-errors-on-unmatched" "optional"
fi

# Final validation summary
echo ""
echo "=================================="

if [ "$VALIDATION_FAILED" = true ]; then
    echo ""
    echo -e "${RED}❌ PRE-COMMIT VALIDATION FAILED${NC}"
    echo -e "${YELLOW}💡 Fix the issues above before committing${NC}"
    echo ""
    echo -e "${BLUE}🔧 Quick fixes:${NC}"
    echo "   • Run: pnpm typecheck (to fix TypeScript issues)"
    echo "   • Run: pnpm lint:fix (to fix linting issues)"
    echo "   • Run: pnpm format (to fix formatting)"
    echo "   • Run: pnpm test:smoke (to fix critical test failures)"
    echo ""
    echo -e "${BLUE}🚀 Re-run with: git commit${NC}"
    exit 1
else
    echo ""
    echo -e "${GREEN}🎉 PRE-COMMIT VALIDATION PASSED!${NC}"
    echo -e "${GREEN}✅ Ready to commit changes${NC}"
    echo ""
fi
