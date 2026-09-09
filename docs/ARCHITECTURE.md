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

Les cinq parcours principaux sont isolés par règles et/ou étapes dédiées : recruter, renouveler, modifier, contrôler le droit au travail actuel et rompre. La branche « Rompre » ne transforme jamais automatiquement la perte du droit au travail en décision de licenciement.

## Application
Deux usages sont distincts :
- `assessForeignWorkerCase` : validation + exécution pure du moteur ;
- `createForeignWorkerAssessment` : autorisation de l'acteur + validation + exécution + création d'un identifiant + sauvegarde du snapshot et des versions de règles appliquées.

Le contexte applicatif d'un acteur contient `userId`, `organizationId` et un rôle (`owner`, `hr`, `advisor`, `readonly`). Les permissions sont vérifiées dans la couche application, pas dans React.

En mode serveur, l'API `/api/analyse` utilise `createForeignWorkerAssessment`. La réponse contient un `assessmentId` et le `result` du moteur.

Les futurs use-cases doivent rester dans cette couche et dépendre de ports plutôt que d'adapters concrets.

## Infrastructure
Repositories présents :
- `EmployeeRepository` pour le portefeuille salarié ;
- `AssessmentRepository` pour les assessments ;
- `InMemoryAssessmentRepository` pour le développement ;
- `PostgresAssessmentRepository` pour la persistence serveur.

Le repository d'assessment est tenant-scoped : chaque enregistrement porte l'organisation et l'utilisateur créateur, et `findById` exige l'organisation attendue.

`assessment-repository-provider.ts` sélectionne PostgreSQL lorsque `DATABASE_URL` est défini. Le fallback mémoire est interdit en environnement serveur de production afin d'éviter une perte silencieuse de données.

Le schéma PostgreSQL est décrit dans `db/schema.sql`. `db/rls.sql` active des policies Row-Level Security sur les tables tenant-scoped et `PostgresAssessmentRepository` renseigne `vigie.organization_id` dans chaque transaction avant d'accéder aux assessments.

### Identité serveur
`resolveServerActor()` fournit uniquement un acteur de démonstration en environnement de développement. En production serveur, aucun utilisateur implicite n'est créé : tant qu'un véritable fournisseur d'identité/session n'est pas raccordé, l'API échoue explicitement.

Le rôle envoyé par un navigateur ne doit jamais devenir une source d'autorité. Le futur provider d'identité devra résoudre l'utilisateur authentifié puis son membership dans `organization_members`.

### Adapter GitHub Pages
GitHub Pages ne peut pas exécuter de route POST Next.js. Le build Pages utilise donc `StaticPagesAnalysisBridge`, un adapter d'infrastructure client qui intercepte uniquement les appels d'analyse et exécute `assessForeignWorkerCase` dans le navigateur.

Le workflow retire `src/app/api` uniquement après les tests et le typecheck, juste avant `next build` en mode `output: export`. En développement ou sur un hébergement serveur, les routes API restent présentes.

Le bridge ne contient aucune règle juridique et ne reçoit aucun secret PostgreSQL : il délègue au même use-case pur et au même moteur que le serveur.

## Front
Le wizard est un composant client. Il collecte des réponses tri-state (`true` / `false` / `null`) et transporte `null` jusqu'au moteur comme information inconnue.

Les parcours « Recruter », « Renouveler », « Modifier », « Peut-il travailler ? » et « Rompre » disposent d'étapes dédiées lorsque leurs faits opérationnels divergent.

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
Déjà amorcé :
- PostgreSQL pour les assessments ;
- isolation tenant applicative + policies RLS ;
- RBAC applicatif owner / HR / advisor / read-only.

À raccorder avant un usage réel :
- fournisseur d'identité/session et résolution des memberships ;
- repositories PostgreSQL pour salariés, documents, tâches et audit ;
- chiffrement des documents ;
- audit log append-only ;
- queue pour rappels et synchronisations ;
- stockage objet S3 compatible ;
- observabilité ;
- import légal versionné et signé ;
- tests E2E sur les parcours critiques.

Voir aussi `docs/PERSISTENCE-RBAC.md`.
