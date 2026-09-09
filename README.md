# Vigie RH

**Code du travail numérique du salarié étranger** — prototype SaaS B2B de conformité employeur.

Vigie RH transforme une situation opérationnelle (recruter, renouveler, modifier, vérifier le droit au travail, rompre) en un parcours structuré : diagnostic, niveau de risque, checklist, alertes et sources.

> **Important** : le contenu juridique livré ici est un socle de démonstration à faire valider et maintenir par un professionnel habilité avant tout usage réel. Le moteur privilégie volontairement `review_required` lorsque le cas exige une analyse plus fine.

## Stack
- Next.js 16.3.3 / App Router
- React 19.2.7
- TypeScript strict
- CSS natif, aucun framework UI
- Moteur de règles pur et testable
- Vitest

## Lancer le projet
```bash
npm install
npm run dev
```
Puis ouvrir `http://localhost:3000`.

## Déploiement GitHub Pages
Le workflow `.github/workflows/deploy-pages.yml` exécute les tests, le typecheck et un export statique Next.js avant de publier le dossier `out/` sur GitHub Pages.

Sur GitHub Pages, le moteur d'analyse déterministe s'exécute directement dans le navigateur : aucune API serveur n'est nécessaire pour utiliser la démonstration.

Site : `https://ibradevweb.github.io/Vigie-RH/`

## Routes
- `/` : landing page
- `/dashboard` : tableau de bord conformité
- `/analyse` : moteur de décision guidé
- `/salaries` : portefeuille des salariés
- `/salaries/[id]` : dossier salarié pré-généré pour les données de démonstration
- `/audit` : audit entreprise
- `/sources` : registre juridique versionné

## Architecture
Voir `docs/ARCHITECTURE.md` et `docs/LEGAL-GOVERNANCE.md`.

## Ce qui est déjà prêt
- UI SaaS responsive complète ;
- parcours recrutement / renouvellement / modification / rupture / droit au travail ;
- moteur de règles isolé du front ;
- sources officielles versionnées ;
- gestion explicite de l'incertitude ;
- alertes d'expiration ;
- portefeuille et dossier salarié ;
- audit de conformité ;
- analyse utilisable en hébergement statique GitHub Pages ;
- tests unitaires du moteur ;
- Dockerfile ;
- interfaces de repository prêtes pour PostgreSQL.

## Étapes production recommandées
1. Faire auditer chaque règle du moteur par un avocat/juriste habilité.
2. Brancher PostgreSQL + authentification + RBAC.
3. Ajouter chiffrement applicatif des documents et journal d'audit.
4. Connecter les sources officielles (Légifrance/API PISTE, jeux de données métiers en tension).
5. Ajouter extraction documentaire (OCR/LLM) comme **outil d'extraction uniquement**.
6. Ajouter tests E2E et monitoring.

## Modèle de données production
Un schéma PostgreSQL de référence est fourni dans `db/schema.sql` avec multi-tenant, documents, versions de règles, assessments, tâches et audit log.
