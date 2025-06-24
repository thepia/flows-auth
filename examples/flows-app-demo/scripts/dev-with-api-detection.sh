#!/bin/bash

# Development script with automatic API server detection
# Handles the structural reality that API server source is in thepia.com repo

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LOCAL_API_URL="https://dev.thepia.com:8443"
PRODUCTION_API_URL="https://api.thepia.com"
LOCAL_API_HEALTH_ENDPOINT="$LOCAL_API_URL/health"
PRODUCTION_API_HEALTH_ENDPOINT="$PRODUCTION_API_URL/health"

# Function to check if local API server is running
check_local_api() {
    echo -e "${BLUE}🔍 Checking for local API server at $LOCAL_API_URL...${NC}"
    
    if curl -k -s --connect-timeout 3 "$LOCAL_API_HEALTH_ENDPOINT" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Local API server detected and responding${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Local API server not detected${NC}"
        return 1
    fi
}

# Function to check production API server
check_production_api() {
    echo -e "${BLUE}🔍 Checking production API server at $PRODUCTION_API_URL...${NC}"
    
    if curl -s --connect-timeout 5 "$PRODUCTION_API_HEALTH_ENDPOINT" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Production API server accessible${NC}"
        return 0
    else
        echo -e "${RED}❌ Production API server not accessible${NC}"
        return 1
    fi
}

# Function to display API server information
display_api_info() {
    local api_url=$1
    local api_type=$2
    
    echo -e "${GREEN}📡 API Server Information:${NC}"
    echo -e "${BLUE}   Type: $api_type${NC}"
    echo -e "${BLUE}   URL: $api_url${NC}"
    
    # Try to get detailed info from health endpoint
    if [[ "$api_type" == *"Local"* ]]; then
        local health_response=$(curl -k -s "$api_url/health" 2>/dev/null || echo "{}")
    else
        local health_response=$(curl -s "$api_url/health" 2>/dev/null || echo "{}")
    fi
    
    if [[ "$health_response" != "{}" ]]; then
        echo -e "${BLUE}   Status: $(echo "$health_response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "unknown")${NC}"
        echo -e "${BLUE}   Server: $(echo "$health_response" | grep -o '"server":"[^"]*"' | cut -d'"' -f4 || echo "unknown")${NC}"
    fi
    
    echo ""
}

# Function to set environment variables for API configuration
configure_api_environment() {
    local api_url=$1
    local api_type=$2
    
    export PUBLIC_API_BASE_URL="$api_url"
    
    # Create or update .env.local for the demo app
    local env_file=".env.local"
    echo "# Auto-generated API configuration - $(date)" > "$env_file"
    echo "PUBLIC_API_BASE_URL=$api_url" >> "$env_file"
    echo "# API Type: $api_type" >> "$env_file"
    
    echo -e "${GREEN}✅ Environment configured for $api_type${NC}"
    echo -e "${BLUE}   PUBLIC_API_BASE_URL=$api_url${NC}"
    echo ""
}

# Function to start local API server (if thepia.com repo is available)
start_local_api_if_available() {
    local thepia_repo_path="../../thepia.com"
    
    if [[ -d "$thepia_repo_path" ]]; then
        echo -e "${BLUE}🔍 Found thepia.com repository at $thepia_repo_path${NC}"
        echo -e "${YELLOW}💡 You can start the local API server by running:${NC}"
        echo -e "${YELLOW}   cd $thepia_repo_path && ./scripts/start-local-api.sh${NC}"
        echo ""
        
        read -p "Would you like to start the local API server now? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}🚀 Starting local API server...${NC}"
            cd "$thepia_repo_path"
            ./scripts/start-local-api.sh &
            cd - > /dev/null
            
            # Wait for server to start
            echo -e "${YELLOW}⏳ Waiting for local API server to start...${NC}"
            for i in {1..15}; do
                if check_local_api > /dev/null 2>&1; then
                    echo -e "${GREEN}✅ Local API server started successfully${NC}"
                    return 0
                fi
                sleep 1
            done
            
            echo -e "${RED}❌ Local API server failed to start within 15 seconds${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}💡 To use local API server:${NC}"
        echo -e "${YELLOW}   1. Clone thepia.com repository: git clone https://github.com/thepia/thepia.com${NC}"
        echo -e "${YELLOW}   2. Start local API: cd thepia.com && ./scripts/start-local-api.sh${NC}"
        echo ""
    fi
    
    return 1
}

# Main execution
main() {
    echo -e "${GREEN}🚀 Flows Auth Development Environment${NC}"
    echo -e "${GREEN}=====================================${NC}"
    echo ""
    
    # Parse command line arguments
    local force_local=false
    local force_production=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --local-api)
                force_local=true
                shift
                ;;
            --production-api)
                force_production=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --local-api       Force use of local API server (requires local server running)"
                echo "  --production-api  Force use of production API server"
                echo "  --help           Show this help message"
                echo ""
                echo "API Server Architecture:"
                echo "  Production:       https://api.thepia.com (deployed via Bunny Edge)"
                echo "  Local Development: https://dev.thepia.com:8443 (from thepia.com repo)"
                echo "  Source Code:      thepia.com/src/api/ directory"
                exit 0
                ;;
            *)
                echo -e "${RED}❌ Unknown option: $1${NC}"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Determine which API server to use
    local api_url=""
    local api_type=""
    
    if [[ "$force_local" == true ]]; then
        if check_local_api; then
            api_url="$LOCAL_API_URL"
            api_type="Local Development (forced)"
        else
            echo -e "${RED}❌ Local API server forced but not available${NC}"
            echo -e "${YELLOW}💡 Start local API server from thepia.com repo first${NC}"
            exit 1
        fi
    elif [[ "$force_production" == true ]]; then
        if check_production_api; then
            api_url="$PRODUCTION_API_URL"
            api_type="Production (forced)"
        else
            echo -e "${RED}❌ Production API server forced but not accessible${NC}"
            exit 1
        fi
    else
        # Auto-detection logic
        if check_local_api; then
            api_url="$LOCAL_API_URL"
            api_type="Local Development (auto-detected)"
        elif check_production_api; then
            api_url="$PRODUCTION_API_URL"
            api_type="Production (fallback)"
        else
            echo -e "${RED}❌ No API server available${NC}"
            echo ""
            
            # Try to start local API server
            if start_local_api_if_available; then
                api_url="$LOCAL_API_URL"
                api_type="Local Development (started)"
            else
                echo -e "${RED}❌ Cannot proceed without an available API server${NC}"
                exit 1
            fi
        fi
    fi
    
    # Display configuration
    display_api_info "$api_url" "$api_type"
    
    # Configure environment
    configure_api_environment "$api_url" "$api_type"
    
    # Start the demo application
    echo -e "${BLUE}🎯 Starting flows-app-demo...${NC}"
    echo -e "${YELLOW}💡 Press Ctrl+C to stop${NC}"
    echo ""

    pnpm dev
}

# Run main function with all arguments
main "$@"
