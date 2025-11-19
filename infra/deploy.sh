#!/bin/bash

# Script de déploiement automatisé pour TACE IT-ROOM
# Usage: ./deploy.sh [options]
# Options:
#   --no-build    Skip Docker build (use existing image)
#   --help        Show this help message

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
CONTAINER_NAME="tace-itroom"
IMAGE_NAME="infra-tace-itroom"

# Parse arguments
SKIP_BUILD=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-build)
            SKIP_BUILD=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --no-build    Skip Docker build (use existing image)"
            echo "  --help        Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Functions
print_step() {
    echo -e "\n${BLUE}==>${NC} ${GREEN}$1${NC}"
}

print_error() {
    echo -e "${RED}ERROR:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}WARNING:${NC} $1"
}

print_info() {
    echo -e "${BLUE}INFO:${NC} $1"
}

check_dependencies() {
    print_step "Vérification des dépendances..."

    if ! command -v docker &> /dev/null; then
        print_error "Docker n'est pas installé"
        exit 1
    fi

    print_info "Docker: $(docker --version)"
}

build_image() {
    if [ "$SKIP_BUILD" = true ]; then
        print_warning "Build ignoré (--no-build)"
        return
    fi

    print_step "Construction de l'image Docker..."
    cd "$SCRIPT_DIR"

    docker compose build

    if [ $? -eq 0 ]; then
        print_info "Image construite avec succès"
    else
        print_error "Échec de la construction de l'image"
        exit 1
    fi
}

stop_container() {
    print_step "Arrêt du conteneur existant..."
    cd "$SCRIPT_DIR"

    if docker ps -a | grep -q "$CONTAINER_NAME"; then
        docker compose down
        print_info "Conteneur arrêté"
    else
        print_info "Aucun conteneur à arrêter"
    fi
}

start_container() {
    print_step "Démarrage du nouveau conteneur..."
    cd "$SCRIPT_DIR"

    docker compose up -d

    if [ $? -eq 0 ]; then
        print_info "Conteneur démarré avec succès"
    else
        print_error "Échec du démarrage du conteneur"
        exit 1
    fi
}

check_health() {
    print_step "Vérification de l'état du conteneur..."

    # Wait a bit for container to start
    sleep 2

    if docker ps | grep -q "$CONTAINER_NAME"; then
        print_info "✓ Conteneur en cours d'exécution"

        # Get container IP
        CONTAINER_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$CONTAINER_NAME")
        print_info "✓ IP du conteneur: $CONTAINER_IP"

        # Show recent logs
        print_step "Derniers logs du conteneur:"
        docker logs "$CONTAINER_NAME" --tail 10

    else
        print_error "Le conteneur n'est pas en cours d'exécution"
        exit 1
    fi
}

cleanup_old_images() {
    print_step "Nettoyage des anciennes images Docker..."

    # Remove dangling images
    DANGLING=$(docker images -f "dangling=true" -q)
    if [ -n "$DANGLING" ]; then
        docker rmi $DANGLING 2>/dev/null || true
        print_info "Images obsolètes supprimées"
    else
        print_info "Aucune image obsolète à supprimer"
    fi
}

show_status() {
    print_step "État du déploiement:"
    echo ""
    docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    print_info "URL de production: https://tace.itroom.fr"
    echo ""
}

# Main deployment flow
main() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════╗"
    echo "║   Déploiement TACE IT-ROOM - Production       ║"
    echo "╚═══════════════════════════════════════════════╝"
    echo -e "${NC}"

    check_dependencies
    build_image
    stop_container
    start_container
    check_health
    cleanup_old_images
    show_status

    echo -e "\n${GREEN}✓ Déploiement terminé avec succès!${NC}\n"
}

# Run main function
main
