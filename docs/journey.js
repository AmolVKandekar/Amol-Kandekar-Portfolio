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
  const moveButtons = journey.querySelectorAll('[data-move]');
  const forward = journey.querySelector('[data-walk-forward]');
  const reset = journey.querySelector('[data-walk-reset]');
  const paths = journey.querySelector('[data-path-choices]');
  const status = journey.querySelector('[data-walk-status]');
  const crossroads = panels.findIndex(panel => panel.id === 'milestone-turn');
  const college = panels.findIndex(panel => panel.id === 'milestone-degree');
  const last = stops.length - 1;
  const directions = new Map([['arrowleft', -1], ['a', -1], ['arrowright', 1], ['d', 1]]);
  let active = 0;
  let destination = null;
  let position = 12;
  let animation;
  let gateOpen = false;
  let computerPath = false;
  let driver = null;

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
    forward.textContent = active === crossroads ? (gateOpen ? 'Choose a path' : 'Open the building') : 'Next stop';
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
    if (index < 0 || index > last || index === destination) return;
    if (index === active && destination === null && Math.abs(position - marker(index)) < 1) return;
    stopDriving();
    cancelAnimationFrame(animation);
    if (index >= college) computerPath = true;
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

  function moveOneStop(direction) {
    if (destination !== null) return;
    if (direction === 1) walkForward();
    else walkTo(active - 1);
  }

  function stopDriving(input) {
    if (!driver || (input && driver !== input)) return;
    cancelAnimationFrame(animation);
    driver = null;
    draw(position);
  }

  function startDriving(direction, input) {
    if (destination !== null || driver === input) return;
    if (reduceMotion()) {
      moveOneStop(direction);
      return;
    }
    stopDriving();
    const edge = direction === -1 ? marker(0) : marker(computerPath ? last : crossroads);
    if ((edge - position) * direction <= 0) return;

    driver = input;
    walker.style.setProperty('--walker-facing', String(direction));
    let previous = performance.now() - 17;
    let strideTime = 0;
    function move(time) {
      const elapsed = Math.min(45, Math.max(0, time - previous));
      previous = time;
      strideTime += elapsed;
      const offset = position + direction * .024 * elapsed;
      const x = direction === 1 ? Math.min(edge, offset) : Math.max(edge, offset);
      draw(x, Math.floor(strideTime / 93) % 8);

      const next = active + direction;
      if (next >= 0 && next <= last && (x - marker(next)) * direction >= 0) revealStop(next);
      if (x === edge) stopDriving(input);
      else animation = requestAnimationFrame(move);
    }
    move(performance.now());
  }

  function stopFromHash() {
    const target = document.getElementById(location.hash.slice(1));
    return panels.indexOf(target?.closest('[data-panel]'));
  }

  journey.classList.add('is-ready');
  stage.querySelector('[data-stage-actions]').append(paths);
  stage.tabIndex = 0;
  stage.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight A D E');
  journey.querySelector('[data-walk-controls]').hidden = false;
  stopsList.hidden = false;
  walker.hidden = false;
  const start = Math.max(0, stopFromHash());
  computerPath = start >= college;
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
  for (const button of moveButtons) {
    const direction = Number(button.dataset.move);
    button.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      button.setPointerCapture(event.pointerId);
      startDriving(direction, 'pointer:' + event.pointerId);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(type, event => stopDriving('pointer:' + event.pointerId));
    }
    button.addEventListener('contextmenu', event => event.preventDefault());
    button.addEventListener('click', event => {
      if (event.detail === 0) moveOneStop(direction);
    });
  }
  forward.addEventListener('click', walkForward);
  reset.addEventListener('click', () => {
    gateOpen = false;
    computerPath = false;
    walkTo(0);
  });
  paths.addEventListener('click', event => {
    const link = event.target.closest('[data-path]');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (link.dataset.path === 'civil') computerPath = false;
    const next = panels.findIndex(panel => '#' + panel.id === link.hash);
    walkTo(next);
  });
  stage.addEventListener('keydown', event => {
    if (event.target !== stage || event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toLowerCase();
    const direction = directions.get(key);
    if (!direction && key !== 'e') return;
    event.preventDefault();
    if (event.repeat) return;
    if (direction) {
      startDriving(direction, 'key:' + key);
      return;
    }
    stopDriving();
    if (active === crossroads) walkForward();
    else if (!companies.hidden) companies.querySelector('button').focus();
    else panels[active].querySelector('a')?.focus();
  });
  stage.addEventListener('blur', () => {
    if (driver?.startsWith('key:')) stopDriving();
  });
  window.addEventListener('keyup', event => stopDriving('key:' + event.key.toLowerCase()));
  window.addEventListener('blur', () => stopDriving());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopDriving();
  });
  document.addEventListener('portfolio-motion', () => {
    if (!reduceMotion()) return;
    stopDriving();
    if (destination !== null) arrive(destination);
  });
  window.addEventListener('hashchange', () => {
    const linked = stopFromHash();
    if (linked >= 0) walkTo(linked);
  });
})();
