# AI Toolkit Bundle (v4, English)

Two variants with the same rules. Pick one.

| Variant | For | Contents |
|---|---|---|
| `vicitech-private/` | The private ViciTech repo, ready to use | Filled-in rules, full `ROADMAP.md` with schedule and the hero slider spec, `PATTERNS.md`, scripts. Skills are not bundled in this version; `setup.sh` skips them. |
| `universal-template/` | Publishing on GitHub | `CORE_CONTEXT.md` and `ROADMAP.md` as `[...]` templates, ViciTech-free SOPs, standards, and patterns, English scripts, README. |

## Install the ViciTech variant

```bash
bash vicitech-private/setup.sh /path/to/vicitech-repo
cd /path/to/vicitech-repo && bash scripts/sync-ai-rules.sh
```

Updating an existing install: `bash vicitech-private/setup.sh --update /path/to/vicitech-repo` refreshes the rule files, `PATTERNS.md`, and the scripts (old files kept as `.bak`). It never touches `docs/ROADMAP.md`, which holds your progress; compare it manually.

## Publish the template

Copy the contents of `universal-template/` into a new repository, read its `README.md`, and choose a license first.
