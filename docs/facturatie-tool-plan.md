# Facturatie Tool Integration Plan

## Objective
Integrate the facturatie tool from the temp project into the main Olympisch dashboard, persist member and invoice data through PocketBase, and forward invoice payloads to Make.com while preserving current usability features.

## Snapshot of the Temp Tool
- Member management with add/edit/delete, membership type changes, and auto-generated member numbers.
- Bulk selection with a stubbed `sendSelectedInvoices` flow, summary metrics, and detailed vs compact table views.
- CSV/Excel export via custom CSV code and the `xlsx` library, plus `alert` based feedback.
- UI components built with shadcn primitives, lucide icons, and client-side React state only (no data persistence).

## Implementation Phases

### 1. Prepare & Port the UI
- Create a dedicated module (e.g. `src/components/facturatie` or a route under `src/app/tools/facturatie`) and move the tool code out of the temp folder.
- Split oversized logic into components/hooks (summary cards, member table, modals, exports) to match the main codebase style.
- Replace `alert` calls with the existing toast system and wire loading/empty states.
- Ensure the `Dashboard` tool registry includes the new `facturatie-tool` entry and route the component correctly.

### 2. PocketBase Data Layer
- Add a `facturatie_members` collection with fields for personal data (name, contact, address), membership metadata (type, name, custom amount), lifecycle fields (`joinDate`, `lastInvoiceDate`), and bookkeeping extras (title, initials, group name, sport, notes).
- Define indexes on `lidnr` and `email` (unique) and allow authenticated users to `list`, `view`, `create`, `update`, `delete` as required.
- Optionally add a `facturatie_invoice_runs` collection to log each send (members, payload, Make response, status, timestamps) for auditing.
- Implement a PocketBase service layer: `listMembers`, `createMember`, `updateMember`, `deleteMember`, `updateMembership`, `bulkMarkInvoiced` using the existing `pb` client plus a server-side helper for privileged operations if needed.
- Handle auto-generated `lidnr` via either a server hook or by querying the latest number before create; guard for race conditions by using a unique field and retry on conflict.
- On mount, fetch members into state; keep UI reactive by re-fetching after mutations or applying optimistic updates.

### 3. Make.com Integration
- Confirm the Make scenario accepts HTTP POST webhook payloads and add a secure env var `MAKE_WEBHOOK_URL` (and optional auth token).
- Create a Next.js API route (e.g. `src/app/api/facturatie/send/route.ts`) that validates the request, loads member records from PocketBase, and posts the composed payload to Make.
- Shape payload to include member identity, membership details, invoice amount, and any required metadata (due date, memo, run id).
- Update `sendSelectedInvoices` to call the API route, show progress feedback, handle errors gracefully, and update PocketBase (`lastInvoiceDate` and optional log collection) once the Make call succeeds.

### 4. Preserve & Extend Functionality
- Rewire CSV/Excel exports to use the PocketBase backed state; keep `xlsx` dependency (add to `package.json` if absent).
- Ensure membership change modal and edit flows persist updates to PocketBase.
- Replace dropdown actions with shared components if available; ensure keyboard focus management and accessibility are intact.
- Add loading skeletons/empty states for the table and summary metrics; surface errors via toasts.

### 5. Validation & Documentation
- Smoke-test: load list, add member, edit member, change membership, delete member, export CSV/Excel, send invoices (with Make webhook mocked), verify persisted `lastInvoiceDate` and audit log entries.
- Document PocketBase schema changes, required environment variables, and Make.com payload contract in `README.md` or dedicated docs.
- Consider adding integration/unit tests for the API route (mock Make + PocketBase) and utilities generating invoice payloads.

## PocketBase Schema Draft
- `facturatie_members` (base collection)
  - `lidnr` (text, unique), `firstName`, `lastName`, `title`, `initials`, `tussenvoegsel`, `groupName`
  - `email` (email, unique), `phone`, `mobile`
  - `address`, `postalCode`, `city`
  - `sport`, `background`, `notes`
  - `membershipType` (select: gewoon/partner/bedrijf/sponsoring/custom), `membershipName` (text)
  - `customAmount` (number, optional), `joinDate` (date), `lastInvoiceDate` (date)
- `facturatie_invoice_runs` (optional)
  - `members` (relation to `facturatie_members`, multiple)
  - `payload` (json), `status` (select: pending/sent/failed), `response` (json or text), `triggeredBy` (relation to users), `executedAt` (date)

## Dependencies & Configuration
- Add `xlsx` to the root `package.json` if not already present; ensure tree-shaking keeps bundle size manageable.
- `.env` additions: `NEXT_PUBLIC_POCKETBASE_URL` (already used), `POCKETBASE_SERVICE_TOKEN` (for server-side writes if necessary), `MAKE_WEBHOOK_URL` (and optional `MAKE_WEBHOOK_SECRET`).
- Verify PocketBase auth rules so that the existing `AuthProvider` grants access to the new collections.

## Make.com Structure

# 📑 JSON Schema voor Facturatie (Olympisch Stadion)

> **Gebruik:** Dit schema beschrijft de benodigde velden voor het genereren van facturen. Je kunt dit direct doorgeven aan een backend developer. Alle velden zijn gebaseerd op de screenshots van het ledenformulier, de factuurvoorbeelden en de lidmaatschapsopties.

---

## 🔢 Factuurgegevens (automatisch gegenereerd)
- **factuurnummer** *(string)* → automatisch incrementeel of UUID, uniek per factuur.
- **factuurdatum** *(date, ISO 8601)* → automatisch ingesteld op aanmaakdatum.
- **vervaldatum** *(date, ISO 8601)* → automatisch ingesteld op factuurdatum + 30 dagen.

---

## 👤 Klantgegevens
- **klantnummer** *(string)* → unieke ID per lid.
- **voornaam** *(string)*
- **tussenvoegsel** *(string, optional)*
- **achternaam** *(string)*
- **emailadres** *(string, email)*
- **telefoon** *(string, optional)*
- **mobiel** *(string, optional)*
- **adres** *(string)* → straat + huisnummer
- **postcode** *(string)*
- **woonplaats** *(string)*

---

## 🏷️ Lidmaatschapgegevens
- **lidmaatschap_type** *(enum)* → [
  `Gewoon lidmaatschap`,
  `Partnerlidmaatschap`,
  `Bedrijfslidmaatschap`,
  `Sponsoring`,
  `Custom Lidmaatschap`
]
- **lidmaatschap_naam** *(string)* → leesbare naam (bijv. "Gewoon lidmaatschap").
- **lidmaatschap_bedrag** *(number, float)* → bedrag in euro’s, afhankelijk van type (bijv. 150.00, 200.00, 300.00, 600.00, of custom waarde).
- **lid_sinds** *(date, optional)* → ingangsdatum lidmaatschap.
- **sport** *(string, optional)* → sporten die lid beoefent.

---

## 💶 Factuurregels (line items)
Array van objecten:
```json
"regels": [
  {
    "omschrijving": "string",
    "aantal": 1,
    "prijs_per_eenheid": 150.00,
    "totaal": 150.00
  }
]
```

### Voorbeeldregels:
- Gewoon lidmaatschap → 150.00
- Partnerlidmaatschap → 200.00
- Bedrijfslidmaatschap → 300.00
- Sponsoring → 600.00
- Custom lidmaatschap → ingevoerd bedrag

---

## 🧾 Totaalvelden
- **subtotaal** *(number)* → som van alle regels.
- **btw** *(number, optional)* → indien van toepassing.
- **totaal** *(number)* → subtotaal + btw.

---

## 📝 Extra velden
- **achtergrond** *(string, optional)* → sportieve achtergrond / opmerkingen.
- **opmerkingen** *(string, optional)* → vrije tekst.

---

## 📚 JSON Schema (voorbeeld)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "factuurnummer": {"type": "string"},
    "factuurdatum": {"type": "string", "format": "date"},
    "vervaldatum": {"type": "string", "format": "date"},
    "klantnummer": {"type": "string"},
    "voornaam": {"type": "string"},
    "tussenvoegsel": {"type": "string"},
    "achternaam": {"type": "string"},
    "emailadres": {"type": "string", "format": "email"},
    "telefoon": {"type": "string"},
    "mobiel": {"type": "string"},
    "adres": {"type": "string"},
    "postcode": {"type": "string"},
    "woonplaats": {"type": "string"},
    "lidmaatschap_type": {"type": "string", "enum": [
      "Gewoon lidmaatschap",
      "Partnerlidmaatschap",
      "Bedrijfslidmaatschap",
      "Sponsoring",
      "Custom Lidmaatschap"
    ]},
    "lidmaatschap_naam": {"type": "string"},
    "lidmaatschap_bedrag": {"type": "number"},
    "lid_sinds": {"type": "string", "format": "date"},
    "sport": {"type": "string"},
    "regels": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "omschrijving": {"type": "string"},
          "aantal": {"type": "integer"},
          "prijs_per_eenheid": {"type": "number"},
          "totaal": {"type": "number"}
        },
        "required": ["omschrijving", "aantal", "prijs_per_eenheid", "totaal"]
      }
    },
    "subtotaal": {"type": "number"},
    "btw": {"type": "number"},
    "totaal": {"type": "number"},
    "achtergrond": {"type": "string"},
    "opmerkingen": {"type": "string"}
  },
  "required": ["factuurnummer", "factuurdatum", "vervaldatum", "klantnummer", "voornaam", "achternaam", "emailadres", "adres", "postcode", "woonplaats", "lidmaatschap_type", "lidmaatschap_bedrag", "regels", "totaal"]
}
```

---

✅ Dit schema bevat alles wat nodig is om vanuit het ledenformulier en de facturatie-vereisten een correcte factuur in JSON te genereren. Je backend developer kan dit direct gebruiken voor validatie en implementatie.



---

## 🧾 JSON Schema – Lidmaatschap Facturatie (voor backend & Make)

> Doel: eenduidig contract tussen frontend → backend → Make. Backend genereert **factuurnummer** en **factuurdatum**; **vervaldatum** is automatisch `factuurdatum + 30 dagen`. Bedragen komen uit het gekozen lidmaatschap of uit `custom_amount` wanneer `membership.type == "custom"`.

### ✔️ Functionele spelregels
- **Factuurnummer**: server-side gegenereerd (idempotent, uniek).
- **Factuurdatum**: server-side `ISO-8601` (YYYY-MM-DD) op het moment van aanmaken.
- **Vervaldatum**: `factuurdatum + 30 dagen` (server-side berekend, niet door client).
- **Klantnummer**: verplicht (staat in ledenadministratie).
- **Adresgegevens**: overnemen uit ledenformulier.
- **Lidmaatschap**: keuze uit vaste types of `custom`; prijs wordt server-side bepaald/geverifieerd.
- **BTW**: model ondersteunt `vat_rate` en `vat_included`. Indien prijzen inclusief BTW zijn, zet `vat_included=true` en `vat_rate` op de juiste waarde.

---

### 🧱 JSON Schema (Draft 2020-12)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://twofeetup.nl/schemas/olympisch-stadion/invoice.json",
  "title": "MembershipInvoice",
  "type": "object",
  "required": [
    "customer",
    "membership",
    "invoice_meta",
    "invoice_lines",
    "totals"
  ],
  "properties": {
    "customer": {
      "type": "object",
      "required": ["customer_number", "name", "address", "postal_code", "city", "email"],
      "properties": {
        "customer_number": {"type": "string", "minLength": 1},
        "name": {"type": "string", "minLength": 1},
        "initials": {"type": ["string", "null"]},
        "infix": {"type": ["string", "null"], "description": "tussenvoegsel"},
        "title": {"type": ["string", "null"]},
        "address": {"type": "string"},
        "postal_code": {"type": "string"},
        "city": {"type": "string"},
        "country": {"type": ["string", "null"], "default": "NL"},
        "email": {"type": "string", "format": "email"},
        "phone": {"type": ["string", "null"]},
        "mobile": {"type": ["string", "null"]}
      }
    },

    "membership": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": {
          "type": "string",
          "enum": ["gewoon", "partner", "bedrijf", "sponsoring", "custom"],
          "description": "Dropdown-keuze in UI; uitbreidbaar."
        },
        "year": {"type": "integer", "minimum": 2000, "maximum": 2100},
        "display_name": {"type": ["string", "null"], "description": "Bijv. 'Gewoon lidmaatschap'"},
        "custom_amount": {
          "type": ["number", "null"],
          "minimum": 0,
          "description": "Alleen verplicht/van toepassing wanneer type = custom"
        }
      },
      "allOf": [
        {
          "if": {"properties": {"type": {"const": "custom"}}},
          "then": {"required": ["custom_amount"]}
        }
      ]
    },

    "invoice_meta": {
      "type": "object",
      "required": ["issue_date", "due_date"],
      "properties": {
        "invoice_number": {"type": ["string", "null"], "description": "Server vult dit in"},
        "issue_date": {"type": "string", "format": "date", "description": "Server vult huidige datum in"},
        "due_date": {"type": "string", "format": "date", "description": "= issue_date + 30 dagen (server)"},
        "reference": {"type": ["string", "null"], "description": "Bijv. jaar-maand of vrije referentie"},
        "notes": {"type": ["string", "null"]}
      }
    },

    "invoice_lines": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["description", "unit_price", "quantity"],
        "properties": {
          "description": {"type": "string", "minLength": 1},
          "unit_price": {"type": "number", "minimum": 0},
          "quantity": {"type": "number", "minimum": 1},
          "line_total": {"type": ["number", "null"], "description": "Server berekent = unit_price * quantity"}
        }
      }
    },

    "tax": {
      "type": "object",
      "properties": {
        "vat_rate": {"type": ["number", "null"], "description": "Bijv. 21 of 0"},
        "vat_included": {"type": "boolean", "default": true}
      }
    },

    "totals": {
      "type": "object",
      "required": ["subtotal", "vat_amount", "grand_total"],
      "properties": {
        "currency": {"type": "string", "default": "EUR"},
        "subtotal": {"type": "number", "minimum": 0},
        "vat_amount": {"type": "number", "minimum": 0},
        "grand_total": {"type": "number", "minimum": 0}
      }
    }
  },
  "additionalProperties": false
}
```

---

### 🧩 Voorbeeldpayload (server-side berekend waar mogelijk)
```json
{
  "customer": {
    "customer_number": "OS-001234",
    "name": "J.A. van der Example",
    "initials": "J.A.",
    "infix": "van der",
    "address": "Straatnaam 123",
    "postal_code": "1234 AB",
    "city": "Amsterdam",
    "country": "NL",
    "email": "example@domain.nl",
    "mobile": "06-12345678"
  },
  "membership": {
    "type": "gewoon",
    "year": 2025,
    "display_name": "Gewoon lidmaatschap"
  },
  "invoice_meta": {
    "invoice_number": null,
    "issue_date": "2025-09-16",
    "due_date": "2025-10-16",
    "reference": "Lidmaatschap Sociëteit Olympisch Stadion 2025",
    "notes": null
  },
  "invoice_lines": [
    { "description": "Gewoon lidmaatschap 2025", "unit_price": 150.00, "quantity": 1 },
    { "description": "Partnerlidmaatschap", "unit_price": 200.00, "quantity": 1 }
  ],
  "tax": { "vat_rate": 21, "vat_included": true },
  "totals": { "currency": "EUR", "subtotal": 200.00, "vat_amount": 0.00, "grand_total": 200.00 }
}
```

---

### 🔗 Mapping uit ledenformulier → schema
- **Naamvelden**: `title` → `customer.title`, `initials` → `customer.initials`, `infix` → `customer.infix`, `Voornaam + Achternaam` → `customer.name` (of concateneer inclusief tussenvoegsel).
- **Contact**: `E-mailadres`, `Telefoon`, `Mobiel` → `customer.email|phone|mobile`.
- **Adres**: `Adres`, `Postcode`, `Woonplaats` → `customer.address|postal_code|city`.
- **Lidmaatschap Type/Naam**: dropdown → `membership.type` + `membership.display_name`; indien `Custom Lidmaatschap` → `membership.type = "custom"` + `membership.custom_amount`.
- **Jaar**: UI-select of afgeleid → `membership.year`.

---

### 🧮 Server-side berekeningen (niet door client aanleveren)
- `invoice_meta.invoice_number`
- `invoice_meta.issue_date = today()`
- `invoice_meta.due_date = issue_date + 30d`
- `invoice_lines[*].line_total`
- `totals.subtotal = Σ line_total`
- `totals.vat_amount` (afhankelijk van `tax.vat_rate` en `tax.vat_included`)
- `totals.grand_total = subtotal + vat_amount` (of = subtotal wanneer prijzen incl. BTW)

> Hiermee kan je backend developer direct bouwen. Wil je dat ik er ook validatiecode (TS/Zod) of Make-mapping bij zet, zeg het even.



## Open Questions / Assumptions
- How should automated member number generation behave when records are deleted? (e.g. reuse numbers vs keep monotonic counter.)
- Does Make.com require invoice PDFs or only metadata? Adjust payload accordingly.
- Should membership pricing live in PocketBase (config collection) instead of hardcoded constants for easier updates?
- Confirm whether invoice sends should be idempotent per billing cycle and if so track cycle metadata in the log collection.

