# Changelog

## 2026-09-11 — Read-model de conformité

- ajout d'un read-model serveur agrégeant salariés, documents, assessments et tâches par organisation ;
- aucun score de conformité synthétique : la vue distingue uniquement les signaux opérationnels vérifiables et conserve `unknown` lorsque l'historique est insuffisant ;
- ajout d'un rattachement explicite optionnel `employeeId` sur les assessments persistants et de lectures par salarié/organisation ;
- ajout du marqueur documentaire `isCurrent`, avec valeur sûre `false` lorsqu'il est omis ;
- les échéances documentaires du read-model ignorent désormais explicitement les archives ;
- ajout de lectures repository par organisation pour éviter un N+1 lors de l'agrégation ;
- comptage des tâches ouvertes/retardées, documents actuels expirés/à échéance et salariés sans assessment ;
- génération d'une liste de priorités fondée uniquement sur tâches ouvertes et échéances de documents actuels ;
- ajout de `GET /api/compliance/overview` en mode serveur ;
- raccordement du dashboard serveur au read-model avec remplacement du score fictif par une couverture d'assessments vérifiable ;
- conservation du dashboard de démonstration uniquement pour l'export statique GitHub Pages ;
- documentation dédiée dans `docs/COMPLIANCE-READ-MODEL.md`.

## 2026-09-09 — Tâches de conformité persistantes

- ajout d'un modèle persistant `compliance_tasks` avec états et sévérités explicites ;
- routes serveur de création, liste, lecture et changement d'état ;
- filtres tenant-scoped par salarié et état ;
- permissions RBAC `task:read` / `task:write`, avec `readonly` en lecture seule ;
- vérification applicative des références salarié et assessment dans l'organisation courante ;
- contraintes SQL composites tenant-aware pour salarié, assessment et futur utilisateur assigné ;
- `completedAt` renseigné au passage à `done` et effacé lors d'une réouverture ;
- assignation utilisateur volontairement non exposée tant que les memberships authentifiés ne sont pas raccordés ;
- tests use-cases et adapter PostgreSQL dédiés ;
- compatibilité maintenue avec l'export statique GitHub Pages.

## 2026-09-09 — Documents salariés persistants

- ajout d'un modèle persistant dédié aux métadonnées `employee_documents` ;
- routes serveur de création, liste et lecture des documents d'un salarié ;
- permissions RBAC `document:read` et `document:write` ;
- adapter PostgreSQL exécuté sous contexte tenant transactionnel ;
- validation stricte des dates documentaires et de leur cohérence ;
- vérification applicative que le salarié parent appartient à l'organisation courante ;
- contrainte SQL composite empêchant le rattachement d'un document à un salarié d'une autre organisation ;
- champs OCR/LLM conservés dans le modèle mais non modifiables par l'API de création tant que la chaîne d'extraction contrôlée n'est pas implémentée ;
- aucune prétention d'upload S3 ou de chiffrement applicatif dans cette tranche ;
- compatibilité maintenue avec l'export statique GitHub Pages.

## 2026-09-09 — Persistence PostgreSQL & RBAC

- ajout d'un contexte applicatif `userId` / `organizationId` / rôle pour les opérations serveur ;
- RBAC `owner`, `hr`, `advisor`, `readonly` avec contrôle de `assessment:create` et `assessment:read` dans la couche application ;
- assessments désormais tenant-scoped et historisant l'utilisateur créateur ;
- ajout de `PostgresAssessmentRepository` avec requêtes paramétrées et contexte d'organisation transactionnel ;
- fallback mémoire conservé uniquement en développement et refusé en production serveur ;
- ajout de policies PostgreSQL Row-Level Security pour les tables tenant-scoped ;
- ajout d'un seed local de développement et des variables `.env.example` associées ;
- ajout de `GET /api/assessments/{id}` avec lecture RBAC et isolation par organisation ;
- aucune authentification de production fictive : l'API échoue explicitement tant qu'un véritable fournisseur d'identité n'est pas raccordé ;
- compatibilité maintenue avec l'export statique GitHub Pages.

## 2026-09-09 — Parcours « Rompre »

- ajout d'un questionnaire dédié aux situations où une rupture est envisagée à la suite d'une perte ou d'une incertitude sur le droit au travail ;
- distinction explicite entre l'interdiction éventuelle de maintenir le salarié au travail et la décision de rupture, qui reste soumise à une validation de droit social ;
- prise en compte de l'expiration du document, d'une activité non couverte, des documents temporaires et du périmètre de l'autorisation actuelle ;
- branche spéciale pour les salariés protégés avec blocage de toute conclusion automatique ;
- signalement des droits à calculer lorsqu'une période de travail sans autorisation est déclarée, notamment au regard de l'article L. 8252-2 ;
- conservation de `review_required` pour toute décision de rupture afin de ne pas automatiser un licenciement à partir du seul moteur de droit au travail ;
- ajout de sources Légifrance et Ministère du Travail dédiées ;
- tests moteur et validation dédiés.

## 2026-09-09 — Parcours « Peut-il travailler ? »

- ajout d'un questionnaire dédié au contrôle du droit au travail dans la situation actuelle ;
- contrôle de la validité du document et, pour les titres salarié / travailleur temporaire, du périmètre déclaré de l'autorisation conservée ;
- traitement du titre étudiant avec plafond annuel de 964 heures, apprentissage et autorisation correspondant à l'activité actuelle lorsque nécessaire ;
- maintien en `review_required` des documents provisoires, catégories génériques et régimes spéciaux insuffisamment qualifiés ;
- aucune formalité propre à une nouvelle embauche n'est déclenchée artificiellement dans ce parcours ;
- tests moteur et validation dédiés ;
- compatibilité maintenue avec le mode serveur et l'export statique GitHub Pages.

## 2026-09-09 — Parcours « Modifier »

- ajout d'un questionnaire dédié aux modifications de contrat, employeur, poste, région, rémunération et temps de travail ;
- distinction entre droit au travail actuel et possibilité d'appliquer la modification ;
- nouveau contrat traité séparément des modifications internes ;
- contrôle du périmètre de l'autorisation existante pour les changements sans nouveau contrat ;
- conservation de `review_required` lorsqu'une information juridiquement déterminante manque ;
- tests moteur et validation dédiés ;
- compatibilité maintenue avec le mode serveur et l'export statique GitHub Pages.

## 2026-09-09 — Parcours « Renouveler »

- distinction entre titre renouvelé et justificatif d'instruction ;
- prise en charge des attestations, récépissés et nouveaux titres dans le périmètre modélisé ;
- traitement fail-closed des justificatifs insuffisamment qualifiés.

## 2026-09-09 — Parcours « Recruter »

- questionnaire adaptatif ;
- contrôles liés à l'autorisation de travail, à la situation de l'emploi et aux formalités employeur ;
- traitement spécifique du titre étudiant dans le périmètre modélisé.
