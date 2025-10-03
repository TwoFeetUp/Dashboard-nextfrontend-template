# PocketBase Facturatie Schema

## Overview
This document captures the recommended PocketBase data model required by the facturatie tool. The setup consists of three collections:

- `facturatie_memberships`: authorised users manage the available membership plans and pricing.
- `facturatie_members`: stores individual member records, linking to a membership plan and tracking billing metadata.
- `facturatie_invoice_runs`: audit log for each Make.com dispatch, including member selection and payload metadata.

All collections should require authentication for read/write access (`@request.auth.id != ''` for list/view/create/update/delete unless stricter rules are needed).

---

## Collection: `facturatie_memberships`
Holds configurable membership plans, including pricing and name overrides for the UI.

| Field | Type | Required | Notes |
|---|---|---|---|
| `type` | `text` (ideally `select`) | Yes | Unique identifier, suggested values: `gewoon`, `partner`, `bedrijf`, `sponsoring`, `custom`. |
| `displayName` | `text` | Yes | Human-friendly label used in the UI. |
| `amount` | `number` | Yes | Base yearly amount in EUR. |
| `description` | `text` | No | optional description or marketing copy. |
| `billingCycle` | `text` | Yes | Cycle identifier (e.g. `2025`). |
| `isActive` | `bool` | No | Flag to hide retired plans. |

**Indexes**: optional unique index on `type`.

---

## Collection: `facturatie_members`
Stores personal data and billing metadata for members.

| Field | Type | Required | Notes |
|---|---|---|---|
| `sequence` | `number` | Yes | Monotonic counter used for generating `lidnr`. |
| `lidnr` | `text` | Yes | Member number (e.g. `OS0001`). Unique. |
| `firstName` | `text` | Yes | Member first name. |
| `lastName` | `text` | Yes | Member last name or organisation name. |
| `middleName` | `text` | No | Dutch tussenvoegsel / infix. |
| `initials` | `text` | No | Initials used for invoices. |
| `title` | `text` | No | Honorific (Dhr., Mevr., etc.). |
| `email` | `email` | Yes | Primary billing address. |
| `phone` | `text` | No | Landline. |
| `mobile` | `text` | No | Mobile number. |
| `address` | `text` | No | Street + number. |
| `postalCode` | `text` | No | Postal code. |
| `city` | `text` | No | City / residence. |
| `groupName` | `text` | No | Company or group name. |
| `sport` | `text` | No | Discipline or interest. |
| `background` | `text` | No | Additional background info. |
| `notes` | `text` | No | Internal remarks. |
| `membershipId` | `text` (or relation) | Yes | Reference to a membership plan. If relations are enabled, make it a `relation` to `facturatie_memberships`. |
| `membershipType` | `text` | Yes | Cached value from plan (e.g. `gewoon`). |
| `membershipName` | `text` | Yes | Display name (customisable per member). |
| `membershipAmount` | `number` | Yes | Amount used for billing (plan amount unless overridden). |
| `customAmount` | `number` | No | Overrides plan amount when present. |
| `joinDate` | `date` | No | Member since. |
| `lastInvoiceDate` | `date` | No | Timestamp of last Make.com run. |
| `billingCycle` | `text` | No | Current cycle (e.g. `2025`). |

**Indexes**: consider unique index on `lidnr` and `email`.

---

## Collection: `facturatie_invoice_runs`
Audit log for interactions with Make.com.

| Field | Type | Required | Notes |
|---|---|---|---|
| `cycleKey` | `text` | Yes | Billing cycle identifier. |
| `status` | `select` | Yes | `pending`, `sent`, `failed`. |
| `memberIds` | `json` | Yes | Array of member IDs included in the run (used if relations are not configured). Alternatively define a relation field `members`. |
| `payload` | `json` | No | Raw payload sent to Make.com. |
| `response` | `json` | No | Response from Make.com. |
| `notes` | `text` | No | Optional operator notes. |
| `triggeredBy` | `text` or `relation` | No | User ID of the operator (relation to `users` if available). |
| `executedAt` | `date` | No | When the Make.com call succeeded. |
| `makeExecutionId` | `text` | No | Identifier returned by Make.com if applicable. |
| `metadata` | `json` | No | Additional stats (e.g. member count). |

**Indexes**: optional index on `cycleKey`.

---

## Suggested Rules & Permissions
- For each collection set `listRule` and `viewRule` to `@request.auth.id != ''` to restrict data to authenticated users.
- `create/update/delete` rules can initially mirror the same expression; tighten when role-based permissions are introduced.

---

## Synchronisation Steps
1. Create the collections in PocketBase admin if they do not exist.
2. Add the fields as listed above. For relations, ensure `membershipId` (members) points to `facturatie_memberships`, and `triggeredBy`/`members` (invoice runs) point to the proper collections if relations are desired.
3. Seed the `facturatie_memberships` table with default plans (`gewoon`, `partner`, `bedrijf`, `sponsoring`, `custom`).
4. Deploy environment variables:
   - `NEXT_PUBLIC_POCKETBASE_URL`
   - `POCKETBASE_SERVICE_TOKEN` (or admin credentials for setup).
5. Restart the Next.js application so changes to the schema are consumed by the serverless routes.

Maintaining this schema ensures the facturatie tool runs against a predictable PocketBase structure while leaving room for later extensions (e.g. export logs, invoice attachments).
