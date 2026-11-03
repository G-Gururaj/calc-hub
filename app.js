/* app.js - UI wiring */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const fmt = (n, d = 2) => Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
  const stat = (k, v, big) => `<div class="stat${big ? ' big' : ''}"><div class="k">${k}</div><div class="v">${v}</div></div>`;
  const showErr = (el, e) => { el.innerHTML = `<div class="error">${e.message}</div>`; };

  // ---------- Theme ----------
  const root = document.documentElement;
  try { const t = localStorage.getItem('theme'); if (t) root.dataset.theme = t; } catch (e) {}
  $('#themeBtn').onclick = () => {
    const t = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = t;
    try { localStorage.setItem('theme', t); } catch (e) {}
  };

  // ---------- Tabs ----------
  $$('#tabs button').forEach((b) => (b.onclick = () => {
    $$('#tabs button').forEach((x) => x.classList.toggle('active', x === b));
    $$('.panel').forEach((p) => p.classList.toggle('active', p.id === b.dataset.tab));
  }));

  // ---------- Scientific ----------
  const input = $('#sciInput'), resEl = $('#sciResult'), histEl = $('#sciHistory');
  let angle = 'deg', ans = 0, memory = 0;
  const layout = [
    ['sin(', 'fn'], ['cos(', 'fn'], ['tan(', 'fn'], ['(', 'op'], [')', 'op'], ['C', 'op'],
    ['asin(', 'fn'], ['acos(', 'fn'], ['atan(', 'fn'], ['^', 'op'], ['!', 'op'], ['⌫', 'op'],
    ['log(', 'fn'], ['ln(', 'fn'], ['sqrt(', 'fn'], ['7'], ['8'], ['9'],
    ['exp(', 'fn'], ['abs(', 'fn'], ['pi', 'fn'], ['4'], ['5'], ['6'],
    ['e', 'fn'], ['ncr(', 'fn'], ['npr(', 'fn'], ['1'], ['2'], ['3'],
    ['%', 'op'], ['ans', 'fn'], [',', 'op'], ['0'], ['.'], ['=', 'eq'],
    ['+', 'op'], ['-', 'op'], ['*', 'op'], ['/', 'op'], ['cbrt(', 'fn'], ['sinh(', 'fn']
  ];
  const keys = $('#sciKeys');
  layout.forEach(([label, cls]) => {
    const b = document.createElement('button');
    b.textContent = label.replace('*', '×').replace('/', '÷');
    if (cls) b.className = cls;
    b.onclick = () => press(label);
    keys.appendChild(b);
  });

  function press(k) {
    if (k === 'C') { input.value = ''; resEl.textContent = '0'; resEl.classList.remove('err'); }
    else if (k === '⌫') input.value = input.value.slice(0, -1);
    else if (k === '=') compute();
    else input.value += k;
    input.focus();
  }
  function compute() {
    const expr = input.value.trim();
    if (!expr) return;
    try {
      const r = Calc.evaluate(expr, { angle, ans });
      if (!isFinite(r)) throw new Error('Result is not finite');
      ans = r;
      const shown = Number(r.toPrecision(12));
      resEl.classList.remove('err');
      resEl.textContent = String(shown);
      const line = document.createElement('div');
      line.textContent = `${expr} = ${shown}`;
      histEl.appendChild(line); histEl.scrollTop = histEl.scrollHeight;
    } catch (e) {
      resEl.classList.add('err'); resEl.textContent = e.message;
    }
  }
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); compute(); } });
  const memInd = $('#memInd');
  const updMem = () => (memInd.textContent = memory ? 'M = ' + Number(memory.toPrecision(10)) : '');
  $('#angleBtn').onclick = (e) => { angle = angle === 'deg' ? 'rad' : 'deg'; e.target.textContent = angle.toUpperCase(); };
  $('#memC').onclick = () => { memory = 0; updMem(); };
  $('#memR').onclick = () => { input.value += String(memory); input.focus(); };
  $('#memP').onclick = () => { try { memory += Calc.evaluate(input.value || '0', { angle, ans }); updMem(); } catch (e) {} };
  $('#memM').onclick = () => { try { memory -= Calc.evaluate(input.value || '0', { angle, ans }); updMem(); } catch (e) {} };

  // ---------- Charts (tiny canvas line/area) ----------
  function drawChart(canvas, series, labels) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = 180;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const g = canvas.getContext('2d'); g.scale(dpr, dpr); g.clearRect(0, 0, w, h);
    const css = getComputedStyle(document.documentElement);
    const muted = css.getPropertyValue('--muted').trim();
    const max = Math.max(...series.flatMap((s) => s.data)) || 1;
    const pad = 30, n = series[0].data.length;
    g.strokeStyle = muted; g.fillStyle = muted; g.font = '11px sans-serif';
    g.beginPath(); g.moveTo(pad, 6); g.lineTo(pad, h - 20); g.lineTo(w - 6, h - 20); g.stroke();
    g.fillText(fmt(max, 0), 2, 12);
    series.forEach((s) => {
      g.strokeStyle = s.color; g.lineWidth = 2; g.beginPath();
      s.data.forEach((v, i) => {
        const x = pad + (i / Math.max(n - 1, 1)) * (w - pad - 10);
        const y = h - 20 - (v / max) * (h - 30);
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      });
      g.stroke();
      g.fillStyle = s.color; g.fillText(s.name, pad + 6 + series.indexOf(s) * 110, 14);
    });
    g.fillStyle = muted;
    g.fillText(labels[0], pad, h - 6); g.fillText(labels[labels.length - 1], w - 40, h - 6);
  }

  // ---------- Form handlers ----------
  const handlers = {
    mort(f) {
      const out = $('#mortOut');
      try {
        const r = Calc.mortgage(Object.fromEntries(new FormData(f)));
        out.innerHTML =
          stat('Monthly payment (total)', fmt(r.monthlyTotal), true) +
          stat('Principal & interest', fmt(r.monthlyPI)) +
          stat('Tax + insurance + HOA', fmt(r.monthlyTaxIns)) +
          stat('Loan amount', fmt(r.principal)) +
          stat('Loan-to-value', fmt(r.ltv, 1) + '%') +
          stat('Total interest', fmt(r.totalInterest)) +
          stat('Total paid (P+I)', fmt(r.totalPaid)) +
          stat('Payoff time', `${Math.floor(r.payoffMonths / 12)}y ${r.payoffMonths % 12}m`) +
          (r.interestSaved > 0 ? stat('Interest saved by extra', fmt(r.interestSaved)) + stat('Time saved', `${Math.floor(r.monthsSaved / 12)}y ${r.monthsSaved % 12}m`) : '');
        const yearly = r.schedule.filter((x) => x.month % 12 === 0 || x.month === r.schedule.length);
        let cumInt = 0; const cum = [];
        r.schedule.forEach((x) => { cumInt += x.interest; if (x.month % 12 === 0 || x.month === r.schedule.length) cum.push(cumInt); });
        drawChart($('#mortChart'), [
          { name: 'Balance', color: '#3b6cf6', data: yearly.map((x) => x.balance) },
          { name: 'Cumulative interest', color: '#e67e22', data: cum }
        ], ['Yr 1', 'Yr ' + Math.ceil(r.payoffMonths / 12)]);
        $('#mortTable').innerHTML = '<table><tr><th>Month</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Balance</th></tr>' +
          r.schedule.map((x) => `<tr><td>${x.month}</td><td>${fmt(x.payment)}</td><td>${fmt(x.principal)}</td><td>${fmt(x.interest)}</td><td>${fmt(x.balance)}</td></tr>`).join('') + '</table>';
      } catch (e) { showErr(out, e); }
    },
    emi(f) {
      const d = Object.fromEntries(new FormData(f)), out = $('#emiOut');
      try {
        const r = Calc.emi(d.p, +d.r, +d.n);
        out.innerHTML = stat('Monthly EMI', fmt(r.emi), true) + stat('Total interest', fmt(r.totalInterest)) + stat('Total payment', fmt(r.totalPaid));
      } catch (e) { showErr(out, e); }
    },
    sip(f) {
      const d = Object.fromEntries(new FormData(f)), out = $('#sipOut');
      try {
        const r = Calc.sip(d.m, +d.r, +d.y);
        out.innerHTML = stat('Future value', fmt(r.futureValue), true) + stat('Total invested', fmt(r.invested)) + stat('Estimated gain', fmt(r.gain));
      } catch (e) { showErr(out, e); }
    },
    comp(f) {
      const d = Object.fromEntries(new FormData(f)), out = $('#compOut');
      try {
        const r = Calc.compound(d.p, +d.r, +d.y, +d.n, d.a);
        out.innerHTML = stat('Final balance', fmt(r.final), true) + stat('Total contributed', fmt(r.contributed)) + stat('Interest earned', fmt(r.interest));
        drawChart($('#compChart'), [
          { name: 'Balance', color: '#3b6cf6', data: r.rows.map((x) => x.balance) },
          { name: 'Contributed', color: '#2ca58d', data: r.rows.map((x) => x.contributed) }
        ], ['Yr 1', 'Yr ' + d.y]);
      } catch (e) { showErr(out, e); }
    },
    gst(f) {
      const d = Object.fromEntries(new FormData(f)), out = $('#gstOut');
      const r = Calc.gst(d.a, d.r, d.mode);
      out.innerHTML = stat('Total', fmt(r.total), true) + stat('Base amount', fmt(r.base)) + stat('Tax', fmt(r.tax)) + stat('CGST / SGST (each)', fmt(r.cgst));
    },
    bmi(f) {
      const d = Object.fromEntries(new FormData(f)), out = $('#bmiOut');
      try {
        const r = Calc.bmi(+d.w, +d.h);
        out.innerHTML = stat('BMI', fmt(r.bmi, 1), true) + stat('Category', r.category) + stat('Healthy weight range', `${fmt(r.healthyMin, 1)} – ${fmt(r.healthyMax, 1)} kg`);
      } catch (e) { showErr(out, e); }
    },
    pct(f) {
      const d = Object.fromEntries(new FormData(f)), out = $('#pctOut');
      try {
        const v = Calc.percent(d.k, d.a, d.b);
        out.innerHTML = stat('Result', fmt(v, 4) + (d.k === 'of' ? '' : '%'), true);
      } catch (e) { showErr(out, e); }
    },
    date(f) {
      const d = Object.fromEntries(new FormData(f)), out = $('#dateOut');
      try {
        const r = Calc.dateDiff(d.d1, d.d2);
        out.innerHTML = stat('Difference', `${r.years}y ${r.months}m ${r.days}d`, true) + stat('Total days', r.totalDays) + stat('Total weeks', r.totalWeeks);
      } catch (e) { showErr(out, e); }
    }
  };
  $$('form[data-calc]').forEach((f) => f.addEventListener('submit', (e) => { e.preventDefault(); handlers[f.dataset.calc](f); }));
  // default dates
  const today = new Date().toISOString().slice(0, 10);
  $$('#date input[type=date]').forEach((i) => (i.value = today));
  // auto-run defaults once
  ['mort', 'emi', 'sip', 'comp', 'gst', 'bmi', 'pct', 'date'].forEach((k) => handlers[k]($(`form[data-calc="${k}"]`)));

  // ---------- Units ----------
  const uCat = $('#uCat'), uFrom = $('#uFrom'), uTo = $('#uTo'), uVal = $('#uVal'), uOut = $('#unitOut');
  const cats = Object.keys(Calc.units).concat('Temperature');
  cats.forEach((c) => uCat.add(new Option(c, c)));
  function fillUnits() {
    const list = uCat.value === 'Temperature' ? ['°C', '°F', 'K'] : Object.keys(Calc.units[uCat.value]);
    [uFrom, uTo].forEach((s) => { s.innerHTML = ''; list.forEach((u) => s.add(new Option(u, u))); });
    uTo.selectedIndex = Math.min(1, list.length - 1);
    runUnit();
  }
  function runUnit() {
    const v = Calc.convert(uCat.value, uVal.value, uFrom.value, uTo.value);
    uOut.innerHTML = stat(`${uVal.value} ${uFrom.value} =`, Number(v.toPrecision(10)).toLocaleString(undefined, { maximumFractionDigits: 8 }) + ' ' + uTo.value, true);
  }
  uCat.onchange = fillUnits;
  [uFrom, uTo, uVal].forEach((e) => e.addEventListener('input', runUnit));
  fillUnits();
})();
