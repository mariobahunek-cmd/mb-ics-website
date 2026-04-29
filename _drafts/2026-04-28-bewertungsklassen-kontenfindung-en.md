---
layout: post
lang: en
title: "Valuation Class and Account Determination in MM — the underrated lever in international rollouts"
description: "Valuation class, account modifier, OBYC: why MM account determination is more than a customizing footnote — and where international rollouts repeatedly come apart at this exact spot."
slug: valuation-class-account-determination-international-rollouts
translation_key: post-001-bewertungsklassen
date: 2026-04-28
keywords: "OBYC, valuation class, account modifier, account determination, MM customizing, BSX WRX GBB, valuation area, ICMS IPI, international rollout, SAP S/4HANA, TS452"
persona: C
latam_topic: "BR ICMS/IPI accounts and OBYC extension"
reading_time: 9
show_secondary_cta: true
sources:
  - label: "SAP Help Portal — Account Determination (MM, S/4HANA)"
    url: "https://help.sap.com/"
    note: "Search path in the S/4HANA help: Materials Management → Valuation and Account Assignment → Account Determination"
  - label: "SAP Customizing IMG path — T-Codes OMWB / OBYC"
    note: "Materials Management → Valuation and Account Assignment → Account Determination; valuation-class maintenance via T-Code OMSK"
  - label: "SAP Help Portal — Localization for Brazil (TAXBRA, NF-e, BR tax accounts)"
    url: "https://help.sap.com/"
    note: "State 2026 — verify the current version before any production rollout"
  - label: "SAP for Me / SAP Support — Note search on BR account determination"
    url: "https://me.sap.com/notes"
    note: "Search terms: 'Brazil tax account determination', 'TAXBRA account assignment', 'NF-e accounts'. Re-check actively maintained notes — customizing recommendations for BR are regularly extended."
---

If, as an MM consultant on a rollout project, finance suddenly opens tickets for the wrong account on a goods receipt, a GR/IR balance that drifts apart, or inventory differences smearing onto consumption accounts, the root cause sits surprisingly often in the same spot: account determination. More precisely, in how valuation class and account modifier interact.

This post breaks down what OBYC actually does, why the valuation class is more than a customizing field on the material master — and where international rollouts reproducibly come apart at this point, especially around a Brazilian company code.

## What valuation class and account modifier actually do

The valuation class is maintained on the material master in the Accounting view. It classifies the material into the account determination scheme — raw materials, semi-finished goods, finished products, and trading goods are typically run on different valuation classes because they are reported in different positions of the balance sheet.

The account modifier comes from the movement type. It describes what is supposed to happen on the financial side for this specific movement: consumption against a cost center, vendor return, inventory difference. The movement type carries the information about *what* is being posted; the valuation class, *which material group* it concerns.

OBYC is the transaction that brings these two axes together. For each transaction key (e.g. BSX), valuation area, valuation class, and account modifier you maintain an account. Sounds like trivial table work — and turns into a full-time activity in groups running dozens of plants across multiple countries. That is exactly where the rollout tickets emerge.

## The core OBYC transaction keys — the short list that actually shows up

There are far more transaction keys than the five you deal with day to day. When a finance ticket comes in, the first question — "which transaction key are we looking at?" — usually gets you halfway to the diagnosis.

| Key  | What it controls | When it becomes relevant |
|------|------------------|--------------------------|
| BSX  | Stock account | Any value change on stock: goods receipt, reversal, valuation change |
| WRX  | GR/IR clearing account | Goods receipt plus invoice receipt — the classic document pair |
| GBB  | Offsetting entry against stock | Consumption, inventory differences, scrapping, goods receipt without PO — splits via account modifier into multiple sub-cases |
| PRD  | Price differences | Difference between PO price and valuation price for standard-price (S) materials |
| KDM  | Exchange rate differences | Currency-rate difference between goods receipt and invoice receipt |
| KBS  | Account assignment from PO | Directly assigned POs (cost center, internal order) — important complement to GBB |

The most practically important detail: **GBB is not one account, it is an entire family.** The account modifier splits it into several sub-cases — VBR for consumption postings, BSA for stock initialization (e.g. movement type 561), INV for inventory differences, ZOB for goods receipt without reference, VNG for scrapping. When a controller asks why an inventory difference ended up on a consumption account, the bug almost always sits in the GBB block of OBYC.

## Valuation area — the layer many rollouts overlook

In valuation-level customizing you decide whether the valuation area is at plant level or at company-code level. This is not just a technical setup question — it determines the level on which OBYC determinations are resolved.

In multi-plant setups where different plants need different accounts (for example, a manufacturing plant and a pure distribution warehouse), valuation area = plant is essentially mandatory. In leaner setups with homogenous account logic, valuation area = company code is enough.

**Practitioner note:** This decision is only reversible at significant cost after go-live. On greenfield rollouts it belongs in the first round of architecture workshops, not in the build team's customizing sprint.

## Where international rollouts come apart at this point

Three patterns that reliably create problems in multi-country projects — not spectacular bugs, but slow-growing reporting drift that only surfaces at the first quarterly close from the target country.

**1. Local accounts do not exist in the operational chart of accounts.** OBYC requires that the account exists in the operational chart of accounts of the company code. If the COA originates from a corporate template and a subsidiary company code needs accounts the headquarters COA does not carry, the very first goods receipt fails. The fix: maintain local accounts in the operational COA, even if HQ never posts to them.

**2. Valuation classes get inherited 1:1 from the corporate template, with no local exceptions.** In certain countries materials need specific valuation classes because of local tax requirements or reporting obligations. If you adopt the template without adjustment, you build in reporting drift that can only be repaired later by changing the valuation class on the material — a costly operation in production, because it pulls on stock, value, and posting documents at the same time.

**3. Movement types are not extended locally.** The SAP standard movement types are usually enough for headquarters setups. For company codes in Brazil, Mexico, or Colombia you typically need customer-defined movement types (Y- or Z-range), because certain country-specific postings only happen there. Each of these custom movement types needs its own account modifier in OBYC — otherwise country-specific postings smear together with standard postings on the same account, and the reporting becomes unusable.

<aside class="latam-bridge">

<div class="latam-bridge__head">International perspective — Brazil</div>

### ICMS/IPI on OBYC: why standard determination alone is not enough

In Brazil, ICMS (Imposto sobre Circulação de Mercadorias e Serviços) and IPI (Imposto sobre Produtos Industrializados) are not taxes that simply flow along inside an FI document. Depending on the tax situation of the movement, they are partly recoverable. Practically, this means: a goods-receipt posting in a Brazilian company code does not just hit the stock account. It needs to post in parallel to separate accounts for ICMS clearing, IPI clearing, and where applicable PIS/COFINS components.

Standard OBYC provides hooks for this through additional transaction keys that the **Brazilian localization** layers on top of the regular account determination. The **TAXBRA tax procedure** is the central place where the tax situation of a movement is calculated. Based on the NCM code, the tax classification of the material, and the tax situation of the vendor, the localization logic then resolves the final accounts — typically several accounts per posting document.

**Three places where this comes apart in practice:**

- **Transaction keys are missing from the OBYC scheme.** If you arrive from a non-Brazilian template and only maintain transaction keys with the parent company's account modifiers, ICMS-relevant consumption postings will not produce a complete posting document.
- **NCM code is not maintained on the material.** Without the NCM code (Nomenclatura Comum do Mercosul) on the material master, the localization logic falls into a default — which rarely picks the correct account.
- **Tax situation is not cleanly assigned.** Vendors in Brazil need a specific tax situation (CFOP logic), which in combination with movement type and valuation class drives the final account resolution.

This is not "a bit of extra configuration" on top — it is a second logic layer above OBYC. If you miss it, the NF-e output and therefore the SEFAZ filing breaks. Before any production go-live in Brazil, account determination belongs in its own dedicated test track, not in the bulk MM-movements regression.

</aside>

{% include disclaimer-latam.html sources="SAP Help Portal (Localization for Brazil), TAXBRA customizing path, SAP Notes on BR account determination." %}

## How to debug a failed account determination

A tool sequence that gets you to the root quickly during an active rollout:

1. **Simulate the movement.** Before the actual posting, validate the booking logic via simulation — for goods receipts directly in the posting screen, for critical edge cases via T-Code MB1A in simulation mode. The simulation shows the FI document the posting *would* produce.
2. **Open OBYC in display mode** and look up the entry directly for the affected combination of transaction key, valuation class, and account modifier. Is there an entry at all? Is the account correct?
3. **Check the material master:** Which valuation class is maintained in the Accounting view? In which valuation area?
4. **Check the movement-type customizing:** Is the account modifier the movement type is supposed to hand over actually maintained in OBYC for this transaction-key/valuation-class combination?
5. **For Brazilian setups, additionally:** Verify NCM on the material, tax situation on the vendor, and the tax procedure resolution via TAXBRA.

In about 80% of cases the issue is a missing OBYC entry or an incorrectly maintained valuation class on the material. The remaining 20% split across valuation-area confusion and localization-specific edge cases.

## What matters for the TS452 certification

Exam questions in this area rarely go deep on localization. They reliably test the fundamentals: which transaction key handles what (BSX, WRX, GBB)? How is the account modifier derived from the movement type? What is the difference between valuation class and account modifier, and how do they interact in OBYC?

An observation from training practice: candidates who memorize the OBYC keys as a list tend to fail when faced with an applied scenario. Candidates who can walk through the posting document for a standard goods receipt step by step (stock account against GR/IR via BSX and WRX, movement type 101, standard-price vs. moving-average-price material, the role of the valuation class) have the topic under control.

## A practical checklist before any rollout

A short checklist that catches the worst on an international MM rollout:

1. **OBYC diff** between the corporate template and the target company code, before the first test goods receipt. Gaps in the operational COA become visible early.
2. **Movement-type inventory:** Which Y/Z movement types are planned in the target country? Each one needs an account modifier maintained in OBYC for GBB.
3. **Valuation-class mapping** between material-master templates and local requirements — especially for company codes in BR, MX, and CO with tax implications.
4. **Verify the valuation-area level:** plant or company code? In multi-plant multi-country setups it is almost always plant.
5. **Check the local tax toolkit activation** — and do not find out at the first real NF-e or CFDI that the localization is not yet sharp.

OBYC is an old table. It is not spectacular, it is not exciting, it is not what wins awards at conferences. But it is the spot where international MM rollouts either run cleanly or blow up at the quarterly close — and that makes it required reading for anyone setting up MM in more than one country.
