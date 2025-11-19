# Infrastructure TACE IT-ROOM

Ce répertoire contient les fichiers nécessaires pour déployer l'application TACE IT-ROOM en production.

## 📁 Fichiers

- **`docker-compose.yml`** - Configuration Docker Compose pour le déploiement
- **`Dockerfile`** - Instructions pour construire l'image Docker
- **`nginx.conf`** - Configuration Nginx pour servir l'application Angular
- **`deploy.sh`** - Script de déploiement automatisé
- **`rollback.sh`** - Script de rollback en cas de problème

## 🚀 Déploiement

### Déploiement complet

Pour déployer l'application (build + démarrage) :

```bash
cd infra
./deploy.sh
```

### Déploiement rapide (sans rebuild)

Si l'image est déjà construite et que vous voulez juste redémarrer :

```bash
./deploy.sh --no-build
```

### Options disponibles

- `--no-build` - Ignore le build Docker et utilise l'image existante
- `--help` - Affiche l'aide

## ⏮️ Rollback

En cas de problème avec un déploiement, vous pouvez revenir à une version précédente :

```bash
# Liste les images disponibles et demande laquelle utiliser
./rollback.sh

# Ou spécifiez directement l'ID de l'image
./rollback.sh <image_id>
```

Le script affichera la liste des images Docker disponibles avec leurs IDs et dates de création.

## 🔧 Commandes manuelles

### Build de l'image

```bash
docker compose build
```

### Démarrer l'application

```bash
docker compose up -d
```

### Arrêter l'application

```bash
docker compose down
```

### Voir les logs

```bash
docker logs tace-itroom -f
```

### Redémarrer le conteneur

```bash
docker compose restart
```

## 🌐 Configuration

### URL de production

L'application est accessible sur : **https://tace.itroom.fr**

### Réseau Docker

L'application utilise le réseau Docker externe `traefik-public` pour communiquer avec Traefik.

### Traefik

L'application est configurée pour être routée par Traefik avec :
- Génération automatique de certificat SSL (Let's Encrypt)
- Redirection HTTP vers HTTPS
- Headers de sécurité

## 📋 Prérequis

### Traefik

Assurez-vous que Traefik est déjà déployé et configuré avec :
- Le réseau Docker `traefik-public`
- Le resolver Let's Encrypt nommé `letsencrypt`
- Les entrypoints `web` (port 80) et `websecure` (port 443)

### DNS

Le DNS `tace.itroom.fr` doit pointer vers le serveur où l'application est déployée.

### Google Cloud OAuth

Les credentials Google OAuth doivent être configurés dans :
- `src/environments/environment.prod.ts`

Et dans la Google Cloud Console, ajoutez `https://tace.itroom.fr` dans les "Origines JavaScript autorisées".

## 🐛 Dépannage

### Vérifier l'état des conteneurs

```bash
docker ps | grep tace-itroom
```

### Vérifier les logs Traefik

```bash
docker logs traefik --tail 50
```

### Tester la connectivité réseau

```bash
docker exec traefik wget -O- http://tace-itroom --timeout=5
```

### Reconstruire complètement

Si vous rencontrez des problèmes, reconstruisez complètement :

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

## 📝 Notes

- L'image est construite en 2 étapes (multi-stage build) :
  1. Build de l'application Angular avec Node.js
  2. Servir l'application avec Nginx Alpine

- Le build de production Angular optimise automatiquement le code (minification, tree-shaking, etc.)

- Les fichiers statiques sont servis avec compression Gzip et cache HTTP configuré
