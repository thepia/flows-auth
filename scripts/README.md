# flows-auth Validation Scripts

Comprehensive validation scripts for the flows-auth library, based on thepia.com's proven validation system.

## 🚀 Pre-Push Validation

**File**: `scripts/pre-push-sanity-check.sh`

Comprehensive validation before pushing to GitHub to ensure code quality and prevent CI failures.

### **What it validates:**

- ✅ **Environment & Dependencies** - Tool availability, dependency installation
- ✅ **Repository State** - No uncommitted changes, branch status
- ✅ **Security & Configuration** - No secrets, valid config files
- ✅ **Code Quality & Formatting** - Linting, formatting, TypeScript compilation
- ✅ **Testing** - Unit tests, integration tests, coverage, smoke tests
- ✅ **Build Verification** - Library build, exports validation, example apps
- ✅ **Library Health** - Package exports, TypeScript declarations, documentation

### **Usage**

```bash
# Complete validation (recommended)
pnpm pre-push

# Skip build verification (faster)
pnpm pre-push:quick

# Skip tests and builds (fastest)
pnpm pre-push:fast

# Show detailed output
pnpm pre-push --verbose

# Get help
pnpm pre-push --help
```

### **Example Output**

```
🚀 flows-auth Pre-Push Sanity Check
====================================

📋 Validating flows-auth library before push to GitHub

🔧 Environment & Dependencies
==================================
✅ Node.js availability
✅ pnpm availability
✅ Git availability
✅ Node dependencies installed
✅ Check for critical dependency updates

📁 Repository State
==================================
✅ No uncommitted changes
✅ On a valid branch
✅ Remote origin configured

🔒 Security & Configuration
==================================
✅ No hardcoded secrets in files
✅ No .env files in src/
✅ Package.json syntax valid

🎨 Code Quality & Formatting
==================================
✅ Biome linting
✅ Code formatting check
✅ TypeScript type checking

🧪 Testing
==================================
✅ Unit tests
✅ Integration tests
✅ Test coverage generation
✅ Smoke tests (critical paths)
✅ Auth state machine tests
✅ Auth store tests

🏗️ Build Verification
==================================
✅ Library build
✅ Build output exists
✅ Package exports validation
✅ ES module exports validation

📊 Library Health
==================================
✅ Package.json exports configuration
✅ TypeScript declaration files
✅ Svelte component exports
✅ README.md exists

📈 Repository Metrics
==================================
✅ Test file count validation
✅ Source file organization

🎉 ALL SANITY CHECKS PASSED!
🚀 flows-auth library is ready to push to GitHub
```

## 🔍 Pre-Commit Validation

**File**: `scripts/pre-commit-validation.sh`

Quick validation before committing changes to catch issues early.

### **What it validates:**

- ✅ Tool availability (Node.js, pnpm, Git)
- ✅ TypeScript compilation
- ✅ Package.json and config file syntax
- ✅ Required file structure
- ✅ Security checks (no hardcoded secrets)
- ✅ Quick test execution for changed files

### **Usage:**

```bash
# Manual execution
pnpm pre-commit

# Automatic setup (recommended)
echo "./scripts/pre-commit-validation.sh" > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### **Benefits**

- **Faster feedback** - Catch issues before they reach CI
- **Targeted validation** - Only runs relevant tests for changed files
- **Security protection** - Prevents committing secrets or sensitive data
- **Consistent quality** - Ensures all commits meet quality standards

## 📋 Additional Scripts

### **Validation Commands**

```bash
# Complete validation (typecheck + lint + test)
pnpm validate

# Quick validation (typecheck + smoke tests)
pnpm validate:quick

# Individual checks
pnpm typecheck
pnpm lint
pnpm format
pnpm test:smoke
```

### **Test Commands**

```bash
# All tests
pnpm test

# Specific test suites
pnpm test:unit
pnpm test:integration
pnpm test:coverage

# Critical tests
pnpm test:smoke
pnpm test:state-machine
pnpm test:auth-store
```

### **Build Commands**

```bash
# Build library
pnpm build

# Build with watch mode
pnpm build:watch

# Check build output
ls -la dist/
```

## 🔧 Configuration

### **Script Options**

All scripts support various options for flexibility:

- `--skip-tests` - Skip test execution
- `--skip-build` - Skip build verification
- `--skip-lint` - Skip linting and formatting checks
- `--verbose` - Show detailed output
- `--help` - Show help message

### **Environment Variables**

Scripts automatically detect and adapt to:
- Available tools (Node.js, pnpm, Git)
- Project structure (components, stores, utils)
- Configuration files (vite.config.ts, vitest.config.ts)
- Example applications (tasks-app-demo, flows-app-demo)

## 🚨 Troubleshooting

### **Common Issues**

1. **Uncommitted changes**
   ```bash
   git add .
   git commit -m "Your commit message"
   ```

2. **Linting errors**
   ```bash
   pnpm lint:fix
   pnpm format
   ```

3. **Test failures**
   ```bash
   pnpm test
   # Fix failing tests, then re-run
   ```

4. **Build errors**
   ```bash
   pnpm build
   # Check TypeScript errors and fix
   ```

5. **Missing dependencies**
   ```bash
   pnpm install
   ```

### **Getting Help**

```bash
# Show help for any script
pnpm pre-push --help
pnpm pre-commit --help

# Verbose output for debugging
pnpm pre-push --verbose
```

## 🎯 Best Practices

1. **Run pre-commit before every commit**
2. **Run pre-push before every push**
3. **Use `pnpm pre-push:quick` for faster iteration**
4. **Use `pnpm pre-push:fast` only when necessary**
5. **Always fix issues rather than skipping validation**
6. **Keep dependencies up to date**
7. **Maintain test coverage above 80%**

## 📊 Integration with CI/CD

These scripts ensure that:
- **Local validation** matches CI/CD requirements
- **Faster feedback** than waiting for CI
- **Reduced CI failures** and faster development cycles
- **Consistent quality** across all environments

The validation scripts are designed to catch 95% of issues locally before they reach GitHub, significantly improving development velocity and code quality.
