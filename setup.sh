#!/usr/bin/env bash
# Pasang toolkit AI ViciTech ke sebuah project.
# Pakai:  bash setup.sh [--update] [/path/ke/project]     (tanpa path = folder saat ini)
# Tanpa --update: file yang sudah ada tidak ditimpa (aman dijalankan ulang).
# Dengan --update: docs/ai/*.md dan scripts/sync-ai-rules.sh ditimpa dengan versi
#   terbaru (file lama disimpan sebagai .bak). docs/ROADMAP.md TIDAK pernah ditimpa
#   karena berisi progres; bandingkan manual.
set -euo pipefail

UPDATE=0
TARGET="."
for arg in "$@"; do
  case "$arg" in
    --update) UPDATE=1 ;;
    *) TARGET="$arg" ;;
  esac
done
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

[ -d "$TARGET" ] || { echo "Folder tujuan tidak ditemukan: $TARGET"; exit 1; }

# copy_file <sumber-relatif> <tujuan-relatif> [managed: 1 = boleh diperbarui oleh --update]
copy_file() {
  local src="$HERE/$1" dst="$TARGET/$2" managed="${3:-0}"
  if [ -e "$dst" ]; then
    if [ "$UPDATE" -eq 1 ] && [ "$managed" -eq 1 ]; then
      if cmp -s "$src" "$dst"; then
        echo "sudah terbaru: $2"
      else
        cp "$dst" "$dst.bak"
        cp "$src" "$dst"
        echo "diperbarui: $2 (backup: $2.bak)"
      fi
    else
      echo "lewati (sudah ada): $2"
    fi
  else
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
    echo "terpasang: $2"
  fi
}

# 1. Skill (.claude/skills): tidak pernah ditimpa; dilewati jika bundle tidak menyertakannya
if [ -d "$HERE/.claude/skills" ]; then
  mkdir -p "$TARGET/.claude/skills"
  for dir in "$HERE"/.claude/skills/*/; do
    [ -d "$dir" ] || continue
    name="$(basename "$dir")"
    if [ -e "$TARGET/.claude/skills/$name" ]; then
      echo "lewati (sudah ada): .claude/skills/$name"
    else
      cp -R "$dir" "$TARGET/.claude/skills/$name"
      echo "terpasang: .claude/skills/$name"
    fi
  done
else
  echo "lewati: bundle ini tidak menyertakan .claude/skills (pasang skill secara terpisah)"
fi

# 2. Aturan (dikelola; diperbarui oleh --update) dan roadmap (tidak pernah ditimpa)
copy_file "docs/ai/CORE_CONTEXT.md"     "docs/ai/CORE_CONTEXT.md"     1
copy_file "docs/ai/CODING_STANDARDS.md" "docs/ai/CODING_STANDARDS.md" 1
copy_file "docs/ai/WORKFLOW_SKILLS.md"  "docs/ai/WORKFLOW_SKILLS.md"  1
copy_file "docs/ai/PATTERNS.md"         "docs/ai/PATTERNS.md"         1
copy_file "docs/ROADMAP.md"             "docs/ROADMAP.md"             0

# 3. Script sinkronisasi dan lisensi
copy_file "scripts/sync-ai-rules.sh"    "scripts/sync-ai-rules.sh"    1
if [ -f "$HERE/THIRD-PARTY-LICENSES.md" ]; then
  copy_file "THIRD-PARTY-LICENSES.md" ".claude/THIRD-PARTY-LICENSES.md" 1
fi

cat <<'MSG'

Langkah berikutnya (jalankan di root project):
  1. bash scripts/sync-ai-rules.sh   # buat/perbarui CLAUDE.md, AGENTS.md, GEMINI.md,
                                     # aturan Copilot, Cursor, dan Windsurf dari docs/ai/
                                     # (file lama yang bukan hasil generate tidak ditimpa)
  2. npx impeccable install          # skill desain utama (penilai); butuh internet
  3. Buka Claude Code, jalankan:     /impeccable init
  4. npm install -g ui-ux-pro-max-cli
     uipro init --ai claude          # skill desain pendamping; butuh Python 3
  5. Jalankan skill product-marketing sekali untuk mengisi konteks produk
     (wajib sebelum modul 1.4).

Sumber aturan ada di docs/ai/. Ubah di sana, lalu jalankan ulang langkah 1.
Detail modul dan jadwal ada di docs/ROADMAP.md.
Memperbarui toolkit dari versi baru:  bash setup.sh --update /path/ke/project
MSG
