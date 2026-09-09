# Portefeuille salariés persistant

## Objectif

Le portefeuille de démonstration et le modèle PostgreSQL sont volontairement séparés.

Les composants GitHub Pages continuent d'utiliser `demoEmployees` pour fournir une démo statique sans backend. En mode serveur, les données persistantes passent par `EmployeeStore`, les use-cases de la couche application et les routes `/api/employees`.

## Données persistées

Le record serveur correspond aux colonnes de `employees` dans `db/schema.sql` :

- `id` ;
- `organizationId` ;
- `firstName` / `lastName` ;
- code de nationalité à deux lettres lorsqu'il est connu ;
- intitulé de poste ;
- site de travail ;
- type de contrat ;
- dates de création et de mise à jour.

Les champs de démonstration comme `riskLabel`, `nextAction` ou la timeline ne sont pas écrits dans cette table. Ils devront être construits à partir des documents, assessments, tâches et événements réels.

## RBAC

- `owner` et `hr` peuvent créer des salariés ;
- `advisor` et `readonly` disposent de la lecture mais pas de `employee:write` ;
- toute liste et toute recherche individuelle sont bornées par `organizationId`.

Les contrôles sont exécutés dans les use-cases, et PostgreSQL applique en plus les policies RLS de `db/rls.sql`.

## API serveur

### `GET /api/employees`
Retourne uniquement les salariés de l'organisation de l'acteur authentifié.

### `POST /api/employees`
Crée un salarié dans l'organisation de l'acteur.

Exemple :

```json
{
  "firstName": "Nora",
  "lastName": "Martin",
  "nationalityCode": "FR",
  "roleTitle": "Responsable RH",
  "workSite": "Paris",
  "contractType": "CDI"
}
```

Le code de nationalité est normalisé en majuscules et doit contenir exactement deux lettres. Cette validation de forme ne prétend pas, à elle seule, certifier qu'il s'agit d'un code officiel existant.

### `GET /api/employees/{id}`
Retourne le record uniquement si l'identifiant appartient à l'organisation courante. Un identifiant d'une autre organisation est traité comme introuvable.

## Adapters

- `InMemoryEmployeeStore` : développement serveur uniquement ;
- `PostgresEmployeeStore` : production serveur avec `DATABASE_URL` ;
- `InMemoryEmployeeRepository` : read-model historique de la démo GitHub Pages, distinct de la persistence serveur.

La séparation temporaire des deux abstractions évite de transformer les données de présentation de la démo en modèle de persistence.

## Étapes suivantes

1. brancher `employee_documents` avec un repository tenant-scoped ;
2. construire un read-model salarié depuis le record, les documents, assessments et tâches ;
3. remplacer progressivement les mocks sur un hébergement serveur authentifié ;
4. conserver une fixture dédiée pour GitHub Pages ;
5. ajouter les écritures d'audit pour création et consultation sensible.
