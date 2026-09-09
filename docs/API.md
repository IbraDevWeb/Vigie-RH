# API

## POST `/api/analyse`
Crée un assessment, valide les entrées avec Zod, exécute le moteur juridique déterministe puis sauvegarde le snapshot via le repository d'assessment configuré.

Dans le prototype actuel, ce repository est un adapter mémoire. La persistence PostgreSQL cible n'est pas encore branchée.

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
- `studentDeclarationCompleted` : déclaration nominative préalable propre à l'embauche d'un étudiant ;
- `workAuthorizationGrantedForContract` : autorisation déclarée obtenue pour le contrat précis analysé ;
- `jobInShortageList` : métier déclaré présent sur la liste applicable ;
- `offerPublishedThreeWeeks` / `noValidCandidateReceived` : faits utilisés pour le test du marché de l'emploi.

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
Retourne l'état du service et le timestamp serveur courant.
