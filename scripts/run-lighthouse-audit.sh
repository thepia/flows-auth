#!/bin/bash

# Lighthouse Audit Runner for Local Development
# Mirrors the CI workflow from .github/workflows/lighthouse-audit.yml
# Usage: ./scripts/run-lighthouse-audit.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PORT=4321
TIMEOUT=120
ACCESSIBILITY_THRESHOLD=0.8
REPORT_DIR="./lighthouse-reports/json"
REPORT_FILE="$REPORT_DIR/home.json"

# Cleanup function
cleanup() {
  if [ ! -z "$SERVER_PID" ]; then
    echo -e "${YELLOW}🧹 Stopping server (PID: $SERVER_PID)...${NC}"
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
  fi
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Helper functions
log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Main script
main() {
  log_info "Starting Lighthouse Audit..."
  
  # Step 1: Build project
  log_info "Building project..."
  pnpm run build
  log_success "Build completed"
  
  # Step 2: Install global tools
  log_info "Installing global tools (lighthouse, http-server)..."
  npm install -g lighthouse http-server >/dev/null 2>&1
  log_success "Global tools installed"
  
  # Step 3: Check for Chrome/Chromium
  log_info "Checking for Chrome/Chromium..."
  CHROME_FLAGS="--headless --no-sandbox --disable-dev-shm-usage"
  
  if command_exists chromium; then
    log_success "Found chromium"
  elif command_exists chromium-browser; then
    log_success "Found chromium-browser"
  elif command_exists google-chrome; then
    log_success "Found google-chrome"
  elif command_exists "Google Chrome"; then
    log_success "Found Google Chrome"
  else
    log_warning "Chrome/Chromium not found in PATH"
    log_info "Attempting to install Chromium..."
    
    if command_exists brew; then
      log_info "Installing via Homebrew..."
      brew install chromium >/dev/null 2>&1 || {
        log_error "Failed to install Chromium via Homebrew"
        log_info "Please install Chrome or Chromium manually:"
        log_info "  macOS: brew install chromium"
        log_info "  Linux: sudo apt-get install chromium-browser"
        return 1
      }
      log_success "Chromium installed"
    else
      log_error "Homebrew not found. Please install Chrome or Chromium manually."
      return 1
    fi
  fi
  
  # Step 4: Start local server
  log_info "Starting local server on port $PORT..."
  cd dist
  http-server -p $PORT -s >/dev/null 2>&1 &
  SERVER_PID=$!
  cd ..
  
  log_success "Server started (PID: $SERVER_PID)"
  
  # Step 5: Wait for server to start
  log_info "Waiting for server to start..."
  sleep 3
  
  # Step 6: Test connectivity
  log_info "Testing server connectivity..."
  if ! curl -f http://localhost:$PORT/ >/dev/null 2>&1; then
    log_error "Server is not responding"
    return 1
  fi
  log_success "Server is responding"
  
  # Step 7: Create report directory
  mkdir -p "$REPORT_DIR"
  
  # Step 8: Run Lighthouse audit
  log_info "Running Lighthouse audit (this may take a minute)..."
  
  if ! timeout $TIMEOUT lighthouse http://localhost:$PORT/ \
    --output=json \
    --output-path="$REPORT_FILE" \
    --chrome-flags="$CHROME_FLAGS" \
    --only-categories=accessibility \
    --throttling-method=provided \
    --quiet; then
    log_error "Lighthouse audit failed or timed out"
    return 1
  fi
  
  log_success "Lighthouse audit completed"
  
  # Step 9: Check results
  log_info "Checking accessibility score..."
  
  if [ ! -f "$REPORT_FILE" ]; then
    log_error "Report file not found: $REPORT_FILE"
    return 1
  fi
  
  # Extract accessibility score
  if command_exists jq; then
    accessibility_score=$(jq -r '.categories.accessibility.score' "$REPORT_FILE" 2>/dev/null || echo "null")
  else
    log_warning "jq not found, installing..."
    npm install -g jq >/dev/null 2>&1 || {
      log_warning "Could not install jq, trying alternative method..."
      accessibility_score=$(grep -o '"accessibility".*"score":[0-9.]*' "$REPORT_FILE" | grep -o '[0-9.]*$' || echo "null")
    }
  fi
  
  if [ "$accessibility_score" = "null" ] || [ -z "$accessibility_score" ]; then
    log_warning "Could not read accessibility score from report"
    log_info "Report saved to: $REPORT_FILE"
    return 0
  fi
  
  # Convert to percentage
  score_percent=$(echo "scale=1; $accessibility_score * 100" | bc 2>/dev/null || echo "N/A")
  
  log_info "Home page accessibility score: ${score_percent}%"
  
  # Check threshold
  if (( $(echo "$accessibility_score < $ACCESSIBILITY_THRESHOLD" | bc -l) )); then
    log_error "Accessibility score below ${ACCESSIBILITY_THRESHOLD}0% threshold"
    log_info "Report saved to: $REPORT_FILE"
    return 1
  else
    log_success "Accessibility score meets threshold (≥ ${ACCESSIBILITY_THRESHOLD}0%)"
  fi
  
  log_info "Report saved to: $REPORT_FILE"
  log_success "Lighthouse audit completed successfully!"
}

# Run main function
main
exit $?

