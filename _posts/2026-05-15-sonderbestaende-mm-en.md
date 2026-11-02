---
layout: post
lang: en
title: 'Special stocks in SAP MM: distinguishing K, E and Q'
seo_title: 'Special stocks in SAP MM: distinguishing K, E and Q'
description: 'Vendor consignment, sales order stock and project stock: assignment, valuation and the meaning of 411 K.'
slug: special-stocks-mm-consignment-project-stock-q-stock
permalink: /blog/en/special-stocks-mm-consignment-project-stock-q-stock/
translation_key: post-002-sonderbestaende
date: 2026-05-15
reading_time: 5
author: Mario Bahunek
last_modified_at: '2026-11-02'
system_reference: 'SAP S/4HANA on-premise / Private Edition; documentation scope: 2025 FPS01. Supplementary sources identify their own scope.'
review_status: pending_mario_and_independent_review
sources:
- label: 'SAP Help: Externally-Owned Special Stocks'
  url: https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/91b21005dded4984bcccf4a69ae1300c/a361bd534f22b44ce10000000a174cb4.html
  note: SAP S/4HANA 2025 FPS01; stock assignment and stock types; accessed 2026-11-02
- label: 'SAP Help: Make to Order Scenario (Sales Order Stock)'
  url: https://help.sap.com/docs/SUPPORT_CONTENT/ficontrolling/3361881737.html
  note: SAP support content; E/Q indicators; no release version shown; accessed 2026-11-02
- label: 'SAP Help: Sales Order Stock'
  url: https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/91b21005dded4984bcccf4a69ae1300c/6362bd534f22b44ce10000000a174cb4.html
  note: SAP S/4HANA; E, valuation and movements; accessed 2026-11-02
- label: 'SAP Help: Non-valuated project stock'
  url: https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/cc8f759e1b0e4f3b8048c3cf808d4068/ccceb65334e6b54ce10000000a174cb4.html
  note: SAP S/4HANA; quantity-only project stock; accessed 2026-11-02
- label: 'SAP Learning: Performing the Process of Vendor Consignment'
  url: https://learning.sap.com/courses/inventory-management-and-physical-inventory-in-sap-s-4hana/performing-the-process-of-vendor-consignment
  note: SAP S/4HANA; replenishment, withdrawal and settlement; accessed 2026-11-02
- label: 'SAP Help: How to post a stock transfer for Consignment Material'
  url: https://help.sap.com/docs/SUPPORT_CONTENT/erpscm/3362168070.html
  note: SAP support content; 411 K; no release version shown; accessed 2026-11-02
- label: 'SAP Help: Transfer Posting: From Consignment to Company-Owned Stock'
  url: https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/af9ef57f504840d2b81be8667206d485/a65eb6531de6b64ce10000000a174cb4.html
  note: SAP S/4HANA; stock account and consignment liability; accessed 2026-11-02
- label: 'SAP Help: Goods Movement Type'
  url: https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/ee6ff9b281d8448f96b4fe6c89f2bdc8/8b7b5fe73ef54063a2bfcfbe83cebd38.html
  note: SAP S/4HANA 2025 FPS01; 101 purchase-order goods receipt, 561 initial entry; read with vendor-consignment process source; accessed 2026-11-02
---

K, E and Q answer different questions: Does the stock still belong to the supplier? Is it assigned to a sales order or a project? A special stock indicator is separate from the stock type. Special stock can also be unrestricted-use, in quality inspection or blocked. [1](#source-1)

## The three indicators

| Indicator | Meaning | Assignment |
|---|---|---|
| K | Vendor consignment | Supplier |
| E | Sales order stock | Sales order and item |
| Q | Project stock | WBS element |

E does **not** mean project stock. Q is neither an extra reservation variant of E nor an indicator for quality inspection stock in this context. [2](#source-2)

The indicator alone does not determine valuation. Depending on the process and configuration, sales order and project stock can be valuated or non-valuated. Neither E nor Q implies a universal posting to a project asset account. [3](#source-3) [4](#source-4)

## Consignment: distinguish receipt, transfer and consumption

Vendor consignment initially remains the supplier's property. The standard process uses purchase order item category K. A receipt against the consignment purchase order uses **101 K** and increases consignment stock without valuating it as company-owned stock. The consignment info record supplies the price for later withdrawals or transfers. [5](#source-5) [8](#source-8)

**411 K** transfers unrestricted-use vendor consignment stock into company-owned unrestricted-use stock. It is neither the supplier's goods receipt nor a direct issue to a cost center. The transfer value is posted to inventory against the consignment liability; valuation differences can produce additional posting lines. An additional 561 posting is not part of this transfer of ownership. [6](#source-6) [7](#source-7)

Direct consumption and transfer to own stock are separate transactions. Liabilities arising from withdrawals or transfers are settled through **MRKO** in the classic process. A consignment purchase order item is not settled as an ordinary PO invoice through MIRO. [5](#source-5)

## A quantity example to verify

Suppose unrestricted-use K stock contains 100 units. Transferring 20 units with 411 K should leave 80 units in K stock and 20 in own stock. Total physical quantity remains 100. This is a derived learning example, not a recorded system test.

Before testing, check the material, plant, storage location, supplier, valid consignment info record, valuation and account determination. In an authorized test client, reconcile the material document, stock overview, accounting document and subsequent settlement. Actual account numbers depend on the system.

## E and Q in practice

E identifies stock for a particular sales order item; Q identifies stock for a WBS element. For a receipt against a purchase order, relevant assignments come from the reference document. Choose a transfer posting by its source, destination and business transaction, not by a letter alone. The previous descriptions of “412 E as a project receipt” and “411 E as project consumption” were incorrect. [3](#source-3) [1](#source-1)

## International processes and exam preparation

This article does not infer tax or customs treatment in Mexico, Brazil or Colombia from consignment. The previous blanket claims about IMMEX, IVA, CFDI and supposedly required country-specific movement types have been withdrawn. A country-specific design needs a separate, evidence-based specialist review.

For learning, ask three questions: What is the stock assigned to? Is it valuated? Which business transaction does the movement represent? This article makes no claim about specific current certification questions or their order.

**Verification status:** Sources checked on November 2, 2026. No SAP system test performed. Verify the target release, valuation and configuration before applying the example.
