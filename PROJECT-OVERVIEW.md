# Havifin - Project Overview

## 🎯 Project Summary

**Havifin** est une **application full-stack moderne** construite avec **Laravel 12** et **React 19 + TypeScript**. C'est un système de gestion complet avec authentification, gestion de rôles/permissions, et une architecture API RESTful robuste.

### Type d'Application
🏦 **Système de gestion de caisses/boutiques** avec support multi-tenant (multi-magasins), gestion d'utilisateurs, transactions, et taux de change.

---

## 🏗️ Stack Technologique

### Backend
| Technologie | Version | Rôle |
|---|---|---|
| **Laravel** | 12.0 | Framework backend principal |
| **PHP** | 8.2+ | Langage serveur |
| **Laravel Sanctum** | 4.2 | Authentification API (tokens) |
| **Laravel Fortify** | 1.30 | Système d'authentification complet |
| **Inertia.js** | 2.0 | Communication frontend/backend |
| **Spatie Permissions** | 6.24 | Gestion rôles & permissions |
| **DomPDF** | 3.1 | Génération de PDF |

### Frontend
| Technologie | Version | Rôle |
|---|---|---|
| **React** | 19.2 | UI framework |
| **TypeScript** | 5.7 | Typage statique |
| **Vite** | 8.1 | Bundler ultra-rapide |
| **Tailwind CSS** | 4.0 | Utility-first styling |
| **Radix UI** | Latest | Composants accessibles |
| **React Query** | 5.90 | Gestion data/cache |
| **Framer Motion** | 12.25 | Animations fluides |
| **Lucide React** | 0.475 | Système d'icônes |
| **Axios** | 1.18 | HTTP client |

---

## 🏛️ Architecture & Répartition Frontend/Backend

### 1️⃣ **Paradigme: Monolithe avec Inertia.js**

```
┌─────────────────────────────────────────────────────────┐
│                   BROWSER (Client)                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │  React Components + TypeScript                     │  │
│  │  - Pages & layouts                                │  │
│  │  - State management (React Query)                 │  │
│  │  - UI components (Radix + Tailwind)               │  │
│  └───────────────────────────────────────────────────┘  │
│                           │                               │
│                    HTTP/JSON (Axios)                     │
│                           │                               │
└─────────────────────────────────────────────────────────┘
                            │
                ┌───────────▼───────────┐
                │  Laravel Backend      │
                ├───────────────────────┤
                │ - API Routes (REST)   │
                │ - Controllers         │
                │ - Models (Eloquent)   │
                │ - Middleware (Auth)   │
                │ - Business Logic      │
                │ - DB (SQLite/MySQL)   │
                └───────────────────────┘
```

### 2️⃣ **Flux de Données**

#### Page Web (SSR avec Inertia)
```
1. Browser → Laravel route (web.php)
2. Laravel → Inertia::render('ComponentName', [props])
3. React composant rendu avec les props
4. Utilisateur interagit → API call
5. API response → UI update
```

#### API (REST avec Sanctum)
```
1. Frontend → POST /api/transactions (with token)
2. Laravel Sanctum middleware → Valide token
3. Controller → Business logic
4. DB → Eloquent models
5. Response JSON → Frontend
6. React Query → Cache & UI update
```

---

## 📂 Structure du Projet

```
havifin/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Api/              ← API controllers (CRUD REST)
│   │   │   │   ├── ShopController.php
│   │   │   │   ├── TransactionController.php
│   │   │   │   ├── ClientController.php
│   │   │   │   └── ...
│   │   │   └── Auth/
│   │   │       └── AuthController.php
│   │   └── Middleware/
│   │       ├── Authenticate.php  ← Vérifie token Sanctum
│   │       ├── CheckUserActive.php
│   │       └── Role-based middlewares
│   │
│   ├── Models/
│   │   ├── User.php              ← Modèle utilisateur
│   │   ├── Shop.php              ← Modèle magasin
│   │   ├── Transaction.php       ← Modèle transaction
│   │   ├── Client.php
│   │   └── ...
│   │
│   ├── Support/
│   │   └── TenantAccess.php      ← Contrôle multi-tenant
│   │
│   └── ...
│
├── resources/
│   ├── js/
│   │   ├── app.tsx               ← Point d'entrée React
│   │   ├── ssr.tsx               ← SSR entry point
│   │   ├── components/
│   │   │   ├── Auth/
│   │   │   │   └── Login.tsx      ← Page Login (rendue par Inertia)
│   │   │   ├── Cashier/          ← Composants pour caissiers
│   │   │   ├── Manager/          ← Composants pour managers
│   │   │   ├── SuperAdmin/       ← Composants pour super-admins
│   │   │   └── Client/           ← Composants pour clients
│   │   │
│   │   ├── hooks/
│   │   │   └── useXxx.ts         ← Custom React hooks
│   │   │
│   │   ├── lib/
│   │   │   ├── api.ts            ← Axios instance & helpers
│   │   │   └── utils.ts
│   │   │
│   │   └── layouts/
│   │       └── AppLayout.tsx
│   │
│   └── css/
│       └── app.css               ← Tailwind + global styles
│
├── routes/
│   ├── web.php                   ← Routes SSR (Inertia)
│   │   └── /login, /dashboard, /cashier, /manager, etc.
│   │
│   ├── api.php                   ← Routes API REST (JSON)
│   │   └── /api/transactions, /api/shops, /api/clients, etc.
│   │
│   └── settings.php
│
├── database/
│   ├── migrations/               ← Schéma DB
│   └── seeders/
│
├── config/
│   ├── app.php                   ← Config app
│   ├── database.php              ← Config DB
│   └── cors.php                  ← CORS settings
│
├── .github/
│   └── workflows/
│       ├── lint.yml              ← GitHub Actions: Linting
│       └── tests.yml             ← GitHub Actions: Tests
│
├── package.json                  ← Dépendances Node
├── composer.json                 ← Dépendances PHP
├── vite.config.ts                ← Config Vite
├── tsconfig.json                 ← Config TypeScript
└── .env.example                  ← Variables d'env

print-server/                      ← Micro-service impression (?)
```

---

## 🔄 Communication Frontend ↔ Backend

### A. Routes Web (Server-Side Rendered avec Inertia)

**Fichier: `routes/web.php`**

Ces routes **renvoient des pages React** compilées côté serveur.

```php
// Route publique
Route::get('/login', fn() => Inertia::render('Auth/Login'))->name('login');

// Routes protégées (nécessite authentification)
Route::middleware(['auth', 'active'])->group(function () {
    Route::get('/dashboard', fn() => Inertia::render('Manager'))->name('dashboard');
    Route::get('/cashier', fn() => Inertia::render('Cashier'))->name('cashier.index');
    
    // Dynamic routes avec paramètres
    Route::get('/manager/shops/{shop}', function (Shop $shop) {
        TenantAccess::authorizeShop(auth()->user(), $shop);
        return Inertia::render('Manager/ManagerShopDetail', ['id' => $shop->id]);
    })->name('manager.shops.show');
});
```

**Flux:**
```
User visite /manager/shops/5
  ↓
Laravel authentifie l'utilisateur
  ↓
Charge le modèle Shop avec ID 5
  ↓
Vérifie les permissions (TenantAccess)
  ↓
Rend le composant React "Manager/ManagerShopDetail" avec props
  ↓
HTML + React hydraté retourné au navigateur
  ↓
React prend le contrôle (Client-side)
```

**Rôles & Permissions:**
```
super-admin → Accès pages super admin
manager     → Accès pages manager + gestion boutiques
cashier     → Accès pages caissier
client      → Accès formulaires clients
```

### B. Routes API (JSON/REST)

**Fichier: `routes/api.php`**

Ces routes **retournent du JSON** pour les appels via Axios/Fetch.

#### Authentification & Sessions
```php
// Login/Logout via tokens Sanctum
Route::post('/auth/logout', [AuthController::class, 'logout'])
    ->middleware(['auth:sanctum', 'active']);

Route::get('/auth/me', [AuthController::class, 'me'])
    ->middleware(['auth:sanctum', 'active']);
```

#### Gestion des Boutiques
```php
// Super-admin seulement
Route::middleware('role:super-admin')->group(function () {
    Route::post('/shops', [ShopController::class, 'store']);
    Route::delete('/shops/{shop}', [ShopController::class, 'destroy']);
    Route::get('/shops/{shop}/statistics', [ShopController::class, 'statistics']);
});

// Manager + Caissier
Route::middleware('role:cashier,manager,super-admin')->group(function () {
    Route::get('/shops', [ShopController::class, 'index']);
    Route::get('/shops/{shop}', [ShopController::class, 'show']);
});
```

#### Gestion des Transactions (Core Business)
```php
// Caissier peut créer une transaction
Route::post('/transactions', [TransactionController::class, 'store'])
    ->middleware('role:cashier');

// Caissier + Manager peuvent lister
Route::middleware('role:cashier,manager')->group(function () {
    Route::apiResource('transactions', TransactionController::class)
        ->only(['index', 'show']);
});
```

#### Gestion des Clients
```php
// Client/Caissier/Manager peuvent récupérer les clients
Route::middleware('role:cashier,manager')->group(function () {
    Route::apiResource('clients', ClientController::class)
        ->only(['index', 'show', 'update']);
});

// Création client (accessible à tous les rôles)
Route::post('/clients', [ClientController::class, 'store'])
    ->middleware('role:client,cashier,manager');
```

#### Autres Ressources
```php
// Taux de change (managers)
Route::middleware('role:manager')->group(function () {
    Route::post('/exchange-rates', [ExchangeRateController::class, 'store']);
    Route::match(['put', 'patch'], '/exchange-rates/{exchangeRate}', ...);
    Route::delete('/exchange-rates/{exchangeRate}', ...);
});

// Sessions de caisse (cashier + manager)
Route::middleware('role:cashier,manager')->group(function () {
    Route::post('/cash/sessions', [CashSessionController::class, 'store']);
    Route::post('/cash/sessions/{session}/close', ...);
    Route::get('/cash/sessions', [CashSessionController::class, 'index']);
});

// Publicités, News, Institutions (lecture publique, création manager)
Route::middleware('role:client,cashier,manager')->group(function () {
    Route::get('/advertisements/active', [AdvertisementController::class, 'active']);
});
```

### C. Flow Exemple: Création d'une Transaction

#### Côté Frontend (React)
```tsx
// resources/js/components/Cashier/TransactionForm.tsx

const handleSubmit = async (data) => {
  try {
    const response = await axios.post('/api/transactions', {
      client_id: data.clientId,
      amount: data.amount,
      currency: data.currency,
      // ...
    });
    
    // React Query invalidate + refetch
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    
    // Success toast
    toast.success('Transaction créée!');
  } catch (error) {
    toast.error(error.response.data.message);
  }
};
```

#### Côté Backend (Laravel)
```php
// app/Http/Controllers/Api/TransactionController.php

class TransactionController extends Controller
{
    public function store(StoreTransactionRequest $request)
    {
        // Middleware: auth:sanctum, role:cashier validé
        
        $client = Client::findOrFail($request->client_id);
        
        // Vérification tenant (multi-shop)
        TenantAccess::authorizeShop(auth()->user(), $client->shop_id);
        
        $transaction = Transaction::create([
            'client_id' => $client->id,
            'amount' => $request->amount,
            'currency' => $request->currency,
            'created_by' => auth()->id(),
        ]);
        
        // Event pour logs/notifications
        TransactionCreated::dispatch($transaction);
        
        return response()->json($transaction, 201);
    }
}
```

---

## 🚀 Déploiement (CI/CD)

### 1. **GitHub Actions Workflows**

Le projet utilise **GitHub Actions** pour l'automatisation (branchesvalidées: `main` et `develop`).

#### 📝 Workflow: Linting (`lint.yml`)

**Quand:** À chaque push/PR sur `main` ou `develop`

**Actions:**
```yaml
1. Setup PHP 8.4
2. Install dependencies (Composer + NPM)
3. Run Pint         → Format code PHP (Laravel auto-formatter)
4. Format Frontend  → Prettier (resources/)
5. Lint Frontend    → ESLint (TypeScript/React)
```

**Résultat:** Vérifie que le code suit les standards du projet

---

#### ✅ Workflow: Tests (`tests.yml`)

**Quand:** À chaque push/PR sur `main` ou `develop`

**Actions:**
```yaml
1. Setup PHP 8.4 + Node 22
2. Install dependencies
   ↓
3. Build Frontend Assets
   └─ npm run build
     └─ Vite compile React/TS → static JS/CSS
   
4. Copy .env.example → .env
5. Generate Laravel key
6. Run Tests
   └─ ./vendor/bin/phpunit
     └─ Exécute les tests PHP
```

**Résultat:** Valide que le code passe les tests

---

### 2. **Build Assets Frontend**

**Fichier: `vite.config.ts`**

```typescript
export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.tsx',  // Server-side rendering
            refresh: true,
        }),
        react({ babel: { plugins: ['babel-plugin-react-compiler'] } }),
        tailwindcss(),
        wayfinder({ formVariants: true }),
    ],
});
```

**Build Process:**
```
npm run build (or npm run build:ssr for SSR)
  ↓
Vite compile:
  - TypeScript → JavaScript
  - JSX → React
  - Tailwind CSS → optimized CSS
  - Minification & bundling
  ↓
public/build/
  ├── assets/
  │   ├── app.xxx.js
  │   ├── app.xxx.css
  │   └── ...
```

---

### 3. **Scripts de Démarrage**

**Fichier: `composer.json`**

```bash
# Setup initial (installation + migrations)
composer run setup
  ├─ composer install
  ├─ copy .env.example → .env
  ├─ php artisan key:generate
  ├─ php artisan migrate
  ├─ npm install
  └─ npm run build

# Development (toutes les services en parallèle)
composer run dev
  ├─ php artisan serve              (serveur Laravel sur :8000)
  ├─ php artisan queue:listen       (job queue)
  ├─ php artisan pail               (logs temps réel)
  └─ npm run dev                    (Vite dev server sur :5173)

# Development avec SSR
composer run dev:ssr
  ├─ npm run build:ssr
  ├─ php artisan serve
  ├─ php artisan queue:listen
  ├─ php artisan pail
  └─ php artisan inertia:start-ssr (Inertia SSR server)

# Tests
composer run test
  ├─ php artisan config:clear
  └─ php artisan test (PHPUnit)
```

---

## 🔐 Authentification & Sécurité

### Laravel Sanctum (API Tokens)

```php
// Login API
POST /api/login
{
  "email": "user@example.com",
  "password": "password"
}

Response:
{
  "token": "xyz123...",
  "user": {...}
}

// Subsequent requests
Authorization: Bearer xyz123...
```

### Middleware Stack
```
Request → Auth:Sanctum → Active Check → Role Check → Controller
```

**Exemples:**
```php
Route::middleware(['auth:sanctum', 'active', 'role:manager'])->group(function () {
    // Only authenticated, active managers
});
```

---

## 🎯 Rôles & Permissions

**Fichier: `database/migrations/xxx_create_roles.php`** + **Spatie Permissions**

| Rôle | Permissions | Accès |
|---|---|---|
| **super-admin** | Tous | Toutes les pages admin |
| **manager** | Gestion boutique, utilisateurs, rapports | Pages manager |
| **cashier** | Transactions, clients | Pages caissier |
| **client** | Formulaires, infos compte | Pages client |

---

## 📊 Variables d'Environnement

**Fichier: `.env.example`**

```env
# App Config
APP_NAME=Havifin
APP_ENV=local/production
APP_DEBUG=true/false
APP_URL=https://havifin.com

# Database
DB_CONNECTION=sqlite/mysql
DB_DATABASE=havifin
DB_USERNAME=root
DB_PASSWORD=secret

# Queue & Cache
QUEUE_CONNECTION=database/redis
CACHE_STORE=database/redis

# Mail
MAIL_MAILER=log/smtp
MAIL_HOST=smtp.mailtrap.io

# WhatsApp Integration
WHATSAPP_DRIVER=none/ultramsg
WHATSAPP_ULTRAMSG_TOKEN=...

# Print Server (Micro-service)
VITE_PRINT_SERVER_URL=http://127.0.0.1:3001/print
VITE_PRINT_SERVER_TOKEN=...

# Auth
SANCTUM_TOKEN_EXPIRATION=120 (minutes)
```

---

## 📦 Ressources & Fichiers Clés

| Fichier | Rôle |
|---|---|
| `resources/js/app.tsx` | Point d'entrée React (client-side) |
| `resources/js/ssr.tsx` | Point d'entrée SSR (server-side) |
| `routes/web.php` | Routes SSR (Inertia pages) |
| `routes/api.php` | Routes API (JSON endpoints) |
| `app/Http/Controllers/Api/*` | API logic |
| `app/Models/*` | Database models (Eloquent) |
| `database/migrations/*` | Schema definitions |
| `.github/workflows/*` | CI/CD automation |
| `vite.config.ts` | Frontend build config |
| `composer.json` | PHP dependencies |
| `package.json` | Node.js dependencies |

---

## 🔗 Résumé de l'Architecture

```
┌─ Utilisateur accède à https://havifin.com/login
│
├─ Navigateur HTTP GET /login
│
├─ Laravel route (web.php):
│  └─ Inertia::render('Auth/Login')
│
├─ React composant compilé + HTML
│  └─ Utilisateur remplit formulaire
│
├─ Click Submit
│  └─ React envoie POST /api/login (Axios)
│
├─ Laravel Sanctum middleware valide credentials
│  └─ Retourne token JWT
│
├─ React sauvegarde token (localStorage/sessionStorage)
│
├─ Subsequent requests incluent Authorization header
│  └─ Sanctum valide token à chaque fois
│
└─ Accès API protégée: /api/transactions, /api/shops, etc.
```

---

## 🛠️ Outils de Développement

| Outil | Commande | Rôle |
|---|---|---|
| **Vite** | `npm run dev` | Dev server avec HMR |
| **Tailwind** | Auto | CSS compiler |
| **TypeScript** | `npm run types` | Type checking |
| **Prettier** | `npm run format` | Code formatting |
| **ESLint** | `npm run lint` | JavaScript linting |
| **Pint** | `vendor/bin/pint` | PHP code formatter |
| **PHPUnit** | `php artisan test` | PHP tests |
| **Pail** | `php artisan pail` | Real-time logs |

---

## ✨ Caractéristiques Principales

✅ **Multi-tenant** - Isolation données par boutique  
✅ **Authentification robuste** - Sanctum + Fortify  
✅ **Rôles & Permissions** - Spatie Permissions  
✅ **API RESTful** - Endpoints JSON protégés  
✅ **SSR avec Inertia** - Pages pré-rendues + React hydration  
✅ **Gestion de caisse** - Transactions, sessions, rapports  
✅ **Échanges de devises** - Taux dynamiques  
✅ **Génération PDF** - Reçus & rapports  
✅ **WhatsApp Integration** - Notifications optionnelles  
✅ **CI/CD automatisé** - Tests & linting continus  

---

**Projet professionnel bien architecturé pour un MVP ou production! 🚀**
