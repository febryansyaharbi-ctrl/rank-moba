const { test } = require('node:test');
const assert = require('node:assert/strict');
const { series, previousMonth, monthDays, groups } = require('../monitoring.js');
const player = points => ({ history: { '2026-09': { 1: 3, 2: 4 }, '2026-10': { 1: 0, 2: points } } });
for (const [points, expected] of [[7, 0], [8, 1], [6, -1]]) test(`carry -3 versus 4: ${points} points produces ${expected}`, () => {
 const days = series([player(points)], '2026-10');
 assert.equal(days[0].balance, -3); assert.equal(days[1].opponent, 4);
 assert.equal(days[1].balance, expected); assert.equal(days[1].breakEven, 7); assert.equal(days[1].winTarget, 8);
});
test('positive balances also carry forward', () => {
 const p = player(0); p.history['2026-10'][1] = 10;
 const d = series([p], '2026-10')[1]; assert.equal(d.before, 7); assert.equal(d.balance, 3); assert.equal(d.winTarget, 0);
});
test('team actuals, opponents, and balances equal sum of players', () => {
 const members = [player(8), player(6)]; const team = series(members, '2026-10');
 for (let d = 0; d < 31; d++) for (const field of ['actual','opponent','balance']) assert.equal(team[d][field], members.reduce((n,p)=>n+series([p],'2026-10')[d][field],0));
 assert.equal(team[1].actual,14); assert.equal(team[1].balance,0);
});
test('January previous month and leap years', () => {
 assert.equal(previousMonth('2026-01'),'2025-12'); assert.equal(monthDays('2024-02'),29); assert.equal(monthDays('2026-02'),28);
});
test('absent date in previous month uses zero opponent', () => {
 const d=series([{history:{'2026-03':{31:5}}}],'2026-03')[30];
 assert.equal(d.hasOpponentDate,false);assert.equal(d.opponent,0);assert.equal(d.actual,5);
});
test('missing values are marked provisional; explicit zero is recorded', () => {
 const a=series([player(8)],'2026-10');assert.equal(a[0].recorded,1);assert.equal(a[0].provisional,false);assert.equal(a[2].provisional,true);
});
test('month starts with zero balance regardless of earlier months', () => {
 const p=player(8);p.history['2026-08']={1:999};assert.equal(series([p],'2026-10')[0].before,0);
});
test('orphan and independent players are included exactly once', () => {
 const players=[{id:'a',guild_id:'g'},{id:'b',guild_id:'deleted'},{id:'c'}];const g=groups(players,[{id:'g',name:'A'}]);
 assert.equal(g.flatMap(x=>x.members).length,3);assert.equal(g[1].members.length,2);
});
