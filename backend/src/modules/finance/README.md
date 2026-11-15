# Finance module (Phase 4)

All routes are under `/api/v1`, need a Bearer token, and are limited to ADMIN, MANAGER and ACCOUNTANT
(cancel / delete / reverse actions: ADMIN and MANAGER only).

| Area | Routes |
|---|---|
| Invoices | `POST/GET /invoices`, `GET/PATCH/DELETE /invoices/:id`, `PATCH /invoices/:id/issue`, `PATCH /invoices/:id/cancel` |
| Invoice items (draft only) | `POST /invoices/:id/items`, `POST /invoices/:id/bookings`, `PATCH/DELETE /invoices/:id/items/:itemId` |
| Customer payments | `POST/GET /customer-payments`, `GET/DELETE /customer-payments/:id` |
| Vendor payments | `POST/GET /vendor-payments`, `GET/DELETE /vendor-payments/:id` |
| Driver transactions | `POST/GET /driver-transactions`, `GET /driver-transactions/salary-summary/:driverId?month=YYYY-MM`, `GET/DELETE /driver-transactions/:id` |
| Office expenses | `POST/GET /office-expenses`, `GET /office-expenses/summary`, `GET/PATCH/DELETE /office-expenses/:id` |
| Ledger | `GET /ledger/summary?partyType=`, `GET /ledger/:partyType/:partyId?from=&to=`, `POST/DELETE /ledger/adjustments`, `POST /ledger/vendor-trips/:tripId/post-hire` |

## Ledger sign convention
- CUSTOMER: balance = opening + DEBIT - CREDIT (positive = customer owes you)
- VENDOR: balance = opening + CREDIT - DEBIT (positive = you owe the vendor)
- DRIVER: balance = CREDIT - DEBIT (positive = you owe the driver, negative = driver owes you)

## What posts to the ledger
- Invoice issued -> customer DEBIT; invoice cancelled -> customer CREDIT (reversal)
- Customer payment -> customer CREDIT
- Vendor payment -> vendor DEBIT
- Vendor trip hire charges (`post-hire`, completed trips only) -> vendor CREDIT
- Driver: SALARY / TRIP_ALLOWANCE / BONUS -> CREDIT + DEBIT (net 0); ADVANCE -> DEBIT; DEDUCTION -> CREDIT;
  SETTLEMENT -> clears the outstanding balance in whichever direction it stands
- Deleting a payment or driver transaction removes its ledger rows and rolls the invoice back
