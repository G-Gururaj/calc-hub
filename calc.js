/* calc.js - pure calculation logic (works in browser and Node for testing) */
(function (root) {
  'use strict';

  // ---------- Scientific expression evaluator (no eval) ----------
  function evaluate(expr, opts) {
    opts = opts || {};
    const angle = opts.angle === 'rad' ? 'rad' : 'deg';
    const ans = opts.ans || 0;
    const src = String(expr)
      .replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
      .replace(/π/g, 'pi').replace(/√/g, 'sqrt').replace(/\s+/g, '');
    let pos = 0;

    const toRad = (x) => (angle === 'deg' ? (x * Math.PI) / 180 : x);
    const fromRad = (x) => (angle === 'deg' ? (x * 180) / Math.PI : x);

    function fact(n) {
      if (n < 0 || Math.floor(n) !== n) {
        if (n < 0 && Math.floor(n) === n) throw new Error('Factorial of negative');
        return gamma(n + 1);
      }
      if (n > 170) return Infinity;
      let r = 1;
      for (let i = 2; i <= n; i++) r *= i;
      return r;
    }
    function gamma(z) {
      const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
        771.32342877765313, -176.61502916214059, 12.507343278686905,
        -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
      if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
      z -= 1;
      let x = c[0];
      const t = z + g + 0.5;
      for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
      return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
    }
    const nCr = (n, r) => fact(n) / (fact(r) * fact(n - r));
    const nPr = (n, r) => fact(n) / fact(n - r);

    const funcs = {
      sin: (x) => { const r = Math.sin(toRad(x)); return Math.abs(r) < 1e-15 ? 0 : r; },
      cos: (x) => { const r = Math.cos(toRad(x)); return Math.abs(r) < 1e-15 ? 0 : r; },
      tan: (x) => Math.tan(toRad(x)),
      asin: (x) => fromRad(Math.asin(x)),
      acos: (x) => fromRad(Math.acos(x)),
      atan: (x) => fromRad(Math.atan(x)),
      sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
      log: Math.log10, ln: Math.log, log2: Math.log2,
      sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, exp: Math.exp,
      floor: Math.floor, ceil: Math.ceil, round: Math.round,
      fact: fact,
      npr: nPr, ncr: nCr, pow: Math.pow, mod: (a, b) => a % b,
      min: Math.min, max: Math.max
    };
    const consts = { pi: Math.PI, e: Math.E, ans: ans, tau: 2 * Math.PI, phi: (1 + Math.sqrt(5)) / 2 };

    function peek() { return src[pos]; }
    function parseExpr() {
      let v = parseTerm();
      while (peek() === '+' || peek() === '-') {
        const op = src[pos++];
        const r = parseTerm();
        v = op === '+' ? v + r : v - r;
      }
      return v;
    }
    function parseTerm() {
      let v = parseUnary();
      for (;;) {
        const c = peek();
        if (c === '*' || c === '/') {
          pos++;
          const r = parseUnary();
          if (c === '/' && r === 0) throw new Error('Division by zero');
          v = c === '*' ? v * r : v / r;
        } else if (c === '(' || /[a-z]/i.test(c || '')) {
          v = v * parseUnary(); // implicit multiplication: 2pi, 3(4)
        } else break;
      }
      return v;
    }
    function parseUnary() {
      if (peek() === '-') { pos++; return -parseUnary(); }
      if (peek() === '+') { pos++; return parseUnary(); }
      return parsePower();
    }
    function parsePower() {
      let base = parsePostfix();
      if (peek() === '^') {
        pos++;
        const exp = parseUnary(); // right associative
        base = Math.pow(base, exp);
      }
      return base;
    }
    function parsePostfix() {
      let v = parsePrimary();
      for (;;) {
        if (peek() === '!') { pos++; v = fact(v); }
        else if (peek() === '%') { pos++; v = v / 100; }
        else break;
      }
      return v;
    }
    function parsePrimary() {
      const c = peek();
      if (c === undefined) throw new Error('Unexpected end');
      if (c === '(') {
        pos++;
        const v = parseExpr();
        if (peek() !== ')') throw new Error('Missing )');
        pos++;
        return v;
      }
      if (/[0-9.]/.test(c)) {
        const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(pos));
        if (!m) throw new Error('Bad number');
        // avoid treating constant e as exponent when not followed by digits
        pos += m[0].length;
        return parseFloat(m[0]);
      }
      if (/[a-z]/i.test(c)) {
        const m = /^[a-z][a-z0-9]*/i.exec(src.slice(pos));
        let name = m[0].toLowerCase();
        // split things like "2pi" handled by implicit mult; here name starts at letter
        pos += m[0].length;
        if (peek() === '(') {
          if (!(name in funcs)) throw new Error('Unknown function ' + name);
          pos++;
          const args = [];
          if (peek() !== ')') {
            args.push(parseExpr());
            while (peek() === ',') { pos++; args.push(parseExpr()); }
          }
          if (peek() !== ')') throw new Error('Missing )');
          pos++;
          return funcs[name].apply(null, args);
        }
        if (name in consts) return consts[name];
        throw new Error('Unknown name ' + name);
      }
      throw new Error('Unexpected ' + c);
    }

    const result = parseExpr();
    if (pos < src.length) throw new Error('Unexpected ' + src[pos]);
    return result;
  }

  // ---------- Mortgage ----------
  function mortgage(p) {
    const price = +p.price, down = +p.down || 0;
    const years = +p.years, rate = +p.rate;
    const extra = +p.extra || 0;
    const tax = (+p.propertyTaxYear || 0) / 12;
    const ins = (+p.insuranceYear || 0) / 12;
    const hoa = +p.hoaMonth || 0;
    const principal = price - down;
    if (!(principal > 0) || !(years > 0) || rate < 0) throw new Error('Invalid inputs');
    const n = Math.round(years * 12);
    const r = rate / 100 / 12;
    const base = r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n));
    let bal = principal, totalInterest = 0, month = 0;
    const schedule = [];
    while (bal > 0.005 && month < n + 1) {
      month++;
      const interest = bal * r;
      let pay = base + extra;
      let prin = pay - interest;
      if (prin > bal) { prin = bal; pay = prin + interest; }
      bal -= prin;
      totalInterest += interest;
      schedule.push({ month, payment: pay, principal: prin, interest, balance: Math.max(bal, 0) });
    }
    const baseTotalInterest = base * n - principal;
    return {
      principal, monthlyPI: base, monthlyTotal: base + extra + tax + ins + hoa,
      monthlyTaxIns: tax + ins + hoa, totalInterest, totalPaid: principal + totalInterest,
      payoffMonths: month, interestSaved: Math.max(baseTotalInterest - totalInterest, 0),
      monthsSaved: Math.max(n - month, 0), ltv: (principal / price) * 100, schedule
    };
  }

  // ---------- Loan / EMI ----------
  function emi(P, annualRate, months) {
    P = +P; months = +months;
    const r = annualRate / 100 / 12;
    if (!(P > 0) || !(months > 0)) throw new Error('Invalid inputs');
    const e = r === 0 ? P / months : (P * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
    return { emi: e, totalPaid: e * months, totalInterest: e * months - P };
  }

  // ---------- Compound interest ----------
  function compound(P, annualRate, years, perYear, monthlyAdd) {
    P = +P; years = +years; perYear = +perYear || 12; monthlyAdd = +monthlyAdd || 0;
    const r = annualRate / 100;
    const rows = [];
    let bal = P, contributed = P;
    const periods = Math.round(years * perYear);
    const addPerPeriod = (monthlyAdd * 12) / perYear;
    for (let i = 1; i <= periods; i++) {
      bal = bal * (1 + r / perYear) + addPerPeriod;
      contributed += addPerPeriod;
      if (i % perYear === 0 || i === periods) rows.push({ year: +(i / perYear).toFixed(2), balance: bal, contributed });
    }
    return { final: bal, contributed, interest: bal - contributed, rows };
  }

  // ---------- SIP ----------
  function sip(monthly, annualRate, years) {
    monthly = +monthly; years = +years;
    const n = Math.round(years * 12), i = annualRate / 100 / 12;
    if (!(monthly > 0) || !(n > 0)) throw new Error('Invalid inputs');
    const fv = i === 0 ? monthly * n : monthly * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    return { futureValue: fv, invested: monthly * n, gain: fv - monthly * n };
  }

  // ---------- GST / VAT ----------
  function gst(amount, ratePct, mode) {
    amount = +amount; ratePct = +ratePct;
    if (mode === 'inclusive') {
      const base = amount / (1 + ratePct / 100);
      const tax = amount - base;
      return { base, tax, cgst: tax / 2, sgst: tax / 2, total: amount };
    }
    const tax = (amount * ratePct) / 100;
    return { base: amount, tax, cgst: tax / 2, sgst: tax / 2, total: amount + tax };
  }

  // ---------- BMI ----------
  function bmi(weightKg, heightCm) {
    const h = heightCm / 100;
    if (!(weightKg > 0) || !(h > 0)) throw new Error('Invalid inputs');
    const v = weightKg / (h * h);
    let cat = 'Obese';
    if (v < 18.5) cat = 'Underweight'; else if (v < 25) cat = 'Normal'; else if (v < 30) cat = 'Overweight';
    return { bmi: v, category: cat, healthyMin: 18.5 * h * h, healthyMax: 24.9 * h * h };
  }

  // ---------- Percentage ----------
  function percent(kind, a, b) {
    a = +a; b = +b;
    switch (kind) {
      case 'of': return (a / 100) * b;            // a% of b
      case 'is': return (a / b) * 100;            // a is what % of b
      case 'change': return ((b - a) / a) * 100;  // % change a -> b
      default: throw new Error('Unknown kind');
    }
  }

  // ---------- Unit converter ----------
  const units = {
    Length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254 },
    Weight: { kg: 1, g: 0.001, mg: 1e-6, lb: 0.45359237, oz: 0.028349523125, tonne: 1000 },
    Volume: { L: 1, mL: 0.001, gal: 3.785411784, qt: 0.946352946, cup: 0.2365882365, 'fl oz': 0.0295735295625 },
    Area: { 'm²': 1, 'km²': 1e6, 'ft²': 0.09290304, acre: 4046.8564224, hectare: 10000, 'cent (India)': 40.4685642 },
    Speed: { 'm/s': 1, 'km/h': 0.2777777778, mph: 0.44704, knot: 0.5144444444 },
    Data: { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 }
  };
  function convert(category, value, from, to) {
    value = +value;
    if (category === 'Temperature') {
      let c;
      if (from === '°C') c = value; else if (from === '°F') c = (value - 32) * 5 / 9; else c = value - 273.15;
      if (to === '°C') return c; if (to === '°F') return c * 9 / 5 + 32; return c + 273.15;
    }
    const t = units[category];
    return (value * t[from]) / t[to];
  }

  // ---------- Date difference ----------
  function dateDiff(d1, d2) {
    let a = new Date(d1), b = new Date(d2);
    if (isNaN(a) || isNaN(b)) throw new Error('Invalid date');
    if (a > b) { const t = a; a = b; b = t; }
    let y = b.getFullYear() - a.getFullYear();
    let m = b.getMonth() - a.getMonth();
    let d = b.getDate() - a.getDate();
    if (d < 0) { m--; d += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); }
    if (m < 0) { y--; m += 12; }
    const days = Math.round((b - a) / 86400000);
    return { years: y, months: m, days: d, totalDays: days, totalWeeks: Math.floor(days / 7) };
  }

  const api = { evaluate, mortgage, emi, compound, sip, gst, bmi, percent, convert, dateDiff, units };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Calc = api;
})(typeof window !== 'undefined' ? window : globalThis);
