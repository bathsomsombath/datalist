#!/usr/bin/env bash
# Upload one local file to Supabase storage bucket ql_files (project tbwkbtslmtxvwnqcqljx).
# The bucket policies allow anon insert/update, so the public anon key is enough.
# Usage: SB_ANON_KEY=<anon key from get_publishable_keys> tools/sb_upload.sh <local_file> <object_path>
# Prints: HTTP_CODE size object_path (200 = saved; an existing object is overwritten).
set -u
REF=tbwkbtslmtxvwnqcqljx
KEY="${SB_ANON_KEY:?set SB_ANON_KEY}"
f="$1"; p="$2"
case "${f##*.}" in
  xlsx) ct=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet ;;
  pptx) ct=application/vnd.openxmlformats-officedocument.presentationml.presentation ;;
  docx) ct=application/vnd.openxmlformats-officedocument.wordprocessingml.document ;;
  pdf) ct=application/pdf ;; png) ct=image/png ;; jpg|jpeg) ct=image/jpeg ;;
  js) ct=text/javascript ;; json) ct=application/json ;; md) ct=text/markdown ;;
  zip) ct=application/zip ;; html) ct=text/html ;; csv) ct=text/csv ;; *) ct=text/plain ;;
esac
enc=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$p")
resp=$(mktemp)
code=$(curl -sS -o "$resp" -w '%{http_code}' --max-time 300 -X POST \
  "https://$REF.supabase.co/storage/v1/object/ql_files/$enc" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "x-upsert: true" -H "Content-Type: $ct" \
  --data-binary @"$f")
echo "$code $(stat -c %s "$f") $p"
[ "$code" = 200 ] || { cat "$resp"; echo; }
