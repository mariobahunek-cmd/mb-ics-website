---
layout: post
lang: en
title: 'Invoice verification in SAP: MIRO, direct FI posting and ERS'
seo_title: 'Invoice verification in SAP: MIRO, direct FI posting and ERS'
description: Distinguish purchasing references, GR/IR, ERS prerequisites and invoice tolerance keys.
slug: invoice-verification-mm-logistics-fi-ers
permalink: /blog/en/invoice-verification-mm-logistics-fi-ers/
translation_key: post-003-rechnungspruefung
date: 2026-05-25
reading_time: 5
author: Mario Bahunek
last_modified_at: '2026-11-02'
system_reference: 'SAP S/4HANA on-premise / Private Edition; documentation scope: 2025 FPS01. Supplementary sources identify their own scope.'
review_status: pending_mario_and_independent_review
sources:
- label: 'SAP Help: Invoice Processing'
  url: https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/f3419342409c4a7cb0b2d27f801d38b1/ab6fb6531de6b64ce10000000a174cb4.html
  note: SAP S/4HANA; PO, GR and non-PO references; accessed 2026-11-02
- label: 'SAP Learning: Entering Invoices with Variances'
  url: https://learning.sap.com/courses/invoice-verification-in-sap-s-4hana/entering-invoices-with-variances-1
  note: SAP S/4HANA; OMR6 and accounting for variances; accessed 2026-11-02
- label: 'SAP Help: Return Delivery in Goods-Receipt-Based Invoice Verification'
  url: https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/91b21005dded4984bcccf4a69ae1300c/eb63bd534f22b44ce10000000a174cb4.html?version=2023.latest
  note: SAP S/4HANA 2023 documentation; reversal dependency, supplementary only; accessed 2026-11-02
- label: 'SAP Help: Evaluated Receipt Settlement'
  url: https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/b846b365dbf64aa3a251fbdb53f4c97e/796fb6531de6b64ce10000000a174cb4.html
  note: SAP S/4HANA 2025 FPS01; prerequisites and test mode; accessed 2026-11-02
- label: 'SAP Help: Tolerance'
  url: https://help.sap.com/docs/SUPPORT_CONTENT/spmm/3362167829.html
  note: SAP support content; exact key definitions; no release version shown; accessed 2026-11-02
- label: 'SAP Help: Blocking Invoices'
  url: https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/af9ef57f504840d2b81be8667206d485/7870b6531de6b64ce10000000a174cb4.html
  note: SAP S/4HANA 2025 FPS01; whole-invoice payment block; accessed 2026-11-02
- label: 'SAP Learning: Handling of Variances Without Reference to an Item'
  url: https://learning.sap.com/courses/invoice-verification-in-sap-s-4hana/handling-of-variances-without-reference-to-an-item
  note: SAP S/4HANA; BD and supplier-specific tolerances; accessed 2026-11-02
- label: 'SAP Help: Supplier Invoice in Finance'
  url: https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/b2d44c1091094b5a810c2a879ee95522/7b43c20ec48e46768de3cb7d00024b5d.html?locale=en-US&state=PRODUCTION&version=2025.001
  note: SAP S/4HANA 2025 FPS01; FB60/FB65 transaction names only, no localization claim; accessed 2026-11-02
- label: 'SAP Help: Vendor Consignment (MM-IM)'
  url: https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/8a57feade137489098f59374c06f1e0e/6507b753128eb44ce10000000a174cb4.html?locale=en-US
  note: SAP S/4HANA 2025 FPS01; MRKO settlement transaction; accessed 2026-11-02
---

The business process determines the posting route. Supplier invoices can refer to a purchase order, individual goods receipts or no purchase order. “No PO” therefore does not automatically mean “MIRO cannot be used”. [1](#source-1)

## MIRO and direct FI posting

Logistics Invoice Verification can use purchase order history and goods receipts. **PO-based** verification settles PO items; **GR-based** verification assigns invoices to individual deliveries. Not every MIRO invoice is necessarily a three-way match with a goods receipt already posted. Direct postings to G/L or material accounts without a PO reference are also supported. [1](#source-1)

FB60 and FB65 provide direct FI entry of a supplier invoice and credit memo respectively. The interface must fit the approved invoicing process. Direct FI entry does not replace checking against MM purchase order history. [8](#source-8)

## What the GR/IR account shows

For a simplified example with valuated stock material, identical purchase order and valuation prices, and no taxes, delivery costs or variances:

- Goods receipt: **debit inventory, credit GR/IR**.
- Invoice receipt: **debit GR/IR, credit supplier payable**.

Price and quantity variances require a more detailed treatment. Depending on price control and stock coverage, price differences may affect inventory or price difference accounts. An open GR/IR balance is not automatically a price variance. [2](#source-2)

Reversing a receipt after invoicing does not simply produce “ghost items”. Permitted reversals and follow-up actions depend on configuration. Documented options include canceling the invoice or establishing an appropriate subsequent receipt reference. [3](#source-3)

## ERS: settlement without a separate supplier invoice

Evaluated receipt settlement derives invoice data from the purchase order and goods receipt. It requires agreement with the supplier. The classic transaction is **MRRL**. Key prerequisites include:

- ERS indicators in the relevant supplier purchasing data and PO items.
- A PO-referenced goods receipt and GR-based invoice verification.
- A tax code in the PO item; the order price must not be flagged as estimated.

Test mode lists eligible and ineligible transactions without posting. Settlement output and delivery must be configured. Consignment settlement through MRKO is a separate procedure. [4](#source-4) [9](#source-9)

ERS does not compare a separately submitted supplier invoice with the PO. The earlier blanket equivalence between MIRO and ERS variance checks was misleading. The generalized claim about ERS eligibility in Brazil and Mexico has also been withdrawn; no country-specific process is verified here.

## The correct tolerance keys

These keys belong to Logistics Invoice Verification. Maintain company-code-dependent limits under **Materials Management → Logistics Invoice Verification → Invoice Block → Set Tolerance Limits (OMR6)**. [2](#source-2)

| Key | What it checks |
|---|---|
| AN | Item amount without PO reference, where the amount check is activated |
| AP | Item amount with PO reference, as configured for amount checks |
| BD | Automatic balancing of small invoice differences |
| BR | Percentage order price quantity variance when invoice precedes receipt |
| BW | Percentage order price quantity variance when receipt precedes invoice |
| DQ | Quantity variance against the expected quantity |
| DW | Quantity variance when a goods receipt is expected but none has been posted (GR quantity zero) |
| PP | Price variance |
| ST | Date variance, evaluated as amount × days |

BR checks the relationship between order price units and order units, not simply an increased invoice price. DW is not a combined price/value variance. [5](#source-5)

## Distinguish warnings, payment blocks and posting prevention

A variance in one item can block the **entire invoice** for payment. The accounting document may already be posted. Falling below a lower limit is not equivalent to exceeding an upper limit. [6](#source-6) [2](#source-2)

BD concerns the invoice balance, not dates. Supplier-specific tolerances can take precedence. “Do not check” is not strict zero tolerance. Consult the particular key's documentation for the interaction between absolute and percentage limits; a universal AND rule is incorrect. [7](#source-7)

**Verification status:** Sources checked on November 2, 2026; no SAP system test. Test price (PP), quantity (DQ/DW), order price quantity (BR/BW), date (ST), item amount (AN/AP) and balance differences (BD) separately in a test client. This article promises no particular exam questions or outcomes.
