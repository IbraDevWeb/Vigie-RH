# Documents salariés — persistence serveur

Cette tranche branche les métadonnées de `employee_documents` sur la même architecture multi-tenant que les assessments et le portefeuille salariés.

## Périmètre

Le serveur peut désormais :
- créer les métadonnées d'un document pour un salarié ;
- lister les documents d'un salarié ;
- lire un document précis ;
- isoler chaque opération par organisation ;
- appliquer un RBAC explicite `document:read` / `document:write`.

Routes serveur :
- `GET /api/employees/{employeeId}/documents` ;
- `POST /api/employees/{employeeId}/documents` ;
- `GET /api/employees/{employeeId}/documents/{documentId}`.

Ces routes sont retirées avec les autres routes API lors de l'export GitHub Pages statique.

## Métadonnées persistées

Le record contient notamment :
- type documentaire ;
- libellé ;
- clé de stockage éventuelle (`storageKey`) ;
- date d'émission ;
- date de fin de validité ;
- champs extraits et confiance d'extraction ;
- confirmation humaine éventuelle ;
- date de création.

L'API de création de cette tranche n'accepte volontairement que les métadonnées documentaires de base (`documentType`, `label`, `storageKey`, `issuedAt`, `validUntil`). Les champs OCR/LLM et leur confirmation ne sont pas encore modifiables via cette route : ils restent réservés à une future chaîne d'extraction contrôlée.

## Sécurité multi-tenant

Trois niveaux se cumulent :
1. les use-cases exigent les permissions documentaires adaptées ;
2. chaque accès repository reçoit explicitement `organizationId` et s'exécute dans `withPostgresTenant` ;
3. PostgreSQL applique la RLS sur `employee_documents`.

La création vérifie en plus que le salarié parent existe dans l'organisation courante.

Le schéma SQL renforce cette règle avec une clé étrangère composite :
`(employee_id, organization_id) -> employees(id, organization_id)`.
Ainsi, un document ne peut pas être rattaché à un salarié d'une autre organisation même si une future régression applicative omettait la vérification.

## Validation

Les dates doivent être au format `YYYY-MM-DD`, correspondre à une date calendaire réelle et respecter `issuedAt <= validUntil` lorsque les deux sont fournies.

## Hors périmètre actuel

Cette tranche ne fournit pas encore :
- upload de fichier binaire ;
- stockage objet S3 compatible ;
- chiffrement applicatif ;
- antivirus / analyse de contenu ;
- OCR ou LLM ;
- confirmation des champs extraits ;
- suppression ou remplacement de documents ;
- journalisation append-only des mutations documentaires.

`storageKey` est donc une référence de stockage, pas une preuve qu'un backend objet est déjà opérationnel.
