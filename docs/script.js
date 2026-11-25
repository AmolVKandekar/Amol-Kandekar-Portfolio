const page = document.documentElement;
const body = document.body;
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const motionButton = document.querySelector('.motion-toggle');
const motionLabel = motionButton.querySelector('[data-motion-label]');
const nav = document.querySelector('#site-nav');
const menu = document.querySelector('.menu-toggle');
const navLinks = Array.from(nav.querySelectorAll('a'));
const sections = navLinks.map(link => document.querySelector(link.hash));
let motion = !motionPreference.matches;
let motionOverride = false;
let frameScheduled = false;

function setMotion(enabled) {
  motion = enabled;
  body.classList.toggle('motion-on', enabled);
  body.classList.toggle('motion-off', !enabled);
  page.style.scrollBehavior = enabled ? '' : 'auto';
  motionButton.setAttribute('aria-pressed', String(enabled));
  motionLabel.textContent = enabled ? 'Motion on' : 'Motion off';
  document.dispatchEvent(new Event('portfolio-motion'));
  scheduleScroll();
}

function updateScroll() {
  frameScheduled = false;
  const available = Math.max(page.scrollHeight - innerHeight, 1);
  page.style.setProperty('--read-progress', Math.min(1, scrollY / available));
  const active = sections.findLastIndex(section => section.getBoundingClientRect().top <= innerHeight * 0.38);
  navLinks.forEach((link, index) => {
    if (index === active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}

function scheduleScroll() {
  if (frameScheduled) return;
  frameScheduled = true;
  requestAnimationFrame(updateScroll);
}

body.classList.add('enhanced');
setMotion(motion);
motionButton.hidden = false;
motionButton.addEventListener('click', () => {
  motionOverride = true;
  setMotion(!motion);
});
motionPreference.addEventListener('change', event => {
  if (!motionOverride) setMotion(!event.matches);
});
window.addEventListener('scroll', scheduleScroll, { passive: true });
window.addEventListener('resize', scheduleScroll);

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        if (motion) entry.target.classList.add('entering');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.16 });
  document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
}

function setMenu(open) {
  nav.classList.toggle('is-open', open);
  menu.setAttribute('aria-expanded', String(open));
}

menu.hidden = false;
menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') === 'false'));
nav.addEventListener('click', event => {
  if (event.target.closest('a')) setMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menu.focus();
  }
});

const dialog = document.querySelector('.case-dialog');
if (typeof dialog.showModal === 'function') {
  body.classList.add('has-dialog');
  const caseContent = dialog.querySelector('[data-case-content]');
  const close = dialog.querySelector('[data-close]');
  const links = Array.from(document.querySelectorAll('.case-link'));
  let sourceLink;
  let activeId;
  let previousHash = '';

  function showCase(id, link, returnHash) {
    const source = document.getElementById(id);
    if (!source?.classList.contains('case-study')) return;
    sourceLink = link;
    activeId = id;
    previousHash = returnHash;
    caseContent.replaceChildren(...Array.from(source.children, child => child.cloneNode(true)));
    caseContent.querySelector('h2').id = 'case-title';
    if (!dialog.open) dialog.showModal();
    close.focus();
  }

  for (const link of links) {
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const returnHash = location.hash;
      if (returnHash !== link.hash) history.pushState(null, '', link.hash);
      showCase(link.hash.slice(1), link, returnHash === link.hash ? '' : returnHash);
    });
  }

  function syncCase() {
    const matches = links.filter(link => link.hash === location.hash);
    const link = matches.find(match => match.closest('.project')) ?? matches.find(match => match.getClientRects().length > 0);
    if (link) {
      const section = link.closest('.project, [data-panel]');
      showCase(link.hash.slice(1), link, section ? '#' + section.id : '');
    } else if (dialog.open) {
      dialog.close();
    }
  }

  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    if (location.hash === '#' + activeId) {
      history.replaceState(null, '', previousHash || location.pathname + location.search);
    }
    sourceLink?.focus({ preventScroll: true });
  });
  window.addEventListener('hashchange', syncCase);
  syncCase();
}
