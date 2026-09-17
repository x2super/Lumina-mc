(() => {
  const motion = window.Motion;
  if (!motion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const { animate, stagger, hover, press } = motion;
  const ease = [0.22, 1, 0.36, 1];

  function animatePage(page) {
    if (!page) return;
    const heading = page.querySelector('.page-heading, .content-heading-row');
    const items = page.querySelectorAll('.version-card, .settings-card, .loader-hero, .loader-steps, .notice-card, .content-summary > div, .content-item, .empty-state, .info-card');
    if (heading) animate(heading, { opacity: [0, 1], y: [14, 0] }, { duration: 0.38, ease });
    if (items.length) animate(items, { opacity: [0, 1], y: [18, 0], scale: [0.985, 1] }, { duration: 0.42, delay: stagger(0.045), ease });
  }

  function animateSelect(root) {
    if (!root?.classList.contains('open')) return;
    const panel = root.querySelector('.select-content');
    const options = root.querySelectorAll('.select-option');
    if (panel) animate(panel, { opacity: [0, 1], y: [7, 0], scale: [0.98, 1] }, { duration: 0.18, ease });
    if (options.length) animate(options, { opacity: [0, 1], x: [-5, 0] }, { duration: 0.2, delay: stagger(0.018), ease });
  }

  requestAnimationFrame(() => {
    animate('.brand-mini, .logo', { opacity: [0, 1], x: [-14, 0] }, { duration: 0.45, ease });
    animate('.nav-item, .nav-label', { opacity: [0, 1], x: [-12, 0] }, { duration: 0.35, delay: stagger(0.025), ease });
    animate('.hero', { opacity: [0, 1], scale: [0.975, 1] }, { duration: 0.65, ease });
    animate('.hero-copy > *', { opacity: [0, 1], y: [18, 0] }, { duration: 0.48, delay: stagger(0.08, { startDelay: 0.12 }), ease });
    animate('.voxel-scene', { opacity: [0, 1], x: [26, 0], scale: [0.97, 1] }, { duration: 0.75, delay: 0.08, ease });
    animate('.launch-dock', { opacity: [0, 1] }, { duration: 0.52, delay: 0.12, ease });
    animate('.info-card', { opacity: [0, 1], y: [16, 0] }, { duration: 0.38, delay: stagger(0.07, { startDelay: 0.25 }), ease });
  });

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => requestAnimationFrame(() => animatePage(document.querySelector('.page.active'))));
  });

  document.addEventListener('click', event => {
    const trigger = event.target.closest('.select-trigger');
    if (trigger) requestAnimationFrame(() => animateSelect(trigger.closest('.custom-select')));
  });

  const contentObserver = new MutationObserver(records => {
    const added = records.flatMap(record => [...record.addedNodes]).filter(node => node.nodeType === 1 && node.classList?.contains('content-item'));
    if (added.length) animate(added, { opacity: [0, 1], x: [-12, 0] }, { duration: 0.32, delay: stagger(0.04), ease });
  });
  const contentList = document.querySelector('#contentList');
  if (contentList) contentObserver.observe(contentList, { childList: true });

  hover('.play-button, .primary-action', element => {
    animate(element, { scale: 1.025, y: -2 }, { duration: 0.18, ease });
    return () => animate(element, { scale: 1, y: 0 }, { duration: 0.2, ease });
  });
  hover('.version-card, .info-card, .content-item', element => {
    animate(element, { y: -3 }, { duration: 0.18, ease });
    return () => animate(element, { y: 0 }, { duration: 0.2, ease });
  });
  press('.play-button, .primary-action, .nav-item', element => {
    animate(element, { scale: 0.97 }, { duration: 0.1 });
    return () => animate(element, { scale: 1 }, { duration: 0.16, ease });
  });
})();
