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
- Moteur de règles pur et testable
- Vitest

## Lancer le projet
```bash
npm install
npm run dev
```
Puis ouvrir `http://localhost:3000`.

## Vérifications locales
```bash
npm run test
npm run typecheck
npm run build
```

Le dépôt ne contient pas encore de workflow GitHub Actions : ces contrôles doivent donc être exécutés localement tant qu'une CI n'a pas été ajoutée.

## Routes
- `/` : landing page
- `/dashboard` : tableau de bord conformité
- `/analyse` : moteur de décision guidé
- `/salaries` : portefeuille des salariés
- `/salaries/[id]` : dossier salarié
- `/audit` : audit entreprise
- `/sources` : registre juridique versionné
- `/api/analyse` : création et exécution d'un assessment juridique
- `/api/health` : healthcheck

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

## Architecture
Voir `docs/ARCHITECTURE.md`, `docs/LEGAL-GOVERNANCE.md` et `docs/API.md`.

## Ce qui est déjà prêt
- UI SaaS responsive ;
- parcours recrutement renforcé, plus parcours renouvellement / modification / rupture / droit au travail ;
- moteur de règles isolé du front ;
- sources officielles versionnées ;
- règles appliquées historisées dans le résultat (`appliedRules`) ;
- gestion explicite de l'incertitude via `review_required` ;
- alertes d'expiration ;
- portefeuille et dossier salarié ;
- audit de conformité ;
- API d'analyse avec identifiant d'assessment ;
- repository d'assessment et adapter mémoire de démonstration ;
- tests unitaires du moteur, de la validation et du use-case de création ;
- Dockerfile ;
- schéma PostgreSQL cible dans `db/schema.sql`.

## Limites actuelles
- l'adapter d'assessment est en mémoire : il n'est pas une persistence de production ;
- PostgreSQL, authentification et RBAC ne sont pas encore branchés ;
- aucun OCR/LLM ne participe au verdict ;
- le recrutement depuis l'étranger n'est pas modélisé de bout en bout (introduction, visa, séjour) et reste fail-closed ;
- certaines sous-catégories de titres et certains régimes spéciaux nécessitent encore une branche dédiée ;
- les contrôles juridiques doivent être revus par un professionnel habilité avant usage réel.

## Étapes production recommandées
1. Faire auditer chaque règle du moteur par un avocat/juriste habilité.
2. Brancher PostgreSQL + authentification + RBAC.
3. Ajouter chiffrement applicatif des documents et journal d'audit.
4. Connecter les sources officielles (Légifrance/API PISTE, jeux de données métiers en tension).
5. Ajouter extraction documentaire (OCR/LLM) comme **outil d'extraction uniquement**, avec confirmation humaine des champs.
6. Ajouter tests E2E, CI et monitoring.

## Modèle de données production
Un schéma PostgreSQL de référence est fourni dans `db/schema.sql` avec multi-tenant, documents, versions de règles, assessments, tâches et audit log.
