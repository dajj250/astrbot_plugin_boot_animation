# Third-party notices

`code_animation/` contains adapted runtime files from
[6shenhonghong9/dsh-startup-screen](https://github.com/6shenhonghong9/dsh-startup-screen),
licensed under MIT. Its original license is preserved at `code_animation/LICENSE`.

Adaptations in this plugin are limited to:

- a small iframe host page for AstrBot;
- relative audio asset URLs instead of the original DSH HTTP route;
- AstrBot-specific display text and lifecycle handoff.

The upstream README states that the bundled voice and sound-effect assets include
third-party material not covered by the MIT code license. Reuse and commercial
distribution of those media files may require permission from their rights holders.

`code_animation/assets/line-6-chatgpt.mp3` is derived from the bundled welcome
recording. Only the brand-name interval was replaced with a locally generated
IndexTTS 2.5 segment using that recording as the voice reference; surrounding
speech is retained. This derivative does not change the original media rights.

`code_animation_gpt/openai-white-monoblossom.svg` contains the exact white
OpenAI Blossom path supplied in OpenAI's official 2025 logo archive. Its
outer SVG wrapper was simplified without changing the mark geometry. OpenAI owns
the mark. Its use identifies the GPT-themed animation and does not imply
OpenAI sponsorship or endorsement. See https://openai.com/brand/ for the
current brand guidelines and usage terms.

`code_animation_gemini/gemini-star.svg` and `stars.js` use a Gemini-inspired
four-point silhouette with original pastel facets based on the user's visual
reference. They are stylized artwork, not an official downloadable logo asset.
Gemini and Google names identify the selected theme; no endorsement is implied.

`code_animation/assets/line-6-gemini.mp3` retains the original welcome recording
outside the brand-name interval. Its Gemini segment was generated locally with
IndexTTS 2.5 using the original recording as reference, then duration/loudness
matched. The original recording's rights and limitations still apply.

`assets/videos/codex-startup-2k-144fps-crf16.mp4` and
`assets/videos/whale-fantasy-loop.mp4` were supplied by the user from their local
AstrBot instances and included without transcoding. Inclusion does not grant
additional rights to third-party imagery or trademarks appearing in the videos.
