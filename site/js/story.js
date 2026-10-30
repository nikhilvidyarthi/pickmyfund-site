/* PickMyFund story animations.
   Usage: <div class="story" data-anim="stocks|spx|funds|algo" role="img" aria-label="..."></div>
   Draws on a canvas, loops while on screen, and shows one still frame when the visitor prefers reduced motion. */
(function () {
  const C = { bg: '#0F1F22', tile: '#1A2B2E', edge: '#26393C', line: '#1F3033', gold: '#C9A44C', goldS: '#E6C77A',
    fg: '#FAFAF7', mut: '#B7C2C3', dim: '#94A3A6', blue: '#4E9BD6', green: '#4FB59A', red: '#E0796B', ink: '#0A1517' };
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const pr = (t, a, b) => cl((t - a) / (b - a));
  const eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const eo = x => 1 - Math.pow(1 - x, 3);
  const L = (a, b, k) => a + (b - a) * k;
  const hex = h => h[0] === '#' ? [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) : h.match(/\d+/g).slice(0, 3).map(Number);
  const mix = (a, b, k) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`; };
  const rng = s => () => (s = (s * 16807) % 2147483647, (s - 1) / 2147483646);
  const band = (t, a, b, f = .3) => pr(t, a, a + f) * (1 - pr(t, b - f, b));

  function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  function T(c, s, x, y, o = {}) {
    const { size = 14, w = 600, col = C.fg, al = 'left', a = 1, ls = 0 } = o;
    if (a <= 0) return;
    c.globalAlpha = a; c.fillStyle = col; c.font = `${w} ${size}px Inter, system-ui, -apple-system, sans-serif`;
    c.textAlign = al; c.textBaseline = 'middle';
    if ('letterSpacing' in c) c.letterSpacing = ls + 'px';
    c.fillText(s, x, y);
    if ('letterSpacing' in c) c.letterSpacing = '0px';
    c.globalAlpha = 1;
  }
  function chip(c, s, x, y, a, col = C.gold) {
    if (a <= 0) return;
    c.font = `700 11px Inter, system-ui, sans-serif`; if ('letterSpacing' in c) c.letterSpacing = '1.5px';
    const w = c.measureText(s).width + 26; if ('letterSpacing' in c) c.letterSpacing = '0px';
    c.globalAlpha = a; rr(c, x, y - 13, w, 26, 13); c.fillStyle = 'rgba(201,164,76,.12)'; c.fill();
    c.strokeStyle = col; c.lineWidth = 1; c.stroke(); c.globalAlpha = 1;
    T(c, s, x + 13, y + 1, { size: 11, w: 700, col, a, ls: 1.5 });
  }
  function caption(c, S, t, list) {
    const size = S.port ? 15 : 16;
    for (const [a, b, s] of list) {
      const k = band(t, a, b); if (k <= 0) continue;
      const y = S.h - 22 + (1 - eo(k)) * 6, o = { size, w: 600, col: C.fg, al: 'center', a: k };
      c.font = `600 ${size}px Inter, system-ui, sans-serif`;
      if (c.measureText(s).width <= S.w - 28) { T(c, s, S.w / 2, y, o); continue; }
      const words = s.split(' '); let best = 1, bd = 1e9;
      for (let i = 1; i < words.length; i++) { const d = Math.abs(c.measureText(words.slice(0, i).join(' ')).width - c.measureText(words.slice(i).join(' ')).width); if (d < bd) { bd = d; best = i; } }
      T(c, words.slice(0, best).join(' '), S.w / 2, y - 11, o); T(c, words.slice(best).join(' '), S.w / 2, y + 10, o);
    }
  }

  /* ---------------- calendar (Friday) ---------------- */
  function friCal(c, S, t, vis, dateLabel) {
    if (vis <= 0) return;
    const p = S.port, cw = p ? 46 : 52, ch = p ? 40 : 36, W = cw * 7, x0 = (S.w - W) / 2, yT = p ? 76 : 62;
    c.save(); c.globalAlpha = vis;
    const sc = L(.94, 1, vis); c.translate(S.w / 2, S.h / 2); c.scale(sc, sc); c.translate(-S.w / 2, -S.h / 2);
    T(c, 'OCTOBER 2026', S.w / 2, yT, { size: 13, w: 700, col: C.gold, al: 'center', ls: 3, a: vis });
    const yH = yT + 34, yD = yH + 30;
    // Friday column
    const fk = eo(pr(t, .9, 1.4));
    if (fk > 0) { rr(c, x0 + 4 * cw + 3, yH - 16, cw - 6, (yD - yH) + 5 * ch + 6, 10); c.fillStyle = `rgba(201,164,76,${.16 * fk})`; c.fill(); }
    'MTWTFSS'.split('').forEach((d, i) => T(c, d, x0 + i * cw + cw / 2, yH, { size: 12, w: 700, col: i === 4 ? C.gold : C.dim, al: 'center', a: vis }));
    for (let d = 1; d <= 31; d++) {
      const idx = 3 + d - 1, col = idx % 7, row = Math.floor(idx / 7), a = pr(t, .05 + d * .018, .35 + d * .018) * vis;
      const x = x0 + col * cw + cw / 2, y = yD + row * ch;
      if (d === 30) {
        const k = eo(pr(t, 1.5, 1.9));
        if (k > 0) { c.globalAlpha = vis; c.beginPath(); c.arc(x, y, 15 * k, 0, 7); c.fillStyle = C.gold; c.fill();
          const ring = pr(t, 1.9, 2.5); if (ring > 0 && ring < 1) { c.beginPath(); c.arc(x, y, 15 + ring * 14, 0, 7); c.strokeStyle = `rgba(201,164,76,${1 - ring})`; c.lineWidth = 2; c.stroke(); } }
        T(c, String(d), x, y + 1, { size: 14, w: 700, col: k > .5 ? C.ink : C.fg, al: 'center', a });
      } else T(c, String(d), x, y + 1, { size: 14, w: 500, col: col === 4 ? C.goldS : (col > 4 ? C.dim : C.mut), al: 'center', a });
    }
    T(c, dateLabel, S.w / 2, yD + 5 * ch + (p ? 26 : 16), { size: p ? 15 : 16, w: 600, col: C.fg, al: 'center', a: pr(t, 1.6, 2.0) * vis });
    c.restore();
  }

  /* ---------------- stocks / SPX screen ---------------- */
  function screen(S, o) {
    const R = rng(o.seed), N = o.n, p = S.port;
    const cols = p ? o.colsP : o.colsL, rows = Math.ceil(N / cols);
    const top = p ? 74 : 60, left = 20, gw = S.w - left * 2, gh = S.h - top - (p ? 64 : 54);
    const cell = Math.min(gw / cols, gh / rows), ts = cell * .74, ox = left + (gw - cell * cols) / 2, oy = top + (gh - cell * rows) / 2;
    const st = Array.from({ length: N }, () => Math.pow(R(), 1.5)), dl = st.map(() => R());
    const order = [...st.keys()].sort((a, b) => st[b] - st[a]), rank = []; order.forEach((i, r) => rank[i] = r);
    const pos = i => [ox + (i % cols) * cell + cell / 2, oy + Math.floor(i / cols) * cell + cell / 2];
    const fs = p ? 46 : 42, fg = p ? 10 : 10, fw = 5 * fs + 4 * fg, fh = 4 * fs + 3 * fg, fx = (S.w - fw) / 2, fy = top + (gh - fh) / 2 + 12;
    const TT = 12;
    return { T: TT, still: 10.6, draw(c, t) {
      friCal(c, S, t, 1 - eio(pr(t, 2.3, 3.0)), o.calLine);
      chip(c, o.chip, left, p ? 30 : 28, pr(t, 2.6, 3.1));
      if (t > 2.8) {
        const scanX = L(ox - 30, ox + cols * cell + 30, eio(pr(t, 3.9, 5.7)));
        const h = pr(t, 7.7, 8.3), f0 = 8.7;
        const card = eo(pr(t, 8.5, 9.0));
        // draw non-winners first, winners on top
        for (let pass = 0; pass < 2; pass++) for (let i = 0; i < N; i++) {
          const win = rank[i] < 20; if ((pass === 1) !== win) continue;
          const ap = pr(t, 2.9 + dl[i] * .8, 3.2 + dl[i] * .8); if (ap <= 0) continue;
          const m = eio(pr(t, 6.0 + dl[i] * .5, 7.0 + dl[i] * .5));
          const [ax, ay] = pos(i), [bx, by] = pos(rank[i]);
          let x = L(ax, bx, m), y = L(ay, by, m), s = ts, a = ap;
          const scanned = ax < scanX;
          let col = scanned ? mix(C.tile, st[i] > .55 ? C.gold : C.blue, .25 + .75 * st[i]) : C.tile;
          if (win) { col = mix(col, C.gold, h); }
          else a *= L(1, .2, h) * L(1, .45, card);
          if (win) {
            const f = eio(pr(t, f0 + rank[i] * .025, f0 + .7 + rank[i] * .025));
            const r = rank[i], tx = fx + (r % 5) * (fs + fg) + fs / 2, ty = fy + Math.floor(r / 5) * (fs + fg) + fs / 2;
            x = L(x, tx, f); y = L(y, ty, f); s = L(ts, fs, f);
            if (h > 0 && f < .05) { c.globalAlpha = .35 * h; c.fillStyle = C.gold; c.beginPath(); c.arc(x, y, ts * 1.1, 0, 7); c.fill(); }
            c.globalAlpha = a; rr(c, x - s / 2, y - s / 2, s, s, Math.max(2, s * .18)); c.fillStyle = col; c.fill();
            if (f > .6) T(c, '#' + (r + 1), x, y + 1, { size: 13, w: 700, col: C.ink, al: 'center', a: pr(f, .6, 1) });
          } else {
            c.globalAlpha = a; c.fillStyle = col; c.fillRect(x - s / 2, y - s / 2, s, s);
          }
        }
        c.globalAlpha = 1;
        if (t > 3.9 && t < 5.9) { c.globalAlpha = .9 * band(t, 3.9, 5.9, .2); c.fillStyle = C.goldS; c.fillRect(scanX - 1, oy - 6, 2, rows * cell + 12); c.globalAlpha = 1; }
        if (card > 0) T(c, o.final, S.w / 2, fy - 22, { size: 15, w: 700, col: C.gold, al: 'center', a: card, ls: 1 });
      }
      caption(c, S, t, [[3.0, 3.95, o.universe], [3.95, 6.0, 'One test of strength, the same for every stock'], [6.0, 7.7, 'Ranked, strongest to weakest'],
        [7.7, 8.7, o.cut], [8.7, TT + .3, o.after]]);
    } };
  }

  /* ---------------- Select 5 fund screen ---------------- */
  function funds(S) {
    const R = rng(5), p = S.port;
    const G = [{ n: 'SECTORS', k: 30, c: 6, pool: 's' }, { n: 'GOLD', k: 6, c: 2, pool: 's' }, { n: 'SILVER', k: 5, c: 2, pool: 's' },
      { n: 'OVERSEAS', k: 14, c: p ? 4 : 3, pool: 'o' }, { n: 'CORE', k: 28, c: p ? 6 : 5, pool: 'c' }];
    const hue = { s: C.gold, o: C.blue, c: C.green }, cell = 28, ts = 21;
    const tiles = [];
    // layout
    const place = (gs, y0, gap) => { const totalC = gs.reduce((a, g) => a + g.c, 0), W = totalC * cell + (gs.length - 1) * gap; let x = (S.w - W) / 2;
      gs.forEach(g => { g.x = x; g.y = y0; x += g.c * cell + gap; }); };
    if (p) { place(G.slice(0, 3), 122, 22); place(G.slice(3), 300, 22); } else place(G, 118, 26);
    G.forEach((g, gi) => { for (let i = 0; i < g.k; i++) tiles.push({ g, gi, x: g.x + (i % g.c) * cell + cell / 2, y: g.y + Math.floor(i / g.c) * cell + cell / 2, s: R() * .8, d: R() }); });
    // winners: strength pool top 2 (one gold, one sector), overseas 1, core 2
    const pick = (f, v) => { const tl = tiles.filter(f); const tt = tl[Math.floor(R() * tl.length)]; tt.s = v; return tt; };
    const W = [pick(x => x.g.n === 'GOLD', 1), pick(x => x.g.n === 'SECTORS', .97), pick(x => x.g.pool === 'o', .96), pick(x => x.g.pool === 'c', .95)];
    W.push(pick(x => x.g.pool === 'c' && x !== W[3], .93));
    const lab = ['Strength', 'Strength', 'Overseas', 'Core', 'Core'], wk = [0, 0, 1, 2, 2];
    W.forEach((w, i) => { w.win = i; });
    const cs = p ? 62 : 86, cg = p ? 9 : 16, cw = 5 * cs + 4 * cg, cx0 = (S.w - cw) / 2, cy = p ? 268 : 214;
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const TT = 12.5;
    return { T: TT, still: 11.2, draw(c, t) {
      // ---- year calendar
      const vis = 1 - eio(pr(t, 2.5, 3.1));
      if (vis > 0) {
        c.save(); c.globalAlpha = vis;
        const pw = p ? 56 : 48, ph = p ? 46 : 44, g = p ? 8 : 6, per = p ? 6 : 12, W0 = per * pw + (per - 1) * g, x0 = (S.w - W0) / 2, y0 = p ? 150 : 172;
        T(c, 'THE SELECT 5 YEAR', S.w / 2, p ? 92 : 120, { size: 13, w: 700, col: C.gold, al: 'center', ls: 3, a: vis });
        months.forEach((m, i) => {
          const x = x0 + (i % per) * (pw + g), y = y0 + Math.floor(i / per) * (ph + 14), a = pr(t, .05 + i * .04, .35 + i * .04) * vis;
          const q = i % 3 === 0, qk = q ? eo(pr(t, 1.25 + i * .03, 1.6 + i * .03)) : 0;
          c.globalAlpha = a; rr(c, x, y, pw, ph, 10); c.fillStyle = qk > 0 ? mix(C.tile, C.gold, qk) : C.tile; c.fill();
          T(c, m, x + pw / 2, y + ph / 2 - 4, { size: 12, w: 700, col: qk > .5 ? C.ink : C.mut, al: 'center', a });
          const dk = pr(t, .45 + i * .05, .7 + i * .05); c.globalAlpha = a * dk; c.beginPath(); c.arc(x + pw / 2, y + ph - 9, 3, 0, 7); c.fillStyle = qk > .5 ? C.ink : C.dim; c.fill();
          if (i === 9) { const r = pr(t, 1.9, 2.5); if (r > 0 && r < 1) { c.globalAlpha = (1 - r) * vis; rr(c, x - r * 8, y - r * 8, pw + r * 16, ph + r * 16, 12); c.strokeStyle = C.gold; c.lineWidth = 2; c.stroke(); } }
        });
        c.globalAlpha = 1;
        const yc = y0 + (p ? 2 : 1) * (ph + 14) + 18;
        T(c, '•  Signals checked at every month end', S.w / 2, yc, { size: 14, w: 500, col: C.mut, al: 'center', a: pr(t, .5, .9) * vis });
        T(c, 'Funds change only at the quarterly review', S.w / 2, yc + 26, { size: 15, w: 700, col: C.gold, al: 'center', a: pr(t, 1.4, 1.8) * vis });
        c.restore();
      }
      chip(c, 'QUARTERLY REVIEW · OCTOBER', 20, p ? 30 : 28, pr(t, 2.8, 3.3));
      if (t > 3.0) {
        const scanX = L(-20, S.w + 20, eio(pr(t, 3.9, 5.6)));
        const final = eo(pr(t, 8.4, 9.0));
        G.forEach(g => T(c, g.n, g.x, g.y - 16, { size: 11, w: 700, col: g.pool === 's' ? C.goldS : g.pool === 'o' ? C.blue : C.green, ls: 1.5, a: pr(t, 3.0, 3.5) * L(1, .3, final) }));
        const hs = [pr(t, 5.8, 6.3), pr(t, 6.7, 7.2), pr(t, 7.5, 8.0)];
        for (let pass = 0; pass < 2; pass++) for (const q of tiles) {
          const isW = q.win != null; if ((pass === 1) !== isW) continue;
          const ap = pr(t, 3.0 + q.d * .7, 3.3 + q.d * .7); if (ap <= 0) continue;
          const pool = q.g.pool, ph = hs[pool === 's' ? 0 : pool === 'o' ? 1 : 2];
          let col = q.x < scanX ? mix(C.tile, hue[pool], .2 + .8 * q.s) : C.tile, a = ap, x = q.x, y = q.y, s = ts;
          if (isW) {
            col = mix(col, hue[pool], ph);
            const f = eio(pr(t, 8.6 + q.win * .1, 9.4 + q.win * .1));
            const tx = cx0 + q.win * (cs + cg) + cs / 2, ty = cy;
            x = L(x, tx, f); y = L(y, ty, f); s = L(ts, cs, f);
            if (ph > 0 && f < .05) { c.globalAlpha = .35 * ph; c.fillStyle = hue[pool]; c.beginPath(); c.arc(x, y, ts, 0, 7); c.fill(); }
            c.globalAlpha = a; rr(c, x - s / 2, y - s / 2, s, s, L(4, 14, f)); c.fillStyle = col; c.fill();
            if (f > .6) {
              const k = pr(f, .6, 1);
              T(c, '20%', x, y - (p ? 6 : 10), { size: p ? 15 : 20, w: 800, col: C.ink, al: 'center', a: k });
              T(c, lab[q.win], x, y + (p ? 14 : 18), { size: p ? 10 : 12, w: 700, col: C.ink, al: 'center', a: k });
            }
          } else {
            a *= L(1, .3, ph) * L(1, .25, final);
            c.globalAlpha = a; rr(c, x - s / 2, y - s / 2, s, s, 4); c.fillStyle = col; c.fill();
          }
        }
        c.globalAlpha = 1;
        if (t > 3.9 && t < 5.8) { c.globalAlpha = .9 * band(t, 3.9, 5.8, .2); c.fillStyle = C.goldS; c.fillRect(scanX - 1, (p ? 100 : 96), 2, (p ? 360 : 200)); c.globalAlpha = 1; }
        if (final > 0) T(c, 'SELECT 5 · RESET TO 20% EACH QUARTER', S.w / 2, cy - cs / 2 - 26, { size: 13, w: 700, col: C.gold, al: 'center', ls: 1.5, a: final });
      }
      caption(c, S, t, [[3.0, 3.9, 'Every eligible fund, grouped'], [3.9, 5.8, 'Ranked on the same yardstick'], [5.8, 6.7, 'Sectors, gold and silver compete: top 2 win'],
        [6.7, 7.5, 'Strongest overseas market: 1 fund'], [7.5, 8.5, 'Steadiest core funds: 2'], [8.5, TT + .3, 'Five funds, one per fund house']]);
    } };
  }

  /* ---------------- Arbitrage + algo: second income ---------------- */
  function algo(S) {
    const p = S.port, R = rng(9);
    const B = p ? { cap: [20, 40, 360, 70], arb: [20, 134, 360, 158], alg: [20, 352, 360, 112], ch: [36, 508, 330, 74] }
      : { cap: [16, 70, 112, 172], arb: [148, 70, 236, 172], alg: [490, 70, 174, 172], ch: [40, 290, 600, 96] };
    const box = (c, b, a, title, sub, badge, col = C.gold) => {
      if (a <= 0) return; const [x, y, w, h] = b;
      c.globalAlpha = a; rr(c, x, y, w, h, 16); c.fillStyle = '#132629'; c.fill(); c.strokeStyle = C.edge; c.lineWidth = 1; c.stroke(); c.globalAlpha = 1;
      T(c, title, x + 14, y + 20, { size: 14, w: 700, col: C.fg, a });
      if (sub) T(c, sub, x + 14, y + 38, { size: 11, w: 500, col: C.dim, a });
      if (badge) { const bw = 62; c.globalAlpha = a; rr(c, x + w - bw - 10, y + 10, bw, 20, 10); c.fillStyle = col; c.fill(); c.globalAlpha = 1;
        T(c, badge, x + w - bw / 2 - 10, y + 21, { size: 10, w: 800, col: C.ink, al: 'center', a, ls: 1 }); }
    };
    // capital bars: start in capital box, end in a row at the bottom of the arbitrage box
    const nb = 7, bars = [];
    for (let i = 0; i < nb; i++) {
      const [cx, cy, cw, chh] = B.cap, [ax, ay, aw, ah] = B.arb;
      const from = p ? [cx + 120 + i * 30, cy + chh / 2 + 6, 22, 30] : [cx + 22, cy + chh - 22 - i * 14, cw - 44, 10];
      const to = [ax + 14 + i * 26, ay + ah - 20, 20, 10];
      bars.push({ from, to });
    }
    // arbitrage mini chart (cash and futures converge at expiry)
    const npt = 40, fut = [], cash = [];
    let a1 = .2, a2 = .78;
    for (let i = 0; i < npt; i++) { const k = i / (npt - 1), conv = 1 - k; const w1 = (R() - .5) * .08 * conv, w2 = (R() - .5) * .08 * conv;
      a1 = .5 - .3 * conv + w1; a2 = .5 + .18 * conv + w2; fut.push(a1); cash.push(a2); }
    // income layers
    const NP = 60, base = [], alg = []; let accA = 0;
    for (let i = 0; i < NP; i++) { base.push(i / (NP - 1)); const step = .9 + (R() - .5) * 3.2 + (i > 30 && i < 36 ? -2.6 : 0); accA += step; alg.push(accA); }
    const mx = Math.max(...alg); const algN = alg.map(v => Math.max(-.08, v / mx));
    const TT = 14;
    return { T: TT, still: 12.6, draw(c, t) {
      const capA = pr(t, .1, .6);
      box(c, B.cap, capA * L(1, .55, pr(t, 2.6, 3.2)), 'Your capital', p ? 'For example, a company’s treasury surplus' : 'Treasury surplus');
      const arbA = pr(t, 1.0, 1.5);
      box(c, B.arb, arbA, 'Arbitrage fund', 'Buy in cash, sell in futures', pr(t, 4.3, 4.6) > 0 ? 'LAYER 1' : '', C.gold);
      // bars
      for (let i = 0; i < nb; i++) {
        const k = eio(pr(t, 1.4 + i * .12, 2.4 + i * .12)), f = bars[i].from, to = bars[i].to;
        const x = L(f[0], to[0], k), y = L(f[1], to[1], k), w = L(f[2], to[2], k), h = L(f[3], to[3], k);
        c.globalAlpha = capA; rr(c, x, y, w, h, 3); c.fillStyle = mix(C.gold, C.goldS, i / nb); c.fill(); c.globalAlpha = 1;
      }
      // mini chart inside arbitrage box
      if (arbA > 0) {
        const [x, y, w, h] = B.arb, gx = x + 16, gy = y + 66, gw = w - 32, gh = h - 108;
        const rv = eio(pr(t, 2.3, 4.2)), n = Math.max(2, Math.round(rv * (npt - 1)) + 1);
        const P = (arr, i) => [gx + i / (npt - 1) * gw, gy + arr[i] * gh];
        if (rv > 0) {
          c.globalAlpha = .18 * arbA; c.beginPath(); for (let i = 0; i < n; i++) { const [px, py] = P(fut, i); i ? c.lineTo(px, py) : c.moveTo(px, py); }
          for (let i = n - 1; i >= 0; i--) { const [px, py] = P(cash, i); c.lineTo(px, py); } c.closePath(); c.fillStyle = C.gold; c.fill(); c.globalAlpha = arbA;
          [[fut, C.blue], [cash, C.goldS]].forEach(([arr, col]) => { c.beginPath(); for (let i = 0; i < n; i++) { const [px, py] = P(arr, i); i ? c.lineTo(px, py) : c.moveTo(px, py); } c.strokeStyle = col; c.lineWidth = 2; c.stroke(); });
          c.globalAlpha = 1;
          T(c, 'Futures', gx, gy - 6, { size: 10, w: 600, col: C.blue, a: arbA * pr(t, 2.4, 2.8) });
          T(c, 'Cash', gx, gy + gh + 8, { size: 10, w: 600, col: C.goldS, a: arbA * pr(t, 2.4, 2.8) });
          T(c, 'Expiry: prices meet', gx + gw, gy + gh / 2 + (p ? -18 : -20), { size: 10, w: 600, col: C.mut, al: 'right', a: arbA * pr(t, 3.9, 4.3) });
          T(c, 'The gap is the return', gx + gw * .35, gy + gh * .5, { size: 11, w: 700, col: C.fg, al: 'center', a: arbA * pr(t, 3.2, 3.6) });
        }
      }
      // pledge arrow
      const arw = eio(pr(t, 4.6, 5.6));
      if (arw > 0) {
        const [ax, ay, aw, ah] = B.arb, [lx, ly, lw, lh] = B.alg;
        const sx = p ? ax + aw / 2 : ax + aw, sy = p ? ay + ah : ay + ah / 2, ex = p ? lx + lw / 2 : lx, ey = p ? ly : ly + lh / 2;
        const cx = L(sx, ex, arw), cy = L(sy, ey, arw);
        c.strokeStyle = C.gold; c.lineWidth = 2; c.setLineDash([5, 5]); c.beginPath(); c.moveTo(sx, sy); c.lineTo(cx, cy); c.stroke(); c.setLineDash([]);
        if (arw > .98) { c.fillStyle = C.gold; c.beginPath(); if (p) { c.moveTo(ex - 6, ey - 9); c.lineTo(ex + 6, ey - 9); c.lineTo(ex, ey - 1); } else { c.moveTo(ex - 9, ey - 6); c.lineTo(ex - 9, ey + 6); c.lineTo(ex - 1, ey); } c.fill(); }
        // lock
        const lk = pr(t, 4.6, 5.0) * (1 - pr(t, 13.4, 13.8));
        const lx2 = L(sx, ex, eio(pr(t, 4.8, 5.8))), ly2 = L(sy, ey, eio(pr(t, 4.8, 5.8)));
        c.globalAlpha = lk; c.fillStyle = C.gold; rr(c, lx2 - 8, ly2 - 4, 16, 12, 3); c.fill();
        c.strokeStyle = C.gold; c.lineWidth = 2; c.beginPath(); c.arc(lx2, ly2 - 4, 5, Math.PI, 0); c.stroke(); c.globalAlpha = 1;
        const lbA = pr(t, 5.0, 5.4);
        if (p) { T(c, 'Units pledged as margin', sx + 22, (sy + ey) / 2 + 1, { size: 12, w: 600, col: C.goldS, a: lbA }); }
        else { T(c, 'Units pledged', (sx + ex) / 2, sy - 34, { size: 11, w: 600, col: C.goldS, al: 'center', a: lbA }); T(c, 'as margin', (sx + ex) / 2, sy - 20, { size: 11, w: 600, col: C.goldS, al: 'center', a: lbA }); }
      }
      // algo box
      const alA = pr(t, 5.5, 6.0);
      box(c, B.alg, alA, 'Algo Desk', p ? 'Hedged strategies, run by rule' : 'Hedged, run by rule', pr(t, 7.0, 7.3) > 0 ? 'LAYER 2' : '', C.green);
      if (alA > 0) {
        const [x, y, w, h] = B.alg;
        const pills = ['F&O · morning', 'MCX · evening'];
        pills.forEach((s, i) => { const px = p ? x + 14 + i * 116 : x + 14, py = p ? y + 62 : y + 62 + i * 26; c.globalAlpha = alA * .9; rr(c, px, py - 10, p ? 108 : 112, 20, 10); c.fillStyle = '#1C3236'; c.fill(); c.globalAlpha = 1;
          T(c, s, px + 10, py + 1, { size: 10.5, w: 600, col: C.mut, a: alA }); });
        // balance: long and short legs offset
        const bx = p ? x + w - 70 : x + w / 2, by = p ? y + 70 : y + 140, osc = Math.sin(t * 2.4) * 9;
        const hl = 20 + osc, hs = 20 + osc;
        c.globalAlpha = alA; c.fillStyle = C.green; rr(c, bx - 22, by - hl, 16, hl, 3); c.fill(); c.fillStyle = C.red; rr(c, bx + 6, by, 16, hs, 3); c.fill();
        c.strokeStyle = C.mut; c.lineWidth = 1.5; c.beginPath(); c.moveTo(bx - 34, by); c.lineTo(bx + 34, by); c.stroke(); c.globalAlpha = 1;
        T(c, 'Long', bx - 14, by - hl - 9, { size: 10, w: 600, col: C.green, al: 'center', a: alA });
        T(c, 'Short', bx + 14, by + hs + 9, { size: 10, w: 600, col: C.red, al: 'center', a: alA });
      }
      // income chart
      const chA = pr(t, 7.2, 7.7);
      if (chA > 0) {
        const [x, y, w, h] = B.ch, rv = eio(pr(t, 7.6, 11.6)), n = Math.max(2, Math.round(rv * (NP - 1)) + 1);
        const X = i => x + i / (NP - 1) * w, base0 = y + h, sB = h * .42, sA = h * .5;
        const yb = i => base0 - base[i] * sB, ya = i => yb(i) - algN[i] * sA;
        c.globalAlpha = chA; c.strokeStyle = C.edge; c.lineWidth = 1; c.beginPath(); c.moveTo(x, base0); c.lineTo(x + w, base0); c.stroke();
        // base area
        c.beginPath(); c.moveTo(X(0), base0); for (let i = 0; i < n; i++) c.lineTo(X(i), yb(i)); c.lineTo(X(n - 1), base0); c.closePath(); c.fillStyle = 'rgba(201,164,76,.55)'; c.fill();
        // algo layer
        c.beginPath(); for (let i = 0; i < n; i++) c.lineTo(X(i), yb(i)); for (let i = n - 1; i >= 0; i--) c.lineTo(X(i), ya(i)); c.closePath(); c.fillStyle = 'rgba(79,181,154,.45)'; c.fill();
        c.beginPath(); for (let i = 0; i < n; i++) i ? c.lineTo(X(i), ya(i)) : c.moveTo(X(i), ya(i)); c.strokeStyle = C.green; c.lineWidth = 2; c.stroke();
        c.globalAlpha = 1;
        const ly = y - (p ? 14 : 16);
        c.globalAlpha = chA; c.fillStyle = C.gold; c.fillRect(x, ly - 5, 10, 10); c.fillStyle = C.green; c.fillRect(x + (p ? 150 : 210), ly - 5, 10, 10); c.globalAlpha = 1;
        T(c, p ? 'Arbitrage · steady' : 'Layer 1 · arbitrage, steady', x + 16, ly, { size: 11, w: 600, col: C.mut, a: chA });
        T(c, p ? 'Algo · varies, can be negative' : 'Layer 2 · algo income, varies and can be negative', x + (p ? 166 : 226), ly, { size: 11, w: 600, col: C.mut, a: chA });
        T(c, 'Illustration only, not actual returns', x + w, base0 + 12, { size: 10, w: 500, col: C.dim, al: 'right', a: chA });
      }
      caption(c, S, t, [[1.0, 4.5, 'Idle money first earns a low-risk arbitrage return'], [4.5, 7.2, 'The same units are pledged as margin for the Algo Desk'],
        [7.2, TT + .3, 'Two layers of income from one pool of capital']]);
    } };
  }

  const SCENES = {
    stocks: S => screen(S, { seed: 7, n: 730, colsL: 37, colsP: 22, chip: 'FRIDAY 30 OCT · AFTER THE CLOSE', calLine: 'Every Friday, after the market closes',
      universe: 'About 730 NSE stocks', cut: 'The top 20 make the cut', final: 'TOP 20 · THIS WEEK', after: 'Held while strong. Tested again next Friday.' }),
    spx: S => screen(S, { seed: 11, n: 503, colsL: 34, colsP: 19, chip: 'FRIDAY 30 OCT · US CLOSE', calLine: 'Every Friday, after the US market closes',
      universe: 'All 503 S&P 500 stocks', cut: 'The top 20 make the cut, max five per sector', final: 'SPX TOP 20 · THIS WEEK', after: 'Held while strong. Tested again next Friday.' }),
    funds: funds, algo: algo,
  };

  function mount(el) {
    const kind = el.dataset.anim; if (!SCENES[kind]) return;
    const cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true'); cv.style.display = 'block'; el.appendChild(cv);
    const c = cv.getContext('2d'); let S, sc, t0 = performance.now(), vis = false, lastW = 0, started = false;
    function size() {
      const w = Math.round(el.clientWidth); if (!w || w === lastW) return false; lastW = w;
      const port = w < 520, st = port ? { w: 400, h: kind === 'algo' ? 650 : 570 } : { w: 680, h: kind === 'algo' ? 440 : 420 };
      const k = w / st.w, d = Math.min(2, devicePixelRatio || 1);
      cv.width = Math.round(w * d); cv.height = Math.round(st.h * k * d); cv.style.width = w + 'px'; cv.style.height = Math.round(st.h * k) + 'px';
      c.setTransform(k * d, 0, 0, k * d, 0, 0); S = { ...st, port }; sc = SCENES[kind](S); return true;
    }
    function draw(now) {
      const t = window.__storyT != null ? window.__storyT : RM ? sc.still : ((now - t0) / 1000) % sc.T;
      c.fillStyle = C.bg; c.fillRect(0, 0, S.w, S.h); sc.draw(c, t);
      if (!RM && window.__storyT == null) { const fade = Math.max(1 - pr(t, 0, .35), pr(t, sc.T - .45, sc.T)); if (fade > 0) { c.globalAlpha = fade; c.fillStyle = C.bg; c.fillRect(0, 0, S.w, S.h); c.globalAlpha = 1; } }
    }
    size();
    new ResizeObserver(() => { if (size()) draw(performance.now()); }).observe(el);
    new IntersectionObserver(es => es.forEach(e => { vis = e.isIntersecting; if (vis && !started) { started = true; t0 = performance.now(); } }), { threshold: .2 }).observe(el);
    if (RM) { const go = () => draw(0); document.fonts ? document.fonts.ready.then(go) : go(); }
    else { const loop = now => { if (vis) draw(now); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  }
  const run = () => document.querySelectorAll('.story[data-anim]').forEach(mount);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', run) : run();
})();
