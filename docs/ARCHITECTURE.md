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

Le domaine `employee` distingue le read-model de démonstration utilisé par GitHub Pages des records persistants serveur pour les salariés et leurs métadonnées documentaires. Chaque document persistant porte un marqueur explicite `isCurrent`, afin qu'une archive ne soit jamais interprétée comme situation courante par heuristique.

Le dossier salarié serveur agrège uniquement des données persistées explicitement rattachées au salarié : identité RH stockée, documents, assessments et tâches. Les libellés de risque, titres de démonstration et « prochaines actions » statiques ne sont jamais utilisés comme source de vérité côté serveur.

Le domaine `compliance` contient le record de tâche, ses états et sévérités ainsi que le contrat du read-model opérationnel de conformité. Les tâches générées depuis un assessment portent un `sourceKey` stable de provenance ; les tâches manuelles gardent `sourceKey = null`.

## Application
Deux usages juridiques sont distincts :
- `assessForeignWorkerCase` : validation + exécution pure du moteur ;
- `createForeignWorkerAssessment` : autorisation de l'acteur + validation + exécution + création d'un identifiant + sauvegarde du snapshot et des versions de règles appliquées.

Un assessment peut être rattaché explicitement à un salarié par `employeeId`. Les analyses générales restent possibles sans rattachement. Aucun rapprochement d'assessment vers un salarié n'est effectué par nom ou autre heuristique.

Le contexte applicatif d'un acteur contient `userId`, `organizationId` et un rôle (`owner`, `hr`, `advisor`, `readonly`). Les permissions sont vérifiées dans la couche application, pas dans React.

Les opérations persistantes sur assessments, salariés, documents et tâches suivent le même principe : les use-cases reçoivent des ports, vérifient le RBAC et transportent explicitement l'organisation de l'acteur.

La création manuelle d'une tâche vérifie dans la couche application que ses références optionnelles vers un salarié ou un assessment existent dans l'organisation courante. Le changement d'état est séparé des autres mutations et gère `completedAt`.

`generateAssessmentComplianceTasks` transforme, uniquement à la demande de l'utilisateur, les actions ouvertes d'un assessment salarié en tâches persistantes. Le use-case ne lit que le snapshot enregistré : les checklist `done` sont ignorées, les autres utilisent leur identifiant stable comme provenance, et seule une `nextDeadline` explicitement produite par le moteur peut devenir une tâche datée. Il n'invente ni action ni échéance et n'altère pas le verdict juridique.

`getComplianceOverview` charge les salariés, documents, assessments et tâches par organisation puis construit une vue opérationnelle en mémoire. Seuls les documents `isCurrent = true` participent aux échéances. L'absence de signal ne devient jamais automatiquement un verdict juridique « conforme » : sans assessment salarié, la vue reste `unknown` sauf signal plus fort.

`getEmployeeDossier` charge le salarié demandé dans l'organisation de l'acteur puis agrège ses documents, assessments et tâches. Les documents sont séparés entre `currentDocuments` et `historicalDocuments`; les assessments et tâches ne sont jamais rapprochés par heuristique.

En mode serveur :
- `/api/analyse` utilise `createForeignWorkerAssessment` pour les analyses générales ;
- `/api/employees/[id]/assessments` crée et liste les analyses explicitement rattachées au salarié après contrôle RBAC et tenant ;
- `POST /api/assessments/[id]/tasks/generate` matérialise explicitement les actions ouvertes d'un assessment salarié en tâches idempotentes ;
- `/api/compliance/overview` expose le read-model agrégé ;
- `/salaries` utilise les salariés persistants ;
- `/salaries/[id]` utilise le dossier salarié persistant.

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

`ComplianceTaskStore.createIfAbsent` fournit l'opération atomique utilisée par la génération. PostgreSQL s'appuie sur un index unique partiel `(organization_id, assessment_id, source_key)` afin que deux déclenchements concurrents ne puissent pas créer le même suivi. L'adapter mémoire reproduit ce comportement pour les tests et le développement.

Les providers sélectionnent PostgreSQL lorsque `DATABASE_URL` est défini. Le fallback mémoire est interdit en environnement serveur de production afin d'éviter une perte silencieuse de données.

Le schéma PostgreSQL est décrit dans `db/schema.sql`. `db/rls.sql` active des policies Row-Level Security sur les tables tenant-scoped. Des clés étrangères composites renforcent l'intégrité tenant des liens document → salarié, assessment → salarié et tâche → salarié/assessment. Le futur utilisateur assigné à une tâche doit également correspondre à un membership de la même organisation.

Un index partiel cible les documents actuels afin de faciliter les lectures d'échéances sans mélanger les archives.

### Identité serveur
`resolveServerActor()` fournit uniquement un acteur de démonstration en environnement de développement. En production serveur, aucun utilisateur implicite n'est créé : tant qu'un véritable fournisseur d'identité/session n'est pas raccordé, l'API échoue explicitement.

Le rôle envoyé par un navigateur ne doit jamais devenir une source d'autorité. Le futur provider d'identité devra résoudre l'utilisateur authentifié puis son membership dans `organization_members`.

L'API des tâches n'accepte pas encore d'assignation utilisateur afin de ne pas contourner cette future résolution de membership.

### Adapters d'analyse côté navigateur
GitHub Pages ne peut pas exécuter de route POST Next.js. Le build Pages utilise donc `StaticPagesAnalysisBridge`, un adapter d'infrastructure client qui intercepte uniquement les appels d'analyse et exécute `assessForeignWorkerCase` dans le navigateur.

Le workflow retire `src/app/api` uniquement après la validation PostgreSQL, les tests et le typecheck, juste avant `next build` en mode `output: export`. En développement ou sur un hébergement serveur, les routes API restent présentes.

Le bridge Pages ne contient aucune règle juridique et ne reçoit aucun secret PostgreSQL : il délègue au même use-case pur et au même moteur que le serveur.

En mode serveur, `EmployeeAnalysisBridge` est activé sur `/analyse`. Lorsque la page est ouverte depuis une fiche persistante avec `?employeeId=...`, il redirige uniquement le POST du wizard vers `/api/employees/[id]/assessments`. Le paramètre navigateur ne confère aucun droit : l'endpoint salarié vérifie toujours l'acteur, l'organisation et l'existence du salarié avant la persistance. Après une création réussie, le bridge publie seulement l'identifiant de l'assessment au composant de suivi ; la génération de tâches reste une action utilisateur distincte et serveur.

Les pages `/salaries` et `/salaries/[id]` utilisent le backend persistant en mode serveur, mais conservent un chemin de rendu de démonstration lors de l'export GitHub Pages afin que la vitrine statique reste fonctionnelle.

## Front
Le wizard est un composant client. Il collecte des réponses tri-state (`true` / `false` / `null`) et transporte `null` jusqu'au moteur comme information inconnue.

Les parcours « Recruter », « Renouveler », « Modifier », « Peut-il travailler ? » et « Rompre » disposent d'étapes dédiées lorsque leurs faits opérationnels divergent.

Depuis une fiche salarié persistante, l'action « Analyser ce salarié » ouvre le même wizard avec l'identifiant du salarié dans l'URL. L'adapter serveur décrit ci-dessus fait persister le résultat comme assessment rattaché ; une analyse ouverte directement depuis `/analyse` reste générale et non rattachée.

Après une analyse salarié réussie en mode serveur, un panneau propose « Créer les tâches de suivi ». Le clic appelle le use-case de génération contrôlée. Ce panneau n'est pas inclus dans la démo GitHub Pages statique, où aucune persistence serveur n'existe.

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
- pages salariés serveur alimentées par les données persistantes ;
- création d'assessments explicitement rattachés depuis la fiche salarié ;
- génération contrôlée et idempotente des tâches depuis la checklist et l'échéance explicite d'un assessment salarié.

À raccorder avant un usage réel :
- fournisseur d'identité/session et résolution des memberships ;
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
