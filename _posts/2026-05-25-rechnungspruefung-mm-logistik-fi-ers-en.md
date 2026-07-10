---
layout: post
lang: en
title: "Invoice Verification in MM: Logistics IV vs. FI Direct Posting vs. ERS — when to use what"
seo_title: "Invoice Verification in SAP MM: MIRO, FB60 & ERS"
description: "MIRO, FB60 or ERS? The three ways to record an incoming invoice in SAP MM — GR/IR, tolerances, and the audit pitfalls TS452 likes to surface."
slug: invoice-verification-mm-logistics-fi-ers
permalink: /blog/en/invoice-verification-mm-logistics-fi-ers/
translation_key: post-003-rechnungspruefung
date: 2026-05-25
keywords: "invoice verification, MIRO, FB60, ERS, Evaluated Receipt Settlement, GR/IR, tolerances, OMR6, MM customizing, TS452, C_TS452_2601, SAP S/4HANA"
persona: C
reading_time: 9
show_secondary_cta: true
---

Three ways to record an incoming invoice in SAP — and the difference between them decides more than just your posting style. It decides the audit readiness of your entire procurement process. In the TS452 exam this shows up in several flavors: as a scenario question, as a customizing-sequence question, almost always with a GR/IR trap hidden inside.

This post breaks down what really separates MIRO, FB60 and ERS — and the three places where consultants trip up, both in practice and on exam day.

## The three paths at a glance

| Approach | Transaction | MM document involved | GR/IR account used | Typical use case |
|---|---|---|---|---|
| **Logistics Invoice Verification** | MIRO | PO + goods receipt | Yes | Standard path for PO-based procurement |
| **FI Direct Posting** | FB60 / FB65 | No MM document | No | Other invoices without PO reference |
| **ERS (Evaluated Receipt Settlement)** | MRRL | PO + goods receipt | Yes (automatic) | High-frequency, trust-based supplier relationship |

The key distinction is not "which transaction do I use" — it's **what happens in accounting, and what remains attached to the MM document trail**.

## Logistics Invoice Verification (MIRO) — the standard path

MIRO is the canonical path for a PO-related invoice. You start with the supplier invoice in hand (or as a PDF), enter supplier, date and amount, pull in the PO — and the system proposes the items from the goods receipt.

**The posting logic:**

At **goods receipt** (upstream, MIGO with movement type 101) the first document is created:

- Stock to **GR/IR** (Goods Receipt / Invoice Receipt clearing account, posted via key WRX in account determination)

At **invoice receipt** (MIRO) the second document is created:

- **GR/IR to Vendor Payables**

The GR/IR account is therefore a **clearing account** — after a full procurement cycle it should theoretically be zero. In practice it never is, because quantity or price deltas leave residual balances. Managing those balances is its own discipline (T-code MR11 for GR/IR clearing, complemented by Fiori apps in S/4HANA).

**What makes MIRO strong:**

- **Three-way match** automatically: PO ↔ goods receipt ↔ invoice are reconciled line by line.
- **Tolerances** apply automatically — if the invoice falls outside the permitted band, the system blocks the payment (block indicator).
- **Document flow** stays intact: from purchasing document via material document to invoice document, every step is traceable.

**Pitfall:** When MIRO gets treated as "just a posting transaction," people miss that **the quantities come from the goods receipt** (not the PO). If a goods receipt is reversed after an invoice has already posted, ghost positions remain that only clear via dedicated clearing runs.

## FI Direct Posting (FB60 / FB65) — when there's no PO

Not every invoice comes out of the MM process. Consulting fees without an active PO, rent, utility bills, certain small amounts — those land at FB60 (incoming invoice) or FB65 (credit memo).

**Posting logic:**

- **Expense / Asset to Vendor Payables** — direct, no GR/IR clearing in between.
- No MM document, no goods receipt, no tolerance check against a PO.

**When FI Direct Posting is the right path:**

- There is **simply no PO** (e.g. legal fees that came up ad-hoc).
- **Expense not routed through materials** — typical examples: phone bills, insurance, small fringe benefits.
- **Balance-sheet relevant posting** with no inventory component.

**Pitfall:** FB60 often gets abused as a "shortcut" when someone doesn't feel like creating a PO. That surfaces at the next audit at the latest — because the procurement policy says everything runs via POs, and FB60 should only apply in documented exceptions. In the exam, the answer to "What do you do with a supplier invoice that has no PO reference?" depends on framing — either "use FB60" or "have a PO created first, then MIRO." Read the question carefully.

## ERS (Evaluated Receipt Settlement) — when the supplier doesn't issue an invoice at all

ERS flips the model: **you create the invoice yourself** based on PO and goods receipt, the supplier skips sending their own invoice. Sounds odd at first, but in well-established supplier relationships with high-frequency volume it's a massive efficiency gain.

**Posting logic with ERS (T-code MRRL):**

- System scans all settlement-eligible goods receipts of a supplier in a defined period.
- Automatically creates an **invoice for each transaction** — based on the PO (price, tax, conditions) and the goods receipt (quantity).
- Posts internally as **GR/IR to Vendor Payables**, identical to a MIRO posting.
- Supplier receives the generated invoice for information.

**Prerequisites without which ERS does not work:**

1. **Indicator on the vendor master** (Purchasing view): field "AutoEvalGRSetmtDel" (Evaluated Receipt Settlement). Without this flag the system won't process ERS for this supplier.
2. **Indicator at the PO line item**: field "AutoEvalGRSetmtDel" at item level — defaulted from the vendor master but can be overridden.
3. **Price and tax must be 100% clear** — no "we'll clarify in the invoice." What's in the PO is what gets posted.

**When ERS is smart:**

- **Standard parts at fixed prices**, high-frequency (auto suppliers, packaging materials, consignment settlements).
- **Trust-based supplier relationship** — the supplier accepts that you create the invoice.
- **Low dispute potential** on quantities — clean goods receipt posting is mandatory, otherwise disputes land in clarification hell.

**When ERS backfires:**

- **Price changes** mid-contract that aren't reflected in the PO in time — then the system creates wrong invoices.
- **Discounts / rebates** with complex calculation logic — ERS relies on condition mechanics, side-agreements outside the system break it.
- **E-invoicing jurisdictions**: some authorities (BR with NF-e, MX with CFDI) require the invoice to originate from the supplier and be electronically validated — an ERS self-invoice can require an additional compliance layer here.

## Tolerances — the shared safety net

Whether MIRO or ERS — the **tolerance groups** decide what counts as "acceptable deviation" and what triggers a payment block. Configured in **OMR6**.

The key tolerance keys:

| Tolerance key | What it checks |
|---|---|
| **AN** | Quantity undershoot (less delivered than invoiced) |
| **AP** | Positive price variance (invoice more expensive than PO) |
| **BD** | Posting date vs. PO date (grace period) |
| **BR** | PO price vs. invoice price (positive deviation) |
| **DQ** | Quantity overshoot in the invoice |
| **DW** | Value deviation (combined price × quantity) |

**What OMR6 does not decide itself:** what happens when a tolerance breaks. The block itself is governed by **block reason configuration** and the assignment to payment block. Some tolerances trigger a **line block** (single invoice item), others a **document block** (entire invoice).

**Exam pitfall:** Tolerances are often paired with a concrete scenario ("An invoice for 102 EUR against a PO of 100 EUR — tolerance absolute 5 EUR / percentage 5%, what happens?"). Answer: within tolerance, no block. But if the next question reads absolute 1 EUR / percentage 5%, things tighten — both conditions must be met to trigger (or not trigger) a block. Always read the logic **in full**.

## How you decide in practice (and on the exam)

The decision matrix I give consultants:

1. **Is there a PO with a goods receipt?** If yes → MIRO or ERS.
2. **Does the supplier want to issue an invoice?** If yes → MIRO. If no, and the setup is in place → ERS.
3. **Neither PO nor goods receipt?** → FB60 (or have a PO created retroactively, if the process allows).
4. **Know the tolerances before posting** — not just when a block already sits on the invoice.

In the TS452 exam, watch whether the question frames itself as "trace the document flow" or "choose the posting path." Both lenses often point to different answer paths.

{% include cross-promo-cta.html show_secondary=true %}
