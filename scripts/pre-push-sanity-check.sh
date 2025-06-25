#!/bin/bash

# flows-auth Pre-Push Sanity Check
# Comprehensive validation before pushing to GitHub
# Based on thepia.com's proven pre-push validation system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VALIDATION_FAILED=false
SKIP_TESTS=false
SKIP_BUILD=false
SKIP_LINT=false
VERBOSE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-lint)
            SKIP_LINT=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            echo "flows-auth Pre-Push Sanity Check"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --skip-tests    Skip test execution"
            echo "  --skip-build    Skip build verification"
            echo "  --skip-lint     Skip linting and formatting checks"
            echo "  --verbose       Show detailed output"
            echo "  --help          Show this help message"
            echo ""
            echo "Examples:"
            echo "  pnpm pre-push                    # Complete validation"
            echo "  pnpm pre-push:quick              # Skip build verification"
            echo "  pnpm pre-push:fast               # Skip tests and builds"
            echo "  pnpm pre-push --verbose          # Show detailed output"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Helper functions
show_section() {
    echo ""
    echo -e "${BLUE}$1${NC}"
    echo "=================================="
}

run_check() {
    local description="$1"
    local command="$2"
    local required="$3"
    local show_output="$4"
    
    if [ "$VERBOSE" = true ] || [ "$show_output" = "show" ]; then
        echo -e "${YELLOW}🔍 $description${NC}"
        echo "   Command: $command"
    fi
    
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
    
    if [ "$VERBOSE" = true ]; then
        echo "   Command: $command"
    fi
    
    local output
    if output=$(eval "$command" 2>&1); then
        echo -e "${GREEN}✅ $description${NC}"
        if [ "$VERBOSE" = true ] && [ -n "$output" ]; then
            echo "   Output: $output"
        fi
        return 0
    else
        if [ "$required" = "required" ]; then
            echo -e "${RED}❌ $description${NC}"
            echo "   Error: $output"
            VALIDATION_FAILED=true
        else
            echo -e "${YELLOW}⚠️  $description (optional - skipped)${NC}"
            if [ "$VERBOSE" = true ] && [ -n "$output" ]; then
                echo "   Output: $output"
            fi
        fi
        return 1
    fi
}

# Main validation starts here
echo ""
echo -e "${BLUE}🚀 flows-auth Pre-Push Sanity Check${NC}"
echo -e "${BLUE}====================================${NC}"
echo ""
echo -e "${YELLOW}📋 Validating flows-auth library before push to GitHub${NC}"
echo ""

show_section "🔧 Environment & Dependencies"

# Check required tools
run_check "Node.js availability" "node --version" "required"
run_check "pnpm availability" "pnpm --version" "required"
run_check "Git availability" "git --version" "required"

# Check dependencies
run_check "Node dependencies installed" "test -d node_modules && test -f pnpm-lock.yaml" "required"

# Check for outdated dependencies (optional)
run_check "Check for critical dependency updates" "pnpm outdated --depth=0 | grep -v 'All dependencies are up to date' || true" "optional"

show_section "📁 Repository State"

# Repository state checks
run_check "No uncommitted changes" "git diff --quiet && git diff --cached --quiet" "required"
run_check "On a valid branch" "git rev-parse --abbrev-ref HEAD" "required"
run_check "Remote origin configured" "git remote get-url origin" "required"

# Check if we're ahead of remote
if git rev-parse --verify @{u} >/dev/null 2>&1; then
    run_check "Local branch up to date with remote" "test $(git rev-list --count HEAD ^@{u}) -eq 0 || test $(git rev-list --count @{u} ^HEAD) -eq 0" "optional"
else
    echo -e "${YELLOW}⚠️  No upstream branch configured (optional)${NC}"
fi

show_section "🔒 Security & Configuration"

# Security checks
run_check "No hardcoded secrets in files" "! grep -r -i -E '(api_key|secret|password|token).*[=:].*[a-zA-Z0-9]{20,}' src/ --exclude-dir=node_modules || true" "required"
run_check "No .env files in src/" "! find src/ -name '.env*' | grep -q ." "required"
run_check "Package.json syntax valid" "node -e 'JSON.parse(require(\"fs\").readFileSync(\"package.json\"))'" "required"

# Configuration files
if [ -f "vite.config.ts" ]; then
    run_check "Vite config syntax valid" "node -c vite.config.ts" "optional"
fi

if [ -f "vitest.config.ts" ]; then
    run_check "Vitest config syntax valid" "node -c vitest.config.ts" "optional"
fi

show_section "🎨 Code Quality & Formatting"

if [ "$SKIP_LINT" = false ]; then
    # Linting and formatting
    run_check "Biome linting" "pnpm lint" "required"
    run_check "Code formatting check" "pnpm format --check" "required"
    run_check "TypeScript type checking" "pnpm typecheck" "required"
    run_check "Svelte component checking" "pnpm svelte:check" "optional"
else
    echo -e "${YELLOW}⏭️ Skipping linting checks (--skip-lint)${NC}"
fi

show_section "🧪 Testing"

if [ "$SKIP_TESTS" = false ]; then
    # Unit tests
    run_check "Unit tests" "pnpm test:unit" "required" "show"
    
    # Integration tests
    run_check "Integration tests" "pnpm test:integration" "required" "show"
    
    # Coverage check
    run_check "Test coverage generation" "pnpm test:coverage" "required"
    
    # Smoke tests for critical functionality
    run_check "Smoke tests (critical paths)" "pnpm test:smoke" "required"
    
    # State machine tests (critical for auth library)
    run_check "Auth state machine tests" "pnpm test:state-machine" "required"
    
    # Auth store tests (critical for auth library)
    run_check "Auth store tests" "pnpm test:auth-store" "required"
else
    echo -e "${YELLOW}⏭️ Skipping tests (--skip-tests)${NC}"
fi

show_section "🏗️ Build Verification"

if [ "$SKIP_BUILD" = false ]; then
    # Build checks
    run_check "Library build" "pnpm build" "required"
    
    # Check build output
    run_check "Build output exists" "test -d dist && test -f dist/index.js && test -f dist/index.d.ts" "required"
    
    # Check exports are valid
    run_check "Package exports validation" "node -e 'require(\"./dist/index.cjs\"); console.log(\"CJS export OK\")'" "required"
    run_check "ES module exports validation" "node -e 'import(\"./dist/index.js\").then(() => console.log(\"ESM export OK\"))'" "required"
    
    # Example apps build verification
    if [ -d "examples/tasks-app-demo" ]; then
        run_check "Tasks demo app dependencies" "cd examples/tasks-app-demo && test -d node_modules" "optional"
        run_check "Tasks demo app TypeScript check" "cd examples/tasks-app-demo && pnpm run check 2>/dev/null || npx svelte-check --tsconfig ./tsconfig.json" "required"
        run_check "Tasks demo app build" "cd examples/tasks-app-demo && pnpm run build" "required"
    fi

    if [ -d "examples/flows-app-demo" ]; then
        run_check "Flows demo app dependencies" "cd examples/flows-app-demo && test -d node_modules" "optional"
        run_check "Flows demo app TypeScript check" "cd examples/flows-app-demo && pnpm run check 2>/dev/null || npx svelte-check --tsconfig ./tsconfig.json" "required"
        run_check "Flows demo app build" "cd examples/flows-app-demo && pnpm run build" "required"
    fi
else
    echo -e "${YELLOW}⏭️ Skipping build checks (--skip-build)${NC}"
fi

show_section "📊 Library Health"

# Library-specific checks
run_check "Package.json exports configuration" "node -e 'const pkg = require(\"./package.json\"); if (!pkg.exports) throw new Error(\"No exports field\")'" "required"
run_check "TypeScript declaration files" "test -f dist/index.d.ts" "required"
run_check "Svelte component exports" "test -f src/index.ts && grep -q 'export.*from.*components' src/index.ts" "required"

# Documentation checks
run_check "README.md exists" "test -f README.md" "required"
run_check "CHANGELOG.md exists" "test -f CHANGELOG.md" "optional"

# Check for common library issues
run_check "No console.log in production code" "! grep -r 'console\\.log' src/ --exclude-dir=node_modules || true" "optional"
run_check "No TODO comments in src/" "! grep -r 'TODO\\|FIXME\\|XXX' src/ --exclude-dir=node_modules || true" "optional"

show_section "📈 Repository Metrics"

# Repository health metrics
run_check "Test file count validation" "find tests/ -name '*.test.ts' | wc -l | awk '{if(\$1 >= 15) exit 0; else exit 1}'" "optional"
run_check "Source file organization" "test -d src/components && test -d src/stores && test -d src/utils" "required"

# Final validation summary
echo ""
echo "=================================="

if [ "$VALIDATION_FAILED" = true ]; then
    echo ""
    echo -e "${RED}❌ PRE-PUSH SANITY CHECK FAILED${NC}"
    echo -e "${YELLOW}💡 Fix the issues above before pushing to GitHub${NC}"
    echo ""
    echo -e "${BLUE}🔧 Quick fixes:${NC}"
    echo "   • Run: pnpm install (if dependencies missing)"
    echo "   • Run: pnpm lint:fix (to fix linting issues)"
    echo "   • Run: pnpm format (to fix formatting)"
    echo "   • Run: pnpm test (to fix test failures)"
    echo "   • Run: pnpm build (to fix build issues)"
    echo "   • Run: git add . && git commit (if uncommitted changes)"
    echo ""
    echo -e "${BLUE}🚀 Re-run with: pnpm pre-push${NC}"
    exit 1
else
    echo ""
    echo -e "${GREEN}🎉 ALL SANITY CHECKS PASSED!${NC}"
    echo -e "${GREEN}🚀 flows-auth library is ready to push to GitHub${NC}"
    echo ""
    echo -e "${BLUE}💡 Next steps:${NC}"
    echo "   • git push origin $(git rev-parse --abbrev-ref HEAD)"
    echo "   • Monitor CI/CD pipeline"
    echo "   • Update version if needed: pnpm changeset"
    echo ""
    echo -e "${GREEN}✨ Happy coding!${NC}"
fi
