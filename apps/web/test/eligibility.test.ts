import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, parseAnswers } from '../lib/eligibility.ts';

test('home with 4-6 unrelated children -> registered (HRC 42.052)', () => {
  assert.deepEqual(evaluate({ location: 'home', unrelated: '4-6', deed: 'no' }), { outcome: 'registered', permitType: 'registered', deedWarning: null });
});

test('home with 1-3 unrelated, paid -> listed; unpaid -> no listing requirement', () => {
  assert.equal(evaluate({ location: 'home', unrelated: '1-3', paid: true })?.outcome, 'listed');
  assert.equal(evaluate({ location: 'home', unrelated: '1-3' })?.outcome, 'listed'); // unknown pay: assume paid (safer)
  assert.equal(evaluate({ location: 'home', unrelated: '1-3', paid: false })?.outcome, 'unpaid_small');
});

test('home with 7-12 -> licensed home; 13+ -> too many for a home', () => {
  assert.equal(evaluate({ location: 'home', unrelated: '7-12' })?.permitType, 'licensed_home');
  assert.equal(evaluate({ location: 'home', unrelated: '13+' })?.outcome, 'too_many_for_home');
});

test('related children only -> no permit', () => {
  assert.equal(evaluate({ location: 'home', unrelated: '0' })?.outcome, 'related_only');
});

test('away from home: 7+ is a center, fewer is unclear', () => {
  assert.equal(evaluate({ location: 'other', unrelated: '7-12' })?.outcome, 'center');
  assert.equal(evaluate({ location: 'other', unrelated: '4-6' })?.outcome, 'center_small');
});

test('deed restriction warnings only apply at home', () => {
  assert.equal(evaluate({ location: 'home', unrelated: '4-6', deed: 'yes' })?.deedWarning, 'blocker');
  assert.equal(evaluate({ location: 'home', unrelated: '4-6' })?.deedWarning, 'check');
  assert.equal(evaluate({ location: 'other', unrelated: '7-12', deed: 'yes' })?.deedWarning, null);
});

test('incomplete answers -> no result; junk input ignored', () => {
  assert.equal(evaluate({ location: 'home' }), null);
  assert.deepEqual(parseAnswers({ location: 'moon', unrelated: '4-6', paid: 'yes', deed: ['unsure'] }), { location: undefined, unrelated: '4-6', paid: true, deed: 'unsure' });
});
