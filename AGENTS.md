# InvestAI development agreement

- Start from the deployed main revision and a clean, separate feature branch. Preserve existing member/device records and expert workflows.
- Define the user journey and its observable completion criteria before adding screens. Reuse existing calculation and storage services.
- Preserve instrument ID, exchange, spot/futures venue, quote currency and source timestamps across navigation. Never substitute a futures USDT price for a spot KRW analysis.
- Keep price arrival, strategy confirmation, simulated outcomes and actual executions distinct. Missing/stale data must not become a recommendation or a successful result.
- Run focused tests for affected calculations/storage/navigation, then the existing CI checks. Use the connected browser to inspect desktop and phone layouts and exercise the changed journey. Do not seed production records for verification.
- Keep the browser-flow verification evidence separate from mocked automated tests. Report what was checked and what remains unavailable.
- Publish only the exact main revision that passed Frontend CI. After deployment, check the public entry route and visible behavior. Do not declare completion at PR creation or build success alone.
- Extend regression tests when a real failure is reproducible. Keep project rules here; do not add extra tools or paid services without a demonstrated need.
