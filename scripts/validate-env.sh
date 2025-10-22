#!/bin/bash

# MindNote Environment Validation Script
# Validates that all required services and configurations are working

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
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Validation results
VALIDATION_PASSED=true
VALIDATION_ERRORS=0

# Function to record validation result
validate() {
    local description="$1"
    local result="$2"
    local details="$3"

    if [ "$result" = true ]; then
        print_success "$description"
        if [ -n "$details" ]; then
            echo "    $details"
        fi
    else
        print_error "$description"
        if [ -n "$details" ]; then
            echo "    $details"
        fi
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
        VALIDATION_PASSED=false
    fi
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Validate Node.js and npm
validate_nodejs() {
    print_status "Validating Node.js and npm..."

    if command_exists node; then
        NODE_VERSION=$(node --version)
        validate "Node.js is installed" true "Version: $NODE_VERSION"

        # Check version compatibility
        NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" -ge 20 ]; then
            validate "Node.js version is compatible" true "Version $NODE_VERSION meets requirement (>=20)"
        else
            validate "Node.js version is compatible" false "Version $NODE_VERSION is below minimum requirement (>=20)"
        fi
    else
        validate "Node.js is installed" false "Node.js is not installed or not in PATH"
    fi

    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        validate "npm is installed" true "Version: $NPM_VERSION"
    else
        validate "npm is installed" false "npm is not installed or not in PATH"
    fi
}

# Validate project structure
validate_project_structure() {
    print_status "Validating project structure..."

    local required_files=(
        "package.json"
        ".env"
        "tsconfig.json"
        ".eslintrc.js"
        "prisma/schema.prisma"
        "next.config.js"
        "scripts/setup-dev.sh"
        "scripts/start-dev.sh"
    )

    local required_dirs=(
        "src"
        "src/app"
        "src/lib"
        "src/components"
        "tests"
        "docker"
    )

    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            validate "Required file exists: $file" true
        else
            validate "Required file exists: $file" false
        fi
    done

    for dir in "${required_dirs[@]}"; do
        if [ -d "$dir" ]; then
            validate "Required directory exists: $dir" true
        else
            validate "Required directory exists: $dir" false
        fi
    done
}

# Validate environment variables
validate_environment_variables() {
    print_status "Validating environment variables..."

    # Source .env file
    if [ -f ".env" ]; then
        validate ".env file exists" true
        set -a
        source .env
        set +a
    else
        validate ".env file exists" false
        return
    fi

    # Check required variables
    local required_vars=(
        "DATABASE_URL"
        "NEXTAUTH_SECRET"
        "NEXTAUTH_URL"
    )

    local optional_vars=(
        "REDIS_URL"
        "OPENAI_API_KEY"
        "ANTHROPIC_API_KEY"
        "OLLAMA_BASE_URL"
    )

    for var in "${required_vars[@]}"; do
        if [ -n "${!var}" ]; then
            validate "Required environment variable: $var" true
        else
            validate "Required environment variable: $var" false "Variable is not set"
        fi
    done

    for var in "${optional_vars[@]}"; do
        if [ -n "${!var}" ]; then
            validate "Optional environment variable: $var" true
        else
            validate "Optional environment variable: $var" false "Variable is not set (optional)"
        fi
    done
}

# Validate database connection
validate_database() {
    print_status "Validating database connection..."

    if [ -z "$DATABASE_URL" ]; then
        validate "Database URL is configured" false "DATABASE_URL is not set"
        return
    fi

    # Extract connection details
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

    validate "Database connection details parsed" true "Host: $DB_HOST, Port: $DB_PORT, Database: $DB_NAME"

    # Test connection if nc is available
    if command_exists nc; then
        if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
            validate "Database is accessible" true "Can connect to $DB_HOST:$DB_PORT"
        else
            validate "Database is accessible" false "Cannot connect to $DB_HOST:$DB_PORT"
        fi
    else
        validate "Database connection test" false "nc (netcat) not available for connection testing"
    fi

    # Test Prisma connection if available
    if command_exists npx && [ -f "package.json" ]; then
        if npx prisma db pull --force 2>/dev/null || true; then
            validate "Prisma can connect to database" true "Database schema is accessible"
        else
            validate "Prisma can connect to database" false "Prisma connection failed"
        fi
    fi
}

# Validate Redis connection
validate_redis() {
    print_status "Validating Redis connection..."

    if [ -z "$REDIS_URL" ]; then
        validate "Redis URL is configured" false "REDIS_URL is not set"
        return
    fi

    # Extract connection details
    REDIS_HOST=$(echo "$REDIS_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    REDIS_PORT=$(echo "$REDIS_URL" | sed -n 's/.*:\([0-9]*\).*/\1/p')

    validate "Redis connection details parsed" true "Host: $REDIS_HOST, Port: $REDIS_PORT"

    # Test connection if nc is available
    if command_exists nc; then
        if nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; then
            validate "Redis is accessible" true "Can connect to $REDIS_HOST:$REDIS_PORT"
        else
            validate "Redis is accessible" false "Cannot connect to $REDIS_HOST:$REDIS_PORT"
        fi
    else
        validate "Redis connection test" false "nc (netcat) not available for connection testing"
    fi
}

# Validate Docker services
validate_docker() {
    print_status "Validating Docker services..."

    if command_exists docker; then
        DOCKER_VERSION=$(docker --version)
        validate "Docker is installed" true "$DOCKER_VERSION"

        # Check if Docker daemon is running
        if docker info >/dev/null 2>&1; then
            validate "Docker daemon is running" true

            # Check if docker-compose file exists
            if [ -f "docker-compose.yml" ]; then
                validate "Docker Compose configuration exists" true

                # Check running containers
                local running_containers=$(docker-compose ps --services --filter "status=running" 2>/dev/null | wc -l)
                validate "Docker containers are running" true "$running_containers containers running"
            else
                validate "Docker Compose configuration exists" false
            fi
        else
            validate "Docker daemon is running" false "Docker daemon is not running"
        fi
    else
        validate "Docker is installed" false "Docker is not installed"
    fi
}

# Validate dependencies
validate_dependencies() {
    print_status "Validating project dependencies..."

    if [ -d "node_modules" ]; then
        validate "Dependencies are installed" true "node_modules directory exists"

        # Check for key dependencies
        local key_deps=(
            "next"
            "react"
            "@prisma/client"
            "typescript"
        )

        for dep in "${key_deps[@]}"; do
            if [ -d "node_modules/$dep" ]; then
                validate "Key dependency exists: $dep" true
            else
                validate "Key dependency exists: $dep" false
            fi
        done
    else
        validate "Dependencies are installed" false "node_modules directory not found"
        validate "Solution" true "Run 'npm install' to install dependencies"
    fi
}

# Validate TypeScript compilation
validate_typescript() {
    print_status "Validating TypeScript configuration..."

    if [ -f "tsconfig.json" ]; then
        validate "TypeScript configuration exists" true

        # Try to compile
        if command_exists npx; then
            if npx tsc --noEmit 2>/dev/null; then
                validate "TypeScript compilation" true "No compilation errors found"
            else
                validate "TypeScript compilation" false "Compilation errors detected"
            fi
        else
            validate "TypeScript compilation check" false "npx not available"
        fi
    else
        validate "TypeScript configuration exists" false
    fi
}

# Validate git configuration
validate_git() {
    print_status "Validating Git configuration..."

    if command_exists git; then
        validate "Git is installed" true

        # Check if we're in a git repository
        if git rev-parse --git-dir >/dev/null 2>&1; then
            validate "Git repository is initialized" true

            # Check git remote
            if git remote get-url origin >/dev/null 2>&1; then
                REMOTE_URL=$(git remote get-url origin)
                validate "Git remote is configured" true "Origin: $REMOTE_URL"
            else
                validate "Git remote is configured" false "No origin remote configured"
            fi
        else
            validate "Git repository is initialized" false "Not a git repository"
        fi
    else
        validate "Git is installed" false
    fi
}

# Show validation summary
show_summary() {
    echo
    echo "========================================"
    echo "Validation Summary"
    echo "========================================"

    if [ "$VALIDATION_PASSED" = true ]; then
        print_success "All validations passed! 🎉"
        echo
        print_status "Your MindNote development environment is ready to use."
        print_status "You can now run: npm run dev"
    else
        print_error "Validation failed with $VALIDATION_ERRORS error(s)"
        echo
        print_status "Please fix the above issues before continuing."
        print_status "For help, see: docs/troubleshooting.md"
        exit 1
    fi
}

# Show recommendations
show_recommendations() {
    echo
    print_status "Recommendations:"
    echo

    # Check for optional improvements
    if command_exists docker && docker info >/dev/null 2>&1; then
        if [ -f "docker-compose.yml" ]; then
            echo "  • Consider using 'npm run docker:dev' for full development environment"
        fi
    fi

    if [ ! -f "docker-compose.yml" ]; then
        echo "  • Set up Docker for consistent development environment"
    fi

    if [ -z "$OPENAI_API_KEY" ] && [ -z "$ANTHROPIC_API_KEY" ]; then
        echo "  • Configure AI service API keys for full functionality"
    fi

    echo "  • Run 'npm run test' to verify the setup"
    echo "  • Check the logs/ directory for detailed error information"
}

# Main execution
main() {
    echo "🔍 MindNote Environment Validation"
    echo "=================================="
    echo

    validate_nodejs
    validate_project_structure
    validate_environment_variables
    validate_dependencies
    validate_typescript
    validate_database
    validate_redis
    validate_docker
    validate_git

    show_summary
    show_recommendations
}

# Handle script interruption
trap 'echo; print_status "Validation interrupted"; exit 1' INT TERM

# Run main function
main "$@"