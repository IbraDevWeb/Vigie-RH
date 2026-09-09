# Security baseline

The demo contains no real personal data. A production deployment handling residence permits must treat documents and extracted identity fields as sensitive personal data.

Minimum baseline before production:
- tenant isolation at database level;
- least-privilege RBAC;
- encrypted object storage and TLS everywhere;
- signed, short-lived document URLs;
- append-only audit trail;
- configurable retention and deletion workflows;
- secrets manager, never `.env` in production images;
- rate limiting and CSRF/session protection;
- dependency and container scanning;
- backups with restore drills;
- DPA/RGPD register and data-processing inventory;
- no model-training reuse of customer documents by default.

The rule engine must be deployable independently from any LLM provider so a model outage or provider change cannot alter legal conclusions.
