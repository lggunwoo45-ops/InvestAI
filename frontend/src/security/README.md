# Security boundary

This directory is reserved for browser-safe security interfaces and UI. It
contains no credential storage or cryptographic implementation in Sprint 1.1.

Future security capabilities:

- API key manager
- permission manager
- encryption boundary
- explicit trading confirmation
- immutable audit log views
- session manager

Secrets, encryption keys, authorization decisions, and audit records must be
owned by trusted backend infrastructure, never by the browser bundle.
