# API

## POST `/api/analyse`
Runs the deterministic legal assessment engine.

Example request:
```json
{
  "action": "hire",
  "nationalityGroup": "third_country",
  "location": "france",
  "permitType": "student",
  "contractType": "cdd",
  "newContract": true,
  "studentHoursPlanned": 700,
  "region": "Île-de-France",
  "occupation": "Assistant data"
}
```

The response contains:
- `status`: clear / conditional / blocked / review_required;
- `canWorkNow`;
- `workAuthorization`;
- `employerVerification`;
- `findings`;
- `checklist`;
- `sourceIds`;
- `generatedAt`.

## GET `/api/health`
Returns the service status and current server timestamp.
