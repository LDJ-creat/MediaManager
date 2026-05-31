# Attribution

## Upstream

- **Original skill**: `baoyu-xhs-images` from [baoyu-skills](https://github.com/JimLiu/baoyu-skills) (JimLiu)
- **Forked as**: `xhs-images` in MediaManager

## MediaManager changes

- Renamed to `xhs-images`; integrated with `media-manager` orchestration
- Workflow simplified: 4 steps, single outline (no A/B/C variants by default)
- Output path: `$WORKSPACE/output/{slug}/xhs-images/`
- Presets trimmed to tech-oriented set: `notion`, `chalkboard`, `study-notes`, `bold`, `minimal`
- Lifestyle presets (`cute`, `fresh`, `warm`, `pop`, `retro`) removed from bundle; see upstream baoyu-xhs-images if needed
- Removed `references/config/` (blocking EXTEND setup); preferences from workspace guidance or per-run user input
- Workflow references (`analysis-framework`, `outline-template`, `prompt-assembly`) rewritten for MediaManager single-outline flow

## License

Follow the license terms of the upstream baoyu-skills repository when redistributing.
