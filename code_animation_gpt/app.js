(() => {
  'use strict';
  let config = {};
  try { config = parent.__ASTRBOT_BOOT_ANIMATION__ || {}; } catch (_) {}

  const speed = [0.75, 1, 1.25, 1.5, 2].includes(Number(config.codeAnimationSpeed)) ? Number(config.codeAnimationSpeed) : 1;
  const soundEnabled = config.codeAnimationSound === true;
  const stage = document.getElementById('stage');
  const loadTerminal = document.getElementById('loadTerminal');
  const codeTerminal = document.getElementById('codeTerminal');
  const advance = document.getElementById('advance');
  const accessCheckpoint = document.getElementById('accessCheckpoint');
  const identityCheckpoint = document.getElementById('identityCheckpoint');
  const accessTitle = document.getElementById('accessTitle');
  const accessEnglish = document.getElementById('accessEnglish');
  const loadNote = document.getElementById('loadNote');
  const welcome = document.getElementById('welcome');
  const clock = document.getElementById('clock');
  const skip = document.getElementById('skip');
  document.documentElement.style.setProperty('--speed', String(speed));

  let finished = false;
  let checkpoint = 'loading';
  let codeStarted = false;
  let timers = [];
  let audioContext = null;
  let masterGain = null;
  let humNodes = [];
  let loadingSpoken = false;
  let welcomeSpoken = false;

  function timer(fn, delay) {
    const id = window.setTimeout(fn, delay / speed);
    timers.push(id);
    return id;
  }

  function ensureAudio() {
    if (!soundEnabled) return null;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (!masterGain) {
        masterGain = audioContext.createGain();
        masterGain.gain.value = .72;
        masterGain.connect(audioContext.destination);
      }
      if (audioContext.state === 'suspended') void audioContext.resume();
      return audioContext;
    } catch (_) { return null; }
  }

  function tone(from, to, duration, volume = .035, type = 'sine') {
    const ctx = ensureAudio();
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), ctx.currentTime + duration);
    filter.type = 'bandpass';
    filter.frequency.value = Math.max(from, to);
    filter.Q.value = 1.5;
    gain.gain.setValueAtTime(.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + .025);
    gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + duration);
    oscillator.connect(filter).connect(gain).connect(masterGain);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration + .04);
  }

  function startLabHum() {
    const ctx = ensureAudio();
    if (!ctx || humNodes.length) return;
    const low = ctx.createOscillator();
    const air = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    low.type = 'sine'; low.frequency.value = 43;
    air.type = 'triangle'; air.frequency.value = 86;
    filter.type = 'lowpass'; filter.frequency.value = 180;
    gain.gain.setValueAtTime(.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.04, ctx.currentTime + 2.2 / speed);
    low.connect(filter); air.connect(filter); filter.connect(gain).connect(masterGain);
    low.start(); air.start(); humNodes = [low, air, gain];
  }

  function scanSound() {
    tone(145, 1280, .86, .04, 'sawtooth');
    timer(() => tone(1120, 220, .62, .025, 'sine'), 390);
  }

  function confirmationSound() {
    tone(120, 680, 1.15, .055, 'sawtooth');
    timer(() => tone(660, 990, .9, .032), 430);
    timer(() => tone(990, 1480, .75, .024), 610);
  }

  function tick(ok = false) { tone(ok ? 760 : 310, ok ? 940 : 390, ok ? .14 : .08, ok ? .019 : .012, 'square'); }

  function speak(text, kind) {
    if (!soundEnabled || !('speechSynthesis' in window)) return;
    if (kind === 'loading' && loadingSpoken) return;
    if (kind === 'welcome' && welcomeSpoken) return;
    if (kind === 'loading') loadingSpoken = true;
    if (kind === 'welcome') welcomeSpoken = true;
    try {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = kind === 'loading' ? .76 : .8;
      utterance.pitch = kind === 'loading' ? .64 : .72;
      utterance.volume = .95;
      speechSynthesis.speak(utterance);
    } catch (_) {}
  }

  function addDiagnostic(text, delay, ok = false) {
    timer(() => {
      const line = document.createElement('div');
      line.className = 'diag-line';
      line.innerHTML = `${ok ? '<span class="ok">[OK]</span>' : '<span>›</span>'} ${text}`;
      loadTerminal.appendChild(line);
      tick(ok);
    }, delay);
  }

  const codeLines = [
    '<span class="kw">import</span> { AstrBot, ToolBus } <span class="kw">from</span> <span class="str">"@openai/codex"</span>;',
    '<span class="kw">const</span> runtime = <span class="kw">await</span> Codex.<span class="fn">initialize</span>({',
    '  model: <span class="str">"gpt-codex"</span>,',
    '  environment: <span class="str">"astrbot"</span>,',
    '  permissions: <span class="str">"confirmed"</span>,',
    '  laboratoryAudio: <span class="kw">true</span>',
    '});',
    '',
    '<span class="kw">await</span> runtime.tools.<span class="fn">connect</span>(ToolBus);',
    '<span class="kw">await</span> runtime.context.<span class="fn">synchronize</span>();',
    '<span class="kw">await</span> AstrBot.dashboard.<span class="fn">prepare</span>();',
    '',
    '<span class="kw">if</span> (runtime.secure && runtime.ready) {',
    '  console.<span class="fn">log</span>(<span class="str">"GPT CODEX CHANNEL ONLINE"</span>);',
    '  <span class="kw">await</span> runtime.<span class="fn">handoff</span>();',
    '}',
    '',
    '<span class="ok">✓ MODEL CORE VERIFIED</span>',
    '<span class="ok">✓ TOOL ROUTER CONNECTED</span>',
    '<span class="ok">✓ SESSION INITIALIZED</span>'
  ];

  function addCodeLine(html, index) {
    timer(() => {
      const line = document.createElement('div');
      line.className = 'code-line';
      line.innerHTML = `<span class="num">${String(index + 1).padStart(2, '0')}</span>${html || '&nbsp;'}`;
      codeTerminal.appendChild(line);
      codeTerminal.scrollTop = codeTerminal.scrollHeight;
      tick(index > 16);
    }, 550 + index * 650);
  }

  function finish() {
    if (finished) return;
    finished = true;
    timers.forEach(window.clearTimeout); timers = [];
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (audioContext && masterGain) {
      masterGain.gain.cancelScheduledValues(audioContext.currentTime);
      masterGain.gain.setValueAtTime(Math.max(.0001, masterGain.gain.value), audioContext.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + .8);
    }
    humNodes.slice(0, 2).forEach((node) => { try { node.stop((audioContext?.currentTime || 0) + .9); } catch (_) {} });
    stage.classList.add('handoff');
    window.setTimeout(() => {
      try { parent.postMessage({ type: 'astrbot-code-animation:done' }, location.origin); } catch (_) {}
    }, 1200 / speed);
  }

  function enterCodePhase() {
    if (checkpoint !== 'identity' || codeStarted || finished) return;
    codeStarted = true;
    checkpoint = 'code';
    advance.hidden = true;
    identityCheckpoint.hidden = true;
    ensureAudio();
    confirmationSound();
    codeLines.forEach(addCodeLine);
    timer(scanSound, 3600);
    timer(scanSound, 8400);
    timer(() => {
      welcome.classList.add('show');
      confirmationSound();
      speak('Welcome OpenAI GPT Codex', 'welcome');
    }, 14500);
    timer(finish, 18800);
  }

  function advanceCheckpoint() {
    if (finished) return;
    ensureAudio();
    if (checkpoint === 'access') {
      checkpoint = 'enter';
      accessTitle.textContent = '确 认 进 入 CODEX';
      accessEnglish.textContent = 'ACCESS GRANTED / ENTER CODEX';
      advance.innerHTML = '确认进入 CODEX <span>CONTINUE</span>';
      loadNote.textContent = '访问许可已确认 · 等待进入';
      confirmationSound();
    } else if (checkpoint === 'enter') {
      checkpoint = 'identity';
      stage.classList.remove('phase-two');
      stage.classList.add('phase-three');
      identityCheckpoint.hidden = false;
      accessCheckpoint.hidden = true;
      advance.innerHTML = '确认身份 <span>CONFIRM IDENTITY</span>';
      confirmationSound();
    } else if (checkpoint === 'identity') {
      enterCodePhase();
    }
  }

  function startLoadingPhase() {
    stage.classList.add('burst');
    tone(52, 980, .75, .06, 'sawtooth');
    timer(() => {
      stage.classList.add('phase-two');
      startLabHum();
      scanSound();
      speak('OpenAI GPT Codex systems are loading. Please wait.', 'loading');
    }, 620);
    addDiagnostic('LABORATORY POWER BUS STABLE', 1000, true);
    addDiagnostic('AUTHENTICATING GPT MODEL CORE', 1800);
    addDiagnostic('NEURAL CONTEXT MATRIX CALIBRATED', 2700, true);
    addDiagnostic('SCANNING ASTRBOT EXTENSION BUS', 3600);
    addDiagnostic('CODEX TOOL ROUTER CONNECTED', 4500, true);
    addDiagnostic('SECURE EXECUTION CHANNEL SEALED', 5400, true);
    addDiagnostic('USER CONFIRMATION REQUIRED', 5900);
    timer(scanSound, 2300);
    timer(scanSound, 4700);
    timer(() => {
      checkpoint = 'access';
      loadNote.textContent = '加载完成 · 等待访问许可';
      accessCheckpoint.hidden = false;
      advance.hidden = false;
      advance.focus({ preventScroll: true });
      tone(420, 860, .8, .035);
    }, 6600);
  }

  function updateClock() { clock.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false }); }
  updateClock();
  const clockTimer = window.setInterval(updateClock, 1000);

  advance.addEventListener('click', advanceCheckpoint);
  skip.addEventListener('click', finish);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') finish();
    if (['Enter', ' '].includes(event.key) && event.target !== advance && event.target !== skip) {
      event.preventDefault();
      advanceCheckpoint();
    }
  });
  window.addEventListener('pointerdown', () => { ensureAudio(); if (stage.classList.contains('phase-two')) startLabHum(); }, { once: true });
  window.addEventListener('beforeunload', () => window.clearInterval(clockTimer));

  timer(startLoadingPhase, 3800);
})();
