import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildContestResultsCsv } from '../src/lib/contestExport.ts';

const entries = [
  {teamId:'a',familyName:'Daniel',title:'Selfie',votes:9},
  {teamId:'b',familyName:'Minkoo',title:'Nature',votes:9},
  {teamId:'c',familyName:'Simon',title:'Play',votes:2},
  {teamId:'d',familyName:'Luke',title:'Jump',votes:0},
];
test('operator tie order wins over vote ordering and preserves unpublished awards', () => {
  const csv = buildContestResultsCsv(entries, [{teamId:'b',rank:1},{teamId:'a',rank:2},{teamId:'c',rank:3}], 'story chosen', [3]);
  const lines = csv.split('\n');
  assert.match(lines[1], /^"1","Minkoo".*"발표 대기","story chosen"$/);
  assert.match(lines[2], /^"2","Daniel"/);
  assert.match(lines[3], /^"3","Simon".*"공개"/);
  assert.match(lines[4], /^"","Luke".*"수상 대상 아님"/);
});
test('no saved awards means unconfirmed tally, not invented ranks', () => {
  const csv = buildContestResultsCsv(entries, [], '', []);
  assert.match(csv.split('\n')[1], /^"","Daniel".*"미확정 · 득표 집계"/);
});
test('escapes CSV quotes and prevents participant formula execution', () => {
  const csv = buildContestResultsCsv([{...entries[0],familyName:'=1+1',title:'a,"b"'}], [], '', []);
  assert.ok(csv.includes('"\'=1+1"'));
  assert.ok(csv.includes('"a,""b"""'));
});
