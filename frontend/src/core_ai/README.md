# Core AI boundary

This directory is reserved for the future AI orchestration engine. It contains
no runtime implementation in Sprint 1.1.

Future expansion belongs here when it is provider-independent:

- GPT, Claude, and local-model orchestration
- model selection and fallback policy
- AI confidence calibration
- evidence-backed explanations and `Why?` generation
- comparison and consensus across multiple models

Provider SDK calls must remain behind service adapters. AI output must never be
treated as a trading command.
