# Pont d’impression Havifin

Le service écoute uniquement en local et exige un jeton partagé avec
l’application web.

1. Copiez `.env.example` vers `.env`.
2. Générez un jeton aléatoire long et placez-le dans `PRINT_SERVER_TOKEN`.
3. Placez exactement le même jeton dans `VITE_PRINT_SERVER_TOKEN` à la racine
   du projet, puis reconstruisez le frontend.
4. Lancez le pont avec les variables chargées :

```bash
node --env-file=.env server.js
```

Les origines web autorisées se configurent avec `PRINT_SERVER_ORIGINS`. Le
service refuse de démarrer les impressions si le jeton est absent.
