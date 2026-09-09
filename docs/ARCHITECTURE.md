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
- la validation Zod des faits entrants.

Une règle est pure : elle déclare quand elle s'applique et retourne des `findings`, des éléments de checklist, des sources et éventuellement des patches de résultat. Les règles sont triées par priorité ; le moteur conserve la trace des règles appliquées dans `AssessmentResult.appliedRules`.

Le domaine applique une stratégie fail-closed : lorsqu'une information juridiquement déterminante est inconnue, une règle peut forcer `review_required`. L'UI ne doit pas reproduire ni contourner cette logique.

### Recrutement
Les règles de recrutement séparent notamment :
- droit substantiel au travail ;
- autorisation de travail pour le contrat analysé ;
- vérification employeur ;
- situation de l'emploi ;
- formalités étudiantes.

### Renouvellement
`renewal.rules.ts` traite le titre actuel et la preuve de renouvellement comme deux objets distincts. Le moteur distingue notamment : preuve de dépôt, attestation de prolongation, récépissé, décision favorable, nouveau titre et justificatif non qualifié.

Une simple attestation de dépôt ne devient jamais automatiquement un droit au travail. La continuité de trois mois de la carte de résident est isolée dans une règle dédiée et n'est pas extrapolée aux autres titres.

## Application
Deux usages sont actuellement distincts :
- `assessForeignWorkerCase` : validation + exécution pure du moteur ;
- `createForeignWorkerAssessment` : validation + exécution + création d'un identifiant + sauvegarde du snapshot et des versions de règles appliquées.

En mode serveur, l'API `/api/analyse` utilise `createForeignWorkerAssessment`. La réponse contient un `assessmentId` et le `result` du moteur.

Les futurs use-cases doivent rester dans cette couche et dépendre de ports plutôt que d'adapters concrets.

## Infrastructure
Les données de démonstration restent isolées sous `src/infrastructure`.

Repositories actuellement présents :
- `EmployeeRepository` pour le portefeuille salarié ;
- `AssessmentRepository` pour les assessments ;
- adapter `InMemoryAssessmentRepository` pour le prototype.

L'adapter mémoire n'est pas une persistence de production. Le schéma cible PostgreSQL est décrit dans `db/schema.sql`, notamment avec `assessments.input_snapshot`, `result_snapshot` et `rule_versions`.

### Adapter GitHub Pages
GitHub Pages ne peut pas exécuter de route POST Next.js. Le build Pages utilise donc `StaticPagesAnalysisBridge`, un adapter d'infrastructure client qui intercepte uniquement les appels d'analyse et exécute `assessForeignWorkerCase` dans le navigateur.

Le workflow retire `src/app/api` uniquement après les tests et le typecheck, juste avant `next build` en mode `output: export`. En développement ou sur un hébergement serveur, les routes API restent présentes.

Le bridge ne contient aucune règle juridique : il délègue au même use-case pur et au même moteur que le serveur.

## Front
Le wizard est un composant client. Il collecte des réponses tri-state (`true` / `false` / `null`) et transporte `null` jusqu'au moteur comme information inconnue.

Les parcours « Recruter » et « Renouveler » sont adaptatifs. Le renouvellement possède un composant d'étape dédié afin de ne pas mélanger les faits de dépôt, les justificatifs provisoires et le titre en cours de renouvellement.

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

## CI et déploiement
`.github/workflows/deploy-pages.yml` exécute :
1. installation des dépendances ;
2. tests Vitest ;
3. typecheck TypeScript ;
4. préparation de l'export statique ;
5. build Next.js ;
6. upload de l'artefact Pages ;
7. déploiement uniquement depuis `main`.

## Production target
- PostgreSQL, row-level tenancy par organisation ;
- RBAC : owner / HR / advisor / read-only ;
- chiffrement des documents ;
- audit log append-only ;
- queue pour rappels et synchronisations ;
- stockage objet S3 compatible ;
- observabilité ;
- import légal versionné et signé ;
- tests E2E sur les parcours critiques.
