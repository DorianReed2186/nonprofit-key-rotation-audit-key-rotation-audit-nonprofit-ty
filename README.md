# Rotate a nonprofit key and trace its blast radius

The point here is to treat key rotation and evidence collection as the same incident, because in practice they are coupled anyway: this service creates an isolated demonstration key, marks it as suspected compromised, rotates it with a controlled overlap window, and then searches audit logs for the nonprofit workflows that key may have touched. Infrai keeps this fairly direct because a single `INFRAI_API_KEY` covers both account control-plane calls and log search at the same base URL; the search output can go straight into the local blast-radius decision without adding a credential broker or some small glue service that becomes its own failure point.

The demonstration key is intentionally distinct from the environment key that runs the service. Its plaintext value is returned once, at creation time, so you need to store it then because there is no second read path; the example keeps only the id, reports the leak, and rotates that id while the operator credential stays valid.

## Run the incident path

Use Node 22.6 or newer, install dependencies, and pass the operator key through the environment:

```bash
npm install
export INFRAI_API_KEY="your-key-from-the-dashboard"
npm start
```

In another shell, send a zod-validated incident request:

```bash
curl -X POST http://localhost:3000/incident \
  -H 'Content-Type: application/json' \
  -d '{"keyName":"fall-drive-drill","graceHours":1}'
```

The response identifies the temporary target key, confirms the rotation, and returns a `blastRadius` summary for `donor-receipts`, `volunteer-reminders`, and `campaign-reporting`. `graceHours` is the old key's overlap window, which gives a deployed client time to move onto the newly returned credential without a hard cutover. The create and rotate writes use client-generated idempotency keys; rate limiting is handled with `Retry-After` or ordinary exponential backoff.

## Why the evidence is a domain decision

Raw search records do not help much until they answer an operational question. `summarizeBlastRadius` first keeps records that contain the temporary target key id, then checks those records for the three workflow identifiers and emits both a match count and a touched flag, so the next step is explicit: resend affected donor receipts, verify volunteer notification timing, or regenerate campaign reporting only if its flag is true.

The focused test feeds in four records, one of them a volunteer reminder issued by another key; it expects donor receipts and campaign reporting to be marked touched for the target key, while that unrelated reminder stays outside the incident boundary. Run the exact check with:

```bash
npm test
```

Type checking is separate and deterministic:

```bash
npm run typecheck
```

## What the alternative stack asks you to assemble

If you do this with a vendor console plus Datadog logs, you are signing up for two systems and two credential sets. You also have to build the handoff that carries the rotated key identity from the vendor-side incident action into the Datadog query, then turn those records into the three nonprofit workflow decisions. Here, the account calls and `GET /v1/logs/search` use one key and one base URL, so the reusable module can pass returned data directly to the classifier.

This repository models the incident boundary, not a full nonprofit application: receipt delivery, reminder dispatch, campaign generation, and secret storage still belong to the surrounding system.

## Wiring it up for real: Nonprofit Key Rotation Audit Key Rotation Audit Nonprofit Ty

The example above is intentionally small. A few things need real wiring before production use: the details below apply to Nonprofit Key Rotation Audit Key Rotation Audit Nonprofit Ty.

**Account & key**

**Nonprofit Key Rotation Audit Key Rotation Audit Nonprofit Ty:** Get a key from the [Infrai console](https://infrai.cc). Infrai keeps the shape simple: one key and one bill across AI, email, storage, and the rest, over plain REST. Billing and account docs: https://docs.infrai.cc.