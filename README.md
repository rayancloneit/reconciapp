# Bank Reconciliation Application

A web-based financial reconciliation system designed to match General Ledger accounting records against Bank Statement transactions.

## Overview

The application streamlines transaction matching between internal accounting books (Source A: General Ledger) and external statements (Source B: Bank Statement), calculating discrepancies in real time and maintaining an audit log of reconciled groups.

## Core Capabilities

- Multi-Division Management: Isolate transaction sets across distinct operational divisions (Division A and Division B) with one-click switching.
- Spreadsheet Import: Upload CSV and Excel (.xlsx, .xls) files into either General Ledger or Bank Statement tables.
- Column Mapping: Map raw file headers to standard fields (Date, Description, Amount, Debit, Credit, Reference, Document No) with reusable mapping presets.
- Interactive Reconciliation Queue: Stage selected rows from both tables to verify net differences before committing.
- Group Finalization: Lock matched groups, clear them from active tables, and preserve them in reconciled history.
- Audit Export: Generate and download reconciliation reports in Excel (.xlsx) and plain text (.txt) formats.

## Local Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the application:
   ```bash
   python app.py
   ```

3. Access the interface:
   ```
   http://127.0.0.1:5001
   ```

## Documentation

- ARCHITECTURE.md: System design, division data isolation, and persistence details.
- IMPORT_GUIDE.md: File structure requirements and column mapping rules.
