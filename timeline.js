/* =============================================
   TIMELINE.JS — Chapter 3: Our Story
   =============================================

   ┌─────────────────────────────────────────┐
   │  ✏️  EDIT YOUR STORY HERE               │
   └─────────────────────────────────────────┘
   spotify: paste the embed src URL or leave null
*/

const TIMELINE_EVENTS = [
  {
    date:    "The Beginning",
    title:   "First Meet",
    desc:    "The universe quietly rearranged itself the moment our eyes met for the very first time.",
    icon:    "✨",
    spotify: null,
  },
  {
    date:    "A Few Days Later",
    title:   "First Chat",
    desc:    "One message. That's all it took to start something that would change everything.",
    icon:    "💬",
    spotify: null,
  },
  {
    date:    "The One",
    title:   "First Date",
    desc:    "Nervous hands, warm coffee, and the slow realisation that I never wanted the evening to end.",
    icon:    "☕",
    spotify: null,
  },
  {
    date:    "Three Words",
    title:   "First \u201cI Love You\u201d",
    desc:    "You said it first. I had been holding it in my heart for weeks, waiting for the courage.",
    icon:    "❤️",
    spotify: null,
  },
  {
    date:    "Always & Forever",
    title:   "Funny Memories",
    desc:    "The laughs we share are the ones I replay when the world gets too quiet. You are my favourite chaos.",
    icon:    "😂",
    spotify: null,
  },
  {
    date:    "Right Now",
    title:   "Today",
    desc:    "Every day I wake up grateful that all those small moments led me right here — to you.",
    icon:    "🌅",
    spotify: null,
  },
];

/* ============================================================
   ↓  Core — no need to edit below
   ============================================================ */
(function () {
  'use strict';

  /* ── Background starfield ── */
  let bgCanvas, bgCtx, bgW, bgH;
  const BG_STARS = [];

  function initBg() {
    bgCanvas = document.getElementById('bg-canvas');
    if (!bgCanvas) return;
    bgCtx = bgCanvas.getContext('2d');
    resizeBg();
    window.addEventListener('resize', resizeBg);
    for (let i = 0; i < 200; i++) {
      BG_STARS.push({
        x: Math.random(), y: Math.random(),
        r: Math.random() * 1.3 + 0.2,
        a: Math.random() * 0.55 + 0.1,
        ph: Math.random() * Math.PI * 2,
        sp: 0.25 + Math.random() * 0.5,
      });
    }
    requestAnimationFrame(tickBg);
  }

  function resizeBg() {
    bgW = bgCanvas.width  = window.innerWidth;
    bgH = bgCanvas.height = window.innerHeight;
  }

  function tickBg(ts) {
    requestAnimationFrame(tickBg);
    const t = ts * 0.001;
    bgCtx.clearRect(0, 0, bgW, bgH);
    for (const s of BG_STARS) {
      bgCtx.globalAlpha = s.a * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
      bgCtx.fillStyle = '#ffffff';
      bgCtx.beginPath();
      bgCtx.arc(s.x * bgW, s.y * bgH, s.r, 0, Math.PI * 2);
      bgCtx.fill();
    }
    bgCtx.globalAlpha = 1;
  }

  /* ── Build DOM events ── */
  function buildEvents() {
    const wrap = document.getElementById('events-wrap');
    if (!wrap) return;
    TIMELINE_EVENTS.forEach((ev, i) => {
      const side = i % 2 === 0 ? 'left' : 'right';
      const div  = document.createElement('div');
      div.className = `tl-event ${side}`;

      const spotifyHTML = ev.spotify
        ? `<div class="tl-spotify"><iframe style="border-radius:4px"
            src="${ev.spotify}" width="100%" height="80" frameBorder="0"
            allowfullscreen allow="autoplay;clipboard-write;encrypted-media;fullscreen;picture-in-picture"
            loading="lazy"></iframe></div>`
        : '';

      div.innerHTML = `
        <div class="tl-dot"></div>
        <div class="tl-card">
          <p class="tl-date">${ev.date}</p>
          <h3 class="tl-title">${ev.title}</h3>
          <p class="tl-desc">${ev.desc}</p>
          ${spotifyHTML}
          <span class="tl-icon">${ev.icon}</span>
        </div>`;
      wrap.appendChild(div);
    });
  }

  /* ── Scroll reveal ── */
  let spineFill, evEls;

  function onScroll() {
    const scrollTop = window.scrollY;
    const docH      = document.documentElement.scrollHeight - window.innerHeight;
    if (spineFill && docH > 0) {
      spineFill.style.height = Math.min(scrollTop / docH, 1) * 100 + '%';
    }
    for (const el of evEls) {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.85) el.classList.add('visible');
    }
    moveAirplane(scrollTop, docH);
  }

  /* ═══════════════════════════════════════════
     PAPER AIRPLANE — card-by-card hopper
     + floating heart trail
     ═══════════════════════════════════════════ */
  let airplaneWrap, bgCanvas2d;

  // Plane state
  let planeX = 0, planeY = 0;       // current rendered position
  let planeAngle = 0;
  let planeVisible = false;

  // Waypoints = dot centres in viewport space (refreshed on scroll)
  let waypoints = [];
  let lastCardIdx = -1;              // which card the plane is parked at

  // Hearts spawned along the trail
  const hearts = [];

  /* Collect dot viewport positions */
  function collectWaypoints() {
    waypoints = evEls.map(el => {
      const dot  = el.querySelector('.tl-dot');
      const rect = dot.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
  }

  /* Spawn a floating heart at position */
  function spawnHeart(x, y) {
    hearts.push({
      x, y,
      vx: (Math.random() - 0.5) * 1.4,
      vy: -(0.6 + Math.random() * 1.0),
      size: 8 + Math.random() * 10,
      alpha: 0.7 + Math.random() * 0.3,
      life: 1.0,
      decay: 0.008 + Math.random() * 0.006,
      color: ['#f48fb1','#e0365a','#fce4ec','#ff6b8a'][Math.floor(Math.random() * 4)],
      rot: (Math.random() - 0.5) * 0.6,
    });
  }

  /* Draw a heart shape on ctx centered at (cx,cy) with given size */
  function drawHeart2d(ctx, cx, cy, size, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.translate(cx, cy);
    const s = size * 0.045;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.3);
    ctx.bezierCurveTo( size*0.5, -size*0.9,  size*1.1,  size*0.1, 0,  size*0.7);
    ctx.bezierCurveTo(-size*1.1,  size*0.1, -size*0.5, -size*0.9, 0, -size*0.3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* Overlay canvas for hearts (fixed, full-screen, above everything) */
  function initHeartCanvas() {
    bgCanvas2d = document.createElement('canvas');
    bgCanvas2d.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:25;';
    bgCanvas2d.width  = window.innerWidth;
    bgCanvas2d.height = window.innerHeight;
    document.body.appendChild(bgCanvas2d);
    window.addEventListener('resize', () => {
      bgCanvas2d.width  = window.innerWidth;
      bgCanvas2d.height = window.innerHeight;
    });
  }

  /* Tail offset in the plane's local space (SVG tail is at ~30,38 in 64×64, center is 32,32) */
  function tailPos() {
    // tail local offset: x=-2, y=+6 (in 52px rendered size, scale = 52/64 ≈ 0.81)
    const sc  = 0.81;
    const lx  = -2 * sc, ly = 6 * sc;
    const rad = planeAngle * Math.PI / 180;
    return {
      x: planeX + lx * Math.cos(rad) - ly * Math.sin(rad),
      y: planeY + lx * Math.sin(rad) + ly * Math.cos(rad),
    };
  }

  /* Main animation loop — runs every frame */
  let heartSpawnTimer = 0;
  function animatePlane(ts) {
    requestAnimationFrame(animatePlane);
    const ctx2 = bgCanvas2d?.getContext('2d');
    if (!ctx2) return;
    ctx2.clearRect(0, 0, bgCanvas2d.width, bgCanvas2d.height);

    // Update + draw floating hearts
    for (let i = hearts.length - 1; i >= 0; i--) {
      const h = hearts[i];
      h.x    += h.vx;
      h.y    += h.vy;
      h.life -= h.decay;
      h.alpha = h.life * 0.85;
      if (h.life <= 0) { hearts.splice(i, 1); continue; }
      ctx2.save();
      ctx2.translate(h.x, h.y);
      ctx2.rotate(h.rot);
      ctx2.translate(-h.x, -h.y);
      drawHeart2d(ctx2, h.x, h.y, h.size, h.color, h.alpha);
      ctx2.restore();
    }

    if (!airplaneWrap || !planeVisible) return;

    // Spawn hearts from the TAIL position
    heartSpawnTimer++;
    if (heartSpawnTimer % 4 === 0) {
      const t = tailPos();
      spawnHeart(t.x, t.y);
    }

    // Draw the airplane
    airplaneWrap.style.transform = `translate(${planeX}px, ${planeY}px) rotate(${planeAngle}deg)`;
    airplaneWrap.style.opacity   = '1';
  }

  /* Called every scroll — figure out which card we're at and lerp there */
  let lerpRaf = null;
  function moveAirplane(scrollTop, docH) {
    collectWaypoints();
    if (!waypoints.length || !airplaneWrap) return;

    // Which card is closest to the 40% line of the viewport?
    const targetLine = window.innerHeight * 0.40;
    let   bestIdx    = 0;
    let   bestDist   = Infinity;
    for (let i = 0; i < waypoints.length; i++) {
      const d = Math.abs(waypoints[i].y - targetLine);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }

    // Only fly when within reasonable distance (card is visible-ish)
    const wp = waypoints[bestIdx];
    const inRange = wp.y > -200 && wp.y < window.innerHeight + 200;
    if (!inRange) { planeVisible = false; return; }
    planeVisible = true;

    const targetX = wp.x;
    const targetY = wp.y;

    // If we've arrived at a new card, start a lerp flight
    if (bestIdx !== lastCardIdx) {
      lastCardIdx = bestIdx;
      flyTo(targetX, targetY);
    }
  }

  function flyTo(tx, ty) {
    if (lerpRaf) cancelAnimationFrame(lerpRaf);
    // Burst of hearts at departure tail
    for (let i = 0; i < 6; i++) {
      setTimeout(() => { const t = tailPos(); spawnHeart(t.x, t.y); }, i * 40);
    }

    function step() {
      const dx = tx - planeX, dy = ty - planeY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1.5) { planeX = tx; planeY = ty; lerpRaf = null; return; }
      planeAngle = Math.atan2(dy, dx) * 180 / Math.PI;
      planeX += dx * 0.07;
      planeY += dy * 0.07;
      // Spray hearts from tail while flying
      if (Math.random() < 0.35) { const t = tailPos(); spawnHeart(t.x, t.y); }
      lerpRaf = requestAnimationFrame(step);
    }
    lerpRaf = requestAnimationFrame(step);
  }

  /* ── Init ── */
  function init() {
    buildEvents();
    initBg();
    initHeartCanvas();

    spineFill    = document.getElementById('spine-fill');
    airplaneWrap = document.getElementById('airplane-wrap');
    evEls        = Array.from(document.querySelectorAll('.tl-event'));

    // Seed plane position at first dot after layout settles
    requestAnimationFrame(() => requestAnimationFrame(() => {
      collectWaypoints();
      if (waypoints.length) { planeX = waypoints[0].x; planeY = waypoints[0].y; }
      onScroll();
      requestAnimationFrame(animatePlane);
    }));

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { collectWaypoints(); onScroll(); });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
