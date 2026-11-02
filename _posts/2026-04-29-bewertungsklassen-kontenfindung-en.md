---
layout: post
lang: en
title: Valuation classes and automatic account determination in SAP MM
seo_title: Valuation classes and automatic account determination in SAP MM
description: How chart of accounts, valuation, valuation class and account grouping influence account determination.
slug: valuation-class-account-determination-international-rollouts
permalink: /blog/en/valuation-class-account-determination-international-rollouts/
translation_key: post-001-bewertungsklassen
date: 2026-04-29
reading_time: 5
author: Mario Bahunek
last_modified_at: '2026-11-02'
system_reference: 'SAP S/4HANA MM. SAP Learning does not state a release; the account-grouping source identifies Cloud Private Edition. Sources checked: November 2, 2026.'
review_status: pending_mario_and_independent_review
sources:
- label: 'SAP Learning: Describing Automatic Account Determination'
  url: https://learning.sap.com/courses/cross-functional-customizing-in-sap-s-4hana-materials-management/describing-automatic-account-determination
  note: SAP S/4HANA; edition not specified in lesson title; account-determination factors; No release stated; accessed 2026-11-02.
  edition: SAP S/4HANA; edition not specified in lesson title
  release: null
  version_parameter: null
  version_policy: NO_PUBLISHED_RELEASE
  retrieved: '2026-11-02'
- label: 'SAP Learning: Subdividing a Transaction with the Account Grouping Code'
  url: https://learning.sap.com/courses/exploring-cross-functional-customizing-in-sap-s-4hana-cloud-private-edition/subdividing-a-transaction-with-the-account-grouping-code_b471cc3a-c757-43dd-b0f0-18294f8d7d37
  note: SAP S/4HANA Cloud Private Edition; transaction-specific account grouping; No release stated; accessed 2026-11-02.
  edition: SAP S/4HANA Cloud Private Edition
  release: null
  version_parameter: null
  version_policy: NO_PUBLISHED_RELEASE
  retrieved: '2026-11-02'
---

For a valuation-relevant goods movement, SAP must determine the appropriate G/L accounts. Neither movement type nor valuation class is sufficient on its own. The relevant combination depends on the factors activated for the transaction. [1](#source-1)

## Which settings work together

- **Chart of accounts:** The company code determines the relevant operating chart of accounts.
- **Valuation area and valuation grouping code:** The grouping code can combine or distinguish valuation areas for account determination.
- **Valuation class:** It groups materials for account determination; it is not the material group.
- **Transaction/event key:** It identifies the accounting transaction from the value string.
- **Account grouping code:** It can subdivide a transaction, for example into different consumption cases.

The transaction key's rules determine the combination used. Not every transaction requires an entry containing every factor listed above. [2](#source-2)

## Distinguish inventory from offsetting postings

A simplified receipt for a stock purchase order can debit inventory and credit GR/IR. **BSX** identifies inventory postings and **WRX** identifies GR/IR. **GBB** concerns offsetting entries for inventory postings, including certain consumption transactions. **PRD** concerns price differences. Tax, account assignment and valuation scenarios may create additional or different lines. [1](#source-1)

An account grouping code is therefore not a universal extra column for every account. It must fit the transaction. A different country does not automatically require a new movement type or valuation class. [2](#source-2)

## Investigate a specific error

For a traceable test-system analysis:

1. Record the business transaction, document and error message.
2. Check the material and actual valuation area.
3. Identify the chart of accounts and valuation class.
4. Check the relevant transaction key, its rules and any account grouping code.
5. Reconcile account entries and G/L master data with FI.
6. Compare expected and actual document lines.

This is a derived investigation sequence, not a claim about the frequency of errors. The unsupported 80/20 breakdown has been removed, as has the reference to MB1A as a general S/4HANA simulation tool.

## International rollouts

Account determination and country-specific tax processes need coordinated review. This article does not claim a universal mapping from ICMS, IPI or CFDI to OBYC. The previous statements about additional Brazilian OBYC transactions and supposedly mandatory custom movement types have been withdrawn. For a specific country, verify the release, activated functions, tax procedure and local requirements separately.

## For training

Practice explaining each influencing factor and document line for a specific goods movement. This is not a promise about current certification questions. **Verification status: November 2, 2026; source comparison only, no SAP system test.**
