#!/bin/bash

# MindNote Development Server Startup Script
# This script starts the development server with proper environment validation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
check_project_root() {
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Please run this script from the project root."
        exit 1
    fi
}

# Validate environment
validate_environment() {
    print_status "Validating environment..."

    # Check if .env file exists
    if [ ! -f ".env" ]; then
        print_error ".env file not found. Please run ./scripts/setup-dev.sh first."
        exit 1
    fi

    # Source environment variables
    set -a
    source .env
    set +a

    # Check required environment variables
    local required_vars=(
        "DATABASE_URL"
        "NEXTAUTH_SECRET"
        "NEXTAUTH_URL"
    )

    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi

    print_success "Environment validation passed"
}

# Check database connection
check_database() {
    print_status "Checking database connection..."

    # Check if PostgreSQL is accessible
    if command_exists nc; then
        # Extract host and port from DATABASE_URL
        DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
        DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

        if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
            print_success "Database is accessible"
        else
            print_warning "Database is not accessible at $DB_HOST:$DB_PORT"
            print_status "You may need to start the database services:"
            echo "  npm run docker:dev"
            echo "  or"
            echo "  docker-compose up postgres redis"
        fi
    fi
}

# Check Redis connection
check_redis() {
    print_status "Checking Redis connection..."

    if [ -n "$REDIS_URL" ]; then
        REDIS_HOST=$(echo "$REDIS_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
        REDIS_PORT=$(echo "$REDIS_URL" | sed -n 's/.*:\([0-9]*\).*/\1/p')

        if command_exists nc; then
            if nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; then
                print_success "Redis is accessible"
            else
                print_warning "Redis is not accessible at $REDIS_HOST:$REDIS_PORT"
            fi
        fi
    fi
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
check_dependencies() {
    print_status "Checking dependencies..."

    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version)
        print_success "Node.js: $NODE_VERSION"
    else
        print_error "Node.js is not installed"
        exit 1
    fi

    # Check npm
    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        print_success "npm: $NPM_VERSION"
    else
        print_error "npm is not installed"
        exit 1
    fi

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_warning "node_modules not found. Installing dependencies..."
        npm install
    fi

    # Check if Prisma client is generated
    if [ ! -d "node_modules/.prisma" ]; then
        print_status "Generating Prisma client..."
        npm run db:generate
    fi
}

# Check for available ports
check_ports() {
    print_status "Checking available ports..."

    local port=3000
    if command_exists lsof; then
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_warning "Port $port is already in use"
            print_status "The application will try to use the next available port"
        else
            print_success "Port $port is available"
        fi
    fi
}

# Start development server
start_server() {
    print_status "Starting MindNote development server..."
    echo
    print_success "🚀 MindNote is starting..."
    echo
    print_status "Local:    http://localhost:3000"
    print_status "Network:  http://$(hostname -I | cut -d' ' -f1):3000"
    echo
    print_status "Press Ctrl+C to stop the server"
    echo

    # Start the development server
    if [ "$1" = "--verbose" ]; then
        npm run dev -- --verbose
    else
        npm run dev
    fi
}

# Show useful information
show_info() {
    echo
    print_status "Useful commands:"
    echo "  npm run test          - Run tests"
    echo "  npm run lint          - Run linting"
    echo "  npm run type-check    - Check TypeScript types"
    echo "  npm run db:studio     - Open Prisma Studio"
    echo "  npm run docker:dev    - Start with Docker"
    echo
    print_status "Troubleshooting:"
    echo "  - If database connection fails, check your DATABASE_URL in .env"
    echo "  - If port 3000 is in use, the app will automatically use the next available port"
    echo "  - Check logs in the logs/ directory for detailed error information"
    echo
}

# Handle script interruption
cleanup() {
    echo
    print_status "Shutting down development server..."
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Parse command line arguments
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --verbose, -v    Enable verbose output"
            echo "  --help, -h       Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Main execution
main() {
    echo "🎯 MindNote Development Server"
    echo "==============================="
    echo

    check_project_root
    validate_environment
    check_dependencies
    check_ports
    check_database
    check_redis
    show_info

    if [ "$VERBOSE" = true ]; then
        start_server --verbose
    else
        start_server
    fi
}

# Run main function
main "$@"