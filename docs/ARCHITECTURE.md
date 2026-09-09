# Architecture

## Principes
Vigie RH suit une architecture hexagonale légère : le domaine ne dépend ni de Next.js, ni de la persistance, ni d'un fournisseur IA.

```text
UI / Routes (src/app, src/components)
            ↓
Application services (src/application)
            ↓
Domain (src/domain)
            ↑
Infrastructure adapters (src/infrastructure)
```

## Domain
`src/domain/legal` contient les types, sources, règles et le moteur. Une règle renvoie des `findings`, des actions et des sources. Le moteur agrège les règles et calcule un verdict.

## Application
`assessForeignWorkerCase` valide les entrées puis appelle le moteur. Les futurs use-cases (création de dossier, renouvellement, notification) doivent vivre ici.

## Infrastructure
Les données de démonstration sont isolées dans `src/infrastructure/mock`. L'interface `EmployeeRepository` permet de substituer PostgreSQL/Supabase sans modifier le domaine.

## Front
Les pages serveur rendent les données de référence. Le wizard d'analyse est un composant client qui appelle `/api/analyse`.

## Production target
- PostgreSQL, row-level tenancy par organisation ;
- RBAC : owner / HR / advisor / read-only ;
- chiffrement des documents ;
- audit log append-only ;
- queue pour rappels et synchronisations ;
- stockage objet S3 compatible ;
- observabilité ;
- import légal versionné et signé.
