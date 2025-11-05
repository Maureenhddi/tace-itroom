# Déploiement avec Docker et Traefik

Ce guide explique comment déployer l'application Angular avec Docker et Traefik.

## Prérequis

- Docker et Docker Compose installés sur le serveur
- Traefik configuré et en cours d'exécution
- Un nom de domaine pointant vers votre serveur
- Réseau Docker `traefik` créé

## Configuration

### 1. Modifier le nom de domaine

Éditez `infra/docker-compose.yml` et remplacez `your-domain.com` par votre vrai domaine :

```yaml
- "traefik.http.routers.tace-itroom.rule=Host(`votre-domaine.com`)"
- "traefik.http.routers.tace-itroom-secure.rule=Host(`votre-domaine.com`)"
```

### 2. Configuration Traefik

Assurez-vous que Traefik est configuré avec :
- Entrypoints `web` (port 80) et `websecure` (port 443)
- CertResolver `letsencrypt` pour les certificats SSL
- Réseau Docker `traefik`

Si le réseau n'existe pas, créez-le :
```bash
docker network create traefik
```

### 3. Variables d'environnement

Créez un fichier `.env` à la racine avec vos clés API :
```bash
cp .env.example .env
# Éditez .env avec vos vraies valeurs
```

## Déploiement

### Option 1 : Build et déploiement local

Depuis le dossier `infra/` :

```bash
cd infra
docker-compose build
docker-compose up -d
```

### Option 2 : Build et déploiement sur serveur distant

1. Clonez le repo sur le serveur :
```bash
git clone git@github.com:Maureenhddi/tace-itroom.git
cd tace-itroom
```

2. Lancez le déploiement :
```bash
cd infra
docker-compose up -d --build
```

## Vérification

Vérifiez que le conteneur est en cours d'exécution :
```bash
docker ps | grep tace-itroom
```

Vérifiez les logs :
```bash
docker logs tace-itroom
```

Testez l'application :
```bash
curl -I https://votre-domaine.com
```

## Mise à jour

Pour mettre à jour l'application :

```bash
cd tace-itroom
git pull
cd infra
docker-compose down
docker-compose up -d --build
```

## Gestion

### Voir les logs
```bash
docker logs -f tace-itroom
```

### Redémarrer
```bash
docker-compose restart
```

### Arrêter
```bash
docker-compose down
```

### Supprimer
```bash
docker-compose down -v
docker rmi tace-itroom
```

## Structure des fichiers

```
infra/
├── Dockerfile              # Image Docker multi-stage
├── nginx.conf              # Configuration Nginx pour Angular
├── docker-compose.yml      # Configuration Docker Compose avec Traefik
└── DEPLOYMENT.md          # Ce fichier
```

## Traefik - Labels expliqués

- `traefik.enable=true` : Active Traefik pour ce service
- `traefik.http.routers.*.rule=Host(...)` : Définit le domaine
- `traefik.http.routers.*.entrypoints` : Définit les ports (web=80, websecure=443)
- `traefik.http.routers.*.tls.certresolver` : Active Let's Encrypt
- `traefik.http.middlewares.*.redirectscheme` : Redirige HTTP vers HTTPS
- `traefik.http.services.*.loadbalancer.server.port` : Port interne du conteneur

## Troubleshooting

### Le conteneur ne démarre pas
```bash
docker logs tace-itroom
```

### Traefik ne route pas vers l'app
Vérifiez que :
- Le réseau `traefik` existe
- Traefik est en cours d'exécution
- Le domaine pointe vers le serveur
- Les labels sont corrects

### Erreur de build
Assurez-vous que vous êtes dans le dossier `infra/` et que le contexte de build pointe vers `..` (dossier parent)

## Support

Pour plus d'informations sur Traefik : https://doc.traefik.io/traefik/
