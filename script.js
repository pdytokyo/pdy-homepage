(() => {
  'use strict';

  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#navigation');
  const mobile = window.matchMedia('(max-width: 767px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // URLは動きを許可する場合のみ設定。reduce時は動画を取得しない。
  const heroVideo = document.querySelector('#hero-pv');
  const videoToggle = document.querySelector('.hero-video-toggle');
  if (heroVideo && videoToggle) {
    const updateVideoButton = () => {
      const paused = heroVideo.paused;
      videoToggle.setAttribute('aria-label', paused ? '背景動画を再生' : '背景動画を一時停止');
      videoToggle.querySelector('span').textContent = paused ? '▶' : '⏸';
    };
    const playVideo = () => {
      heroVideo.play().catch(updateVideoButton);
    };
    const applyMotionPreference = () => {
      if (reducedMotion.matches) {
        heroVideo.pause();
        if (heroVideo.hasAttribute('src')) {
          heroVideo.removeAttribute('src');
          heroVideo.load();
        }
        if (document.activeElement === videoToggle) {
          const heroLink = document.querySelector('.hero-content a');
          if (heroLink) heroLink.focus({ preventScroll: true });
        }
        videoToggle.hidden = true;
      } else {
        heroVideo.src = heroVideo.dataset.src;
        videoToggle.hidden = false;
        playVideo();
      }
      updateVideoButton();
    };
    heroVideo.addEventListener('play', updateVideoButton);
    heroVideo.addEventListener('pause', updateVideoButton);
    videoToggle.addEventListener('click', () => {
      if (reducedMotion.matches) return;
      if (heroVideo.paused) playVideo();
      else heroVideo.pause();
    });
    reducedMotion.addEventListener('change', applyMotionPreference);
    applyMotionPreference();
  }

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

  // 無料診断フォーム: 成功時のみ受付完了へ切り替える。
  const form = document.querySelector('#diagnosis-form');
  if (form) {
    const API = 'https://pdy-script-generator.pdytokyo.workers.dev/api/homepage/diagnosis';
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const status = document.querySelector('#form-status');
      const button = form.querySelector('.button-submit');
      const show = text => {
        status.textContent = text;
        status.focus({ preventScroll: true });
        status.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'nearest' });
      };
      button.disabled = true;
      show('送信しています…');
      try {
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company: form.querySelector('#company-name').value,
            name: form.querySelector('#full-name').value,
            email: form.querySelector('#email').value,
            channel: form.querySelector('#channel').value,
            goal: form.querySelector('#goal')?.value || '',
            message: (new URLSearchParams(location.search).get('ref') ? `[${new URLSearchParams(location.search).get('ref').slice(0, 24)}] ` : '') + form.querySelector('#message').value,
            website: form.querySelector('input[name="website"]')?.value || '',
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          form.reset();
          button.textContent = '受付完了';
          show('受け付けました。約10分でメールに診断レポートのリンクをお送りします（届かない場合は迷惑メールをご確認ください）。');
        } else {
          show(data.error || '送信に失敗しました。時間を置いてお試しいただくか、pdytokyo@gmail.com へ直接ご連絡ください。');
          button.disabled = false;
        }
      } catch {
        show('通信エラーで送信できませんでした。pdytokyo@gmail.com へ直接ご連絡ください。');
        button.disabled = false;
      }
    });
  }
  // モバイル: ヒーロー通過後に画面下へ診断CTAを固定表示
  const stickyTarget = document.querySelector('#contact');
  if (stickyTarget && mobile.matches) {
    const bar = document.createElement('a');
    bar.href = '#contact';
    bar.className = 'sticky-cta';
    bar.innerHTML = 'チャンネル無料診断 <span aria-hidden="true">↗</span>';
    bar.hidden = true;
    document.body.appendChild(bar);
    const hero = document.querySelector('.hero');
    addEventListener('scroll', () => {
      const past = hero ? hero.getBoundingClientRect().bottom < 0 : scrollY > 500;
      const nearForm = stickyTarget.getBoundingClientRect().top < innerHeight;
      bar.hidden = !(past && !nearForm);
    }, { passive: true });
  }
})();

// ── 粒子オープニング: 粒子が集まって再生ボタン▶を描き、押されてヒーローPVへ ──
(function () {
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (location.pathname !== '/' && !location.pathname.endsWith('index.html')) return;
    if (location.hash && location.hash !== '#top') return; // セクション直行時は演出を挟まない
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

    const T_HOLD = 450, T_OUT = 550; // 集合完了後の静止時間 / 退場時間（短縮版）
    let phase = 'in', phaseStart = performance.now(), prev = performance.now();
    function tick(now) {
      if (finished) return;
      try {
        const frames = Math.min((now - prev) / 16.667, 3); prev = now; // リフレッシュレート補正
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#04040a'; ctx.fillRect(0, 0, W, H);
        const el = now - phaseStart;
        let alpha = 1;
        if (phase === 'in' && el > 850) { phase = 'hold'; phaseStart = now; }
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
