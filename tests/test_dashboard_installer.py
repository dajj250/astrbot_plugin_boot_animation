import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path

from dashboard_installer import (
    END_MARKER,
    _copy_if_changed,
    START_MARKER,
    install_assets,
    normalize_config,
    patch_index,
    restore_index,
)


class DashboardInstallerTests(unittest.TestCase):
    def test_large_media_copy_skips_unchanged_and_updates_changed_files(self):
        import shutil
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source, target = root / 'source.mp4', root / 'public/video.mp4'
            source.write_bytes(b'first version')
            _copy_if_changed(source, target)
            with patch('dashboard_installer.shutil.copy2', wraps=shutil.copy2) as copy:
                _copy_if_changed(source, target)
                copy.assert_not_called()
                source.write_bytes(b'updated media content')
                _copy_if_changed(source, target)
                copy.assert_called_once()
            self.assertEqual(target.read_bytes(), source.read_bytes())
            self.assertFalse(list(target.parent.glob('*.tmp')))

    def test_failed_copy_preserves_existing_media_and_removes_temporary_file(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source, target = root / 'source.mp4', root / 'video.mp4'
            source.write_bytes(b'new media')
            target.write_bytes(b'previous complete media')
            with patch('dashboard_installer.shutil.copy2', side_effect=OSError('disk full')):
                with self.assertRaises(OSError):
                    _copy_if_changed(source, target)
            self.assertEqual(target.read_bytes(), b'previous complete media')
            self.assertFalse(list(root.glob('*.tmp')))

    def test_new_video_pair_can_be_selected(self):
        names = ['codex-startup-2k-144fps-crf16.mp4', 'whale-fantasy-loop.mp4']
        result = normalize_config({'play_sequence':'double', 'opening_clip':names[0],
                                   'closing_clip':names[1]}, names)
        self.assertEqual(result['sequence'], names)

    def test_patch_is_idempotent_and_restore_preserves_dashboard(self):
        with tempfile.TemporaryDirectory() as folder:
            index = Path(folder) / "index.html"
            source = "<!doctype html>\n<html><head><meta charset='utf-8'></head><body></body></html>\n"
            index.write_text(source, encoding="utf-8")

            self.assertTrue(patch_index(index))
            once = index.read_text(encoding="utf-8")
            self.assertEqual(once.count(START_MARKER), 1)
            self.assertEqual(once.count(END_MARKER), 1)

            self.assertFalse(patch_index(index))
            self.assertEqual(index.read_text(encoding="utf-8"), once)

            self.assertTrue(restore_index(index))
            self.assertEqual(index.read_text(encoding="utf-8"), source)

    def test_config_defaults_and_validation(self):
        result = normalize_config(
            {"fade_ms": "999", "entry_mode": "bad", "clips": ["b.mp4", "missing.mp4"]},
            ["a.mp4", "b.mp4"],
        )
        self.assertEqual(result["fadeMs"], 2000)
        self.assertEqual(result["entryMode"], "crossfade")
        self.assertEqual(result["clips"], ["b.mp4"])
        self.assertTrue(result["enabled"])
        self.assertEqual(result["codeAnimationMode"], "off")
        self.assertEqual(result["codeAnimationStyle"], "original")

    def test_single_and_double_clip_sequences(self):
        available = [
            "deepseek-awakening-intro.mp4",
            "deepseek-brand-intro.mp4",
            "deepseek-startup-intro.mp4",
        ]
        single = normalize_config(
            {"play_sequence": "single", "single_clip": "deepseek-brand-intro.mp4"},
            available,
        )
        self.assertEqual(single["sequence"], ["deepseek-brand-intro.mp4"])

        double = normalize_config(
            {
                "play_sequence": "double",
                "opening_clip": "deepseek-awakening-intro.mp4",
                "closing_clip": "deepseek-startup-intro.mp4",
            },
            available,
        )
        self.assertEqual(
            double["sequence"],
            ["deepseek-awakening-intro.mp4", "deepseek-startup-intro.mp4"],
        )

    def test_assets_are_ready_for_dashboard_static_serving(self):
        plugin_dir = Path(__file__).resolve().parent.parent
        with tempfile.TemporaryDirectory() as folder:
            dist = Path(folder)
            config = install_assets(
                plugin_dir,
                dist,
                {"clips": ["deepseek-brand-intro.mp4"], "entry_mode": "after"},
            )
            target = dist / "astrbot-boot-animation"
            self.assertTrue((target / "boot.js").is_file())
            self.assertTrue((target / "boot.css").is_file())
            self.assertIn('"entryMode":"after"', (target / "config.js").read_text("utf-8"))
            self.assertEqual(config["clips"], ["deepseek-brand-intro.mp4"])
            self.assertTrue((target / "videos" / "deepseek-brand-intro.mp4").is_file())
            self.assertTrue((target / "code-animation" / "index.html").is_file())
            self.assertTrue((target / "code-animation" / "splash.js").is_file())
            self.assertTrue((target / "code-animation" / "splash.css").is_file())
            self.assertTrue((target / "code-animation" / "assets" / "line-1.mp3").is_file())
            self.assertTrue((target / "code-animation-gpt" / "index.html").is_file())
            self.assertTrue((target / "code-animation-gpt" / "app.js").is_file())

    def test_client_is_boot_only_without_panel_background_or_progress_bar(self):
        plugin_dir = Path(__file__).resolve().parent.parent
        script = (plugin_dir / "web" / "boot.js").read_text("utf-8")
        style = (plugin_dir / "web" / "boot.css").read_text("utf-8")
        self.assertIn("astrbot-panel-animated-background", script)
        self.assertIn("astrbot-panel-animated-background", style)
        self.assertNotIn("astrbot-boot-progress", script)
        self.assertNotIn("astrbot-boot-progress", style)
        self.assertIn("pointer-events: none", style)
        self.assertIn("astrbot-boot-pending", script)
        self.assertIn("astrbot-boot-pending", style)
        self.assertNotIn("astrbot-panel-aurora", style)
        self.assertNotIn("@keyframes astrbot-panel-aurora", style)
        self.assertNotIn("astrbot-panel-video-background", script)
        self.assertNotIn("astrbot-panel-video-background", style)
        self.assertNotIn("astrbot-panel-background-veil", script)
        self.assertNotIn("astrbot-panel-background-veil", style)
        self.assertNotIn(".v-card", style)
        self.assertNotIn(".dashboard-page", style)
        self.assertIn("background.remove()", script)
        self.assertIn("video.removeAttribute('src')", script)
        self.assertIn("astrbot-code-animation:done", script)
        self.assertIn("codeAnimationMode", script)
        self.assertIn("code-animation'", script)
        self.assertIn("code-animation-gpt", script)

    def test_schema_exposes_folder_and_sequence_controls(self):
        import json

        plugin_dir = Path(__file__).resolve().parent.parent
        schema = json.loads((plugin_dir / "_conf_schema.json").read_text("utf-8"))
        self.assertEqual(schema["play_sequence"]["options"], ["single", "double"])
        self.assertIn("single_clip", schema)
        self.assertIn("opening_clip", schema)
        self.assertIn("closing_clip", schema)
        self.assertIn("open_video_folder", schema)
        self.assertEqual(
            schema["code_animation_mode"]["options"],
            ["off", "before_video", "only"],
        )
        self.assertIn("code_animation_theme", schema)
        self.assertEqual(schema["code_animation_style"]["options"], ["original", "gpt_codex", "gemini"])
        self.assertIn("code_animation_speed", schema)
        self.assertIn("code_animation_interactive", schema)
        self.assertIn("code_animation_sound", schema)

    def test_code_animation_settings_are_normalized(self):
        result = normalize_config(
            {
                "code_animation_mode": "before_video",
                "code_animation_style": "gpt_codex",
                "code_animation_theme": "dark",
                "code_animation_speed": "1.5",
                "code_animation_interactive": True,
                "code_animation_sound": True,
            },
            ["deepseek-brand-intro.mp4"],
        )
        self.assertEqual(result["codeAnimationMode"], "before_video")
        self.assertEqual(result["codeAnimationStyle"], "gpt_codex")
        self.assertEqual(result["codeAnimationTheme"], "dark")
        self.assertEqual(result["codeAnimationSpeed"], 1.5)
        self.assertTrue(result["codeAnimationInteractive"])
        self.assertTrue(result["codeAnimationSound"])

    def test_gemini_installs_complete_page_and_audio(self):
        import re
        from urllib.parse import urljoin
        plugin_dir = Path(__file__).resolve().parent.parent
        with tempfile.TemporaryDirectory() as folder:
            dist = Path(folder)
            config = install_assets(plugin_dir, dist, {
                'code_animation_style': 'gemini', 'code_animation_mode': 'only',
                'code_animation_interactive': True, 'code_animation_sound': True,
            })
            self.assertEqual(config['codeAnimationStyle'], 'gemini')
            self.assertTrue(config['codeAnimationInteractive'])
            self.assertTrue(config['codeAnimationSound'])
            target = dist / 'astrbot-boot-animation'
            markup = (target / 'code-animation-gemini/index.html').read_text('utf-8')
            self.assertIn("identityId:'0003'", markup)
            self.assertNotIn('CODEX', markup)
            self.assertNotIn('DeepSeek', markup)
            # Resolve links exactly as the iframe will after installation.
            page = 'http://preview/code-animation-gemini/index.html'
            base = urljoin(page, re.search(r'<base href="([^"]+)"', markup)[1])
            for link in re.findall(r'(?:src|href)="([^"]+)"', markup):
                if link == '../code-animation/':
                    continue
                path = urljoin(base, link).split('http://preview/', 1)[1]
                self.assertTrue((target / path).is_file(), path)
            self.assertGreater((target/'code-animation/assets/line-6-gemini.mp3').stat().st_size, 1000)
            self.assertTrue((target/'code-animation-gemini/gemini-star.svg').is_file())
            for number in range(1, 6):
                self.assertEqual((target/f'code-animation/assets/line-{number}.mp3').read_bytes(),
                                 (plugin_dir/f'code_animation/assets/line-{number}.mp3').read_bytes())

    def test_gpt_animation_reuses_original_runtime_and_audio(self):
        plugin_dir = Path(__file__).resolve().parent.parent
        script = (plugin_dir / "code_animation" / "splash.js").read_text("utf-8")
        markup = (plugin_dir / "code_animation_gpt" / "index.html").read_text("utf-8")
        self.assertIn('<base href="../code-animation/">', markup)
        self.assertIn('src="./splash.js"', markup)
        self.assertIn("identityId:'0002'", markup)
        self.assertIn("theme:'dark'", markup)
        self.assertIn("voiceSource:'asset'", markup)
        self.assertIn("recordedVoiceOnly:true", markup)
        self.assertNotIn('welcomeSpeech', markup)
        self.assertIn("welcome = voice.line(null, null, C.welcomeAsset || 'line-6')", script)
        self.assertIn("welcomeAsset:'line-6-chatgpt'", markup)
        self.assertGreater((plugin_dir / 'code_animation' / 'assets' / 'line-6-chatgpt.mp3').stat().st_size, 1000)
        for number in range(1, 7):
            self.assertGreater((plugin_dir / 'code_animation' / 'assets' / f'line-{number}.mp3').stat().st_size, 1000)
        self.assertTrue((plugin_dir / 'code_animation_gpt' / 'openai-white-monoblossom.svg').is_file())
        self.assertTrue((plugin_dir / 'code_animation_gpt' / 'rain.js').is_file())


if __name__ == "__main__":
    unittest.main()

