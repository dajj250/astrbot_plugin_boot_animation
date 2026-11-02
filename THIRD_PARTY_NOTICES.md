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

`code_animation_gpt/codex-reference-mark.png` is adapted from an image supplied
by the user for the Codex-style startup screen. Its checkerboard background was
removed. The mark is a visual reference only and does not imply OpenAI
sponsorship, endorsement, certification, or partnership.

`code_animation_gemini/gemini-star.svg` and `stars.js` use a Gemini-inspired
four-point silhouette with original pastel facets based on the user's visual
reference. They are stylized artwork, not an official downloadable logo asset.
Gemini and Google names identify the selected theme; no endorsement is implied.

`code_animation/assets/line-6-gemini.mp3` retains the original welcome recording
outside the brand-name interval. Its Gemini segment was generated locally with
IndexTTS 2.5 using the original recording as reference, then duration/loudness
matched. The original recording's rights and limitations still apply.

`code_animation_claude/claude-flower.svg` is an original vector drawing based on
the daisy image supplied by the user. It is a theme illustration, not an
official Anthropic logo. The Claude and Anthropic names indicate the selected
visual style; they do not imply affiliation or endorsement.

`code_animation/assets/line-6-claude.mp3` retains the original welcome recording
outside the brand-name interval. The word “Claude” was generated locally with
IndexTTS 2.5 using the original recording as its voice reference, then matched
to the original interval's duration and loudness. The generated word may still
differ in timbre. The original recording's rights and limitations still apply.

`code_animation_grok/orbit-cross.svg` and `rain.js` are original, independent
black-and-gold theme artwork. They do not reproduce the supplied reference image
or an official Grok/X logo. “Grok style” describes the requested aesthetic and
does not imply affiliation, approval or sponsorship by xAI or X.

`code_animation/assets/line-6-grok.mp3` preserves the original welcome recording
outside the brand-name interval. The replacement word was synthesized locally,
then matched to the original interval's duration and loudness. Rights and
limitations of the underlying recording still apply.

Earlier releases included `codex-startup-2k-144fps-crf16.mp4` and
`whale-fantasy-loop.mp4`, supplied by the user from local AstrBot instances.
The v1.1.5 installer contains no video files. Downloading or redistributing
older video assets does not grant rights to third-party imagery or trademarks.
