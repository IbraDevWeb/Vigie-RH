# Tâches de conformité — persistence serveur

Cette tranche transforme `compliance_tasks` en une brique serveur exploitable pour les échéances et prochaines actions réelles.

## API serveur

Routes disponibles :
- `GET /api/tasks` ;
- `POST /api/tasks` ;
- `GET /api/tasks/{id}` ;
- `PATCH /api/tasks/{id}` pour changer uniquement l'état.

`GET /api/tasks` accepte les filtres optionnels `employeeId` et `status`.

Ces routes sont retirées avec les autres routes API pendant l'export GitHub Pages statique.

## Modèle

Une tâche persistée contient :
- organisation ;
- salarié optionnel ;
- assessment optionnel ;
- titre ;
- échéance optionnelle ;
- état : `todo`, `doing`, `done`, `cancelled` ;
- sévérité : `info`, `warning`, `critical` ;
- utilisateur assigné optionnel ;
- dates de création et de clôture.

La création via l'API n'accepte pas encore `assignedToUserId`. L'assignation restera fermée tant que l'identité serveur ne résout pas réellement les membres de `organization_members`.

## Cycle d'état

La création produit toujours une tâche `todo`.

Le `PATCH` accepte uniquement :
```json
{ "status": "todo|doing|done|cancelled" }
```

Le passage à `done` renseigne `completedAt` avec l'heure serveur. Repasser la tâche dans un autre état remet `completedAt` à `null`.

Cette tranche n'impose pas encore une machine à états plus restrictive : par exemple, `cancelled -> doing` reste techniquement autorisé. Si le produit doit interdire certaines transitions, cette politique devra être explicitée dans la couche application.

## RBAC

- `owner` : lecture + écriture ;
- `hr` : lecture + écriture ;
- `advisor` : lecture + écriture ;
- `readonly` : lecture uniquement.

Les contrôles sont appliqués dans les use-cases et non dans React.

## Isolation tenant

La sécurité repose sur plusieurs couches :
1. `organizationId` vient de l'acteur serveur ;
2. les références `employeeId` et `assessmentId` sont vérifiées dans l'organisation courante avant création ;
3. le store PostgreSQL exécute ses opérations dans `withPostgresTenant` ;
4. la RLS PostgreSQL filtre `compliance_tasks` ;
5. le schéma impose des clés étrangères composites tenant-aware.

Le schéma garantit également qu'un futur `assigned_to` correspond à un membership `(organization_id, user_id)` existant.

## Hors périmètre

Cette tranche ne fournit pas encore :
- génération automatique des tâches depuis les findings/checklists du moteur ;
- rappels asynchrones ;
- notifications ;
- assignation utilisateur via API ;
- édition du titre, de l'échéance ou de la sévérité ;
- suppression ;
- journalisation append-only des changements.

La prochaine étape logique est de produire un read-model de conformité à partir des salariés, documents, assessments et tâches persistés, puis d'y raccorder progressivement le dashboard serveur.
