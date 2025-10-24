# MindNote Development Environment Troubleshooting Guide

This guide helps you resolve common issues when setting up and working with the MindNote development
environment.

## Table of Contents

- [🔐 Security Setup](#security-setup)
- [Quick Diagnostics](#quick-diagnostics)
- [Common Issues](#common-issues)
- [Service-Specific Problems](#service-specific-problems)
- [Performance Issues](#performance-issues)
- [Cross-Platform Issues](#cross-platform-issues)
- [Getting Help](#getting-help)

## 🔐 Security Setup

### Generate Secure Secrets

Before starting development, generate secure secrets:

```bash
# Generate all security secrets
./scripts/generate-secrets.sh --all

# Or generate specific secrets
./scripts/generate-secrets.sh --jwt
./scripts/generate-secrets.sh --db
./scripts/generate-secrets.sh --redis
```

### Security Best Practices

- **Never commit `.env` file** to version control
- **Use strong passwords** (minimum 16 characters)
- **Rotate secrets regularly** for production environments
- **Use different secrets** for development and production

### Common Security Issues

#### Missing Environment Variables

**Problem**: `NEXTAUTH_SECRET`, `POSTGRES_PASSWORD`, or `REDIS_PASSWORD` are empty

**Solution**:

```bash
# Generate all required secrets
./scripts/generate-secrets.sh --all

# Validate the configuration
./scripts/validate-env.sh
```

#### Weak Passwords

**Problem**: Using default or weak passwords

**Solution**:

```bash
# Generate new secure passwords
openssl rand -base64 32  # For JWT secret
openssl rand -base64 24  # For database passwords
```

#### Docker Security Issues

**Problem**: Services exposed to external network

**Solution**: The updated Docker configuration binds services to localhost only:

```yaml
# Services now bind to localhost only
ports:
  - '127.0.0.1:5432:5432' # PostgreSQL
  - '127.0.0.1:6379:6379' # Redis
  - '127.0.0.1:11434:11434' # Ollama

# Internal network for database services
networks:
  mindnote-internal:
    internal: true
```

## Quick Diagnostics

### Run Environment Validation

First, run the environment validation script to get a comprehensive check:

```bash
npm run validate:env
```

Or run it directly:

```bash
./scripts/validate-env.sh
```

### Check Logs

Check the application logs for detailed error information:

```bash
# View development server logs
tail -f logs/combined.log

# View error logs only
tail -f logs/error.log

# View recent logs
tail -n 50 logs/combined.log
```

### Health Check Endpoints

Test the health check endpoints to identify specific issues:

```bash
# Overall health check
curl http://localhost:3000/api/health

# Database health
curl http://localhost:3000/api/health/database

# Redis health
curl http://localhost:3000/api/health/redis

# AI services health
curl http://localhost:3000/api/health/ai
```

## Common Issues

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solutions**:

1. **Kill the process using the port**:

   ```bash
   # Find the process
   lsof -ti:3000

   # Kill it
   kill -9 $(lsof -ti:3000)
   ```

2. **Use a different port**:

   ```bash
   PORT=3001 npm run dev
   ```

3. **Let Next.js find an available port**:
   ```bash
   npm run dev -- -p 0
   ```

### Dependencies Not Installed

**Problem**: `Cannot find module '...'` or `npm ERR! code ENOENT`

**Solutions**:

1. **Clean and reinstall dependencies**:

   ```bash
   # Remove node_modules and package-lock.json
   rm -rf node_modules package-lock.json

   # Clear npm cache
   npm cache clean --force

   # Reinstall
   npm install
   ```

2. **Check Node.js version**:

   ```bash
   node --version  # Should be v20 or higher
   ```

3. **Use npm ci for consistent installs**:
   ```bash
   npm ci
   ```

### Environment Variables Missing

**Problem**: Application fails to start due to missing environment variables

**Solutions**:

1. **Copy the environment template**:

   ```bash
   cp .env.example .env
   ```

2. **Edit the .env file** and ensure these variables are set:

   ```bash
   DATABASE_URL=postgresql://mindnote:dev_password@localhost:5432/mindnote_dev
   NEXTAUTH_SECRET=your-secret-key-here
   NEXTAUTH_URL=http://localhost:3000
   REDIS_URL=redis://localhost:6379
   ```

3. **Regenerate NEXTAUTH_SECRET**:

   ```bash
   # Generate a new secret
   openssl rand -base64 32

   # Or use the setup script
   ./scripts/setup-dev.sh
   ```

### Database Connection Issues

**Problem**: `ECONNREFUSED` or timeout errors when connecting to database

**Solutions**:

1. **Database authentication failed**:

   ```bash
   # Check if database password is set
   if [ -z "$POSTGRES_PASSWORD" ]; then
     echo "Error: POSTGRES_PASSWORD not set"
     ./scripts/generate-secrets.sh --db
   fi
   ```

2. **Database not running**:

   ```bash
   # Check Docker containers
   docker-compose ps postgres

   # Start database services
   docker-compose up postgres redis ollama

   # Check logs
   docker-compose logs postgres
   ```

3. **Database schema not created**:

   ```bash
   # Generate Prisma client
   npx prisma generate

   # Run database migrations
   npx prisma migrate dev

   # Reset database if needed
   npx prisma migrate reset
   ```

4. **Vector search not working**:

   ```bash
   # Check if pgvector extension is enabled
   docker-compose exec postgres psql -U mindnote -d mindnote_dev -c "SELECT * FROM pg_extension WHERE extname = 'vector';"

   # If not installed, reinstall with vector support
   docker-compose down
   docker-compose up postgres
   ```

5. **Check if PostgreSQL is running**:

   ```bash
   # With Docker
   docker-compose ps postgres

   # Local installation
   pg_isready -h localhost -p 5432
   ```

6. **Start the database services**:

   ```bash
   # With Docker
   npm run docker:dev

   # Or specifically
   docker-compose up postgres redis
   ```

7. **Verify database URL format**:

   ```bash
   # Should be: postgresql://user:password@host:port/database
   echo $DATABASE_URL
   ```

8. **Check database logs**:

   ```bash
   docker-compose logs postgres
   ```

9. **Reset database connection**:

   ```bash
   # Reset migrations
   npm run db:reset

   # Or recreate database
   npm run db:migrate:reset
   ```

### Redis Connection Issues

**Problem**: `ECONNREFUSED` when connecting to Redis

**Solutions**:

1. **Redis authentication failed**:

   ```bash
   # Check if Redis password is set
   if [ -z "$REDIS_PASSWORD" ]; then
     echo "Error: REDIS_PASSWORD not set"
     ./scripts/generate-secrets.sh --redis
   fi

   # Test with password
   redis-cli -a "$REDIS_PASSWORD" ping
   ```

2. **Redis not running**:

   ```bash
   # Check Docker containers
   docker-compose ps redis

   # Start Redis with security
   docker-compose up redis

   # Check logs
   docker-compose logs redis
   ```

3. **Check Redis URL format**:

   ```bash
   # Should be: redis://:password@host:port
   echo $REDIS_URL

   # Should include password
   grep -q "REDIS_PASSWORD" .env && echo "Password is set" || echo "Error: Redis password not configured"
   ```

4. **Clear Redis cache if corrupted**:

   ```bash
   # With Docker and password
   docker-compose exec redis redis-cli -a "$REDIS_PASSWORD" FLUSHALL

   # Local Redis
   redis-cli -a "$REDIS_PASSWORD" FLUSHALL
   ```

5. **Redis security commands disabled**:

   ```bash
   # Check if dangerous commands are disabled
   docker-compose exec redis redis-cli CONFIG GET rename-command

   # This should return empty or modified command names
   ```

## Service-Specific Problems

### Prisma Issues

**Problem**: Prisma commands fail or cannot connect to database

**Solutions**:

1. **Regenerate Prisma client**:

   ```bash
   npx prisma generate
   ```

2. **Reset database**:

   ```bash
   npx prisma migrate reset
   ```

3. **Check schema file**:

   ```bash
   # Validate schema syntax
   npx prisma validate
   ```

4. **Push schema to database**:
   ```bash
   npx prisma db push
   ```

### NextAuth.js Issues

**Problem**: Authentication not working or session issues

**Solutions**:

1. **Check NextAuth configuration**:

   ```bash
   # Verify NEXTAUTH_URL matches your development URL
   echo $NEXTAUTH_URL  # Should be http://localhost:3000
   ```

2. **Clear browser cookies**:
   - Open browser developer tools
   - Clear cookies for localhost
   - Refresh the page

3. **Check secret key**:
   ```bash
   # Should be a non-empty string
   echo $NEXTAUTH_SECRET
   ```

### AI Service Integration Issues

**Problem**: AI services not responding or API errors

**Solutions**:

1. **Check Ollama service**:

   ```bash
   # Check if Ollama is running
   curl http://localhost:11434/api/tags

   # Start Ollama
   docker-compose up ollama

   # Pull a model
   docker-compose exec ollama ollama pull llama2
   ```

2. **Verify API keys**:

   ```bash
   # Check environment variables
   echo $OPENAI_API_KEY
   echo $ANTHROPIC_API_KEY
   ```

3. **Test API connectivity**:
   ```bash
   # Test OpenAI
   curl -H "Authorization: Bearer $OPENAI_API_KEY" \
        https://api.openai.com/v1/models
   ```

### Docker Issues

**Problem**: Docker containers fail to start or connection issues

**Solutions**:

1. **Check Docker daemon**:

   ```bash
   docker info
   ```

2. **Rebuild containers**:

   ```bash
   docker-compose down
   docker-compose up --build
   ```

3. **Clear Docker cache**:

   ```bash
   docker system prune -a
   ```

4. **Check container logs**:

   ```bash
   docker-compose logs app
   docker-compose logs postgres
   docker-compose logs redis
   ```

5. **Reset Docker volumes**:
   ```bash
   docker-compose down -v
   docker-compose up
   ```

## Performance Issues

### Slow Development Server

**Solutions**:

1. **Increase Node.js memory limit**:

   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run dev
   ```

2. **Disable TypeScript strict mode temporarily**:

   ```bash
   # Edit tsconfig.json
   # Set "strict": false
   ```

3. **Clear Next.js cache**:

   ```bash
   rm -rf .next
   npm run dev
   ```

4. **Use Turbopack** (Next.js 15):
   ```bash
   npm run dev -- --turbo
   ```

### Database Query Performance

**Solutions**:

1. **Check slow queries**:

   ```bash
   # Enable query logging in PostgreSQL
   docker-compose exec postgres psql -U mindnote -d mindnote_dev -c "ALTER SYSTEM SET log_min_duration_statement = 100;"
   ```

2. **Add database indexes**:

   ```bash
   # Check missing indexes
   npx prisma db pull
   ```

3. **Use Redis for caching**:
   ```bash
   # Check Redis performance
   docker-compose exec redis redis-cli INFO stats
   ```

## Cross-Platform Issues

### Windows-Specific Issues

**Problems**:

- Path separator issues
- Permission problems
- Shell script compatibility

**Solutions**:

1. **Use Git Bash or WSL**:

   ```bash
   # Run scripts with Git Bash
   bash scripts/setup-dev.sh

   # Or use WSL
   wsl bash scripts/setup-dev.sh
   ```

2. **Check file permissions**:

   ```bash
   # In Git Bash
   chmod +x scripts/*.sh
   ```

3. **Use Windows-compatible commands**:
   ```powershell
   # In PowerShell
   npm run setup:dev
   ```

### macOS-Specific Issues

**Problems**:

- Gatekeeper blocking scripts
- Homebrew installation issues
- Port conflicts with system services

**Solutions**:

1. **Allow scripts to run**:

   ```bash
   # Remove quarantine flag
   xattr -d com.apple.quarantine scripts/setup-dev.sh
   ```

2. **Check Homebrew installation**:

   ```bash
   brew doctor
   brew update
   ```

3. **Use different ports if system services conflict**:
   ```bash
   PORT=3001 npm run dev
   ```

### Linux-Specific Issues

**Problems**:

- Package manager differences
- Permission denied errors
- Missing system dependencies

**Solutions**:

1. **Install system dependencies**:

   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install build-essential python3

   # CentOS/RHEL
   sudo yum install gcc-c++ python3
   ```

2. **Fix permission issues**:

   ```bash
   # Fix npm permissions
   sudo chown -R $(whoami) ~/.npm
   ```

3. **Check node installation**:
   ```bash
   # Use nvm for Node.js management
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 20
   nvm use 20
   ```

## Getting Help

### Check Documentation

1. **Read the setup guide**: `docs/development/setup.md`
2. **API documentation**: `docs/api/`
3. **Architecture guide**: `docs/architecture/`

### Debug Mode

Enable debug logging for more detailed information:

```bash
# Set debug level
export LOG_LEVEL=debug

# Run with verbose output
npm run dev -- --verbose
```

### Report Issues

If you're still having problems:

1. **Collect diagnostic information**:

   ```bash
   # System information
   npm run validate:env > diagnostic-info.txt

   # Recent logs
   tail -n 100 logs/combined.log >> diagnostic-info.txt

   # Package versions
   npm list >> diagnostic-info.txt
   ```

2. **Check GitHub Issues**: Search for similar problems
3. **Create a new issue**: Include diagnostic information

### Community Support

- **GitHub Discussions**: Ask questions and share solutions
- **Discord/Slack**: Join the community chat (if available)
- **Stack Overflow**: Tag questions with `mindnote`

---

**Remember**: Most issues can be resolved by running the setup script again:

```bash
./scripts/setup-dev.sh
```

This will recreate the environment and fix most configuration problems.
