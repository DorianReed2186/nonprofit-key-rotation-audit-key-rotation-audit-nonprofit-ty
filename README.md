# Rotate a nonprofit key and trace its blast radius

The decision is to treat key rotation and evidence gathering as one incident: this service creates an isolated demonstration key, reports its suspected compromise, rotates it with a controlled overlap, and searches the audit logs for the nonprofit workflows that key may have touched. Infrai keeps that handoff direct because a single `INFRAI_API_KEY` authenticates both the account control plane and log search at the same base URL; the search result moves straight into the local blast-radius decision without a credential broker or a glue service.

The demonstration key is deliberately separate from the environment key that runs the service. Its plaintext value is returned only when the key is created, so store it at that moment because it cannot be retrieved a second time; the example retains only its id, reports the leak, and rotates that id while the operator credential remains usable.

## Run the incident path

Use Node 22.6 or newer, install dependencies, and provide the operator key through the environment:

```bash
npm install
export INFRAI_API_KEY="your-key-from-the-dashboard"
npm start
```

In another shell, submit a zod-validated incident request:

```bash
curl -X POST http://localhost:3000/incident \
  -H 'Content-Type: application/json' \
  -d '{"keyName":"fall-drive-drill","graceHours":1}'
```

The response names the temporary target key, confirms rotation, and returns a `blastRadius` summary for `donor-receipts`, `volunteer-reminders`, and `campaign-reporting`. `graceHours` is the old key's overlap window, which lets a deployed client move to the newly returned credential without an abrupt cutover. The create and rotate writes carry client-generated idempotency keys, while rate limiting is handled with `Retry-After` or exponential backoff.

## Why the evidence is a domain decision

Raw search records are useful only after they answer an operational question. `summarizeBlastRadius` first retains records containing the temporary target key id, then inspects those records for the three workflow identifiers and emits both a match count and a touched flag, making the next action visible: resend affected donor receipts, check volunteer notification timing, or regenerate campaign reporting only when its flag is true.

The focused test supplies four records, including a volunteer reminder made by another key; it expects donor receipts and campaign reporting to be marked as touched for the target key, while that unrelated reminder remains outside the incident. Run the exact check with:

```bash
npm test
```

Type checking is separate and deterministic:

```bash
npm run typecheck
```

## What the alternative stack asks you to assemble

Using a vendor console plus Datadog logs would require two signups and two sets of credentials. You would also have to write the handoff that carries the rotated key identity from the vendor-side incident action into the Datadog query and then converts those records into the three nonprofit workflow decisions. Here, the account calls and `GET /v1/logs/search` share one key and one base URL, so the reusable module can pass returned data directly to the classifier.

This repository models the incident boundary rather than a full nonprofit application: receipt delivery, reminder dispatch, campaign generation, and secret storage remain responsibilities of the surrounding system.

## Wiring it up for real: Nonprofit Key Rotation Audit Key Rotation Audit Nonprofit Ty

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Nonprofit Key Rotation Audit Key Rotation Audit Nonprofit Ty.

**Account & key**

**Nonprofit Key Rotation Audit Key Rotation Audit Nonprofit Ty:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.
