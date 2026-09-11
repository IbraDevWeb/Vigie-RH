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

Le domaine `employee` distingue le read-model de démonstration utilisé par GitHub Pages des records persistants serveur pour les salariés et leurs métadonnées documentaires. Chaque document persistant porte désormais un marqueur explicite `isCurrent`, afin qu'une archive ne soit jamais interprétée comme situation courante par heuristique.

Le domaine `compliance` contient le record de tâche, ses états et sévérités ainsi que le contrat du read-model opérationnel de conformité.

## Application
Deux usages juridiques sont distincts :
- `assessForeignWorkerCase` : validation + exécution pure du moteur ;
- `createForeignWorkerAssessment` : autorisation de l'acteur + validation + exécution + création d'un identifiant + sauvegarde du snapshot et des versions de règles appliquées.

Un assessment peut être rattaché explicitement à un salarié par `employeeId`. Les analyses générales restent possibles sans rattachement. Aucun rapprochement d'assessment vers un salarié n'est effectué par nom ou autre heuristique.

Le contexte applicatif d'un acteur contient `userId`, `organizationId` et un rôle (`owner`, `hr`, `advisor`, `readonly`). Les permissions sont vérifiées dans la couche application, pas dans React.

Les opérations persistantes sur assessments, salariés, documents et tâches suivent le même principe : les use-cases reçoivent des ports, vérifient le RBAC et transportent explicitement l'organisation de l'acteur.

La création d'une tâche vérifie dans la couche application que ses références optionnelles vers un salarié ou un assessment existent dans l'organisation courante. Le changement d'état est séparé des autres mutations et gère `completedAt`.

`getComplianceOverview` charge les salariés, documents, assessments et tâches par organisation puis construit une vue opérationnelle en mémoire. Seuls les documents `isCurrent = true` participent aux échéances. L'absence de signal ne devient jamais automatiquement un verdict juridique « conforme » : sans assessment salarié, la vue reste `unknown` sauf signal plus fort.

En mode serveur :
- `/api/analyse` utilise `createForeignWorkerAssessment` ;
- `/api/compliance/overview` expose le read-model agrégé ;
- `/dashboard` consomme directement le même use-case de read-model et remplace les indicateurs de démonstration par des métriques issues des données persistées.

Les futurs use-cases doivent rester dans cette couche et dépendre de ports plutôt que d'adapters concrets.

## Infrastructure
Ports et adapters présents :
- `AssessmentRepository` avec adapters mémoire et PostgreSQL ;
- `EmployeeStore` avec adapters mémoire et PostgreSQL ;
- `EmployeeDocumentStore` avec adapters mémoire et PostgreSQL ;
- `ComplianceTaskStore` avec adapters mémoire et PostgreSQL ;
- `EmployeeRepository` historique pour le read-model de démonstration GitHub Pages.

Les stores PostgreSQL sont tenant-scoped. Chaque opération reçoit `organizationId` et passe par `withPostgresTenant`, qui renseigne `vigie.organization_id` à l'intérieur d'une transaction avant les requêtes métier.

Les repositories utilisés par le read-model disposent d'opérations de lecture par organisation, afin d'éviter un N+1 par salarié lors de l'agrégation du dashboard.

Les providers sélectionnent PostgreSQL lorsque `DATABASE_URL` est défini. Le fallback mémoire est interdit en environnement serveur de production afin d'éviter une perte silencieuse de données.

Le schéma PostgreSQL est décrit dans `db/schema.sql`. `db/rls.sql` active des policies Row-Level Security sur les tables tenant-scoped. Des clés étrangères composites renforcent l'intégrité tenant des liens document → salarié, assessment → salarié et tâche → salarié/assessment. Le futur utilisateur assigné à une tâche doit également correspondre à un membership de la même organisation.

Un index partiel cible les documents actuels afin de faciliter les lectures d'échéances sans mélanger les archives.

### Identité serveur
`resolveServerActor()` fournit uniquement un acteur de démonstration en environnement de développement. En production serveur, aucun utilisateur implicite n'est créé : tant qu'un véritable fournisseur d'identité/session n'est pas raccordé, l'API échoue explicitement.

Le rôle envoyé par un navigateur ne doit jamais devenir une source d'autorité. Le futur provider d'identité devra résoudre l'utilisateur authentifié puis son membership dans `organization_members`.

L'API des tâches n'accepte pas encore d'assignation utilisateur afin de ne pas contourner cette future résolution de membership.

### Adapter GitHub Pages
GitHub Pages ne peut pas exécuter de route POST Next.js. Le build Pages utilise donc `StaticPagesAnalysisBridge`, un adapter d'infrastructure client qui intercepte uniquement les appels d'analyse et exécute `assessForeignWorkerCase` dans le navigateur.

Le workflow retire `src/app/api` uniquement après la validation PostgreSQL, les tests et le typecheck, juste avant `next build` en mode `output: export`. En développement ou sur un hébergement serveur, les routes API restent présentes.

Le bridge ne contient aucune règle juridique et ne reçoit aucun secret PostgreSQL : il délègue au même use-case pur et au même moteur que le serveur.

Le dashboard conserve son portefeuille de démonstration uniquement pendant l'export GitHub Pages. En mode serveur, il utilise le read-model persistant. Les pages `/salaries` et `/salaries/[id]` conservent encore leur read-model de démonstration statique afin que GitHub Pages reste fonctionnel ; leur raccordement serveur constitue la tranche suivante.

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

Le dashboard serveur affiche des compteurs et priorités vérifiables issus du read-model. Il n'affiche pas de « score de conformité » synthétique : la métrique de couverture indique uniquement la proportion de salariés disposant d'au moins un assessment explicitement rattaché.

## Sources et IA
Le verdict ne dépend d'aucun LLM. Un futur OCR/LLM peut extraire des champs documentaires, mais ces champs doivent rester confirmables avant d'être injectés dans le moteur déterministe.

Les colonnes `extracted_fields`, `extraction_confidence`, `confirmed_by_user_id` et `confirmed_at` existent déjà dans le modèle documentaire, mais l'API de création de documents ne permet pas encore de renseigner ou confirmer automatiquement ces champs.

## CI et déploiement
`.github/workflows/deploy-pages.yml` exécute :
1. installation des dépendances ;
2. chargement réel de `db/schema.sql` puis `db/rls.sql` dans PostgreSQL 16 ;
3. tests Vitest ;
4. typecheck TypeScript ;
5. préparation de l'export statique ;
6. build Next.js ;
7. upload de l'artefact Pages ;
8. déploiement uniquement depuis `main`.

## Production target
Déjà amorcé :
- PostgreSQL pour assessments, salariés, métadonnées documentaires et tâches de conformité ;
- isolation tenant applicative + policies RLS ;
- RBAC applicatif owner / HR / advisor / read-only ;
- intégrité tenant renforcée entre les principales entités persistées ;
- read-model serveur de conformité sans score juridique inventé ;
- dashboard serveur alimenté par ce read-model.

À raccorder avant un usage réel :
- fournisseur d'identité/session et résolution des memberships ;
- génération contrôlée des tâches depuis les résultats du moteur ;
- raccordement des pages salariés au backend/read-model serveur ;
- stockage objet S3 compatible ;
- chiffrement applicatif des documents ;
- antivirus / contrôles de fichier ;
- OCR/extraction avec confirmation humaine ;
- audit log append-only ;
- queue pour rappels et synchronisations ;
- observabilité ;
- import légal versionné et signé ;
- tests E2E sur les parcours critiques.

Voir aussi `docs/PERSISTENCE-RBAC.md`, `docs/EMPLOYEE-PERSISTENCE.md`, `docs/EMPLOYEE-DOCUMENTS.md`, `docs/COMPLIANCE-TASKS.md` et `docs/COMPLIANCE-READ-MODEL.md`.
