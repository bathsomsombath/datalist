---
name: ql-daily-routine
description: Sombath's Quick Lane daily / weekly / monthly job routine. Use when Sombath asks "my routine", "what should I do now", "check my routine", "start my day", "routine check", "what is due today", "did I miss anything", or at the start of any work session. Checks the routine against Supabase (project operation, tbwkbtslmtxvwnqcqljx), lists what is due or overdue, and shows which daily reports are missing from Supabase. Reply in Thai.
---

# Quick Lane daily routine (Sombath)

Supabase project `operation` (id `tbwkbtslmtxvwnqcqljx`) is the single source of truth.
All times are ICT (UTC+7). `ql_reminders.remind_at` is stored in UTC.
Reply in Thai, short, in tables (skills `reply-in-thai`, `show-status-on-reply`).

## 1. Session start (always)
1. Read `ql_memory` (deleted_at is null) for rules.
2. Read `ql_reminders` where status in ('pending','due') and deleted_at is null, ordered by remind_at.
3. Read `ql_file_index` latest rows to see which files are already in Supabase.

## 2. Daily routine (Mon–Sat)
| Time (ICT) | Job | Check in Supabase |
|---|---|---|
| 08:00 | Daily push list: everything due today | `ql_reminders` due today + overdue |
| 08:00–10:00 | Battery cash + GRN submitted **before 10:00** | `grn_entries`, `ql_grn` |
| 08:30 | Upload the 9 daily reports (see section 3) | the latest date in each table |
| 08:35 | Beerlao AR + PO check (B0002) | `ql_beerlao`, `ql_ar_detail` account B0002 |
| Morning | Follow up QTs waiting for approval (AVIS, Phubia, Burapha, retail) | `ql_quotes`, `ql_kb` status qt_sent |
| 12:45 | Hand out today's jobs to the team; QC/drive-test reminder for repeat repairs | `ql_reminders` category plan/QC |
| Afternoon | WIP pending follow-up: parts ETA, serious WIPs | `ql_wip_pending`, `ql_parts_pending` |
| 16:30 | EOD check: what is still open (skill `eod-push`) | open reminders today |
| 17:00 | Jack's daily report: 1 problem + action, AVIS/Burapha repeat jobs | — |

## 3. The 9 daily reports (must be uploaded to Supabase every day)
| # | Report | Table | Freshness column |
|---|---|---|---|
| 1 | S0X invoices | `ql_sox` | max(inv_date) |
| 2 | T41 parts sales | `ql_t41` | max(inv_date) |
| 3 | WIP pending | `ql_wip_pending` | max(snap_date) |
| 4 | WIP value not invoiced | `ql_ar_wip_sub` | max(snapshot_date) |
| 5 | Stock G49 | `ql_g49` | max(snapshot_date) |
| 6 | AR detail per account | `ql_ar_detail` | max(snapshot_date) |
| 7 | Upselling | `ql_weekly_meeting` (Upsell sheet) | max(meeting_date) |
| 8 | Workshop loading / tech hours | `ql_tech_hours` | max(snapshot_date) |
| 9 | Parts order ETA | `ql_parts_pending` | max(updated_at) |

A report is ✅ when its date is the last working day or later; otherwise it is ❌.
Show one table: | Report | Latest in Supabase | ✅/❌ |. Ask Sombath only for the ❌ files.

## 4. Weekly routine
| Day | Job |
|---|---|
| Mon | Petty cash: collect and check bills, then submit to Tick (RMA). Keep each claim around 17M LAK. Bills go to `ql_petty_bills` and storage `petty-bills/` |
| Mid-week | GIS: check Anthony's progress (`ql_gis` track_status open) |
| Wed | Verify Suphutta's weekly supplier payment: match PO/GRN/amount+VAT against GIS before transfer |
| Thu | RMA transfers petty cash; Kitty confirms it was received |
| Fri | Bee fleet plan weekly review (`ql_fleet_prospects`) |
| Sat | Weekly report deck (skill `weekly-report-ppt`) and weekly meeting data |

## 5. Monthly routine
- 12th and 25th: AVIS invoice upload to SharePoint (skill `avis-fleet-report`).
- Around the 16th: AR monthly review, compared with the previous baseline (`ql_ar_aging`).
- Beerlao fleet monthly meeting (prepare the day before).
- Start of month: Pornpun KPI dashboard (skill `pornpun-kpi-dashboard`).
- End of month: GIS deadline, so all GIS must be cleared.

## 6. Standing rules
- Phubia: send a QT before **any** work starts (skill `phubia-qt-email`).
- Every file Sombath uploads goes to storage bucket `ql_files`, gets indexed in `ql_file_index`, and its data goes into the matching table.
- Every action (WIP, QT, reminder, AR/GIS check) is written to Supabase in the same turn. Never say "saved" unless the write succeeded.
- When a routine item is finished, set the reminder to `status='done', done_at=now()`, one row at a time. Never close many rows at once.

## Output format
1. **Overdue** (due before today, not done): count + top 10 by priority.
2. **Today**: a table with the time, job and status.
3. **Daily reports**: the 9-report ✅/❌ table.
4. **This week**: the weekly items still to do.
