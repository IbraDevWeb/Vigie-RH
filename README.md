# Vigie RH

**Code du travail numérique du salarié étranger** — prototype SaaS B2B de conformité employeur.

Vigie RH transforme une situation opérationnelle (recruter, renouveler, modifier, vérifier le droit au travail, rompre) en un parcours structuré : diagnostic, niveau de risque, checklist, alertes, traçabilité des règles et sources.

> **Important** : le contenu juridique livré ici est un socle de démonstration à faire valider et maintenir par un professionnel habilité avant tout usage réel. Le moteur privilégie volontairement `review_required` lorsqu'une information déterminante manque, qu'un régime spécial n'est pas modélisé ou qu'une qualification juridique plus précise est requise.

## Stack
- Next.js 16.3.3 / App Router
- React 19.2.7
- TypeScript strict
- Zod pour la validation des entrées
- CSS natif, aucun framework UI
- moteur de règles pur et testable
- Vitest

## Lancer le projet
```bash
npm install
npm run dev
```
Puis ouvrir `http://localhost:3000`.

## Vérifications
```bash
npm test
npm run typecheck
npm run build
```

La CI GitHub exécute les tests, le typecheck et un export statique avant toute publication GitHub Pages.

## Déploiement GitHub Pages
Le site public est publié sur `https://ibradevweb.github.io/Vigie-RH/` avec `.github/workflows/deploy-pages.yml`. Chaque push sur `main` déclenche la validation et, si elle réussit, la publication de la nouvelle version.

Deux modes coexistent :
- **serveur/local** : `/api/analyse` exécute le use-case d'application et sauvegarde l'assessment dans l'adapter mémoire de démonstration ;
- **GitHub Pages** : les routes serveur sont retirées uniquement pendant l'export statique et `StaticPagesAnalysisBridge` exécute localement le même moteur validé par Zod. Aucun verdict juridique différent n'est implémenté dans l'UI.

Cette séparation permet de conserver l'architecture cible tout en gardant une démonstration publique réellement utilisable sur un hébergement statique.

## Routes
- `/` : landing page
- `/dashboard` : tableau de bord conformité
- `/analyse` : moteur de décision guidé
- `/salaries` : portefeuille des salariés
- `/salaries/[id]` : dossier salarié
- `/audit` : audit entreprise
- `/sources` : registre juridique versionné
- `/api/analyse` : création et exécution d'un assessment juridique en mode serveur
- `/api/health` : healthcheck en mode serveur

## Parcours « Nouvelle analyse — Recruter »
Le parcours de recrutement collecte de manière adaptative les faits nécessaires à l'analyse :
- nationalité et localisation de la personne ;
- document/titre et date de validité ;
- contrat, date de prise de poste, poste, région et rémunération ;
- situation particulière des étudiants, dont le plafond de 964 h et l'apprentissage ;
- existence d'une autorisation de travail pour le contrat analysé ;
- situation de l'emploi : métier en tension ou test du marché de l'emploi ;
- vérification préfectorale et exception France Travail ;
- déclaration nominative préalable propre au recrutement d'un étudiant.

Les catégories génériques qui ne permettent pas une qualification sûre, notamment certains cas « vie privée et familiale », « Talent », documents temporaires ou régimes spéciaux, restent en `review_required` tant que les informations exactes ne sont pas modélisées.

## Parcours « Nouvelle analyse — Renouveler »
Le renouvellement distingue explicitement le **titre actuellement renouvelé** du **justificatif reçu pendant l'instruction**.

Le parcours collecte notamment :
- type et échéance du titre actuel ;
- état et date du dépôt du renouvellement ;
- attestation de dépôt, attestation de prolongation, récépissé, décision favorable, nouveau titre ou justificatif non qualifié ;
- date de validité du justificatif lorsqu'elle est connue ;
- mention du récépissé autorisant ou non le travail ;
- activité étudiante et apprentissage lorsque ces données influencent le droit au travail ;
- échéance et renouvellement de l'autorisation de travail pour les titres salarié / travailleur temporaire.

Le moteur ne transforme jamais une simple preuve de dépôt en droit au travail. Les informations manquantes ou les justificatifs dont l'effet n'est pas suffisamment qualifié passent en `review_required`. La continuité de trois mois de la carte de résident est isolée dans une règle dédiée et n'est pas généralisée aux autres titres.

## Parcours « Nouvelle analyse — Modifier »
Le parcours de modification sépare la **situation actuellement autorisée** de la **configuration d'emploi proposée** afin de ne pas confondre le droit au travail actuel et la possibilité d'appliquer la modification.

Le parcours collecte notamment :
- date d'effet envisagée ;
- nouveau contrat ou maintien du contrat actuel ;
- changement d'employeur ;
- poste actuel et poste proposé ;
- région actuelle et région proposée ;
- rémunération et durée du travail proposées ;
- situation particulière de l'étudiant et volume annuel envisagé ;
- existence d'une autorisation correspondant au nouveau contrat lorsqu'une nouvelle autorisation doit être instruite ;
- lorsque le contrat reste le même, confirmation que l'autorisation existante couvre déjà l'activité et la zone géographique proposées.

Le moteur applique directement l'exigence de nouvelle autorisation lorsqu'un **nouveau contrat** entre dans le cas modélisé. Pour une modification sans nouveau contrat, un changement de poste, de région ou d'employeur n'est pas transformé automatiquement en nouvelle obligation : si le périmètre de l'autorisation existante n'est pas établi, le résultat passe en `review_required`. Le résultat distingue explicitement le maintien du droit au travail actuel de la possibilité d'appliquer immédiatement la modification.

## Parcours « Nouvelle analyse — Peut-il travailler ? »
Ce parcours répond à une question distincte des formalités de recrutement : **le droit au travail est-il établi aujourd'hui dans la situation actuelle ?**

Il contrôle notamment :
- la nationalité déclarée ;
- le document actuel et sa date de validité ;
- la mention exacte lorsqu'un récépissé ou une attestation provisoire est utilisé ;
- pour un titre « salarié » ou « travailleur temporaire », la correspondance déclarée entre l'autorisation conservée et le contrat, l'activité et la zone d'emploi actuels ;
- pour un étudiant, le volume annuel de travail, l'éventuelle exception apprentissage et, au-delà de 964 heures hors exception modélisée, l'existence d'une autorisation correspondant à l'activité actuelle.

Le parcours ne déclenche pas artificiellement les formalités propres à une nouvelle embauche. Si le périmètre de l'autorisation actuelle est inconnu, la valeur reste inconnue et le résultat passe en `review_required`. Les documents provisoires restent également en revue lorsque leur fondement ou leur mention exacte ne permet pas une qualification automatique suffisamment sûre.

## Parcours « Nouvelle analyse — Rompre »
Ce parcours est réservé aux situations où l'employeur envisage une rupture **en raison d'une perte, d'un refus ou d'une incertitude sur le droit au travail**. Il ne modélise pas les autres motifs de licenciement et ne produit jamais automatiquement une décision ou une lettre de rupture.

Il collecte notamment :
- le contrat actuel et le motif à l'origine du contrôle ;
- le document actuel, sa validité et, lorsque cela est pertinent, le périmètre de l'autorisation correspondant au contrat, à l'activité et à la zone d'emploi ;
- la date à laquelle le droit au travail aurait cessé, si elle est établie ;
- le statut éventuel de salarié protégé ;
- l'existence éventuelle d'une période de travail sans droit au travail établi ;
- pour les étudiants, le volume annuel de travail, l'apprentissage et l'autorisation éventuellement nécessaire au-delà du seuil modélisé.

Le moteur sépare volontairement **le maintien au travail** de **la rupture du contrat**. Lorsqu'il établit que le droit au travail n'est plus présent dans les faits renseignés, il peut indiquer que le maintien au travail n'est pas possible dans l'état du dossier. En revanche, le résultat global reste en `review_required` afin que la procédure de rupture, les protections particulières et les sommes dues soient validées en droit social avant toute notification. Une période de travail sans autorisation déclarée déclenche également un contrôle dédié des droits prévus à l'article L. 8252-2.

## Architecture
Voir `docs/ARCHITECTURE.md`, `docs/LEGAL-GOVERNANCE.md` et `docs/API.md`.

## Ce qui est déjà prêt
- UI SaaS responsive ;
- cinq parcours renforcés : « Recruter », « Renouveler », « Modifier », « Peut-il travailler ? » et « Rompre » ;
- moteur de règles isolé du front ;
- sources officielles versionnées ;
- règles appliquées historisées dans le résultat (`appliedRules`) ;
- gestion explicite de l'incertitude via `review_required` ;
- alertes d'expiration ;
- portefeuille et dossier salarié ;
- audit de conformité ;
- API d'analyse avec identifiant d'assessment en mode serveur ;
- repository d'assessment et adapter mémoire de démonstration ;
- adapter statique GitHub Pages ;
- tests unitaires du moteur, de la validation et du use-case de création ;
- CI GitHub Actions ;
- Dockerfile ;
- schéma PostgreSQL cible dans `db/schema.sql`.

## Limites actuelles
- l'adapter d'assessment est en mémoire : il n'est pas une persistence de production ;
- la démo GitHub Pages n'a par nature aucune persistence serveur ;
- PostgreSQL, authentification et RBAC ne sont pas encore branchés ;
- aucun OCR/LLM ne participe au verdict ;
- le recrutement depuis l'étranger n'est pas modélisé de bout en bout (introduction, visa, séjour) et reste fail-closed ;
- certaines sous-catégories de titres et certains régimes spéciaux nécessitent encore une branche dédiée ;
- le parcours « Rompre » ne remplace pas l'analyse de la procédure de licenciement, du statut protecteur, du calcul des sommes dues ou des autres règles de droit social ;
- les contrôles juridiques doivent être revus par un professionnel habilité avant usage réel.

## Étapes production recommandées
1. Faire auditer chaque règle du moteur par un avocat/juriste habilité.
2. Brancher PostgreSQL + authentification + RBAC.
3. Ajouter chiffrement applicatif des documents et journal d'audit.
4. Connecter les sources officielles (Légifrance/API PISTE, jeux de données métiers en tension).
5. Ajouter extraction documentaire (OCR/LLM) comme **outil d'extraction uniquement**, avec confirmation humaine des champs.
6. Ajouter tests E2E et monitoring.

## Modèle de données production
Un schéma PostgreSQL de référence est fourni dans `db/schema.sql` avec multi-tenant, documents, versions de règles, assessments, tâches et audit log.
