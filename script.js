/* Portfolio Richard Kheum : animations, interactions et mode présentation */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var body = document.body;

  /* ---------- 0. Mode jour / nuit ---------- */

  var themeBtn = document.querySelector('.theme-toggle');
  var darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function currentTheme() {
    var t = root.getAttribute('data-theme');
    if (t === 'dark' || t === 'light') return t;
    return darkQuery && darkQuery.matches ? 'dark' : 'light';
  }
  function syncThemeBtn() {
    if (!themeBtn) return;
    var dark = currentTheme() === 'dark';
    themeBtn.setAttribute('aria-label', dark ? 'Passer en mode jour' : 'Passer en mode nuit');
    themeBtn.setAttribute('title', dark ? 'Mode jour' : 'Mode nuit');
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('rk-theme', next); } catch (e) { /* stockage indisponible */ }
      syncThemeBtn();
    });
    if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener('change', syncThemeBtn);
    syncThemeBtn();
  }

  /* ---------- 1. Apparitions au défilement + compteurs ---------- */

  // Délais en cascade pour les groupes [data-stagger]
  document.querySelectorAll('[data-stagger]').forEach(function (group) {
    Array.prototype.forEach.call(group.querySelectorAll('[data-reveal]'), function (el, i) {
      if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', (i * 0.1) + 's');
    });
  });

  // Ordre d'apparition des étapes du schéma Secure Boot
  document.querySelectorAll('.chain').forEach(function (chain) {
    Array.prototype.forEach.call(chain.children, function (el, i) { el.style.setProperty('--i', i); });
  });

  function runCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduce || isNaN(target)) { el.textContent = target + suffix; return; }
    var start = null, dur = 1200;
    function tick(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function reveal(el) {
    el.classList.add('in');
    el.querySelectorAll('[data-count]').forEach(runCounter);
  }

  var targets = document.querySelectorAll('[data-reveal], .chain');
  if (!reduce && 'IntersectionObserver' in window) {
    root.classList.add('anim');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        reveal(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) reveal(el);
      else io.observe(el);
    });
  }

  /* ---------- 2. Schéma réseau du hero : parallaxe + paquets ---------- */

  var hero = document.querySelector('.hero');
  var net = document.querySelector('.hero-net');
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var routes = [
    [[120, 90], [220, 230], [400, 280], [590, 250], [720, 330]],
    [[60, 250], [140, 400], [330, 450], [520, 420], [680, 500]],
    [[300, 60], [470, 130], [400, 280], [520, 420], [680, 500]],
    [[650, 70], [590, 250], [400, 280], [220, 230], [60, 250]],
    [[120, 90], [300, 60], [470, 130], [650, 70]]
  ];
  var routeIndex = 0;

  function sendPacket() {
    if (!net) return;
    var route = routes[routeIndex++ % routes.length];
    var dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('r', '6');
    dot.setAttribute('class', 'packet');
    net.appendChild(dot);
    var segDur = reduce ? 0 : 380;
    var seg = 0, start = null;
    function step(t) {
      if (!start) start = t;
      var p = segDur ? Math.min((t - start) / segDur, 1) : 1;
      var a = route[seg], b = route[seg + 1];
      dot.setAttribute('cx', a[0] + (b[0] - a[0]) * p);
      dot.setAttribute('cy', a[1] + (b[1] - a[1]) * p);
      if (p >= 1) { seg++; start = null; }
      if (seg < route.length - 1) requestAnimationFrame(step);
      else setTimeout(function () { dot.remove(); }, 250);
    }
    requestAnimationFrame(step);
  }

  if (hero && net) {
    hero.addEventListener('click', function (e) {
      if (e.target.closest('a, button, .notes')) return;
      sendPacket();
    });
    if (!reduce) {
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        net.style.transform = 'translate(calc(-50% + ' + (x * -24) + 'px),' + (y * -16) + 'px)';
      });
      hero.addEventListener('pointerleave', function () { net.style.transform = ''; });
    }
  }

  /* ---------- 3. Compte à rebours des dates d'expiration ---------- */

  document.querySelectorAll('[data-date]').forEach(function (el) {
    var parts = el.getAttribute('data-date').split('-');
    var target = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var days = Math.round((target - today) / 86400000);
    var out = el.querySelector('.cd');
    if (!out) return;
    if (days > 1) out.textContent = 'dans ' + days + ' jours';
    else if (days === 1) out.textContent = 'demain';
    else if (days === 0) out.textContent = "aujourd'hui";
    else if (days === -1) out.textContent = 'expiré hier';
    else out.textContent = 'expiré depuis ' + (-days) + ' jours';
  });

  /* ---------- 4. Simulateur Secure Boot ---------- */

  var SCENARIOS = {
    ok: {
      steps: [['ok', '✓ Clé du fabricant valide'], ['ok', '✓ KEK 2023 installée'], ['ok', '✓ Listes à jour'], ['ok', '✓ Signé par Windows UEFI CA 2023'], ['ok', '✓ Démarrage sécurisé']],
      result: ['ok', 'Windows démarre, et le PC pourra recevoir les futures protections du démarrage.']
    },
    old: {
      steps: [['ok', '✓ Clé du fabricant valide'], ['warn', '! KEK 2011 expirée'], ['warn', '! Listes figées'], ['ok', '✓ Ancien gestionnaire accepté'], ['warn', '! Démarre, protection figée']],
      result: ['warn', 'Windows démarre toujours, mais le PC ne peut plus recevoir de nouvelles protections du démarrage.']
    },
    attack: {
      steps: [['ok', '✓ Clé du fabricant valide'], ['ok', '✓ KEK 2023 installée'], ['ok', '✓ Bootkit inscrit dans la DBX'], ['fail', '✗ Signature révoquée : bloqué'], ['skip', '– Non lancé']],
      result: ['ok', 'Démarrage bloqué : la liste noire (DBX) a arrêté le bootkit.']
    },
    attackOld: {
      steps: [['ok', '✓ Clé du fabricant valide'], ['warn', '! KEK 2011 expirée'], ['warn', '! DBX sans la nouvelle révocation'], ['fail', '✗ Bootkit accepté'], ['fail', '✗ Démarré mais compromis']],
      result: ['fail', 'Le bootkit passe : la liste noire n\'a pas pu être mise à jour sur ce PC.']
    },
    off: {
      steps: [['skip', '– Secure Boot désactivé'], ['skip', '– Non vérifié'], ['skip', '– Non vérifié'], ['skip', '– Non vérifié'], ['warn', '! Démarre sans aucun contrôle']],
      result: ['fail', 'Aucune vérification : n\'importe quel code peut se lancer avant Windows.']
    }
  };

  var chainEl = document.querySelector('.sim .chain');
  var sim = chainEl && chainEl.closest('.sim');
  if (sim) {
    var chips = sim.querySelectorAll('.chip');
    var steps = sim.querySelectorAll('.step');
    var result = sim.querySelector('.sim-result');
    var timers = [];
    var STATE_CLASSES = ['checking', 'st-ok', 'st-warn', 'st-fail', 'st-skip'];

    function clearSim() {
      timers.forEach(clearTimeout);
      timers = [];
      steps.forEach(function (s) {
        STATE_CLASSES.forEach(function (c) { s.classList.remove(c); });
        s.querySelector('.state').textContent = '';
      });
      result.className = 'sim-result';
    }

    function runScenario(key) {
      var scn = SCENARIOS[key];
      if (!scn) return;
      clearSim();
      result.textContent = 'Vérification en cours…';
      var gap = reduce ? 0 : 520;
      scn.steps.forEach(function (st, i) {
        timers.push(setTimeout(function () { steps[i].classList.add('checking'); }, i * gap));
        timers.push(setTimeout(function () {
          steps[i].classList.remove('checking');
          steps[i].classList.add('st-' + st[0]);
          steps[i].querySelector('.state').textContent = st[1];
        }, i * gap + gap * 0.6));
      });
      timers.push(setTimeout(function () {
        result.className = 'sim-result r-' + scn.result[0];
        result.textContent = scn.result[1];
      }, scn.steps.length * gap));
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
        runScenario(chip.getAttribute('data-scn'));
      });
    });
  }

  /* ---------- 4 bis. Démonstration de signature ---------- */

  var sigFile = document.querySelector('[data-sig-file]');
  if (sigFile) {
    var sigOp = document.querySelector('[data-sig-op]');
    var sigResult = document.querySelector('[data-sig-result]');
    var sigChips = document.querySelectorAll('[data-sig]');
    var ORIGINAL = '7A3F 91C2 0B5E 44D8';
    var TAMPERED = 'C91B 06E7 F2A4 9D30';
    var hashTimer = null;
    function scramble(final, done) {
      if (reduce) { sigFile.textContent = final; done(); return; }
      var chars = '0123456789ABCDEF', n = 0;
      clearInterval(hashTimer);
      hashTimer = setInterval(function () {
        n++;
        sigFile.textContent = final.replace(/[0-9A-F]/g, function () { return chars[Math.floor(Math.random() * 16)]; });
        if (n > 10) { clearInterval(hashTimer); sigFile.textContent = final; done(); }
      }, 50);
    }
    sigChips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var tamper = chip.getAttribute('data-sig') === 'tamper';
        sigChips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
        sigResult.className = 'sim-result';
        sigResult.textContent = 'Calcul de l\'empreinte…';
        sigFile.classList.remove('bad');
        sigOp.classList.remove('bad');
        sigOp.textContent = '?';
        scramble(tamper ? TAMPERED : ORIGINAL, function () {
          sigOp.textContent = tamper ? '≠' : '=';
          sigOp.classList.toggle('bad', tamper);
          sigFile.classList.toggle('bad', tamper);
          sigResult.className = 'sim-result ' + (tamper ? 'r-fail' : 'r-ok');
          sigResult.textContent = tamper
            ? 'Les empreintes sont différentes : le fichier a été modifié, le démarrage est refusé.'
            : 'Les deux empreintes sont identiques : le fichier est authentique, il peut démarrer.';
        });
      });
    });
  }

  /* ---------- 4 ter. Déroulé de la mise à jour ---------- */

  var updRun = document.querySelector('[data-upd-run]');
  if (updRun) {
    var updSteps = document.querySelectorAll('.upd-steps li');
    var updFill = document.querySelector('[data-upd-fill]');
    var updLabel = document.querySelector('[data-upd-label]');
    var UPD = [
      [10, 'Mise à jour installée'],
      [45, 'Certificats 2023 ajoutés'],
      [85, 'Redémarrage en cours'],
      [100, 'Terminé · BIOS à vérifier sur les PC anciens']
    ];
    var uTimers = [];
    updRun.addEventListener('click', function () {
      uTimers.forEach(clearTimeout);
      uTimers = [];
      updSteps.forEach(function (li) { li.classList.remove('active', 'done'); });
      updFill.style.width = '0';
      updLabel.textContent = 'Démarrage…';
      var gap = reduce ? 0 : 1100;
      UPD.forEach(function (u, i) {
        uTimers.push(setTimeout(function () {
          if (i > 0) { updSteps[i - 1].classList.remove('active'); updSteps[i - 1].classList.add('done'); }
          updSteps[i].classList.add('active');
          updFill.style.width = u[0] + '%';
          updLabel.textContent = u[1];
        }, i * gap + 100));
      });
      uTimers.push(setTimeout(function () {
        updSteps[updSteps.length - 1].classList.remove('active');
        updSteps[updSteps.length - 1].classList.add('done');
      }, UPD.length * gap + 100));
    });
  }

  /* ---------- 5. Bouton copier (commandes PowerShell) ---------- */

  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var code = document.getElementById(btn.getAttribute('data-copy'));
      if (!code) return;
      var text = code.textContent;
      function done(msg) { btn.textContent = msg; setTimeout(function () { btn.textContent = 'Copier'; }, 1600); }
      function fallback() {
        var range = document.createRange();
        range.selectNodeContents(code);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        done('Sélectionné');
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done('Copié'); }, fallback);
      } else {
        fallback();
      }
    });
  });

  /* ---------- 6. Simulation d'une alerte de veille ---------- */

  var alertBtn = document.querySelector('[data-alert-sim]');
  if (alertBtn) {
    var mSteps = document.querySelectorAll('[data-alert-steps] li');
    var log = document.querySelector('.log');
    var LOG = [
      '<b>08:00</b> · Google Alertes : nouvel article « Secure Boot : les certificats Microsoft expirent en juin 2026 »',
      '<b>08:05</b> · Article classé dans le dossier « Sécurité du poste » de Feedly',
      '<b>08:20</b> · Information confirmée par la page de support Microsoft ✓',
      '<b>Vendredi</b> · Fiche de synthèse : date, source, résumé, impact sur le parc'
    ];
    var aTimers = [];
    alertBtn.addEventListener('click', function () {
      aTimers.forEach(clearTimeout);
      aTimers = [];
      log.innerHTML = '';
      mSteps.forEach(function (li) { li.classList.remove('active', 'done'); });
      var gap = reduce ? 0 : 900;
      LOG.forEach(function (line, i) {
        aTimers.push(setTimeout(function () {
          if (i > 0) { mSteps[i - 1].classList.remove('active'); mSteps[i - 1].classList.add('done'); }
          mSteps[i].classList.add('active');
          var item = document.createElement('li');
          item.innerHTML = line;
          log.appendChild(item);
        }, i * gap));
      });
      aTimers.push(setTimeout(function () {
        mSteps[mSteps.length - 1].classList.remove('active');
        mSteps[mSteps.length - 1].classList.add('done');
      }, LOG.length * gap));
    });
  }

  /* ---------- 7. Barre de progression, en-tête, lien actif ---------- */

  var bar = document.querySelector('.progress');
  var header = document.querySelector('.site-header');
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
  var linkTargets = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });

  /* ---------- 8. Mode présentation ---------- */

  var SLIDES = [
    ['top', 'Accueil'], ['parcours', 'Parcours'], ['competences', 'Compétences'], ['projets', 'Projets'], ['passions', 'Passions'],
    ['veille', 'Veille'], ['veille-certificat', 'Certificat'], ['veille-fonctionnement', 'Chaîne de confiance'],
    ['veille-maj', 'Mise à jour'], ['veille-methode', 'Méthode'], ['veille-sources', 'Sources'],
    ['veille-bilan', 'Bilan'], ['contact', 'Fin'], ['questions', 'Questions du jury']
  ];
  var slideEls = SLIDES.map(function (s) { return document.getElementById(s[0]); });
  var toggle = document.querySelector('.present-toggle');
  var presenter = document.querySelector('.presenter');
  var pos = presenter && presenter.querySelector('.pos');
  var timerBtn = presenter && presenter.querySelector('.timer');
  var current = 0;
  var elapsed = 0, timerId = null;

  function fmt(s) { var m = Math.floor(s / 60), r = s % 60; return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r; }
  function startTimer() {
    if (timerId) return;
    timerId = setInterval(function () { elapsed++; timerBtn.textContent = fmt(elapsed); }, 1000);
    timerBtn.classList.add('running');
    timerBtn.setAttribute('aria-label', 'Mettre le chronomètre en pause');
  }
  function stopTimer() {
    clearInterval(timerId); timerId = null;
    timerBtn.classList.remove('running');
    timerBtn.setAttribute('aria-label', 'Reprendre le chronomètre');
  }

  var wipe = document.querySelector('.slide-wipe');
  var wipeNum = wipe && wipe.querySelector('.sw-num');
  var wipeName = wipe && wipe.querySelector('.sw-name');
  var midTimer = null;

  function jumpTo(el) {
    var prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    el.scrollIntoView({ block: 'start' });
    root.style.scrollBehavior = prev;
  }

  // Transition : rideau de couleur avec le numéro et le nom, puis la section glisse.
  // Avec « réduire les animations », le rideau apparaît en fondu au lieu de glisser.
  function transitionTo(idx) {
    var el = slideEls[idx];
    if (!el) return;
    if (!wipe) { jumpTo(el); return; }
    wipeNum.textContent = (idx + 1 < 10 ? '0' : '') + (idx + 1) + ' / ' + SLIDES.length;
    wipeName.textContent = SLIDES[idx][1];
    wipe.classList.remove('run');
    void wipe.offsetWidth;
    wipe.classList.add('run');
    clearTimeout(midTimer);
    midTimer = setTimeout(function () {
      jumpTo(el);
      el.classList.remove('slide-enter');
      void el.offsetWidth;
      el.classList.add('slide-enter');
    }, 420);
  }

  function goTo(i) {
    var next = Math.max(0, Math.min(SLIDES.length - 1, i));
    if (next === current && i !== current) return; // déjà au début ou à la fin
    current = next;
    updatePos();
    transitionTo(current);
  }

  // Les liens du menu et les boutons internes (#section) utilisent aussi la transition
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var idx = -1;
    SLIDES.forEach(function (s, i) { if (s[0] === id) idx = i; });
    if (idx < 0 || !slideEls[idx] || slideEls[idx].offsetParent === null) return;
    e.preventDefault();
    current = idx;
    updatePos();
    transitionTo(idx);
  });

  if (wipe) {
    wipe.addEventListener('animationend', function (e) {
      if (e.target === wipe) wipe.classList.remove('run');
    });
  }
  function updatePos() {
    if (pos) pos.textContent = (current + 1) + ' / ' + SLIDES.length + ' · ' + SLIDES[current][1];
  }
  function setPresent(on) {
    body.classList.toggle('present', on);
    presenter.hidden = !on;
    toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on) { elapsed = 0; timerBtn.textContent = '00:00'; startTimer(); syncCurrent(); updatePos(); }
    else { stopTimer(); toggle.focus(); }
  }
  function syncCurrent() {
    var idx = 0;
    slideEls.forEach(function (el, i) {
      if (el && el.offsetParent !== null && el.getBoundingClientRect().top < 160) idx = i;
    });
    current = idx;
  }

  if (toggle && presenter) {
    toggle.addEventListener('click', function () { setPresent(true); });
    presenter.querySelector('[data-prev]').addEventListener('click', function () { goTo(current - 1); });
    presenter.querySelector('[data-next]').addEventListener('click', function () { goTo(current + 1); });
    presenter.querySelector('[data-exit]').addEventListener('click', function () { setPresent(false); });
    timerBtn.addEventListener('click', function () { if (timerId) stopTimer(); else startTimer(); });
    document.addEventListener('keydown', function (e) {
      if (!body.classList.contains('present')) return;
      if (e.target.closest && e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); goTo(current + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goTo(current - 1); }
      else if (e.key === 'Escape') { setPresent(false); }
    });
  }

  var ticking = false;
  function onScroll() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (h > 0 ? window.scrollY / h : 0) + ')';
    header.classList.toggle('scrolled', window.scrollY > 10);
    var active = -1;
    linkTargets.forEach(function (s, i) { if (s && s.getBoundingClientRect().top < 140) active = i; });
    links.forEach(function (a, i) { a.classList.toggle('active', i === active); });
    if (body.classList.contains('present')) { syncCurrent(); updatePos(); }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();
})();
