# Pont d’impression Havifin

Le service écoute uniquement en local et exige un jeton partagé avec
l’application web.

**Il doit tourner sur la machine où l’imprimante est branchée en USB**, et
c’est aussi celle qui affiche le kiosque : la page appelle `127.0.0.1:3001`,
donc un pont installé ailleurs est injoignable (« connexion refusée », et
aucune trace dans le journal du pont).

1. Copiez `.env.example` vers `.env`.
2. Générez un jeton aléatoire long et placez-le dans `PRINT_SERVER_TOKEN`.
3. Placez exactement le même jeton dans `VITE_PRINT_SERVER_TOKEN` à la racine
   du projet, puis reconstruisez le frontend.
4. Installez les dépendances : `npm install`.
5. Lancez le pont avec les variables chargées :

```bash
node --env-file=.env server.js
```

Les origines web autorisées se configurent avec `PRINT_SERVER_ORIGINS`. Le
service refuse de démarrer les impressions si le jeton est absent.

## Windows

### Pilote USB (à faire en premier)

Sous Windows, `libusb` ne voit l’imprimante que si le pilote **WinUSB** lui est
associé. Avec le pilote fabricant ou le pilote d’imprimante générique, le pont
répond `Printer not found or disconnected` alors que l’imprimante fonctionne
par ailleurs.

Associez le pilote avec [Zadig](https://zadig.akeo.ie) : sélectionnez
l’imprimante, choisissez **WinUSB**, puis *Replace Driver*.

Conséquence à connaître : une fois sous WinUSB, l’imprimante n’apparaît plus
comme imprimante Windows classique. Elle ne fonctionnera plus que via ce pont —
ce qui est le but ici, mais empêche d’imprimer depuis d’autres logiciels.

### Démarrage automatique

Prérequis : **Node.js 20.6 ou plus récent** (l’option `--env-file` n’existe pas
avant). Le script de démarrage vérifie la version et le dit clairement.

Depuis le dossier `print-server\windows` :

```powershell
powershell -ExecutionPolicy Bypass -File .\start-print-bridge.ps1
```

Lancez d’abord ce script à la main : il indique précisément ce qui manque
(Node absent du PATH, `.env` manquant, dépendances non installées). Une fois
qu’il démarre correctement, arrêtez-le puis enregistrez la tâche planifiée :

```powershell
powershell -ExecutionPolicy Bypass -File .\install-autostart.ps1
```

Si l’enregistrement de la tâche est refusé, relancez cette commande depuis un
PowerShell ouvert **en tant qu’administrateur**.

Le pont démarrera à chaque ouverture de session, sans fenêtre visible, et
redémarrera tout seul s’il s’arrête. Pour le lancer immédiatement sans se
déconnecter :

```powershell
Start-ScheduledTask -TaskName HavifinPrintBridge
```

Pour retirer le démarrage automatique :

```powershell
powershell -ExecutionPolicy Bypass -File .\uninstall-autostart.ps1
```

### Vérifier que le pont tourne

```powershell
curl.exe http://127.0.0.1:3001/print
```

Une réponse `401 Unauthorized` est le résultat attendu : elle prouve que le
pont écoute. Une erreur de connexion signifie qu’il n’est pas démarré, ou qu’il
tourne sur une autre machine que le navigateur.

La sortie du pont est écrite dans `print-server\print-bridge.log`, et chaque
requête reçue y est tracée — utile pour distinguer une impression refusée d’une
requête qui n’est jamais arrivée.
