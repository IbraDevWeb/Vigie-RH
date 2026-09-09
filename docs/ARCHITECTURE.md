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
`src/domain/legal` contient :
- les types d'entrée et de sortie ;
- le registre des sources officielles ;
- les règles juridiques versionnées ;
- le moteur d'agrégation ;
- la validation des faits entrants.

Une règle est pure : elle déclare quand elle s'applique et retourne des `findings`, des éléments de checklist, des sources et éventuellement des patches de résultat. Les règles sont triées par priorité ; le moteur conserve la trace des règles appliquées dans `AssessmentResult.appliedRules`.

Le domaine applique une stratégie fail-closed : lorsqu'une information juridiquement déterminante est inconnue, une règle peut forcer `review_required`. L'UI ne doit pas reproduire ni contourner cette logique.

## Application
Deux usages sont actuellement distincts :
- `assessForeignWorkerCase` : validation + exécution pure du moteur ;
- `createForeignWorkerAssessment` : validation + exécution + création d'un identifiant + sauvegarde du snapshot et des versions de règles appliquées.

L'API `/api/analyse` utilise `createForeignWorkerAssessment`. La réponse contient donc un `assessmentId` et le `result` du moteur.

Les futurs use-cases (création de dossier salarié, renouvellement, notification, génération de tâches) doivent rester dans cette couche et dépendre de ports plutôt que d'adapters concrets.

## Infrastructure
Les données de démonstration restent isolées sous `src/infrastructure`.

Repositories actuellement présents :
- `EmployeeRepository` pour le portefeuille salarié ;
- `AssessmentRepository` pour les assessments ;
- adapter `InMemoryAssessmentRepository` pour le prototype.

L'adapter mémoire n'est pas une persistence de production. Le schéma cible PostgreSQL est décrit dans `db/schema.sql`, notamment avec `assessments.input_snapshot`, `result_snapshot` et `rule_versions`.

## Front
Les pages serveur rendent les données de référence. Le wizard d'analyse est un composant client qui appelle `/api/analyse`.

Le parcours « Recruter » est adaptatif : il n'affiche que les questions utiles au scénario déclaré et transporte les réponses tri-state (`true` / `false` / `null`) jusqu'au moteur. `null` doit rester une information inconnue et ne jamais être converti en fait positif ou négatif par l'UI.

Le résultat affiche notamment :
- statut global ;
- droit au travail immédiat ;
- exigence d'autorisation de travail ;
- vérification employeur ;
- situation de l'emploi ;
- métier en tension ;
- prochaine échéance ;
- findings et plan d'action ;
- sources ;
- règles appliquées et versions.

## Sources et IA
Le verdict ne dépend d'aucun LLM. Un futur OCR/LLM peut extraire des champs documentaires, mais ces champs doivent rester confirmables avant d'être injectés dans le moteur déterministe.

## Production target
- PostgreSQL, row-level tenancy par organisation ;
- RBAC : owner / HR / advisor / read-only ;
- chiffrement des documents ;
- audit log append-only ;
- queue pour rappels et synchronisations ;
- stockage objet S3 compatible ;
- observabilité ;
- import légal versionné et signé ;
- CI exécutant au minimum `npm run test`, `npm run typecheck` et `npm run build`.
