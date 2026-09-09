# API

## POST `/api/analyse`
Crée un assessment, valide les entrées avec Zod, exécute le moteur juridique déterministe puis sauvegarde le snapshot via le repository d'assessment configuré.

Dans le prototype actuel, ce repository est un adapter mémoire. La persistence PostgreSQL cible n'est pas encore branchée.

> GitHub Pages ne peut pas exécuter cette route POST. Sur la démo statique, `StaticPagesAnalysisBridge` intercepte uniquement cet appel et exécute localement `assessForeignWorkerCase`, c'est-à-dire la même validation et le même moteur. La réponse garde la même forme `{ assessmentId, result }`, mais elle n'est pas persistée côté serveur.

### Exemple — recrutement d'un ressortissant de pays tiers en France
```json
{
  "action": "hire",
  "nationalityGroup": "third_country",
  "location": "france",
  "permitType": "employee",
  "permitValidUntil": "2027-08-31",
  "plannedStartDate": "2026-10-01",
  "contractType": "cdi",
  "newContract": true,
  "region": "Île-de-France",
  "occupation": "Technicien de maintenance",
  "salaryGrossMonthly": 2500,
  "registeredWithFranceTravail": false,
  "employerVerificationCompleted": false,
  "workAuthorizationGrantedForContract": false,
  "jobInShortageList": true,
  "offerPublishedThreeWeeks": null,
  "noValidCandidateReceived": null
}
```

Les réponses tri-state utilisent `true`, `false` ou `null`. `null` signifie que le fait n'est pas établi ; il peut conduire le moteur à `review_required` ou à une autre sortie prudente selon la règle applicable.

### Champs spécifiques utiles au parcours « Recruter »
- `plannedStartDate` : date de prise de poste envisagée ;
- `salaryGrossMonthly` : rémunération brute mensuelle proposée lorsqu'une autorisation doit être instruite ;
- `studentHoursPlanned` : volume annuel envisagé pour un titre étudiant ;
- `isApprenticeship` / `apprenticeshipValidated` : qualification de l'exception apprentissage ;
- `registeredWithFranceTravail` : présence d'un justificatif d'inscription France Travail pour l'exception modélisée aux vérifications préalables ;
- `employerVerificationCompleted` : vérification préfectorale déclarée accomplie lorsque celle-ci reste requise ;
- `studentPrefectureDeclarationCompleted` : déclaration nominative préalable propre à l'embauche d'un étudiant ;
- `workAuthorizationGrantedForContract` : autorisation déclarée obtenue pour le contrat précis analysé ;
- `jobInShortageList` : métier déclaré présent sur la liste applicable ;
- `offerPublishedThreeWeeks` / `noValidCandidateReceived` : faits utilisés pour le test du marché de l'emploi.

### Exemple — renouvellement
```json
{
  "action": "renew",
  "nationalityGroup": "third_country",
  "location": "france",
  "permitType": "employee",
  "permitValidUntil": "2026-10-31",
  "contractType": "cdi",
  "newContract": false,
  "renewalFiled": true,
  "renewalFiledAt": "2026-09-15",
  "renewalProofType": "extension_attestation",
  "renewalProofValidUntil": "2027-01-15",
  "renewalProofAllowsWork": null,
  "workAuthorizationValidUntil": "2026-10-31",
  "workAuthorizationRenewalFiled": true
}
```

### Champs spécifiques utiles au parcours « Renouveler »
- `renewalFiled` : état connu du dépôt de la demande ;
- `renewalFiledAt` : date de dépôt lorsqu'elle est connue ;
- `renewalProofType` : `none`, `submission_attestation`, `extension_attestation`, `receipt`, `favorable_decision_attestation`, `new_permit` ou `other` ;
- `renewalProofValidUntil` : échéance du justificatif ou du nouveau titre lorsqu'elle est connue ;
- `renewalProofAllowsWork` : mention de droit au travail d'un récépissé, avec `null` si elle n'est pas établie ;
- `workAuthorizationValidUntil` : échéance séparée de l'autorisation de travail pour les titres salarié / travailleur temporaire ;
- `workAuthorizationRenewalFiled` : état du renouvellement de cette autorisation.

Le `permitType` d'un renouvellement représente le **titre actuellement renouvelé**. Un récépissé ou une attestation de prolongation doit être fourni via `renewalProofType`, pas via `permitType`.

### Réponse `201`
```json
{
  "assessmentId": "uuid",
  "result": {
    "status": "conditional",
    "statusLabel": "Instruction possible sous conditions",
    "summary": "...",
    "canWorkNow": false,
    "workAuthorization": "yes",
    "employerVerification": "yes",
    "employmentSituation": "yes",
    "shortageOccupation": "yes",
    "nextDeadline": "2026-10-01",
    "confidence": "high",
    "findings": [],
    "checklist": [],
    "sourceIds": [],
    "appliedRules": [],
    "generatedAt": "2026-09-09T10:00:00.000Z",
    "disclaimer": "..."
  }
}
```

Sur GitHub Pages, la réponse de l'adapter statique utilise le même payload mais l'identifiant commence par `pages-` et n'implique aucune persistence distante.

`result.status` vaut :
- `clear` : aucun blocage détecté dans le périmètre modélisé et aucune démarche ouverte représentée par le moteur ;
- `conditional` : l'opération peut poursuivre son instruction mais une ou plusieurs conditions/démarches restent à satisfaire ;
- `blocked` : droit au travail non établi pour une prise ou un maintien en poste dans le cas analysé ;
- `review_required` : information déterminante manquante, régime spécial ou qualification juridique non modélisée de manière suffisamment sûre.

`appliedRules` contient pour chaque règle appliquée son identifiant stable, sa version, sa date d'effet, sa date de dernière revue et ses sources. Il sert à la traçabilité de l'assessment.

### Erreur `400`
Une entrée structurellement invalide ou incomplète pour un champ obligatoire renvoie :
```json
{
  "error": "Entrée invalide",
  "issues": ["message de validation"]
}
```

Une incertitude juridiquement pertinente ne doit pas être transformée artificiellement en erreur `400` lorsqu'elle peut être représentée par une valeur `null` et traitée fail-closed par le moteur.

## GET `/api/health`
Retourne l'état du service et le timestamp serveur courant. Cette route n'existe pas dans l'artefact GitHub Pages statique.
