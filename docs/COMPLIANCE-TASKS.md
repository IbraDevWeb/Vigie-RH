# Tâches de conformité — persistence serveur

Cette brique transforme `compliance_tasks` en un suivi opérationnel persistant des échéances et actions RH. Une tâche n'est pas, à elle seule, un verdict juridique : elle matérialise une action à suivre.

## API serveur

Routes disponibles :
- `GET /api/tasks` ;
- `POST /api/tasks` ;
- `GET /api/tasks/{id}` ;
- `PATCH /api/tasks/{id}` pour changer uniquement l'état ;
- `POST /api/assessments/{id}/tasks/generate` pour générer explicitement les tâches issues d'un assessment salarié.

`GET /api/tasks` accepte les filtres optionnels `employeeId` et `status`.

Ces routes sont retirées avec les autres routes API pendant l'export GitHub Pages statique.

## Modèle

Une tâche persistée contient :
- organisation ;
- salarié optionnel ;
- assessment optionnel ;
- `sourceKey` optionnel, utilisé uniquement comme provenance stable des tâches générées ;
- titre ;
- échéance optionnelle ;
- état : `todo`, `doing`, `done`, `cancelled` ;
- sévérité : `info`, `warning`, `critical` ;
- utilisateur assigné optionnel ;
- dates de création et de clôture.

Une tâche créée manuellement possède `sourceKey = null`. Une tâche générée depuis un assessment reçoit une clé déterministe telle que `checklist:<itemId>` ou `result:next-deadline`.

La création via l'API générale n'accepte pas encore `assignedToUserId`. L'assignation restera fermée tant que l'identité serveur ne résout pas réellement les membres de `organization_members`.

## Génération contrôlée depuis un assessment

La génération est **explicite** : terminer un assessment ne crée pas automatiquement des tâches. Depuis une analyse rattachée à un salarié, l'utilisateur peut déclencher « Créer les tâches de suivi ».

Le use-case `generateAssessmentComplianceTasks` applique les règles suivantes :
1. l'acteur doit posséder `task:write` ;
2. l'assessment doit appartenir à l'organisation courante ;
3. l'assessment doit être explicitement rattaché à un salarié ;
4. seuls les éléments de checklist `todo`, `attention` ou `blocked` deviennent des tâches ;
5. les éléments `done` sont ignorés ;
6. un item de checklist ne reçoit **aucune date inventée** : son `dueAt` reste `null` ;
7. si `result.nextDeadline` est réellement fourni par le moteur, une tâche d'échéance séparée est créée avec cette date ;
8. les `findings` ne sont pas transformés directement en tâches.

La sévérité dérivée reste opérationnelle et déterministe :
- `blocked` → `critical` ;
- `attention` → `warning` ;
- `todo` → `info`.

La génération ne modifie jamais le résultat juridique stocké dans l'assessment.

## Idempotence

PostgreSQL impose une unicité partielle sur `(organization_id, assessment_id, source_key)` lorsque `assessment_id` et `source_key` sont renseignés.

L'adapter expose `createIfAbsent`, qui utilise cette contrainte atomiquement. Relancer la génération pour le même assessment :
- ne crée pas de doublon ;
- retourne les `sourceKey` déjà présentes ;
- conserve les tâches existantes et leur état.

Le même comportement est reproduit par l'adapter mémoire pour les tests et le développement.

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
2. les références `employeeId` et `assessmentId` sont vérifiées dans l'organisation courante ;
3. le store PostgreSQL exécute ses opérations dans `withPostgresTenant` ;
4. la RLS PostgreSQL filtre `compliance_tasks` ;
5. le schéma impose des clés étrangères composites tenant-aware ;
6. l'unicité de provenance d'une tâche générée est elle aussi scoped par organisation et assessment.

Le schéma garantit également qu'un futur `assigned_to` correspond à un membership `(organization_id, user_id)` existant.

## Hors périmètre

Cette tranche ne fournit pas encore :
- création automatique de tâches sans action utilisateur ;
- déduction d'une échéance absente du moteur ;
- rappels asynchrones ;
- notifications ;
- assignation utilisateur via API ;
- édition du titre, de l'échéance ou de la sévérité ;
- suppression ;
- journalisation append-only des changements.
