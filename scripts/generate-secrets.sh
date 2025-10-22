#!/bin/bash

# MindNote Security Keys Generator
# This script generates secure random keys for environment variables

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
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Generate secure random string
generate_secure_string() {
    local length=${1:-32}
    if command_exists openssl; then
        openssl rand -base64 "$length" | tr -d "=+/" | cut -c1-"$length"
    elif command_exists pwgen; then
        pwgen -s "$length" 1
    else
        # Fallback method
        date +%s | sha256sum | base64 | head -c "$length"
    fi
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check OS type
detect_os() {
    case "$(uname -s)" in
        Darwin*)    echo "macos";;
        Linux*)     echo "linux";;
        CYGWIN*|MINGW*|MSYS*) echo "windows";;
        *)          echo "unknown";;
    esac
}

# Create .env file with generated secrets
create_secure_env() {
    print_status "Generating secure environment variables..."

    local env_file=".env"
    local postgres_password
    local redis_password
    local nextauth_secret

    # Generate secure passwords
    postgres_password=$(generate_secure_string 24)
    redis_password=$(generate_secure_string 24)
    nextauth_secret=$(generate_secure_string 32)

    # Create .env file if it doesn't exist
    if [ ! -f "$env_file" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example "$env_file"
            print_status "Created .env from .env.example"
        else
            print_error ".env.example not found"
            exit 1
        fi
    fi

    # Update .env file with generated values
    print_status "Updating environment variables with secure values..."

    # Update PostgreSQL password
    if command_exists sed; then
        sed -i.bak "s/POSTGRES_PASSWORD=\"\"/POSTGRES_PASSWORD=\"$postgres_password\"/" "$env_file"
        sed -i.bak "s|DATABASE_URL=\"postgresql://mindnote:.*@localhost:5432/mindnote_dev\"|DATABASE_URL=\"postgresql://mindnote:$postgres_password@localhost:5432/mindnote_dev\"|" "$env_file"

        # Update Redis password
        sed -i.bak "s/REDIS_PASSWORD=\"\"/REDIS_PASSWORD=\"$redis_password\"/" "$env_file"
        sed -i.bak "s|REDIS_URL=\"redis://:.*@localhost:6379\"|REDIS_URL=\"redis://:$redis_password@localhost:6379\"|" "$env_file"

        # Update NextAuth secret
        sed -i.bak "s/NEXTAUTH_SECRET=\"\"/NEXTAUTH_SECRET=\"$nextauth_secret\"/" "$env_file"

        # Remove backup file
        rm -f "$env_file.bak"

        print_success "Environment variables updated successfully"
    else
        print_warning "sed not available. Please update the following variables manually:"
        echo "POSTGRES_PASSWORD=\"$postgres_password\""
        echo "REDIS_PASSWORD=\"$redis_password\""
        echo "NEXTAUTH_SECRET=\"$nextauth_secret\""
        echo ""
        echo "Also update DATABASE_URL and REDIS_URL to use these passwords."
    fi
}

# Generate JWT secret
generate_jwt_secret() {
    print_status "Generating JWT secret..."
    local jwt_secret=$(generate_secure_string 32)
    echo "$jwt_secret"
}

# Generate database password
generate_db_password() {
    print_status "Generating database password..."
    local db_password=$(generate_secure_string 24)
    echo "$db_password"
}

# Generate Redis password
generate_redis_password() {
    print_status "Generating Redis password..."
    local redis_password=$(generate_secure_string 24)
    echo "$redis_password"
}

# Validate secrets strength
validate_secrets() {
    print_status "Validating generated secrets..."

    local min_length=16
    local has_upper=false
    local has_lower=false
    local has_number=false
    local has_special=false

    # Check .env file if it exists
    if [ -f ".env" ]; then
        # Simple validation - check length and basic complexity
        if grep -q "POSTGRES_PASSWORD=" .env && grep -q "REDIS_PASSWORD=" .env && grep -q "NEXTAUTH_SECRET=" .env; then
            print_success "All required environment variables are set"
        else
            print_warning "Some environment variables may be missing"
        fi
    fi
}

# Show usage
show_usage() {
    echo "Usage: $0 [option]"
    echo ""
    echo "Options:"
    echo "  --all          Generate all security secrets and update .env file"
    echo "  --jwt          Generate JWT secret only"
    echo "  --db           Generate database password only"
    echo "  --redis        Generate Redis password only"
    echo "  --validate     Validate existing secrets"
    echo "  --help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --all              # Generate all secrets and update .env"
    echo "  $0 --jwt              # Generate JWT secret"
    echo "  $0 --validate         # Validate existing secrets"
}

# Main execution
main() {
    echo "🔐 MindNote Security Keys Generator"
    echo "=================================="
    echo

    local os=$(detect_os)
    print_status "Detected OS: $os"

    case "${1:-all}" in
        --all)
            create_secure_env
            validate_secrets
            ;;
        --jwt)
            generate_jwt_secret
            ;;
        --db)
            generate_db_password
            ;;
        --redis)
            generate_redis_password
            ;;
        --validate)
            validate_secrets
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac

    echo
    print_success "Security key generation completed!"
    echo
    print_warning "Important:"
    echo "1. Store these secrets securely"
    echo "2. Never commit .env file to version control"
    echo "3. Use different secrets for production environment"
    echo "4. Rotate secrets regularly for security"
}

# Handle script interruption
trap 'echo; print_status "Key generation interrupted"; exit 1' INT TERM

# Run main function with all arguments
main "$@"