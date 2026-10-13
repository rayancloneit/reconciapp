# Data Import & Mapping Guide

This guide explains how to prepare and import General Ledger and Bank Statement files into the reconciliation application.

---

## 1. Supported File Formats

- **CSV** (`.csv`)
- **Excel** (`.xlsx`, `.xls`)

Files with multiple sheets are supported; the importer will allow you to select the sheet to process.

---

## 2. Source Tables

The application reconciles two primary sides:

| Source | Role | Table Label |
| :--- | :--- | :--- |
| **Source A** | General Ledger / Accounting Records | `General Ledger` |
| **Source B** | Bank Statement / Merchant Feeds | `Bank Statement` |

---

## 3. Canonical Field Reference

When uploading a file, you map your raw file columns to the application's canonical fields:

| Field Name | Type | Description | Required? |
| :--- | :--- | :--- | :--- |
| **Description** | Text | Transaction details, counterparty name, memo | **Yes** |
| **Amount** | Number | Net transaction amount (positive or negative) | **Yes** *(or Debit/Credit)* |
| **Debit** | Number | Outgoing payment / debit amount | Optional |
| **Credit** | Number | Incoming receipt / credit amount | Optional |
| **Date** | Date | Transaction date (`YYYY-MM-DD`, `DD/MM/YYYY`, etc.) | Optional |
| **Reference** | Text | Check number, transaction reference, wire ID | Optional |
| **Document No** | Text | Invoice number, voucher number | Optional |
| **Counterparty** | Text | Vendor, client, or payer name | Optional |
| **Balance** | Number | Running account balance | Optional |
| **Currency** | Text | Currency code (e.g. `USD`, `EUR`, `SAR`) | Optional |
| **Notes** | Text | Internal comments or annotations | Optional |
| **Ignore** | — | Skips importing this raw column | — |

---

## 4. Amount Conventions

The system supports two methods for handling transaction amounts:

1. **Single Amount Column**:
   - Positive numbers (`150.00`): Inflows / Receipts / Credits.
   - Negative numbers (`-150.00`): Outflows / Payments / Debits.
   - Values with currency signs (`$`, `€`, `£`) or comma delimiters (`1,250.00`) are automatically parsed and sanitized.

2. **Separate Debit & Credit Columns**:
   - If your file provides distinct Debit and Credit columns, map each respectively.
   - The system automatically computes `Amount = Credit - Debit` (or vice-versa depending on the account configuration).

---

## 5. Column Mapping Presets

- If your file column headers match common accounting exports, presets will automatically suggest appropriate mappings.
- You can save custom column mapping presets for your specific bank formats to streamline future imports.

---

## 6. Sample Files

Pre-formatted test data is available in the [`sample_data/`](sample_data/) directory:
- `sample_data/sample_bank.csv` — Bank Statement sample.
- `sample_data/sample_gl.csv` — General Ledger sample.
