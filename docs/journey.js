(() => {
  const journey = document.querySelector('[data-journey]');
  const stage = journey.querySelector('[data-stage]');
  const sceneDate = stage.querySelector('[data-scene-date]');
  const sceneLabel = stage.querySelector('[data-scene-label]');
  const walker = stage.querySelector('[data-walker]');
  const companies = stage.querySelector('[data-stage-companies]');
  const stopsList = journey.querySelector('[data-walk-stops]');
  const stops = Array.from(stopsList.querySelectorAll('[data-stop]'));
  const panels = stops.map(stop => document.getElementById(stop.getAttribute('aria-controls')));
  const back = journey.querySelector('[data-walk-back]');
  const forward = journey.querySelector('[data-walk-forward]');
  const reset = journey.querySelector('[data-walk-reset]');
  const paths = journey.querySelector('[data-path-choices]');
  const status = journey.querySelector('[data-walk-status]');
  const crossroads = panels.findIndex(panel => panel.id === 'milestone-turn');
  const college = panels.findIndex(panel => panel.id === 'milestone-degree');
  const last = stops.length - 1;
  let active = 0;
  let destination = null;
  let position = 12;
  let animation;
  let gateOpen = false;

  const marker = index => 12 + (76 * index) / last;
  const reduceMotion = () => document.body.classList.contains('motion-off');

  function draw(x, pose = 3) {
    position = x;
    walker.style.setProperty('--walker-x', x + '%');
    walker.style.setProperty('--walker-frame', (pose * 100) / 7 + '%');
    stage.style.setProperty('--camera-x', (50 - x) * .073 + '%');
  }

  function updateGate() {
    paths.hidden = active !== crossroads || !gateOpen;
    stage.dataset.gate = active === college || (active === crossroads && gateOpen) ? 'open' : 'closed';
    forward.textContent = active === crossroads ? (gateOpen ? 'Choose a path' : 'Open the building') : 'Walk forward';
    if (active === crossroads) {
      forward.setAttribute('aria-controls', paths.id);
      forward.setAttribute('aria-expanded', String(gateOpen));
    } else {
      forward.removeAttribute('aria-controls');
      forward.removeAttribute('aria-expanded');
    }
  }

  function revealStop(index, announce = true) {
    const focused = document.activeElement;
    active = index;
    const selected = panels[index];
    for (const [number, panel] of panels.entries()) {
      panel.hidden = number !== index;
      if (number === index) stops[number].setAttribute('aria-current', 'step');
      else stops[number].removeAttribute('aria-current');
    }

    stage.dataset.scene = selected.dataset.scene;
    companies.hidden = selected.id !== 'milestone-field';
    sceneDate.textContent = selected.querySelector('[data-date]').textContent;
    sceneLabel.textContent = selected.dataset.label;
    back.disabled = index === 0;
    forward.hidden = index === last;
    reset.hidden = index !== last;
    updateGate();

    if ((focused === forward && forward.hidden) || (focused === reset && reset.hidden)) {
      (forward.hidden ? reset : forward).focus({ preventScroll: true });
    } else if (focused?.closest('[hidden]')) {
      stage.focus({ preventScroll: true });
    }
    const rail = stopsList.getBoundingClientRect();
    const button = stops[index].getBoundingClientRect();
    if (button.left < rail.left || button.right > rail.right) {
      stopsList.scrollBy({
        left: button.left - rail.left - 12,
        behavior: reduceMotion() ? 'instant' : 'smooth',
      });
    }
    if (announce) status.textContent = sceneDate.textContent + '. ' + sceneLabel.textContent + '.';
  }

  function arrive(index) {
    cancelAnimationFrame(animation);
    destination = null;
    stage.removeAttribute('aria-busy');
    draw(marker(index));
    revealStop(index);
  }

  function walkTo(index) {
    if (index < 0 || index > last || index === destination || (index === active && destination === null)) return;
    cancelAnimationFrame(animation);
    destination = index;
    const start = position;
    const distance = marker(index) - start;
    walker.style.setProperty('--walker-facing', distance < 0 ? '-1' : '1');
    if (reduceMotion() || Math.abs(distance) < 1) {
      arrive(index);
      return;
    }

    stage.setAttribute('aria-busy', 'true');
    const duration = Math.min(1750, 410 + Math.abs(distance) * 15);
    let started;
    function stride(time) {
      started ??= time;
      const elapsed = time - started;
      const progress = Math.min(1, elapsed / duration);
      const eased = progress * progress * (3 - 2 * progress);
      draw(start + distance * eased, Math.floor(elapsed / 93) % 8);
      if (progress < 1) animation = requestAnimationFrame(stride);
      else arrive(index);
    }
    animation = requestAnimationFrame(stride);
  }

  function walkForward() {
    if (destination !== null) return;
    if (active !== crossroads) {
      walkTo(active + 1);
      return;
    }
    if (gateOpen) {
      paths.querySelector('a').focus();
      return;
    }
    gateOpen = true;
    updateGate();
    status.textContent = 'The building is open. Choose civil engineering or computer engineering.';
  }

  function stopFromHash() {
    const target = document.getElementById(location.hash.slice(1));
    return panels.indexOf(target?.closest('[data-panel]'));
  }

  journey.classList.add('is-ready');
  stage.querySelector('[data-stage-actions]').append(paths);
  stage.tabIndex = 0;
  stage.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight');
  journey.querySelector('[data-walk-controls]').hidden = false;
  stopsList.hidden = false;
  walker.hidden = false;
  const start = Math.max(0, stopFromHash());
  draw(marker(start));
  revealStop(start, false);
  const initialDetails = document.getElementById(location.hash.slice(1));
  if (initialDetails instanceof HTMLDetailsElement) initialDetails.open = true;

  for (const [index, stop] of stops.entries()) {
    stop.addEventListener('click', () => walkTo(index));
  }
  for (const button of companies.querySelectorAll('button')) {
    const company = document.getElementById(button.getAttribute('aria-controls'));
    button.setAttribute('aria-expanded', String(company.open));
    company.addEventListener('toggle', () => button.setAttribute('aria-expanded', String(company.open)));
    button.addEventListener('click', () => {
      company.open = true;
      company.querySelector('summary').focus({ preventScroll: true });
      company.scrollIntoView({ block: 'nearest', behavior: reduceMotion() ? 'instant' : 'smooth' });
    });
  }
  back.addEventListener('click', () => {
    if (destination === null) walkTo(active - 1);
  });
  forward.addEventListener('click', walkForward);
  reset.addEventListener('click', () => {
    gateOpen = false;
    walkTo(0);
  });
  paths.addEventListener('click', event => {
    const link = event.target.closest('[data-path]');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const next = panels.findIndex(panel => '#' + panel.id === link.hash);
    walkTo(next);
  });
  stage.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      walkForward();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (destination === null) walkTo(active - 1);
    }
  });
  document.addEventListener('portfolio-motion', () => {
    if (reduceMotion() && destination !== null) arrive(destination);
  });
  window.addEventListener('hashchange', () => {
    const linked = stopFromHash();
    if (linked >= 0) walkTo(linked);
  });
})();
