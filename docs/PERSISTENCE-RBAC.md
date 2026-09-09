# Persistence PostgreSQL et RBAC

## État actuel

Le moteur juridique reste indépendant de la persistance. En mode serveur, la création d'un assessment passe désormais par un contexte d'acteur (`userId`, `organizationId`, `role`) et par le port `AssessmentRepository`.

La démo GitHub Pages reste statique : elle utilise le moteur dans le navigateur et ne persiste aucune donnée serveur.

## Rôles

Les rôles applicatifs sont :

- `owner` : gestion de l'organisation, salariés et assessments ;
- `hr` : création/lecture des assessments et gestion des salariés ;
- `advisor` : création/lecture des assessments et lecture des salariés ;
- `readonly` : lecture uniquement.

Le use-case de création d'assessment vérifie explicitement la permission `assessment:create` avant tout calcul ou enregistrement.

## PostgreSQL

Le schéma de référence est dans `db/schema.sql`.

Pour un environnement local :

```bash
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/rls.sql
psql "$DATABASE_URL" -f db/dev-seed.sql
```

`db/dev-seed.sql` est exclusivement destiné au développement local.

L'adapter `PostgresAssessmentRepository` :

- écrit `organization_id`, `created_by`, le snapshot d'entrée, le résultat et les versions de règles ;
- filtre toute lecture par `organization_id` ;
- ouvre une transaction et renseigne `vigie.organization_id` avant les requêtes ;
- est compatible avec les politiques RLS de `db/rls.sql`.

## Row-Level Security

`db/rls.sql` active et force RLS sur les tables tenant-scoped déjà définies :

- `employees` ;
- `employee_documents` ;
- `assessments` ;
- `compliance_tasks` ;
- `audit_log`.

Les policies utilisent la variable transactionnelle `vigie.organization_id`. Une requête exécutée sans contexte d'organisation ne doit donc pas accéder aux lignes protégées.

## Sélection de l'adapter

- si `DATABASE_URL` est défini, le serveur utilise PostgreSQL ;
- sans `DATABASE_URL`, le fallback mémoire n'est autorisé qu'en développement ;
- en environnement serveur de production sans base configurée, l'API échoue explicitement au lieu de revenir en mémoire.

## Authentification

Cette tranche n'implémente volontairement pas de faux login de production.

En développement, `resolveServerActor()` peut utiliser les variables `VIGIE_DEMO_*` documentées dans `.env.example`. En production serveur, l'absence de fournisseur d'identité réel provoque une erreur de configuration et aucun acteur implicite n'est créé.

La prochaine étape est de connecter un vrai fournisseur d'identité/session, puis de résoudre le membership depuis `organization_members` avant d'instancier l'`ActorContext`.

## Invariants de sécurité

- aucun rôle client ne doit être accepté comme source d'autorité ;
- l'organisation doit provenir d'une session authentifiée et d'un membership vérifié ;
- les filtres applicatifs ne remplacent pas RLS ;
- GitHub Pages ne doit jamais recevoir de secret PostgreSQL ;
- les documents sensibles ne doivent pas être stockés dans la base ou le repo en clair.
