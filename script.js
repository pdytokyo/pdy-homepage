(() => {
  'use strict';

  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#navigation');
  const mobile = window.matchMedia('(max-width: 767px)');

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
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });
  mobile.addEventListener('change', () => {
    const hadFocus = document.activeElement === menuButton || navigation.contains(document.activeElement);
    closeMenu();
    if (hadFocus) (mobile.matches ? menuButton : navigation.querySelector('a')).focus();
  });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
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
  form.addEventListener('submit', event => {
    event.preventDefault();
    const status = document.querySelector('#form-status');
    status.textContent = '現在準備中です。無料診断の受付開始まで、今しばらくお待ちください。入力内容は送信されていません。';
    status.focus({ preventScroll: true });
    status.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'nearest' });
  });
})();
