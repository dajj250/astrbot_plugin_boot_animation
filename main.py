"""AstrBot startup animation plugin."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

from astrbot.api import AstrBotConfig, logger
from astrbot.api.star import Context, Star

from .dashboard_installer import find_dashboard_dist, install_assets, patch_index, restore_index


class BootAnimationPlugin(Star):
    def __init__(self, context: Context, config: AstrBotConfig):
        super().__init__(context)
        self.plugin_dir = Path(__file__).resolve().parent
        self._open_video_folder_if_requested(config)
        self.dist_dir = find_dashboard_dist(self.plugin_dir)

        if self.dist_dir is None:
            logger.warning(
                "[启动动画] 找不到 AstrBot Dashboard 的 data/dist/index.html；"
                "插件已加载，但自动启动动画未注入。"
            )
            return

        try:
            browser_config = install_assets(self.plugin_dir, self.dist_dir, config)
            index_path = self.dist_dir / "index.html"
            if browser_config["enabled"]:
                patch_index(index_path)
                logger.info("[启动动画] 已注入 AstrBot Dashboard；刷新管理面板即可播放。")
            else:
                restore_index(index_path)
                logger.info("[启动动画] 已关闭，Dashboard 注入已移除。")
        except Exception as exc:
            logger.error(f"[启动动画] 注入 Dashboard 失败：{exc}")

    def _open_video_folder_if_requested(self, config: AstrBotConfig) -> None:
        """Open the trusted media directory for a one-shot config action."""
        if config.get("open_video_folder", False) is not True:
            return

        video_dir = (self.plugin_dir / "assets" / "videos").resolve()
        video_dir.mkdir(parents=True, exist_ok=True)
        try:
            if sys.platform == "win32":
                os.startfile(video_dir)  # type: ignore[attr-defined]
            elif sys.platform == "darwin":
                subprocess.Popen(["open", str(video_dir)])
            else:
                subprocess.Popen(["xdg-open", str(video_dir)])
            logger.info(f"[启动动画] 已打开视频文件夹：{video_dir}")
        except Exception as exc:
            logger.warning(f"[启动动画] 无法打开视频文件夹 {video_dir}：{exc}")
        finally:
            config["open_video_folder"] = False
            save = getattr(config, "save_config", None)
            if callable(save):
                try:
                    save()
                except Exception as exc:
                    logger.warning(f"[启动动画] 无法自动复位文件夹开关：{exc}")

    async def terminate(self):
        """Remove the active injection when the plugin is disabled or uninstalled."""
        if self.dist_dir is None:
            return
        try:
            restore_index(self.dist_dir / "index.html")
            logger.info("[启动动画] 已从 AstrBot Dashboard 移除注入。")
        except Exception as exc:
            logger.warning(f"[启动动画] 移除 Dashboard 注入失败：{exc}")

