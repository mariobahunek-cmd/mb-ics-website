---
layout: post
lang: en
title: "Special stocks in MM (K, E, Q) — when which type, and what most teams overlook"
description: "Consignment, project stock, Q-stock: why the choice of special stock indicator is more than a customizing switch — and where it reproducibly comes apart in international setups, especially MX maquiladora."
slug: special-stocks-mm-consignment-project-stock-q-stock
permalink: /blog/en/special-stocks-mm-consignment-project-stock-q-stock/
translation_key: post-002-sonderbestaende
date: 2026-05-12
keywords: "special stock, consignment, K-stock, project stock, E-stock, Q-stock, transfer posting, maquiladora, MM customizing, SAP S/4HANA, TS452"
persona: C
latam_topic: "MX maquiladora model and consignment, customs implications"
reading_time: 9
show_secondary_cta: true
sources:
  - label: "SAP Help Portal — Special Stocks (MM)"
    url: "https://help.sap.com/"
    note: "Search path: Materials Management → Inventory Management → Special Stocks"
  - label: "SAP Customizing IMG — T-Codes OMJJ (movement types) and SPRO MM → Inventory Management"
  - label: "SAP Help Portal — Localization for Mexico (Maquiladora, IMMEX)"
    url: "https://help.sap.com/"
    note: "State 2026 — verify current version before any production rollout"
  - label: "Mexican Ministry of Economy — IMMEX program (official source for maquiladora status)"
---

If, as an MM consultant, the inventory report suddenly makes your eyes water — a material shows up twice, once with stock indicator K, once as unrestricted, plus three different values depending on which company-code view you choose — special stocks are rarely the actual bug. They are the symptom that someone either picked the wrong indicator or executed a transfer posting with the wrong movement type.

This post breaks down what the special stock indicators K, E, and Q actually do, when each fits — and why the Mexican maquiladora model in particular stands or falls on a correctly configured consignment setup.

## What special stocks really are

In SAP MM, "special stock" doesn't mean "valuable" or "rare" stock. It means stock whose **ownership or intended use** deviates from the standard plant-/storage-location-managed unrestricted stock. The system carries these stocks in parallel with unrestricted stock, with their own quantity and value structure, controlled via a **special stock indicator** on the movement type.

The three indicators that show up in day-to-day work:

| Indicator | Plain meaning | Owner | Value structure |
|-----------|---------------|-------|-------------------|
| K | Vendor-consigned stock | Vendor | Posted to value only at consumption — no value before |
| E | Project stock (WBS-element bound) | Owning company code | Valued, project value is capitalized |
| Q | Project Q-stock (project plus reservation block) | Owning company code | Like E, with additional availability block |

There are further indicators (V for vendor consignment to customer, M for returns, W for customer-side consignment), but they show up far less often in a typical consultant's day.

## K-stock: the vendor remains owner

Vendor consignment stock is a frequently misunderstood concept. The physical stock sits in your plant or storage location — you administer it, count it during physical inventory, see it in MMBE. But it belongs to the vendor until consumption is posted.

**Posting logic for K-stock:**

- **Goods receipt with movement type 411 K:** Stock comes in, **no FI document** (no value posting yet — not your property).
- **Consumption with movement type 411 K (in consumption account assignment):** This is where the posting hits: consumption account against consignment payables.
- **Settlement (T-Code MRKO):** Periodic settlement against the consignment contract — generates the FI documents that become the vendor invoice.

**When K-stock makes sense:**
- Materials with **frequent movement** where you don't want to release every PO individually (screws, standard parts, MRO consumables).
- **High-value materials** you don't want to capitalize until they are actually consumed (cash-flow effect).
- **Vendor is nearby** and can replenish inexpensively — typical for just-in-time setups in automotive.

**Pitfall:** Transfer postings from K to own stock are a separate operation (movement type 411 K with special logic plus another step for ownership transfer — in many setups a paired transaction in MIGO using the "purchase from consignment stock" function). This is often done incorrectly and produces phantom stock.

## E-stock: project stock with its own valuation

When working on a plant-engineering project or a large customer order, material is often procured against a WBS element or a sales order. The stock comes in, belongs to the company code (unlike K), but is assigned to the project — both quantity-wise and value-wise.

**Posting logic for E-stock:**

- **Goods receipt with movement type 412 E:** Stock comes in, FI document hits the project asset account (instead of the standard inventory account).
- **Consumption with movement type 411 E:** Consumption flows directly into project costs.
- **Transfer posting 415 E → unrestricted:** Rarely used, because project stock typically remains in the project until completion.

**When E-stock makes sense:**
- **Plant engineering** with long construction phases where material sits in the warehouse for months or years but should be capitalized to the project.
- **Customer-specific custom configuration** — material doesn't belong to the regular inventory cycle but to a specific order.

**Pitfall:** When the WBS element is locked or closed, the E-stock freezes. Before physical inventory, check whether all E-stocks are assigned to active projects — otherwise you get nasty surprises during valuation changes.

## Q-stock: project stock with availability reservation

Q-stock is a variant of E with one important additional property: the quantity is **reserved against further access**. This is the use case when you want to be sure material is not accidentally consumed for another project.

In practice Q is rarer than E. You need it for:
- **Multi-year projects** with overlapping orders, where you don't want to consume Phase 1 material accidentally for Phase 2.
- **Regulated industries** (pharma, defense), where every material movement must be documented and accidental cross-project consumption is an audit problem.

## Transfer postings — the most common source of errors

Most tickets that show up in the inventory area are not about special stock configuration itself, but about transfer postings. Three movement types you should know cold:

| Movement type | What happens | Typical mistake |
|---|---|---|
| 309 | Material-to-material within the same plant/storage location | Often abused as a "workaround" when customizing isn't right |
| 311 | Storage-location-to-storage-location within the same plant | Looks trivial, but for special stock the indicator must match on both sides of the posting |
| 301 | Plant-to-plant (= cross-plant move) | When valuation area = plant, this fails if the valuation class isn't synchronized between plants |

**Central rule:** A transfer posting must not implicitly change the special stock status. If you want to move K-stock to own stock, you need an **explicit ownership transfer** (in MIGO usually as a separate step in consignment mode), not a simple 309/311.

<aside class="latam-bridge">

<div class="latam-bridge__head">International perspective — Mexico maquiladora</div>

### Consignment as the backbone of the maquiladora model

The Mexican maquiladora model (formally: the **IMMEX program** of the Ministry of Economy) allows foreign companies to import material duty-free and tax-advantaged into Mexico, process it in a Mexican production facility, and re-export the finished product — typically to the United States. Throughout this sequence the material formally belongs to the foreign owner (e.g. the US or European parent company), not to the Mexican subsidiary.

In SAP this almost always shows up as a **consignment model**:

- The Mexican subsidiary carries the stock with special stock indicator K — physically in MX, ownership remains with the foreign vendor / parent company.
- Movement types and account determination are configured so that goods receipt produces **no** Mexican balance-sheet value (stock is not capitalized), and consumption does not trigger **IVA** (VAT), because consumption inside the maquiladora context is not a taxable sale.
- The S/4HANA Localization for Mexico provides the corresponding conditions and CFDI logic (CFDI is the Mexican electronic invoicing requirement, comparable to BR's NF-e).

**Three places where this comes apart in practice:**

- **Stock is capitalized with the wrong indicator.** If goods receipt accidentally uses movement type 101 instead of 411 K, the Mexican subsidiary capitalizes the material value on its balance sheet — and the maquiladora tax advantage is gone. Repair is possible (reversal, re-posting) but tedious and visible at quarterly close.
- **CFDI for consignment consumption is missing or duplicated.** The CFDI setup must distinguish between a "real" sale and an internal maquiladora consumption. Misconfigured: either a missing tax filing (= SAT audit risk) or a duplicate invoice (= dispute).
- **Settlement between MX subsidiary and parent is treated like a regular vendor invoice.** Consignment settlement (in SAP via T-Code MRKO) must run with the correct **pricing procedure** and **CFOP-equivalent for MX** — otherwise intercompany postings get mixed up with external vendor relationships.

**Colombia** has a related model with the **Free Trade Zone (Zona Franca)** — similar logic, different tax implications (DIAN reporting, ICA charges). If you have both countries in your group setup, do not copy one configuration onto the other.

</aside>

{% include disclaimer-latam.html sources="SAP Help Portal (Localization for Mexico, Localization for Colombia), IMMEX program documentation from the Mexican Ministry of Economy, SAP standard customizing for consignment." %}

## Practical check: which special stock when?

A decision matrix that shortens architecture-phase discussions:

| Use case | Recommended type | Why not the other |
|---|---|---|
| C-parts, standard fasteners, MRO consumables | K (consignment) | E would force a project assignment that's pointless here |
| Plant engineering, multi-year project | E (project stock) | K would give the vendor authority you don't want for in-house work |
| Pharma active ingredient for a regulated order | Q (project with reservation) | E without reservation allows accidental cross-order consumption |
| Maquiladora MX (parent → subsidiary) | K with MX localization | Own stock would destroy the IMMEX tax advantage |
| Drop-ship vendor → customer direct | no special stock (= drop-ship model) | K would mean the stock physically comes to you — not the case for drop-ship |

## What matters for the TS452 certification

Exam questions on special stocks almost always test the basic logic plus one movement-type question. What you should know cold:

- **Which indicator means what** (K, E, Q — the order in the exam is almost always alphabetical).
- **Which movement type** for which special stock type (411 K for consignment consumption, 412 E for project-stock goods receipt).
- **Ownership vs. inventory administration** — special stock does not mean you don't physically hold the material.
- **Settlement for consignment** — via MRKO, not via regular invoice verification.

An observation from training practice: candidates who memorize the special stock indicators as a list of letters fail when faced with applied scenarios. Candidates who can walk through the **posting logic for each variant** — what happens at goods receipt, what at consumption, what at settlement — have the topic under control.

## Closing thought

Special stocks are not a technical curiosity. They are the place where your purchasing, your controlling, and (for maquiladora setups) your tax team all hang on the same material record. Treating them as "just a customizing switch" builds in reporting drift that comes back a few quarters later as inventory differences or a tax audit issue.

Before any international rollout, take 30 minutes to walk through the special-stock strategy — which types are needed, which movement types are customized for them, and who in the group is allowed to do which transfer posting. That short conversation saves days of repair later.
