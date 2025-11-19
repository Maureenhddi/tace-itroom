#!/bin/bash

# Script de rollback pour TACE IT-ROOM
# Usage: ./rollback.sh [image_id]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CONTAINER_NAME="tace-itroom"

print_step() {
    echo -e "\n${BLUE}==>${NC} ${GREEN}$1${NC}"
}

print_error() {
    echo -e "${RED}ERROR:${NC} $1"
}

print_info() {
    echo -e "${BLUE}INFO:${NC} $1"
}

echo -e "${YELLOW}"
echo "╔═══════════════════════════════════════════════╗"
echo "║         Rollback TACE IT-ROOM                 ║"
echo "╚═══════════════════════════════════════════════╝"
echo -e "${NC}"

# List available images
print_step "Images Docker disponibles:"
docker images infra-tace-itroom --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.CreatedAt}}\t{{.Size}}"

# Get image ID from argument or ask user
if [ -z "$1" ]; then
    echo ""
    read -p "Entrez l'ID de l'image vers laquelle revenir: " IMAGE_ID
else
    IMAGE_ID="$1"
fi

if [ -z "$IMAGE_ID" ]; then
    print_error "ID d'image requis"
    exit 1
fi

# Verify image exists
if ! docker images --format "{{.ID}}" | grep -q "^$IMAGE_ID"; then
    print_error "Image $IMAGE_ID introuvable"
    exit 1
fi

print_step "Arrêt du conteneur actuel..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

print_step "Démarrage du conteneur avec l'image $IMAGE_ID..."
docker run -d \
    --name "$CONTAINER_NAME" \
    --network traefik-public \
    --restart unless-stopped \
    --label "traefik.enable=true" \
    --label "traefik.http.routers.tace-itroom.rule=Host(\`tace.itroom.fr\`)" \
    --label "traefik.http.routers.tace-itroom.entrypoints=web" \
    --label "traefik.http.routers.tace-itroom-secure.rule=Host(\`tace.itroom.fr\`)" \
    --label "traefik.http.routers.tace-itroom-secure.entrypoints=websecure" \
    --label "traefik.http.routers.tace-itroom-secure.tls=true" \
    --label "traefik.http.routers.tace-itroom-secure.tls.certresolver=letsencrypt" \
    --label "traefik.http.middlewares.tace-itroom-redirect.redirectscheme.scheme=https" \
    --label "traefik.http.middlewares.tace-itroom-redirect.redirectscheme.permanent=true" \
    --label "traefik.http.routers.tace-itroom.middlewares=tace-itroom-redirect" \
    --label "traefik.http.services.tace-itroom.loadbalancer.server.port=80" \
    "$IMAGE_ID"

print_step "Vérification de l'état..."
sleep 2

if docker ps | grep -q "$CONTAINER_NAME"; then
    print_info "✓ Rollback réussi!"
    docker logs "$CONTAINER_NAME" --tail 5
else
    print_error "Le conteneur n'est pas démarré"
    exit 1
fi

echo -e "\n${GREEN}✓ Rollback terminé${NC}\n"
