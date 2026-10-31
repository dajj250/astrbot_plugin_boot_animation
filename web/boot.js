(() => {
  'use strict';

  const config = window.__ASTRBOT_BOOT_ANIMATION__ || {};
  const codeAnimationMode = ['off', 'before_video', 'only'].includes(config.codeAnimationMode)
    ? config.codeAnimationMode
    : 'off';
  const hasVideoClips = Array.isArray(config.clips) && config.clips.length > 0;
  if (config.enabled === false || (codeAnimationMode !== 'only' && !hasVideoClips)) return;
  if (document.getElementById('astrbot-boot-animation')) return;

  const fadeMs = [1000, 1500, 2000, 3000, 4000].includes(Number(config.fadeMs))
    ? Number(config.fadeMs)
    : 2000;
  const entryMode = ['crossfade', 'after', 'click'].includes(config.entryMode)
    ? config.entryMode
    : 'crossfade';
  const fallbackClip = hasVideoClips
    ? config.clips[Math.floor(Math.random() * config.clips.length)]
    : '';
  const sequence = Array.isArray(config.sequence) && config.sequence.length
    ? config.sequence.filter((name) => typeof name === 'string' && name.length > 0)
    : [fallbackClip];
  if (sequence.length === 0) sequence.push(fallbackClip);
  let sequenceIndex = 0;
  const html = document.documentElement;
  html.style.setProperty('--astrbot-boot-fade', `${fadeMs}ms`);
  html.classList.add('astrbot-boot-pending');
  let codeFrame = null;
  let codeFallbackTimer = 0;
  let videoStarted = false;

  // A last-resort guard: an unexpected client exception must never leave the
  // AstrBot interface permanently hidden.
  const visibilityWatchdog = window.setTimeout(() => {
    html.classList.remove('astrbot-boot-pending');
    html.classList.remove('astrbot-panel-entering');
    document.getElementById('astrbot-boot-animation')?.remove();
    document.getElementById('astrbot-panel-animated-background')?.remove();
    document.getElementById('astrbot-code-animation-frame')?.remove();
  }, codeAnimationMode === 'off' ? 15000 : 300000);

  const background = document.createElement('div');
  background.id = 'astrbot-panel-animated-background';
  background.setAttribute('aria-hidden', 'true');
  background.innerHTML = '<video playsinline preload="auto"></video>';

  const overlay = document.createElement('div');
  overlay.id = 'astrbot-boot-animation';
  overlay.style.setProperty('--astrbot-boot-fade', `${fadeMs}ms`);
  overlay.innerHTML = [
    '<div class="astrbot-boot-shade"></div>',
    '<div class="astrbot-boot-title">ASTRBOT</div>',
    '<button type="button" class="astrbot-boot-skip" aria-label="跳过启动动画">跳过</button>',
    '<div class="astrbot-boot-foot">',
    `  <div class="astrbot-boot-hint"${config.showHint === false ? ' hidden' : ''}>正在启动 AstrBot…</div>`,
    '</div>',
  ].join('');

  const video = background.querySelector('video');
  const hint = overlay.querySelector('.astrbot-boot-hint');
  const skip = overlay.querySelector('.astrbot-boot-skip');
  let leaving = false;
  let audible = false;
  let frameSeen = false;
  let videoFailed = false;
  let panelReady = document.readyState === 'complete';
  let enterRequested = false;
  let readinessTimer = 0;
  let failTimer = 0;
  let attachmentObserver = null;

  function attach() {
    const host = document.body || document.documentElement;
    if (background.parentNode !== host) host.prepend(background);
    if (leaving) return;
    if (overlay.parentNode !== host) host.appendChild(overlay);
  }

  function setHint(text) {
    if (hint) hint.textContent = text;
  }

  function sequenceLabel() {
    return sequence.length > 1 ? `第 ${sequenceIndex + 1}/${sequence.length} 段` : '启动动画';
  }

  function loadSequenceClip(index) {
    sequenceIndex = index;
    frameSeen = false;
    videoFailed = false;
    video.loop = entryMode === 'click' && sequenceIndex === sequence.length - 1;
    video.src = `/astrbot-boot-animation/videos/${encodeURIComponent(sequence[sequenceIndex])}`;
    video.load();
    setHint(`${sequenceLabel()}正在加载…`);
    void video.play().catch(() => setHint(`${sequenceLabel()} · 点击画面开始播放`));
    window.clearTimeout(failTimer);
    failTimer = window.setTimeout(() => {
      if (!frameSeen) {
        videoFailed = true;
        if (sequenceIndex < sequence.length - 1) {
          setHint(`${sequenceLabel()}加载超时，正在跳到下一段…`);
          window.setTimeout(() => loadSequenceClip(sequenceIndex + 1), 500);
        } else {
          setHint(`${sequenceLabel()}加载超时，正在进入 AstrBot…`);
          window.setTimeout(requestAutomaticEnter, 800);
        }
      }
    }, 8000);
  }

  function fadeAudio() {
    if (!audible || video.muted || video.paused) return;
    const started = performance.now();
    const initial = video.volume;
    const tick = (now) => {
      if (leaving && now - started < fadeMs && !video.paused) {
        video.volume = Math.max(0, initial * (1 - (now - started) / fadeMs));
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }

  function enter() {
    if (leaving) return;
    leaving = true;
    window.clearTimeout(visibilityWatchdog);
    window.clearTimeout(readinessTimer);
    window.clearTimeout(failTimer);
    window.clearTimeout(codeFallbackTimer);
    if (attachmentObserver) attachmentObserver.disconnect();
    window.removeEventListener('message', handleCodeAnimationMessage);
    if (codeFrame) {
      codeFrame.remove();
      codeFrame = null;
    }
    fadeAudio();
    html.classList.remove('astrbot-boot-pending');
    html.classList.add('astrbot-panel-entering');
    background.classList.add('astrbot-boot-leaving');
    overlay.classList.add('astrbot-boot-leaving');
    window.setTimeout(() => {
      video.pause();
      video.removeAttribute('src');
      background.remove();
      overlay.remove();
      html.classList.remove('astrbot-panel-entering');
    }, fadeMs + 80);
  }

  function requestAutomaticEnter() {
    if (leaving) return;
    if (enterRequested) return;
    if (panelReady) {
      enter();
      return;
    }
    enterRequested = true;
    setHint('动画已完成 · AstrBot 面板正在准备…');
    if (!readinessTimer) readinessTimer = window.setTimeout(enter, 3000);
  }

  async function enableSound() {
    if (config.sound === false) return false;
    try {
      video.muted = false;
      video.volume = 1;
      await video.play();
      audible = true;
      setHint('声音已开启 · 再点一次进入');
      return true;
    } catch (_) {
      video.muted = true;
      setHint('浏览器暂未允许声音 · 再点一次进入');
      return false;
    }
  }

  function userEnter(event) {
    event.preventDefault();
    event.stopPropagation();
    if (config.clickToEnter === true || config.sound === false || audible) {
      enter();
      return;
    }
    void enableSound();
  }

  overlay.addEventListener('pointerdown', userEnter);
  skip.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    enter();
  });
  window.addEventListener('keydown', (event) => {
    if (['Escape', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      enter();
    }
  }, true);

  video.addEventListener('loadeddata', () => {
    frameSeen = true;
    video.classList.add('astrbot-boot-visible');
    setHint(config.sound === false
      ? `${sequenceLabel()} · 点击进入`
      : `${sequenceLabel()} · 点击开启声音 · 再点进入`);
  });

  video.addEventListener('timeupdate', () => {
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    const isLastClip = sequenceIndex === sequence.length - 1;
    if (isLastClip && entryMode === 'crossfade' && video.duration - video.currentTime <= fadeMs / 1000) {
      requestAutomaticEnter();
    }
  });

  video.addEventListener('ended', () => {
    if (sequenceIndex < sequence.length - 1) {
      loadSequenceClip(sequenceIndex + 1);
      return;
    }
    if (entryMode !== 'click') requestAutomaticEnter();
  });
  video.addEventListener('error', () => {
    videoFailed = true;
    if (sequenceIndex < sequence.length - 1) {
      setHint(`${sequenceLabel()}无法播放，正在跳到下一段…`);
      window.setTimeout(() => loadSequenceClip(sequenceIndex + 1), 500);
    } else {
      setHint('视频无法播放，正在进入 AstrBot…');
      window.setTimeout(requestAutomaticEnter, 800);
    }
  });

  window.addEventListener('load', () => {
    panelReady = true;
    if (enterRequested) enter();
  }, { once: true });

  function startVideoIntro() {
    if (videoStarted || leaving) return;
    videoStarted = true;
    attach();
    attachmentObserver = new MutationObserver(attach);
    attachmentObserver.observe(document.documentElement, { childList: true, subtree: true });
    video.muted = true;
    loadSequenceClip(0);
  }

  function finishCodeAnimation() {
    window.clearTimeout(codeFallbackTimer);
    window.removeEventListener('message', handleCodeAnimationMessage);
    if (codeFrame) {
      codeFrame.remove();
      codeFrame = null;
    }
    if (codeAnimationMode === 'before_video' && hasVideoClips) startVideoIntro();
    else requestAutomaticEnter();
  }

  function handleCodeAnimationMessage(event) {
    if (event.origin !== window.location.origin) return;
    if (!event.data || event.data.type !== 'astrbot-code-animation:done') return;
    finishCodeAnimation();
  }

  function startCodeAnimation() {
    const host = document.body || document.documentElement;
    codeFrame = document.createElement('iframe');
    codeFrame.id = 'astrbot-code-animation-frame';
    codeFrame.className = 'astrbot-code-animation-frame';
    codeFrame.title = 'AstrBot 启动动画';
    codeFrame.setAttribute('allow', 'autoplay');
    const codeAnimationPath = config.codeAnimationStyle === 'gpt_codex'
      ? 'code-animation-gpt'
      : 'code-animation';
    codeFrame.src = `/astrbot-boot-animation/${codeAnimationPath}/index.html`;
    codeFrame.addEventListener('error', finishCodeAnimation, { once: true });
    window.addEventListener('message', handleCodeAnimationMessage);
    host.appendChild(codeFrame);

    // If the packaged page cannot load, never leave the dashboard hidden.
    codeFallbackTimer = window.setTimeout(finishCodeAnimation, 120000);
  }

  if (codeAnimationMode === 'off') startVideoIntro();
  else startCodeAnimation();
})();

