#!/bin/bash

# MindNote Development Environment Setup Script
# This script sets up the complete development environment for MindNote

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
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

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to detect OS
detect_os() {
    case "$(uname -s)" in
        Darwin*)    echo "macos";;
        Linux*)     echo "linux";;
        CYGWIN*|MINGW*|MSYS*) echo "windows";;
        *)          echo "unknown";;
    esac
}

# Validate prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."

    local os=$(detect_os)
    print_status "Detected OS: $os"

    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version)
        print_success "Node.js found: $NODE_VERSION"

        # Check if version is compatible
        if [[ "$NODE_VERSION" < "v20" ]]; then
            print_error "Node.js version 20 or higher is required. Current: $NODE_VERSION"
            exit 1
        fi
    else
        print_error "Node.js is not installed. Please install Node.js 20 or higher."
        exit 1
    fi

    # Check npm
    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        print_success "npm found: $NPM_VERSION"
    else
        print_error "npm is not installed."
        exit 1
    fi

    # Check Git
    if command_exists git; then
        GIT_VERSION=$(git --version)
        print_success "Git found: $GIT_VERSION"
    else
        print_error "Git is not installed. Please install Git."
        exit 1
    fi

    # Check Docker (optional but recommended)
    if command_exists docker; then
        DOCKER_VERSION=$(docker --version)
        print_success "Docker found: $DOCKER_VERSION"

        if ! docker info >/dev/null 2>&1; then
            print_warning "Docker is installed but not running. Please start Docker."
        fi
    else
        print_warning "Docker is not installed. Docker is recommended for full development environment."
    fi

    # Check Docker Compose
    if command_exists docker-compose || docker compose version >/dev/null 2>&1; then
        print_success "Docker Compose found"
    else
        print_warning "Docker Compose is not installed."
    fi
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."

    local directories=(
        "logs"
        "src/app/api/auth"
        "src/app/api/notes"
        "src/app/api/ai"
        "src/app/api/admin"
        "src/components/ui"
        "src/components/forms"
        "src/components/charts"
        "src/components/layout"
        "src/lib/db"
        "src/lib/auth"
        "src/lib/utils"
        "src/lib/cache"
        "src/lib/ai"
        "src/hooks"
        "src/types"
        "src/styles"
        "tests/unit"
        "tests/integration"
        "tests/e2e"
        "tests/mocks"
        "tests/fixtures"
        "docs/api"
        "docs/deployment"
        "docs/development"
        "docs/architecture"
        "monitoring/prometheus"
        "monitoring/grafana"
        "ai-services/local/ollama"
        "ai-services/local/models"
        "ai-services/cloud/openai"
        "ai-services/cloud/anthropic"
        "ai-services/routing"
    )

    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_status "Created directory: $dir"
        fi
    done

    print_success "All necessary directories created"
}

# Setup environment configuration
setup_environment() {
    print_status "Setting up environment configuration..."

    # Copy .env.example to .env if it doesn't exist
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success "Created .env from .env.example"
            print_warning "Please review and update .env with your specific configuration"
        else
            print_error ".env.example file not found"
            exit 1
        fi
    else
        print_status ".env file already exists, skipping creation"
    fi

    # Generate a random NEXTAUTH_SECRET if not set
    if ! grep -q "NEXTAUTH_SECRET=" .env || grep -q "your-super-secret-key-here" .env; then
        SECRET=$(openssl rand -base64 32 2>/dev/null || date +%s | sha256sum | base64 | head -c 32)
        if command_exists sed; then
            sed -i.bak "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=\"$SECRET\"/" .env
            rm -f .env.bak
            print_success "Generated NEXTAUTH_SECRET"
        fi
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing project dependencies..."

    if [ -f "package.json" ]; then
        npm ci
        print_success "Dependencies installed successfully"
    else
        print_error "package.json not found"
        exit 1
    fi
}

# Setup database
setup_database() {
    print_status "Setting up database..."

    # Check if Docker is available
    if command_exists docker && docker info >/dev/null 2>&1; then
        print_status "Starting database services with Docker..."

        if [ -f "docker-compose.dev.yml" ]; then
            docker-compose -f docker-compose.dev.yml up -d postgres redis
            print_success "Database services started"

            # Wait for services to be ready
            print_status "Waiting for database services to be ready..."
            sleep 10

            # Generate Prisma client
            print_status "Generating Prisma client..."
            npm run db:generate

            # Run database migrations
            print_status "Running database migrations..."
            npm run db:migrate

            print_success "Database setup completed"
        else
            print_warning "docker-compose.dev.yml not found"
        fi
    else
        print_warning "Docker not available. Please setup PostgreSQL and Redis manually."
        print_status "After setup, run: npm run db:generate && npm run db:migrate"
    fi
}

# Setup Git hooks
setup_git_hooks() {
    print_status "Setting up Git hooks..."

    if command_exists npx && [ -f "package.json" ]; then
        # Initialize Husky if not already done
        if [ ! -d ".husky" ]; then
            npx husky init
            print_success "Initialized Husky"
        fi

        # Add pre-commit hook if it doesn't exist
        if [ ! -f ".husky/pre-commit" ]; then
            echo "npx lint-staged" > .husky/pre-commit
            chmod +x .husky/pre-commit
            print_success "Added pre-commit hook"
        fi

        print_success "Git hooks setup completed"
    else
        print_warning "Could not setup Git hooks (npx not available or package.json missing)"
    fi
}

# Validate setup
validate_setup() {
    print_status "Validating setup..."

    local errors=0

    # Check critical files
    local critical_files=(
        "package.json"
        ".env"
        "tsconfig.json"
        ".eslintrc.js"
        "prisma/schema.prisma"
    )

    for file in "${critical_files[@]}"; do
        if [ -f "$file" ]; then
            print_success "✓ $file exists"
        else
            print_error "✗ $file missing"
            ((errors++))
        fi
    done

    # Check critical directories
    local critical_dirs=(
        "src"
        "tests"
        "scripts"
        "docker"
    )

    for dir in "${critical_dirs[@]}"; do
        if [ -d "$dir" ]; then
            print_success "✓ $dir exists"
        else
            print_error "✗ $dir missing"
            ((errors++))
        fi
    done

    # Check if npm scripts work
    if npm run type-check >/dev/null 2>&1; then
        print_success "✓ TypeScript compilation successful"
    else
        print_error "✗ TypeScript compilation failed"
        ((errors++))
    fi

    if [ $errors -eq 0 ]; then
        print_success "Setup validation passed!"
    else
        print_error "Setup validation failed with $errors errors"
        return 1
    fi
}

# Show next steps
show_next_steps() {
    print_success "🎉 MindNote development environment setup completed!"
    echo
    print_status "Next steps:"
    echo "1. Review and update .env file with your configuration"
    echo "2. Start the development server: npm run dev"
    echo "3. Visit http://localhost:3000 in your browser"
    echo "4. (Optional) Start all services: npm run docker:dev"
    echo
    print_status "Available commands:"
    echo "- npm run dev          - Start development server"
    echo "- npm run build        - Build for production"
    echo "- npm run test         - Run tests"
    echo "- npm run lint         - Run linting"
    echo "- npm run db:studio    - Open Prisma Studio"
    echo "- npm run validate:env - Validate environment"
    echo
    print_status "For troubleshooting, see: docs/troubleshooting.md"
}

# Main execution
main() {
    echo "🚀 MindNote Development Environment Setup"
    echo "========================================"
    echo

    # Parse command line arguments
    SKIP_DEPS=false
    SKIP_DB=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-deps)
                SKIP_DEPS=true
                shift
                ;;
            --skip-db)
                SKIP_DB=true
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --skip-deps  Skip dependency installation"
                echo "  --skip-db    Skip database setup"
                echo "  --help       Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Run setup steps
    check_prerequisites
    create_directories
    setup_environment

    if [ "$SKIP_DEPS" = false ]; then
        install_dependencies
    else
        print_status "Skipping dependency installation (--skip-deps)"
    fi

    if [ "$SKIP_DB" = false ]; then
        setup_database
    else
        print_status "Skipping database setup (--skip-db)"
    fi

    setup_git_hooks
    validate_setup
    show_next_steps
}

# Handle script interruption
trap 'print_error "Setup interrupted"; exit 1' INT TERM

# Run main function with all arguments
main "$@"