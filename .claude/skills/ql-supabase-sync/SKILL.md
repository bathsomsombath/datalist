---
name: ql-supabase-sync
description: Use at the start of any Quick Lane question about WIPs, pending jobs, cash/petty cash, AR, parts ETA, or when Sombath says "sync", "check supabase", "what data is not updated", "save to supabase". Checks data freshness in Supabase project tbwkbtslmtxvwnqcqljx, reports stale tables, says what Sombath must send, and writes new facts to ql_kb.
---

# QL Supabase sync

Project: `tbwkbtslmtxvwnqcqljx` (`operation`). Answer Sombath in Thai. Use the Supabase `execute_sql` tool.

## 1. Check freshness (run once)
```sql
select * from (
select 'ql_wip_pending' t, max(snap_date)::text last_data from ql_wip_pending
union all select 'ql_wip_pending_lines', max(snap_date)::text from ql_wip_pending_lines
union all select 'ql_wip_detail', max(snap_date)::text from ql_wip_detail
union all select 'ql_sox (sales)', max(loaded_at)::text from ql_sox
union all select 'ql_t41 (tyre/battery)', max(loaded_at)::text from ql_t41
union all select 'ql_g49 (stock)', max(snapshot_date)::text from ql_g49
union all select 'ql_ar_detail', max(snapshot_date)::text from ql_ar_detail
union all select 'ql_ar_wip_sub', max(snapshot_date)::text from ql_ar_wip_sub
union all select 'ql_parts_pending (ETA)', max(updated_at)::text from ql_parts_pending
union all select 'ql_order_parts', max(created_at)::text from ql_order_parts
union all select 'ql_car_moves', max(moved_at)::text from ql_car_moves
union all select 'finance_cash', max(updated_at)::text from finance_cash
union all select 'ql_petty_bills', max(created_at)::text from ql_petty_bills
union all select 'wips', max(updated_at)::text from wips
union all select 'ql_kb', max(updated_at)::text from ql_kb
) x order by last_data;
```
Flag a table stale when the last data is more than 2 days old (more than 1 day for WIP detail and parts ETA). Use Laos time (UTC+7). Note: `ql_cash` is empty and `finance_cash` balances were 0 on 12/10, so ask for real balances. Also check `ql_petty` (single row id='main', `data` is a JSON array, last updated 21/09/2026).

Answer format: table of stale tables with last date, then "what to send me" (Autoline export for WIP detail, Ordstat/parts ETA, SOX, T41, G49, AR, cash and bank balances, petty cash bills).

## 2. Write rules for `ql_kb`
- New rows: put the text in `data`; English + Lao together. Reports go in `content`, never in `category`.
- `account` must be a real code: A0010, B0002, B0010, C0006, M0610, P0009, U0006 (free text returns 409).
- `priority`: Normal / Important / Urgent only. `status` is free text (pending, in_progress, done, reference, active).
- Duplicates: set `status='reference'` with note `Merged into #X (duplicate) | ລວມເຂົ້າ #X (ຊ້ຳກັນ)`. Never `done` for a duplicate (trigger closes the WIP in `ql_jobs`).
- Finished task: set `done`. Ask before any delete.
- SOPs use `category='sop'`, `status='active'`, with a `ref` like `sop-<topic>-<yyyymmdd>`.

## 3. Money and cash
- Petty cash: weekly claim in the LFC Weekly sheet (PV number). Record the claim and the BCEL transfer proof in `ql_kb` (category `finance`) and in `ql_petty`.
- Cash forecast: `cf_entries` (override rows for recurring petty cash) and `finance_cash` (balances). Fix forecast rows when the real amount differs.

## 4. Do not
- Do not guess prices, invoice numbers, account codes or dates. Ask Sombath.
- Do not claim data is current without the freshness check.
- You cannot send WhatsApp, email or TPlus. Give the draft and say Sombath sends it.
