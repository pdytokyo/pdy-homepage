(() => {
  'use strict';

  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#navigation');
  const mobile = window.matchMedia('(max-width: 767px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // メニュー（採用ページ等、要素が無いページでは何もしない）
  if (menuButton && navigation) {
    function closeMenu(returnFocus = false) {
      navigation.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.querySelector('.menu-label').textContent = 'MENU';
      if (returnFocus) menuButton.focus();
    }

    menuButton.hidden = false;
    navigation.classList.add('is-collapsible');
    menuButton.addEventListener('click', () => {
      const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
      navigation.classList.toggle('is-open', !isOpen);
      menuButton.setAttribute('aria-expanded', String(!isOpen));
      menuButton.querySelector('.menu-label').textContent = isOpen ? 'MENU' : 'CLOSE';
    });
    navigation.addEventListener('click', event => {
      const link = event.target.closest('a');
      if (!link || !mobile.matches) return;
      closeMenu();
      // 同一ページ内のフラグメントだけをフォーカス移動の対象にする（/recruit等はそのまま遷移）
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
      let id;
      try { id = decodeURIComponent(url.hash.slice(1)); } catch { return; }
      const target = document.getElementById(id);
      if (!target) return;
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
    });
    mobile.addEventListener('change', () => {
      const hadFocus = document.activeElement === menuButton || navigation.contains(document.activeElement);
      closeMenu();
      if (hadFocus) (mobile.matches ? menuButton : navigation.querySelector('a')).focus();
    });
  }

  const revealElements = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove('is-pending');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    revealElements.forEach(element => {
      // 初期画面の内容は即表示。スクロール先だけを穏やかに表示する。
      if (element.getBoundingClientRect().top > window.innerHeight) {
        element.classList.add('is-pending');
        observer.observe(element);
      }
    });
    reducedMotion.addEventListener('change', () => {
      if (!reducedMotion.matches) return;
      observer.disconnect();
      revealElements.forEach(element => element.classList.remove('is-pending'));
    });
  }

  // UIプレビュー。通信・保存は行わない。送信先接続時に差し替える。
  const form = document.querySelector('#diagnosis-form');
  if (form) {
    form.addEventListener('submit', event => {
      event.preventDefault();
      const status = document.querySelector('#form-status');
      status.textContent = '現在準備中です。無料診断の受付開始まで、今しばらくお待ちください。入力内容は送信されていません。';
      status.focus({ preventScroll: true });
      status.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'nearest' });
    });
  }
})();

// ── 粒子オープニング: 粒子が集まって再生ボタン▶を描き、押されてヒーローPVへ ──
(function () {
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (location.pathname !== '/' && !location.pathname.endsWith('index.html')) return;
    let seen = null;
    try { seen = sessionStorage.getItem('pdyIntroSeen'); } catch { /* 記憶不可でも1回は再生 */ }
    if (seen) return;
    try { sessionStorage.setItem('pdyIntroSeen', '1'); } catch { /* 保存不可は無視 */ }

    // 画面を覆う前にCanvas類を初期化し、失敗時は演出自体を諦める
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const off = document.createElement('canvas');
    const octx = off.getContext('2d');
    if (!ctx || !octx) return;

    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = innerWidth, H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    off.width = W; off.height = H;

    // 再生ボタン（円リング + 三角）を描いて粒子の目標座標をサンプリング
    const R = Math.min(W, H) * 0.22;
    octx.strokeStyle = '#fff'; octx.lineWidth = Math.max(6, R * 0.07);
    octx.beginPath(); octx.arc(W / 2, H / 2, R, 0, Math.PI * 2); octx.stroke();
    octx.fillStyle = '#fff';
    const t = R * 0.52, cx = W / 2 + R * 0.06, cy = H / 2;
    octx.beginPath();
    octx.moveTo(cx - t * 0.55, cy - t);
    octx.lineTo(cx - t * 0.55, cy + t);
    octx.lineTo(cx + t * 0.95, cy);
    octx.closePath(); octx.fill();
    const gap = Math.max(4, Math.floor(R / 34));
    const img = octx.getImageData(0, 0, W, H).data;
    const targets = [];
    for (let y = 0; y < H; y += gap) for (let x = 0; x < W; x += gap)
      if (img[(y * W + x) * 4 + 3] > 128) targets.push([x, y]);
    if (!targets.length) return;

    const parts = targets.map(([tx, ty]) => ({
      x: Math.random() * W, y: Math.random() * H, tx, ty,
      c: Math.random() < 0.08 ? '#e5372e' : (Math.random() < 0.12 ? '#6c86ff' : '#ffffff'),
      s: 1 + Math.random() * 1.6, d: 0.05 + Math.random() * 0.055,
    }));

    const overlay = document.createElement('div');
    overlay.id = 'intro-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.appendChild(canvas);
    document.body.appendChild(overlay);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // どんな経路でも必ず1回だけ後片付けする
    let rafId = 0, finished = false;
    const failsafe = setTimeout(() => finish(), 5500);
    function finish() {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(rafId);
      clearTimeout(failsafe);
      removeEventListener('resize', finish);
      removeEventListener('pagehide', finish);
      overlay.remove();
      document.body.style.overflow = previousOverflow;
    }
    addEventListener('resize', finish);
    addEventListener('pagehide', finish);
    // クリック/タップ/キーでスキップ可能に
    overlay.addEventListener('pointerdown', finish);
    addEventListener('keydown', function onKey() { removeEventListener('keydown', onKey); finish(); }, { once: true });

    const T_HOLD = 2000, T_OUT = 650; // 集合完了後の静止時間 / 退場時間
    let phase = 'in', phaseStart = performance.now(), prev = performance.now();
    function tick(now) {
      if (finished) return;
      try {
        const frames = Math.min((now - prev) / 16.667, 3); prev = now; // リフレッシュレート補正
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#04040a'; ctx.fillRect(0, 0, W, H);
        const el = now - phaseStart;
        let alpha = 1;
        if (phase === 'in' && el > 1400) { phase = 'hold'; phaseStart = now; }
        else if (phase === 'hold' && el > T_HOLD) { phase = 'out'; phaseStart = now; }
        else if (phase === 'out') {
          alpha = Math.max(0, 1 - el / T_OUT);
          overlay.style.opacity = alpha;
          if (alpha <= 0) { finish(); return; }
        }
        for (const p of parts) {
          if (phase === 'out') {
            const k = (el < 130 ? -0.06 : 0.085) * frames; // 一瞬沈み込んでから弾ける
            p.x += (p.x - W / 2) * k; p.y += (p.y - H / 2) * k;
          } else {
            const e = 1 - Math.pow(1 - p.d, frames);
            p.x += (p.tx - p.x) * e; p.y += (p.ty - p.y) * e;
          }
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.c;
          ctx.fillRect(p.x, p.y, p.s, p.s);
        }
        ctx.globalAlpha = 1;
        rafId = requestAnimationFrame(tick);
      } catch { finish(); }
    }
    rafId = requestAnimationFrame(tick);
  } catch { /* 演出は失敗しても本文表示を妨げない */ }
})();
