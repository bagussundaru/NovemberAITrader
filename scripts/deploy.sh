#!/bin/bash

# Live Trading Bot Deployment Script
# Requirements: 7.3, 7.4, 7.5

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-production}"
CONTAINER_NAME="${CONTAINER_NAME:-live-trading-bot}"
IMAGE_NAME="${IMAGE_NAME:-live-trading-bot:latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check environment file
    if [[ ! -f "$PROJECT_DIR/.env.$DEPLOYMENT_ENV" ]]; then
        log_error "Environment file .env.$DEPLOYMENT_ENV not found"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Validate environment configuration
validate_environment() {
    log_info "Validating environment configuration..."
    
    # Source environment file
    set -a
    source "$PROJECT_DIR/.env.$DEPLOYMENT_ENV"
    set +a
    
    # Check required variables
    required_vars=(
        "DATABASE_URL"
        "NEBIUS_JWT_TOKEN"
        "GATE_API_KEY"
        "GATE_API_SECRET"
    )
    
    missing_vars=()
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        exit 1
    fi
    
    log_success "Environment configuration validated"
}

# Build Docker image
build_image() {
    log_info "Building Docker image..."
    
    cd "$PROJECT_DIR"
    
    # Build the image
    docker build \
        --target production \
        --tag "$IMAGE_NAME" \
        --build-arg NODE_ENV="$DEPLOYMENT_ENV" \
        .
    
    log_success "Docker image built successfully"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    cd "$PROJECT_DIR"
    
    # Start database if not running
    docker-compose up -d postgres
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    sleep 10
    
    # Run migrations
    docker-compose exec -T postgres psql -U trading_user -d trading_bot -c "SELECT 1;" > /dev/null 2>&1
    if [[ $? -eq 0 ]]; then
        # Run Prisma migrations
        npx prisma migrate deploy
        log_success "Database migrations completed"
    else
        log_error "Database is not ready"
        exit 1
    fi
}

# Deploy application
deploy_application() {
    log_info "Deploying application..."
    
    cd "$PROJECT_DIR"
    
    # Stop existing containers
    docker-compose down
    
    # Start all services
    docker-compose up -d
    
    # Wait for application to be ready
    log_info "Waiting for application to start..."
    sleep 30
    
    # Health check
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        log_success "Application deployed successfully"
    else
        log_error "Application health check failed"
        docker-compose logs trading-bot
        exit 1
    fi
}

# Backup current deployment
backup_deployment() {
    log_info "Creating deployment backup..."
    
    BACKUP_DIR="$PROJECT_DIR/backups/deployment-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    if docker-compose ps postgres | grep -q "Up"; then
        docker-compose exec -T postgres pg_dump -U trading_user trading_bot > "$BACKUP_DIR/database.sql"
        log_success "Database backup created"
    fi
    
    # Backup configuration
    cp "$PROJECT_DIR/.env.$DEPLOYMENT_ENV" "$BACKUP_DIR/"
    cp "$PROJECT_DIR/docker-compose.yml" "$BACKUP_DIR/"
    
    log_success "Deployment backup created at $BACKUP_DIR"
}

# Rollback deployment
rollback_deployment() {
    log_warning "Rolling back deployment..."
    
    cd "$PROJECT_DIR"
    
    # Stop current deployment
    docker-compose down
    
    # Find latest backup
    LATEST_BACKUP=$(find "$PROJECT_DIR/backups" -name "deployment-*" -type d | sort -r | head -n1)
    
    if [[ -n "$LATEST_BACKUP" ]]; then
        log_info "Rolling back to backup: $LATEST_BACKUP"
        
        # Restore configuration
        cp "$LATEST_BACKUP/.env.$DEPLOYMENT_ENV" "$PROJECT_DIR/"
        
        # Restore database
        if [[ -f "$LATEST_BACKUP/database.sql" ]]; then
            docker-compose up -d postgres
            sleep 10
            docker-compose exec -T postgres psql -U trading_user -d trading_bot < "$LATEST_BACKUP/database.sql"
        fi
        
        # Restart application
        docker-compose up -d
        
        log_success "Rollback completed"
    else
        log_error "No backup found for rollback"
        exit 1
    fi
}

# Show deployment status
show_status() {
    log_info "Deployment Status:"
    
    cd "$PROJECT_DIR"
    
    # Show container status
    docker-compose ps
    
    # Show application health
    echo ""
    log_info "Application Health:"
    if curl -s http://localhost:3000/api/health | jq -r '.status' 2>/dev/null; then
        curl -s http://localhost:3000/api/health | jq '.'
    else
        log_warning "Health check endpoint not responding"
    fi
    
    # Show logs
    echo ""
    log_info "Recent logs:"
    docker-compose logs --tail=20 trading-bot
}

# Show usage
show_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  deploy     - Full deployment (default)"
    echo "  build      - Build Docker image only"
    echo "  migrate    - Run database migrations only"
    echo "  backup     - Create deployment backup"
    echo "  rollback   - Rollback to previous deployment"
    echo "  status     - Show deployment status"
    echo "  help       - Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DEPLOYMENT_ENV - Deployment environment (default: production)"
    echo "  CONTAINER_NAME - Container name (default: live-trading-bot)"
    echo "  IMAGE_NAME     - Docker image name (default: live-trading-bot:latest)"
}

# Main execution
main() {
    local command="${1:-deploy}"
    
    case "$command" in
        "deploy")
            check_prerequisites
            validate_environment
            backup_deployment
            build_image
            run_migrations
            deploy_application
            show_status
            ;;
        "build")
            check_prerequisites
            build_image
            ;;
        "migrate")
            check_prerequisites
            validate_environment
            run_migrations
            ;;
        "backup")
            backup_deployment
            ;;
        "rollback")
            rollback_deployment
            ;;
        "status")
            show_status
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Trap errors and cleanup
trap 'log_error "Deployment failed"; exit 1' ERR

# Run main function
main "$@"