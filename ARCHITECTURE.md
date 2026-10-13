# System Architecture

Technical reference and design overview for the bank reconciliation system.

---

## 1. High-Level Overview

The system is a lightweight, zero-database reconciliation web application built with **Python (Flask)** on the backend and **vanilla HTML/CSS/JavaScript** on the frontend. It is designed to run seamlessly on both standard POSIX servers and serverless hosting environments (e.g., Vercel, AWS Lambda).

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Browser                        │
│             (Vanilla JS UI + Keyboard Navigation)           │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON API
┌──────────────────────────────▼──────────────────────────────┐
│                      Flask Application                      │
│                          (app.py)                           │
│  ┌─────────────────────────┐     ┌───────────────────────┐  │
│  │   Division Switcher     │     │ Reconciliation System │  │
│  │ (Division A/Division B) │     │ (Queue & Group Match) │  │
│  └────────────┬────────────┘     └───────────┬───────────┘  │
└───────────────┼──────────────────────────────┼──────────────┘
                │                              │
┌───────────────▼──────────────────────────────▼──────────────┐
│                    Persistence Layer                        │
│                Atomic JSON files in `data/`                 │
│         (Serverless fallback to `/tmp/data` on Vercel)      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Multi-Division System

The application isolates transaction data into logical divisions:
- **`Division A`** (Primary default)
- **`Division B`** (Secondary division)

### Storage Organization
Data files are separated by division suffix:
- Default files (`transactions_gl.json`, `transactions_bank.json`, `queue.json`, `processed.json`, `imports.json`) belong to **Division A**.
- Suffix files (`*_division_b.json`) store records for **Division B**.
- Active division preference is preserved in secure session cookies and synchronized to `data/current_division.json`.

---

## 3. Reconciliation & Matching System

Reconciliation follows an interactive queue workflow:

1. **Selection & Queueing**:
   - Operators click transactions from Source A (GL) and Source B (Bank) to place them into the active reconciliation queue (`queue.json`).
2. **Delta Validation**:
   - Net discrepancy is dynamically calculated: `Discrepancy = Sum(Source A) - Sum(Source B)`.
   - When discrepancy is within acceptable bounds (e.g., 0.00 exact match), the match can be locked and committed.
3. **Commitment**:
   - Group is assigned a unique `group_id`, matched records are removed from active tables, and the reconciled group is saved to `processed.json`.
4. **Reports**:
   - Summaries and detailed audit logs can be exported as `.txt` or `.xlsx` files on demand.

---

## 4. Storage & Serverless Compatibility

- **Atomic Writes**: Writes utilize temporary files and atomic file replacement (`os.replace`) to prevent data corruption during simultaneous read/write cycles.
- **Serverless Resilience**:
  - In environments like Vercel where the repository directory is strictly read-only, the application initializes and redirects writes to `/tmp/data`, pre-seeding it with bundled initial templates if absent.

---

## 5. Directory Structure

```
├── app.py                  # Main Flask application and business logic
├── requirements.txt        # Python package dependencies
├── .env.example            # Environment configuration template
├── LICENSE                 # Project license
├── ARCHITECTURE.md         # Architecture documentation
├── IMPORT_GUIDE.md         # File upload and canonical mapping guide
├── data/                   # Division JSON persistence directory
│   ├── current_division.json
│   ├── imports.json
│   ├── imports_division_b.json
│   ├── processed.json
│   ├── processed_division_b.json
│   ├── queue.json
│   ├── queue_division_b.json
│   ├── transactions_bank.json
│   ├── transactions_bank_division_b.json
│   ├── transactions_gl.json
│   └── transactions_gl_division_b.json
├── sample_data/            # Sample CSV files for testing
│   ├── sample_bank.csv
│   └── sample_gl.csv
├── static/                 # Stylesheet and frontend logic
│   ├── app.js
│   └── style.css
└── templates/              # Jinja2 HTML templates
    └── index.html
```
