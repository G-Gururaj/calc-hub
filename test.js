// Run with: node test.js
const C = require('./calc.js');
let pass = 0, fail = 0;
function eq(name, got, want, tol = 1e-6) {
  const ok = Math.abs(got - want) <= tol * Math.max(1, Math.abs(want));
  ok ? pass++ : fail++;
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + '  got=' + got + ' want=' + want);
}
const E = (s, o) => C.evaluate(s, o);

// Scientific
eq('2+3*4', E('2+3*4'), 14);
eq('(2+3)*4', E('(2+3)*4'), 20);
eq('2^10', E('2^10'), 1024);
eq('2^3^2 right-assoc', E('2^3^2'), 512);
eq('-2^2', E('-2^2'), -4);
eq('5!', E('5!'), 120);
eq('sin(30) deg', E('sin(30)'), 0.5);
eq('cos(60) deg', E('cos(60)'), 0.5);
eq('sin(pi/2) rad', E('sin(pi/2)', { angle: 'rad' }), 1);
eq('log(1000)', E('log(1000)'), 3);
eq('ln(e)', E('ln(e)'), 1);
eq('sqrt(144)', E('sqrt(144)'), 12);
eq('50%', E('50%'), 0.5);
eq('2pi implicit mult', E('2pi'), 2 * Math.PI);
eq('ncr(5,2)', E('ncr(5,2)'), 10);
eq('npr(5,2)', E('npr(5,2)'), 20);
eq('ans', E('ans*2', { ans: 21 }), 42);
eq('asin(0.5) deg', E('asin(0.5)'), 30);
eq('1.5e3', E('1.5e3'), 1500);
eq('0.1+0.2 ok', E('0.1+0.2'), 0.3);
let threw = false; try { E('1/0'); } catch (e) { threw = true; }
threw ? pass++ : fail++; console.log((threw ? 'PASS' : 'FAIL') + '  1/0 throws');
threw = false; try { E('2+*'); } catch (e) { threw = true; }
threw ? pass++ : fail++; console.log((threw ? 'PASS' : 'FAIL') + '  bad syntax throws');
threw = false; try { E('process.exit()'); } catch (e) { threw = true; }
threw ? pass++ : fail++; console.log((threw ? 'PASS' : 'FAIL') + '  code injection rejected');

// Mortgage: 400k @ 6.5% 30y -> 2528.27
const m = C.mortgage({ price: 500000, down: 100000, rate: 6.5, years: 30 });
eq('mortgage monthly', m.monthlyPI, 2528.27, 1e-4);
eq('mortgage payoff months', m.payoffMonths, 360, 0);
eq('mortgage total interest', m.totalInterest, 2528.27 * 360 - 400000, 1e-3);
eq('mortgage ends at 0', m.schedule[m.schedule.length - 1].balance, 0, 1e-6);
const mx = C.mortgage({ price: 500000, down: 100000, rate: 6.5, years: 30, extra: 500 });
eq('extra payment shortens term', mx.payoffMonths < 360 ? 1 : 0, 1, 0);
eq('zero-rate mortgage', C.mortgage({ price: 120000, down: 0, rate: 0, years: 10 }).monthlyPI, 1000);

// EMI: 10L @ 9% 120m -> 12667.58
eq('EMI', C.emi(1000000, 9, 120).emi, 12667.58, 1e-4);
// SIP: 10000/m @12% 15y (annuity-due) ~ 5,046,000
eq('SIP', C.sip(10000, 12, 15).futureValue, 5046000, 2e-2);
// Compound: 10000 @7% monthly 10y no add -> 20096.61
eq('Compound', C.compound(10000, 7, 10, 12, 0).final, 20096.61, 1e-4);
// GST
eq('GST exclusive', C.gst(1000, 18, 'exclusive').total, 1180);
eq('GST inclusive base', C.gst(1180, 18, 'inclusive').base, 1000);
// BMI
eq('BMI', C.bmi(70, 170).bmi, 24.22, 1e-3);
// Percent
eq('15% of 200', C.percent('of', 15, 200), 30);
eq('30 is % of 200', C.percent('is', 30, 200), 15);
eq('change 50->75', C.percent('change', 50, 75), 50);
// Units
eq('1 mi to km', C.convert('Length', 1, 'mi', 'km'), 1.609344);
eq('100C to F', C.convert('Temperature', 100, '°C', '°F'), 212);
eq('1 GB to MB', C.convert('Data', 1, 'GB', 'MB'), 1024);
// Dates
const d = C.dateDiff('2020-01-15', '2026-11-03');
eq('date years', d.years, 6, 0); eq('date months', d.months, 9, 0); eq('date days', d.days, 19, 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
