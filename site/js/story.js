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


  /* ---------------- globe: India to the US (land dots from Natural Earth via world-atlas, 110m) ---------------- */
  const LAND = [-107,-143,-102,-147,-102,-139,-96,-149,-96,-141,-96,-133,-91,-145,-91,-137,-91,338,-86,-139,-86,-132,-86,296,-86,346,-81,-147,-81,-141,-81,-134,-81,-127,-81,353,-76,-142,-76,-135,-76,-129,-76,-122,-76,-116,-76,287,-76,294,-70,-143,-70,-137,-70,-131,-70,-124,-70,-118,-70,277,-70,284,-70,290,-70,296,-70,347,-65,-138,-65,-132,-65,-126,-65,-120,-65,-114,-65,-108,-65,40,-65,46,-65,52,-65,237,-65,243,-65,249,-65,274,-65,280,-65,286,-65,292,-65,298,-65,305,-60,-138,-60,-132,-60,-126,-60,-120,-60,-114,-60,-108,-60,-102,-60,36,-60,42,-60,48,-60,54,-60,60,-60,234,-60,240,-60,246,-60,252,-60,258,-60,264,-60,270,-60,276,-60,282,-60,288,-60,294,-60,300,-60,306,-55,-138,-55,-132,-55,-126,-55,-120,-55,-114,-55,-108,-55,-102,-55,32,-55,38,-55,44,-55,50,-55,56,-55,61,-55,231,-55,237,-55,243,-55,249,-55,255,-55,260,-55,266,-55,272,-55,278,-55,284,-55,290,-55,296,-55,301,-50,-137,-50,-131,-50,-126,-50,-120,-50,-114,-50,-109,-50,-103,-50,-97,-50,34,-50,40,-50,46,-50,51,-50,57,-50,63,-50,91,-50,229,-50,234,-50,240,-50,246,-50,251,-50,257,-50,263,-50,269,-50,274,-50,280,-50,286,-50,291,-50,297,-50,303,-44,-135,-44,-129,-44,-124,-44,-118,-44,-112,-44,-107,-44,-101,-44,-96,-44,-90,-44,-84,-44,34,-44,39,-44,45,-44,51,-44,56,-44,62,-44,68,-44,90,-44,96,-44,231,-44,236,-44,242,-44,248,-44,253,-44,259,-44,264,-44,270,-44,276,-44,281,-44,287,-44,293,-44,298,-39,-138,-39,-133,-39,-127,-39,-122,-39,-116,-39,-111,-39,-105,-39,-100,-39,-94,-39,-89,-39,-83,-39,28,-39,33,-39,39,-39,44,-39,50,-39,55,-39,61,-39,66,-39,94,-39,244,-39,249,-39,255,-39,260,-39,266,-39,271,-39,277,-39,282,-39,288,-39,294,-34,-142,-34,-136,-34,-131,-34,-125,-34,-120,-34,-115,-34,-109,-34,-104,-34,-98,-34,-93,-34,-87,-34,-82,-34,27,-34,33,-34,38,-34,44,-34,49,-34,55,-34,60,-34,65,-34,71,-34,76,-34,93,-34,98,-34,245,-34,251,-34,256,-34,262,-34,267,-34,273,-34,284,-34,289,-29,-150,-29,-145,-29,-140,-29,-134,-29,-129,-29,-124,-29,-118,-29,-113,-29,-107,-29,-102,-29,-97,-29,-91,-29,-86,-29,-81,-29,27,-29,32,-29,38,-29,43,-29,48,-29,54,-29,59,-29,64,-29,70,-29,75,-29,81,-29,97,-29,253,-29,263,-29,269,-29,285,-24,-154,-24,-148,-24,-143,-24,-138,-24,-132,-24,-127,-24,-122,-24,-116,-24,-111,-24,-106,-24,-101,-24,-95,-24,-90,-24,-85,-24,-79,-24,32,-24,37,-24,42,-24,48,-24,53,-24,58,-24,64,-24,69,-24,74,-24,79,-18,-155,-18,-150,-18,-145,-18,-139,-18,-134,-18,-129,-18,-124,-18,-118,-18,-113,-18,-108,-18,-102,-18,-97,-18,-92,-18,-87,-18,-81,-18,-76,-18,-71,-18,29,-18,34,-18,39,-18,45,-18,50,-18,55,-18,60,-18,66,-18,71,-18,76,-18,250,-18,297,-13,-157,-13,-151,-13,-146,-13,-141,-13,-136,-13,-130,-13,-125,-13,-120,-13,-115,-13,-110,-13,-104,-13,-99,-13,-94,-13,-89,-13,-83,-13,-78,-13,-73,-13,26,-13,31,-13,37,-13,42,-13,47,-13,52,-13,57,-13,63,-13,68,-13,73,-13,214,-13,282,-13,287,-13,292,-8,-162,-8,-157,-8,-151,-8,-146,-8,-141,-8,-136,-8,-130,-8,-125,-8,-120,-8,-115,-8,-110,-8,-104,-8,-99,-8,-94,-8,-89,-8,-83,-8,-78,-8,26,-8,31,-8,37,-8,42,-8,47,-8,52,-8,57,-8,63,-8,68,-8,73,-8,78,-8,209,-8,240,-8,245,-8,266,-8,271,-8,277,-8,282,-8,287,-3,-162,-3,-157,-3,-151,-3,-146,-3,-141,-3,-136,-3,-130,-3,-125,-3,-120,-3,-115,-3,-110,-3,-104,-3,-99,-3,-94,-3,21,-3,26,-3,31,-3,37,-3,42,-3,47,-3,52,-3,57,-3,63,-3,68,-3,73,-3,78,-3,83,-3,203,-3,209,-3,224,-3,230,-3,240,-3,266,2,-157,2,-151,2,-146,2,-141,2,-136,2,-130,2,-125,2,-120,2,-115,2,-110,2,-104,2,21,2,26,2,31,2,37,2,42,2,47,2,52,2,57,2,63,2,68,2,73,2,78,2,83,2,198,2,203,2,219,2,224,2,230,2,235,2,256,8,-151,8,-146,8,-141,8,-136,8,-130,8,-125,8,-120,8,-115,8,-110,8,-104,8,21,8,26,8,31,8,37,8,42,8,47,8,52,8,57,8,63,8,68,8,73,8,78,8,83,8,89,8,94,8,193,8,203,8,230,8,235,13,-151,13,-146,13,-141,13,-136,13,-130,13,-125,13,-120,13,-21,13,-16,13,-10,13,-5,13,0,13,5,13,10,13,16,13,21,13,26,13,31,13,37,13,42,13,47,13,52,13,57,13,63,13,68,13,73,13,78,13,83,13,89,13,94,13,162,13,203,13,235,13,250,18,-166,18,-160,18,-150,18,-145,18,-139,18,-134,18,-129,18,-124,18,-24,18,-18,18,-13,18,-8,18,-3,18,3,18,8,18,13,18,18,18,24,18,29,18,34,18,39,18,45,18,50,18,55,18,60,18,66,18,71,18,76,18,81,18,87,18,92,18,97,18,155,18,160,18,197,23,-169,23,-143,23,-32,23,-26,23,-21,23,-16,23,-11,23,-5,23,0,23,5,23,11,23,16,23,21,23,26,23,32,23,37,23,42,23,48,23,53,23,58,23,64,23,69,23,74,23,79,23,85,23,101,23,154,23,159,23,206,23,212,23,217,28,-183,28,-177,28,-172,28,-167,28,-32,28,-27,28,-21,28,-16,28,-11,28,-5,28,0,28,5,28,11,28,16,28,21,28,27,28,32,28,38,28,43,28,48,28,54,28,59,28,64,28,70,28,75,28,81,28,91,28,97,28,150,28,156,28,199,28,204,28,210,28,215,28,242,34,-198,34,-192,34,-187,34,-181,34,-30,34,-24,34,-19,34,-14,34,-8,34,-3,34,3,34,8,34,14,34,19,34,24,34,30,34,35,34,41,34,46,34,51,34,57,34,62,34,68,34,73,34,89,34,95,34,100,34,106,34,149,34,154,34,160,34,192,34,198,34,203,34,208,34,214,34,241,39,-311,39,-206,39,-201,39,-195,39,-179,39,-140,39,-30,39,-25,39,-19,39,-14,39,-8,39,-3,39,3,39,8,39,14,39,19,39,25,39,30,39,36,39,41,39,47,39,52,39,58,39,63,39,69,39,74,39,85,39,91,39,96,39,102,39,107,39,113,39,146,39,151,39,157,39,162,39,168,39,190,39,195,39,201,39,206,44,-208,44,-202,44,-197,44,-169,44,-157,44,-28,44,-22,44,-17,44,-11,44,-6,44,0,44,6,44,11,44,17,44,23,44,28,44,34,44,39,44,45,44,51,44,56,44,62,44,68,44,73,44,79,44,84,44,90,44,96,44,101,44,107,44,113,44,118,44,141,44,146,44,152,44,158,44,163,44,169,44,174,44,180,44,186,44,191,44,197,44,203,44,208,44,214,44,219,44,225,49,-223,49,-211,49,-206,49,-200,49,-29,49,-23,49,-17,49,-11,49,-6,49,0,49,6,49,11,49,17,49,23,49,29,49,34,49,40,49,46,49,51,49,57,49,63,49,69,49,80,49,86,49,91,49,97,49,137,49,143,49,149,49,154,49,160,49,166,49,171,49,177,49,183,49,189,49,194,49,200,49,206,49,211,49,217,49,223,49,229,49,234,54,-225,54,-220,54,-214,54,-208,54,-202,54,-196,54,-161,54,-26,54,-20,54,-15,54,-9,54,-3,54,3,54,9,54,15,54,20,54,26,54,32,54,38,54,44,54,50,54,56,54,61,54,73,54,79,54,85,54,91,54,97,54,108,54,114,54,120,54,126,54,132,54,138,54,143,54,149,54,155,54,161,54,167,54,173,54,179,54,184,54,190,54,196,54,202,54,208,54,214,54,220,54,225,54,231,54,237,60,-222,60,-216,60,-210,60,-204,60,-198,60,-192,60,-186,60,-180,60,-18,60,-12,60,-6,60,0,60,6,60,12,60,18,60,24,60,30,60,36,60,42,60,48,60,54,60,60,60,66,60,72,60,78,60,84,60,90,60,96,60,102,60,108,60,114,60,120,60,126,60,132,60,138,60,144,60,150,60,156,60,162,60,168,60,174,60,180,60,186,60,192,60,198,60,204,60,210,60,216,60,222,60,228,60,234,60,240,65,-231,65,-225,65,-218,65,-212,65,-206,65,-200,65,-194,65,-188,65,-182,65,-175,65,-169,65,-163,65,-15,65,-9,65,-3,65,3,65,9,65,15,65,22,65,28,65,46,65,71,65,77,65,83,65,89,65,95,65,102,65,108,65,114,65,120,65,126,65,132,65,138,65,145,65,151,65,157,65,163,65,169,65,175,65,182,65,188,65,194,65,200,65,206,65,212,65,218,65,225,65,231,65,237,65,262,70,-239,70,-233,70,-226,70,-220,70,-213,70,-207,70,-201,70,-194,70,-188,70,-182,70,-175,70,-169,70,-162,70,-156,70,-10,70,-3,70,3,70,10,70,16,70,67,70,73,70,80,70,86,70,92,70,99,70,105,70,112,70,118,70,124,70,131,70,137,70,143,70,150,70,156,70,162,70,169,70,175,70,182,70,188,70,194,70,201,70,207,70,213,70,220,70,226,70,233,70,264,70,271,70,277,75,-242,75,-236,75,-229,75,-223,75,-216,75,-209,75,-203,75,-196,75,-190,75,-183,75,-177,75,-170,75,-164,75,-157,75,-13,75,-7,75,26,75,46,75,59,75,65,75,72,75,79,75,85,75,92,75,98,75,111,75,118,75,124,75,131,75,137,75,144,75,151,75,157,75,164,75,170,75,177,75,183,75,190,75,196,75,203,75,209,75,216,75,223,75,229,75,236,75,242,75,255,75,281,80,-245,80,-238,80,-231,80,-224,80,-217,80,-211,80,-204,80,-197,80,-190,80,-183,80,-177,80,-170,80,-163,80,-156,80,-149,80,-14,80,-7,80,0,80,41,80,48,80,54,80,61,80,68,80,75,80,82,80,88,80,95,80,109,80,115,80,122,80,129,80,136,80,143,80,149,80,156,80,163,80,170,80,177,80,183,80,190,80,197,80,204,80,211,80,217,80,224,80,231,80,238,80,245,80,251,86,-247,86,-240,86,-233,86,-226,86,-219,86,-212,86,-205,86,-198,86,-191,86,-184,86,-176,86,-169,86,-162,86,-155,86,-148,86,-14,86,-7,86,0,86,35,86,42,86,49,86,85,86,92,86,106,86,113,86,120,86,127,86,134,86,141,86,148,86,155,86,162,86,169,86,176,86,184,86,191,86,198,86,205,86,212,86,219,86,226,86,233,86,240,86,247,86,254,86,261,86,282,91,-241,91,-234,91,-226,91,-219,91,-212,91,-204,91,-197,91,-189,91,-182,91,-174,91,-167,91,-160,91,-152,91,-145,91,-137,91,-130,91,-122,91,4,91,11,91,19,91,33,91,41,91,48,91,56,91,71,91,78,91,85,91,93,91,108,91,115,91,122,91,130,91,137,91,145,91,152,91,160,91,167,91,174,91,182,91,189,91,197,91,204,91,212,91,219,91,226,91,234,91,241,91,249,91,256,91,264,91,271,96,-244,96,-236,96,-228,96,-221,96,-213,96,-205,96,-197,96,-190,96,-182,96,-174,96,-166,96,-159,96,-151,96,-143,96,-135,96,-112,96,-4,96,4,96,12,96,19,96,27,96,35,96,43,96,50,96,58,96,66,96,74,96,81,96,89,96,97,96,105,96,112,96,120,96,128,96,135,96,143,96,151,96,159,96,166,96,174,96,182,96,190,96,197,96,205,96,213,96,221,96,228,96,236,96,244,96,252,96,259,96,267,96,275,101,-245,101,-237,101,-229,101,-221,101,-213,101,-205,101,-196,101,-188,101,-180,101,-172,101,-164,101,-155,101,-147,101,-139,101,-131,101,-123,101,-115,101,-8,101,8,101,16,101,25,101,33,101,41,101,49,101,57,101,65,101,74,101,82,101,90,101,98,101,106,101,115,101,123,101,131,101,139,101,147,101,155,101,164,101,172,101,180,101,188,101,196,101,205,101,213,101,221,101,229,101,237,101,245,101,254,101,262,101,270,101,278,101,286,106,-265,106,-256,106,-247,106,-239,106,-230,106,-221,106,-213,106,-204,106,-195,106,-187,106,-178,106,-169,106,-152,106,-143,106,-134,106,-126,106,-117,106,-13,106,-4,106,13,106,22,106,30,106,39,106,48,106,56,106,65,106,74,106,82,106,91,106,100,106,108,106,117,106,126,106,134,106,143,106,152,106,160,106,169,106,178,106,187,106,195,106,204,106,213,106,221,106,230,106,239,106,247,106,256,106,265,106,273,106,282,106,317,112,-323,112,-258,112,-249,112,-240,112,-231,112,-222,112,-212,112,-203,112,-194,112,-185,112,-175,112,-148,112,-138,112,-129,112,-9,112,18,112,28,112,46,112,55,112,65,112,74,112,83,112,92,112,102,112,111,112,120,112,129,112,138,112,148,112,157,112,166,112,175,112,185,112,194,112,203,112,212,112,222,112,231,112,240,112,249,112,258,112,268,112,314,112,323,117,-311,117,-271,117,-261,117,-252,117,-242,117,-232,117,-222,117,-212,117,-202,117,-192,117,-153,117,-143,117,-133,117,15,117,25,117,54,117,64,117,74,117,84,117,94,117,104,117,113,117,123,117,133,117,143,117,153,117,163,117,173,117,182,117,192,117,202,117,212,117,222,117,232,117,242,117,252,117,261,117,271,117,281,117,321,122,-328,122,-317,122,-306,122,-296,122,-285,122,-274,122,-263,122,-253,122,-242,122,-231,122,-220,122,-210,122,-199,122,-145,122,-91,122,16,122,27,122,48,122,59,122,70,122,81,122,91,122,102,122,113,122,124,122,134,122,145,122,156,122,167,122,177,122,188,122,199,122,210,122,220,122,231,122,242,122,253,122,263,122,274,122,285,122,296,122,306,122,328,122,339,127,-314,127,-302,127,-290,127,-279,127,-267,127,-255,127,-244,127,-232,127,-221,127,-209,127,-197,127,-186,127,-174,127,-163,127,-139,127,-93,127,23,127,35,127,46,127,58,127,70,127,81,127,93,127,105,127,116,127,128,127,139,127,151,127,163,127,174,127,186,127,197,127,209,127,221,127,232,127,244,127,255,127,267,127,279,127,290,127,302,127,314,127,325,127,337,127,348,132,-360,132,-347,132,-321,132,-309,132,-296,132,-283,132,-270,132,-257,132,-244,132,-231,132,-219,132,-206,132,-193,132,-180,132,-141,132,-129,132,-103,132,-90,132,-77,132,26,132,39,132,51,132,64,132,77,132,90,132,103,132,116,132,129,132,141,132,154,132,167,132,180,132,193,132,206,132,219,132,231,132,244,132,257,132,270,132,283,132,296,132,309,132,321,132,334,132,347,138,-360,138,-331,138,-317,138,-302,138,-288,138,-274,138,-259,138,-245,138,-230,138,-187,138,-144,138,-101,138,-86,138,-72,138,-58,138,43,138,58,138,72,138,130,138,144,138,158,138,173,138,187,138,202,138,216,138,230,138,245,138,259,138,274,138,288,138,302,138,317,138,331,138,346,143,-245,143,-229,143,-213,143,-196,143,-164,143,-98,143,-82,143,-65,143,-49,143,147,143,164,143,180,143,196,143,213,143,229,143,245,143,278,143,295,148,-246,148,-189,148,-95,148,-76,148,-57,148,114,148,189,148,208,153,-157,153,-135,153,-112,153,-90,153,-67,153,-45,153,135,153,203,158,-166,158,-111,158,-83,158,-55,158,28,158,194];
  function globe(S) {
    const p = S.port, cx = S.w / 2, cy = p ? S.h / 2 - 20 : S.h / 2 - 8, R0 = Math.min(S.w, S.h) * (p ? .36 : .37);
    const rad = Math.PI / 180, pts = [];
    for (let i = 0; i < LAND.length; i += 2) pts.push([LAND[i] / 2 * rad, LAND[i + 1] / 2 * rad]);
    const vec = (la, lo) => [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
    const ll = v => [Math.asin(cl(v[2], -1, 1)), Math.atan2(v[1], v[0])];
    const A = vec(18.52 * rad, 73.86 * rad), Bv = vec(40.71 * rad, -74.0 * rad);
    const om = Math.acos(A[0] * Bv[0] + A[1] * Bv[1] + A[2] * Bv[2]);
    const slerp = f => { const a = Math.sin((1 - f) * om) / Math.sin(om), b = Math.sin(f * om) / Math.sin(om); return ll([A[0] * a + Bv[0] * b, A[1] * a + Bv[1] * b, A[2] * a + Bv[2] * b]); };
    const proj = (la, lo, la0, lo0, R) => { const cc = Math.sin(la0) * Math.sin(la) + Math.cos(la0) * Math.cos(la) * Math.cos(lo - lo0);
      return [cx + R * Math.cos(la) * Math.sin(lo - lo0), cy - R * (Math.cos(la0) * Math.sin(la) - Math.sin(la0) * Math.cos(la) * Math.cos(lo - lo0)), cc]; };
    const pin = (c, x, y, a, col, l1, l2, right) => {
      if (a <= 0) return; c.globalAlpha = a; c.fillStyle = col; c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill();
      const r = (performance.now() / 1000 * 1.2) % 1; c.globalAlpha = a * (1 - r); c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 5 + r * 16, 0, 7); c.stroke(); c.globalAlpha = 1;
      const tx = right ? x - 6 : x + 6, al = right ? 'left' : 'right';
      T(c, l1, tx, y + 22, { size: 15, w: 800, col: C.fg, al, a }); T(c, l2, tx, y + 40, { size: 11, w: 700, col: col, al, a, ls: 1.2 });
    };
    return { draw(c, t) {
      const f = eio(pr(t, 1.1, 2.9));                    // how far along the route the arc head is
      const fc = .6 * eio(pr(t, .9, 3.0));              // globe turns part way, so both ends stay in view
      const [la0, lo0] = slerp(fc), R = R0 * L(1, 1.08, pr(t, 3.0, 3.8)) * L(.9, 1, eo(pr(t, 0, .6)));
      const tilt = la0 - 8 * rad;
      // disc
      const g = c.createRadialGradient(cx - R * .35, cy - R * .4, R * .1, cx, cy, R);
      g.addColorStop(0, '#173235'); g.addColorStop(1, '#0E1D20');
      c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill(); c.strokeStyle = 'rgba(201,164,76,.25)'; c.lineWidth = 1; c.stroke();
      // land dots
      for (const [la, lo] of pts) { const [x, y, cc] = proj(la, lo, tilt, lo0, R); if (cc <= 0) continue;
        c.globalAlpha = .25 + .75 * cc; c.fillStyle = mix('#3E5558', C.mut, cc * .6); c.beginPath(); c.arc(x, y, (1.1 + cc * .9) * R / 150, 0, 7); c.fill(); }
      c.globalAlpha = 1;
      // arc (lifted great circle)
      if (f > 0) {
        c.strokeStyle = C.gold; c.lineWidth = 2.5; c.lineCap = 'round'; c.beginPath(); let started = false;
        for (let i = 0; i <= 80; i++) { const s = i / 80 * f, [la, lo] = slerp(s), lift = 1 + .16 * Math.sin(Math.PI * s);
          const [x, y, cc] = proj(la, lo, tilt, lo0, R * lift); const px = cx + (x - cx), py = cy + (y - cy);
          if (cc > 0) { started ? c.lineTo(px, py) : c.moveTo(px, py); started = true; } else started = false; }
        c.stroke();
        const [hla, hlo] = slerp(f), [hx, hy, hc] = proj(hla, hlo, tilt, lo0, R * (1 + .16 * Math.sin(Math.PI * f)));
        if (hc > 0 && f < 1) { c.fillStyle = C.goldS; c.globalAlpha = .35; c.beginPath(); c.arc(hx, hy, 10, 0, 7); c.fill(); c.globalAlpha = 1; c.beginPath(); c.arc(hx, hy, 4, 0, 7); c.fill(); }
      }
      // pins
      const [ix, iy, ic] = proj(18.52 * rad, 73.86 * rad, tilt, lo0, R), [ux, uy, uc] = proj(40.71 * rad, -74.0 * rad, tilt, lo0, R);
      pin(c, ix, iy, pr(t, .3, .7) * cl(ic * 4), C.gold, 'India', p ? 'PUNE' : 'PICKMYFUND · PUNE', false);
      pin(c, ux, uy, pr(t, 2.7, 3.1) * cl(uc * 4), C.blue, 'USA', p ? 'S&P 500' : 'S&P 500 · 503 STOCKS', true);
      chip(c, 'SPX TOP 20 · US STOCKS', 20, p ? 30 : 28, pr(t, .2, .6));
      caption(c, S, t, [[.2, 1.6, 'From India'], [1.6, 3.6, 'to every stock in the S&P 500']]);
    } };
  }

  const SCENES = {
    stocks: S => screen(S, { seed: 7, n: 730, colsL: 37, colsP: 22, chip: 'FRIDAY 30 OCT · AFTER THE CLOSE', calLine: 'Every Friday, after the market closes',
      universe: 'About 730 NSE stocks', cut: 'The top 20 make the cut', final: 'TOP 20 · THIS WEEK', after: 'Held while strong. Tested again next Friday.' }),
    spx: S => { const g = globe(S), off = 3.7, sc = screen(S, { seed: 11, n: 503, colsL: 34, colsP: 19, chip: 'FRIDAY 30 OCT · US CLOSE', calLine: 'Every Friday, after the US market closes',
      universe: 'All 503 S&P 500 stocks', cut: 'The top 20 make the cut, max five per sector', final: 'SPX TOP 20 · THIS WEEK', after: 'Held while strong. Tested again next Friday.' });
      return { T: sc.T + off, still: sc.still + off, draw(c, t) {
        if (t < off) { g.draw(c, t); const k = pr(t, off - .45, off); if (k > 0) { c.globalAlpha = k; c.fillStyle = C.bg; c.fillRect(0, 0, S.w, S.h); c.globalAlpha = 1; } }
        else sc.draw(c, t - off);
      } }; },
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
