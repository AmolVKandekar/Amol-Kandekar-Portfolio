const page = document.documentElement;
const body = document.body;
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const motionButton = document.querySelector('.motion-toggle');
const motionLabel = motionButton.querySelector('[data-motion-label]');
const hero = document.querySelector('.hero');
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
  if (!enabled) resetDepth();
  scheduleScroll();
}

function resetDepth() {
  for (const name of ['--image-x', '--image-y', '--grid-x', '--grid-y']) {
    hero.style.removeProperty(name);
  }
}

function updateScroll() {
  frameScheduled = false;
  const available = Math.max(page.scrollHeight - innerHeight, 1);
  page.style.setProperty('--read-progress', Math.min(1, scrollY / available));
  page.style.setProperty('--scroll-motion', motion ? `${Math.min(scrollY * 0.11, 72)}px` : '0px');
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

hero.addEventListener('pointermove', event => {
  if (!motion || event.pointerType === 'touch') return;
  const { left, top, width, height } = hero.getBoundingClientRect();
  const x = (event.clientX - left) / width - 0.5;
  const y = (event.clientY - top) / height - 0.5;
  hero.style.setProperty('--image-x', `${x * -25}px`);
  hero.style.setProperty('--image-y', `${y * -16}px`);
  hero.style.setProperty('--grid-x', `${x * 30}px`);
  hero.style.setProperty('--grid-y', `${y * 21}px`);
});
hero.addEventListener('pointerleave', resetDepth);

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

const timeline = document.querySelector('[data-timeline]');
const rail = timeline.querySelector('.timeline-rail');
const tabs = Array.from(rail.querySelectorAll('[data-step]'));
const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
const previous = timeline.querySelector('[data-previous]');
const next = timeline.querySelector('[data-next]');
const play = timeline.querySelector('[data-play]');
const announcement = timeline.querySelector('[data-announcement]');
let current = 0;
let playback = null;

function selectMilestone(index, { focus = false, announce = false } = {}) {
  current = Math.max(0, Math.min(index, tabs.length - 1));
  for (const [position, tab] of tabs.entries()) {
    const selected = position === current;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    panels[position].hidden = !selected;
    panels[position].classList.toggle('is-current', selected);
  }
  previous.disabled = current === 0;
  next.disabled = current === tabs.length - 1;

  const activeTab = tabs[current];
  if (focus) activeTab.focus({ preventScroll: true });
  const start = activeTab.offsetLeft;
  const end = start + activeTab.offsetWidth;
  if (start < rail.scrollLeft || end > rail.scrollLeft + rail.clientWidth) {
    rail.scrollTo({ left: start - 8, behavior: motion ? 'smooth' : 'instant' });
  }
  if (announce) announcement.textContent = panels[current].querySelector('h3').textContent;
}

function stopPlayback() {
  clearInterval(playback);
  playback = null;
  play.textContent = current === tabs.length - 1 ? 'Replay timeline' : 'Play timeline';
}

function moveMilestone(index, focus = false) {
  selectMilestone(index, { focus, announce: !focus });
  stopPlayback();
}

rail.setAttribute('role', 'tablist');
for (const [index, tab] of tabs.entries()) {
  tab.setAttribute('role', 'tab');
  panels[index].setAttribute('role', 'tabpanel');
  panels[index].setAttribute('aria-labelledby', tab.id);
  panels[index].tabIndex = 0;
  tab.addEventListener('click', () => moveMilestone(index));
}
rail.hidden = false;
timeline.querySelector('.timeline-controls').hidden = false;
play.hidden = false;
selectMilestone(0);

rail.addEventListener('keydown', event => {
  const destination = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: tabs.length - 1 }[event.key];
  if (destination === undefined) return;
  event.preventDefault();
  moveMilestone(destination, true);
});
previous.addEventListener('click', () => moveMilestone(current - 1));
next.addEventListener('click', () => moveMilestone(current + 1));
play.addEventListener('click', () => {
  if (playback !== null) {
    stopPlayback();
    return;
  }
  if (current === tabs.length - 1) selectMilestone(0, { announce: true });
  play.textContent = 'Pause timeline';
  playback = setInterval(() => {
    selectMilestone(current + 1, { announce: true });
    if (current === tabs.length - 1) stopPlayback();
  }, 4000);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopPlayback();
});

const dialog = document.querySelector('.case-dialog');
if (typeof dialog.showModal === 'function') {
  body.classList.add('has-dialog');
  const caseContent = dialog.querySelector('[data-case-content]');
  const close = dialog.querySelector('[data-close]');
  let sourceLink;
  let activeId;

  const showCase = (id, link) => {
    const source = document.getElementById(id);
    if (!source?.classList.contains('case-study')) return;
    sourceLink = link;
    activeId = id;
    caseContent.replaceChildren(...Array.from(source.children, element => element.cloneNode(true)));
    caseContent.querySelector('h2').id = 'case-title';
    if (!dialog.open) dialog.showModal();
    close.focus();
  };

  for (const link of document.querySelectorAll('.case-link')) {
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (location.hash !== link.hash) history.pushState(null, '', link.hash);
      showCase(link.hash.slice(1), link);
    });
  }

  function syncCase() {
    const id = location.hash.slice(1);
    const linkedCase = Array.from(document.querySelectorAll('.case-link')).find(link => link.hash === location.hash);
    if (linkedCase) showCase(id, linkedCase);
    else if (dialog.open) dialog.close();
  }

  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (location.hash === `#${activeId}` && sourceLink) {
      history.replaceState(null, '', `#${sourceLink.closest('.project').id}`);
    }
    sourceLink?.focus({ preventScroll: true });
  });
  window.addEventListener('hashchange', syncCase);
  syncCase();
}
