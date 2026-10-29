"""Install a reversible boot loader into AstrBot's local Dashboard entry."""

from __future__ import annotations

import json
import os
import shutil
from pathlib import Path
from typing import Any

START_MARKER = "<!-- astrbot-boot-animation:start -->"
END_MARKER = "<!-- astrbot-boot-animation:end -->"
INJECTED_HTML = (
    f"{START_MARKER}\n"
    '<link rel="stylesheet" href="/astrbot-boot-animation/boot.css">\n'
    '<script src="/astrbot-boot-animation/config.js"></script>\n'
    '<script src="/astrbot-boot-animation/boot.js"></script>\n'
    f"{END_MARKER}"
)
VIDEO_SUFFIXES = {".mp4", ".webm", ".m4v", ".mov"}


def find_dashboard_dist(plugin_dir: Path) -> Path | None:
    """Find AstrBot's dashboard dist without assuming a single deployment layout."""
    candidates: list[Path] = []
    try:
        # Prefer AstrBot's own resolver; it also understands packaged desktop
        # layouts and user-supplied WebUI directories.
        from astrbot.core.dashboard_assets import resolve_dashboard_dist

        resolved_by_astrbot = resolve_dashboard_dist()
        if resolved_by_astrbot is not None:
            candidates.append(Path(resolved_by_astrbot))
    except (ImportError, RuntimeError, TypeError):
        pass

    explicit = os.environ.get("ASTRBOT_DASHBOARD_DIST")
    if explicit:
        candidates.append(Path(explicit))

    # Standard layout: <astrbot>/data/plugins/<plugin> and <astrbot>/data/dist.
    if len(plugin_dir.parents) >= 2:
        candidates.append(plugin_dir.parent.parent / "dist")

    cwd = Path.cwd()
    candidates.extend((cwd / "data" / "dist", cwd / "dist"))

    seen: set[Path] = set()
    for candidate in candidates:
        resolved = candidate.expanduser().resolve()
        if resolved in seen:
            continue
        seen.add(resolved)
        if (resolved / "index.html").is_file():
            return resolved
    return None


def _without_existing_block(html: str) -> str:
    """Remove our marker block while preserving every unrelated byte."""
    while START_MARKER in html:
        start = html.index(START_MARKER)
        end = html.find(END_MARKER, start)
        if end < 0:
            html = html[:start]
            break
        end += len(END_MARKER)
        if end < len(html) and html[end : end + 2] == "\r\n":
            end += 2
        elif end < len(html) and html[end] == "\n":
            end += 1
        html = html[:start] + html[end:]
    return html


def patch_index(index_path: Path) -> bool:
    """Add the loader before the first head close; return whether bytes changed."""
    original = index_path.read_text(encoding="utf-8")
    clean = _without_existing_block(original)
    lower = clean.lower()
    position = lower.find("</head>")
    if position < 0:
        raise RuntimeError("Dashboard index.html has no closing head tag")
    patched = clean[:position] + INJECTED_HTML + "\n" + clean[position:]
    if patched == original:
        return False
    index_path.write_text(patched, encoding="utf-8", newline="")
    return True


def restore_index(index_path: Path) -> bool:
    """Remove only this plugin's marker block."""
    original = index_path.read_text(encoding="utf-8")
    restored = _without_existing_block(original)
    if restored == original:
        return False
    index_path.write_text(restored, encoding="utf-8", newline="")
    return True


def normalize_config(config: Any, available_clips: list[str]) -> dict[str, Any]:
    """Create the browser configuration with conservative defaults."""

    def read(key: str, default: Any) -> Any:
        try:
            return config.get(key, default)
        except (AttributeError, TypeError):
            return default

    selected = read("clips", available_clips)
    if not isinstance(selected, list):
        selected = available_clips
    selected_set = {item for item in selected if isinstance(item, str)}
    clips = [name for name in available_clips if name in selected_set]
    if not clips and available_clips:
        clips = [available_clips[0]]

    fade_raw = str(read("fade_ms", "2000"))
    fade_ms = int(fade_raw) if fade_raw in {"1000", "1500", "2000", "3000", "4000"} else 2000
    entry_mode = read("entry_mode", "crossfade")
    if entry_mode not in {"crossfade", "after", "click"}:
        entry_mode = "crossfade"

    code_animation_mode = read("code_animation_mode", "off")
    if code_animation_mode not in {"off", "before_video", "only"}:
        code_animation_mode = "off"
    code_animation_theme = read("code_animation_theme", "light")
    if code_animation_theme not in {"light", "dark"}:
        code_animation_theme = "light"
    code_speed_raw = str(read("code_animation_speed", "1"))
    code_animation_speed = (
        float(code_speed_raw)
        if code_speed_raw in {"0.75", "1", "1.25", "1.5", "2"}
        else 1.0
    )

    play_sequence = read("play_sequence", "single")
    if play_sequence not in {"single", "double"}:
        play_sequence = "single"

    def selected_clip(key: str, fallback: str) -> str:
        candidate = read(key, fallback)
        if isinstance(candidate, str) and candidate in available_clips:
            return candidate
        if fallback in available_clips:
            return fallback
        if clips:
            return clips[0]
        return available_clips[0] if available_clips else ""

    single_clip = selected_clip("single_clip", "deepseek-brand-intro.mp4")
    opening_clip = selected_clip("opening_clip", "deepseek-awakening-intro.mp4")
    closing_clip = selected_clip("closing_clip", "deepseek-startup-intro.mp4")
    sequence = (
        [opening_clip, closing_clip]
        if play_sequence == "double"
        else [single_clip]
    )
    sequence = [name for name in sequence if name]

    return {
        "enabled": read("enabled", True) is not False,
        "sound": read("sound", True) is not False,
        "clickToEnter": read("click_to_enter", False) is True,
        "showHint": read("show_hint", True) is not False,
        "fadeMs": fade_ms,
        "entryMode": entry_mode,
        "codeAnimationMode": code_animation_mode,
        "codeAnimationTheme": code_animation_theme,
        "codeAnimationSpeed": code_animation_speed,
        "codeAnimationInteractive": read("code_animation_interactive", False) is True,
        "codeAnimationSound": read("code_animation_sound", False) is True,
        "clips": clips,
        "playSequence": play_sequence,
        "sequence": sequence,
    }


def install_assets(plugin_dir: Path, dist_dir: Path, config: Any) -> dict[str, Any]:
    """Copy the tiny loader and selected media to the Dashboard static root."""
    target = dist_dir / "astrbot-boot-animation"
    video_target = target / "videos"
    video_target.mkdir(parents=True, exist_ok=True)

    shutil.copy2(plugin_dir / "web" / "boot.js", target / "boot.js")
    shutil.copy2(plugin_dir / "web" / "boot.css", target / "boot.css")

    code_animation_source = plugin_dir / "code_animation"
    code_animation_target = target / "code-animation"
    if code_animation_target.exists():
        shutil.rmtree(code_animation_target)
    shutil.copytree(code_animation_source, code_animation_target)

    source_dir = plugin_dir / "assets" / "videos"
    available = sorted(
        path.name
        for path in source_dir.iterdir()
        if path.is_file() and path.suffix.lower() in VIDEO_SUFFIXES
    )
    browser_config = normalize_config(config, available)

    # Keep only the current pool in the public static directory.
    for old in video_target.iterdir():
        if old.is_file() and old.name not in available:
            old.unlink()
    for name in available:
        shutil.copy2(source_dir / name, video_target / name)

    payload = "window.__ASTRBOT_BOOT_ANIMATION__=" + json.dumps(
        browser_config, ensure_ascii=False, separators=(",", ":")
    ) + ";\n"
    (target / "config.js").write_text(payload, encoding="utf-8", newline="\n")
    return browser_config

