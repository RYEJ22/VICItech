#!/usr/bin/env bash
# Generate file aturan untuk tiap AI coding assistant dari sumber di docs/ai/.
# Sumber kebenaran: docs/ai/CORE_CONTEXT.md, CODING_STANDARDS.md, WORKFLOW_SKILLS.md,
# dan (opsional) PATTERNS.md.
# Pakai:  bash scripts/sync-ai-rules.sh [--force]
# Jalankan ulang setiap kali file di docs/ai/ berubah.
# File yang sudah ada dan bukan hasil generate TIDAK ditimpa, kecuali pakai --force
# (file lama disalin ke <nama>.bak lebih dulu).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AI="$ROOT/docs/ai"
PROJECT_NAME="${PROJECT_NAME:-ViciTech}"
MARK="Dibuat otomatis dari docs/ai/ oleh scripts/sync-ai-rules.sh. Jangan edit file ini; edit sumbernya."
FORCE=0
[ "${1:-}" = "--force" ] && FORCE=1

for f in CORE_CONTEXT CODING_STANDARDS WORKFLOW_SKILLS; do
  [ -f "$AI/$f.md" ] || { echo "Tidak ditemukan: docs/ai/$f.md"; exit 1; }
done

HAS_PATTERNS=0
[ -f "$AI/PATTERNS.md" ] && HAS_PATTERNS=1

BODY="$(mktemp)"
FLOW="$(mktemp)"
WINDSURF="$(mktemp)"
PATTERNS_FILE="$(mktemp)"
trap 'rm -f "$BODY" "$FLOW" "$WINDSURF" "$PATTERNS_FILE"' EXIT

# Isi inti: konteks + standar + penunjuk ke SOP dan roadmap.
{
  echo "$MARK"
  echo
  cat "$AI/CORE_CONTEXT.md"
  echo
  cat "$AI/CODING_STANDARDS.md"
  echo
  echo "## SOP Kerja"
  echo "Untuk tugas desain, Supabase RLS, audit keamanan, Figma-to-code, debugging, refactoring, copy, atau rilis, baca bagian yang relevan di docs/ai/WORKFLOW_SKILLS.md. Detail modul ada di docs/ROADMAP.md."
} > "$BODY"
if [ "$HAS_PATTERNS" -eq 1 ]; then
  echo "Kode referensi untuk pola berulang (hook browser, reducer + timer, hero slider, Server Action, RLS, RPC, Realtime) ada di docs/ai/PATTERNS.md. Muat hanya bagian yang ditunjuk SOP." >> "$BODY"
fi

# Isi ringkas khusus Windsurf (menghindari pemotongan batas karakter Windsurf).
{
  echo "$MARK"
  echo
  cat "$AI/CORE_CONTEXT.md"
  echo
  echo "## Standar Kode dan SOP Kerja (Wajib Dibaca)"
  echo "- Sebelum menulis kode, migration, atau Server Action, baca aturan lengkap di \`docs/ai/CODING_STANDARDS.md\`."
  echo "- Untuk tugas spesifik (desain, Supabase RLS, audit keamanan, Figma-to-code, debugging, refactoring, copy, rilis), baca SOP relevan di \`docs/ai/WORKFLOW_SKILLS.md\`."
  echo "- Detail spesifikasi modul dan Definition of Done ada di \`docs/ROADMAP.md\`."
} > "$WINDSURF"
if [ "$HAS_PATTERNS" -eq 1 ]; then
  echo "- Untuk kode referensi pola berulang, baca bagian yang ditunjuk SOP di \`docs/ai/PATTERNS.md\`." >> "$WINDSURF"
fi

# Isi SOP lengkap (untuk platform yang memuatnya on-demand).
{
  echo "$MARK"
  echo
  cat "$AI/WORKFLOW_SKILLS.md"
} > "$FLOW"

# Kode referensi (dimuat on-demand).
if [ "$HAS_PATTERNS" -eq 1 ]; then
  {
    echo "$MARK"
    echo
    cat "$AI/PATTERNS.md"
  } > "$PATTERNS_FILE"
fi

# write_target <path-relatif> <file-isi> [<prefix-teks>]
write_target() {
  local rel="$1" src="$2" prefix="${3:-}"
  local target="$ROOT/$rel"
  if [ -e "$target" ] && ! grep -qF "Dibuat otomatis dari docs/ai/" "$target"; then
    if [ "$FORCE" -eq 1 ]; then
      cp "$target" "$target.bak"
      echo "backup: $rel.bak"
    else
      echo "dilewati (sudah ada, bukan hasil generate): $rel  (pakai --force untuk menimpa)"
      return 0
    fi
  fi
  mkdir -p "$(dirname "$target")"
  if [ -n "$prefix" ]; then
    { printf '%s' "$prefix"; cat "$src"; } > "$target"
  else
    cat "$src" > "$target"
  fi
  echo "ditulis: $rel"
}

CURSOR_CORE=$'---\nalwaysApply: true\n---\n'
printf -v CURSOR_FLOW -- '---\ndescription: SOP kerja %s (desain, RLS, audit, Figma-to-code, copy, rilis). Pakai saat tugas cocok dengan SOP.\nalwaysApply: false\n---\n' "$PROJECT_NAME"

write_target "CLAUDE.md" "$BODY"                       # Claude Code
write_target "AGENTS.md" "$BODY"                       # Codex dan agen yang membaca AGENTS.md
write_target "GEMINI.md" "$BODY"                       # Gemini CLI
write_target ".github/copilot-instructions.md" "$BODY" # GitHub Copilot
write_target ".windsurfrules" "$WINDSURF"              # Windsurf (ringkas, aman dari limit karakter)
write_target ".cursor/rules/vicitech-core.mdc" "$BODY" "$CURSOR_CORE"
write_target ".cursor/rules/vicitech-workflows.mdc" "$FLOW" "$CURSOR_FLOW"
if [ "$HAS_PATTERNS" -eq 1 ]; then
  printf -v CURSOR_PATTERNS -- '---\ndescription: Kode referensi %s (hook browser, reducer + timer, hero slider, Server Action, RLS, RPC, Realtime). Pakai saat SOP menunjuk PATTERNS.\nalwaysApply: false\n---\n' "$PROJECT_NAME"
  write_target ".cursor/rules/vicitech-patterns.mdc" "$PATTERNS_FILE" "$CURSOR_PATTERNS"
fi

echo
if [ -f "$ROOT/.windsurfrules" ]; then
  echo "Ukuran .windsurfrules: $(wc -m < "$ROOT/.windsurfrules" | tr -d ' ') karakter (ringkas; merujuk ke docs/ai/CODING_STANDARDS.md & WORKFLOW_SKILLS.md)."
fi
echo "Selesai. Sumber tetap di docs/ai/. Untuk chat web, upload semua file di docs/ai/ sebagai knowledge."
