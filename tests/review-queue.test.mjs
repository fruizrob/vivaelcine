import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reviewData } from '../scripts/tmdb-review-data.mjs';

test('review rows use the registered festival name, including FICVIÑA', async () => {
  const key = 'ficvina-2026/film';
  const cache = await mkdtemp(join(tmpdir(), 'vivaelcine-queue-festival-'));
  const queue = await reviewData(new Map([[key, { title: 'Film', director: 'Director' }]]),
    [{ key, status: 'unmatched', candidates: [] }], { films: [] }, cache,
    [{ id: 'ficvina-2026', name: 'FICVIÑA 38' }]);
  assert.equal(queue.rows[0].festival, 'FICVIÑA 38');
});

test('sourced queue approvals reference unchanged catalogue/candidates and one provider identity per film', async () => {
  const queue = JSON.parse(await readFile(new URL('../assets/tmdb/review-data.json', import.meta.url), 'utf8'));
  const decisions = JSON.parse(await readFile(new URL('../data/film-review-decisions.json', import.meta.url), 'utf8'));
  assert.equal(decisions.version, 1);
  const keys = new Set(), providerIds = new Set();
  for (const decision of decisions.reviews) {
    const row = queue.rows.find(r => r.key === decision.key);
    const candidate = row?.candidates.find(c => c.id === decision.tmdbId);
    assert.ok(row, `Missing review target: ${decision.key}`);
    assert.equal(decision.sourceFingerprint, row.sourceFingerprint, decision.key);
    if (decision.decision !== 'accepted') continue;
    assert.ok(candidate, `Missing candidate: ${decision.key}`);
    assert.equal(decision.candidateFingerprint, candidate.fingerprint, decision.key);
    assert.equal(decision.decision, 'accepted');
    assert.ok(!keys.has(row.key) && !providerIds.has(candidate.id), `Duplicate approval: ${row.key}`);
    keys.add(row.key); providerIds.add(candidate.id);
    assert.ok(decision.reviewedAt && decision.reviewedBy, row.key);
    assert.ok(decision.supportingEvidence.length, row.key);
    for (const evidence of decision.supportingEvidence) {
      assert.match(evidence.source, /^https:\/\//, row.key);
      assert.ok(evidence.note, row.key);
    }
  }
  for (const pending of decisions.pending || []) {
    assert.ok(queue.rows.some(row => row.key === pending.key), `Missing difficult case: ${pending.key}`);
    assert.ok(!keys.has(pending.key), `Difficult case also approved: ${pending.key}`);
    assert.ok(pending.reason, pending.key);
  }
});
