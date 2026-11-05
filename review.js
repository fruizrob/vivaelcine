const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const storageKey = 'vivaelcine-film-review-v1';
let data, selected, choices = {}, overrides = {}, storageAvailable = true;
const candidateSelection = new Map();
const choiceKey = (row, id = 'film') => `${row.key}::${id}`;
const safeUrl = value => { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };
const link = (url, title) => safeUrl(url) ? `<a href="${escape(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${escape(title)} ↗</a>` : '';
const decisionLabel = { accepted: 'Correct match', rejected: 'Wrong match', unsure: 'Unsure', no_match: 'None correct' };

function currentChoice(row, id = 'film') {
  const choice = choices[choiceKey(row, id)];
  if (choice?.decision === 'pending') return null;
  const candidate = row.candidates.find(c => c.id === id);
  return choice?.sourceFingerprint === row.sourceFingerprint
    && (id === 'film' || choice.candidateFingerprint === candidate?.fingerprint) ? choice : null;
}

function setChoice(key, choice) {
  choices[key] = choice;
  overrides[key] = choice;
}

function clearChoice(row, id = 'film') {
  // Keep an explicit override so clearing a sourced default survives reload.
  setChoice(choiceKey(row, id), { key: row.key, tmdbId: id === 'film' ? null : id,
    sourceFingerprint: row.sourceFingerprint, decision: 'pending' });
}

function rowStatus(row) {
  const disposition = currentChoice(row);
  if (disposition?.decision === 'unsure') return null;
  if (disposition) return decisionLabel[disposition.decision];
  if (row.candidates.some(c => currentChoice(row, c.id)?.decision === 'accepted')) return 'Correct match';
  if (row.status === 'matched' && !row.candidates.some(c => choices[choiceKey(row, c.id)]?.decision === 'pending')) return 'Correct match';
  if (row.candidates.length && row.candidates.every(c => currentChoice(row, c.id)?.decision === 'rejected')) return 'None correct';
  return null;
}

function filteredRows(includeSelected = true) {
  const query = $('#search').value.trim().toLocaleLowerCase();
  const filter = $('#filter').value;
  return data.rows.filter(row => `${row.title} ${row.director} ${row.festival}`.toLocaleLowerCase().includes(query)
    && (filter === 'all' || (filter === 'reviewed' ? !!rowStatus(row) : !rowStatus(row)) || (includeSelected && row.key === selected)));
}

function renderQueue() {
  const reviewed = data.rows.filter(rowStatus).length;
  $('#progress').textContent = `${reviewed} of ${data.rows.length} reviewed · ${data.rows.length - reviewed} remaining`;
  const count = validChoices().length;
  $('#export').disabled = !count;
  $('#export-count').textContent = count ? `(${count})` : '';
  $('#queue').innerHTML = filteredRows().map(row => `<button class="queue-item" data-key="${escape(row.key)}" aria-current="${row.key === selected}">
    <strong>${escape(row.title)}</strong><small>${escape(row.festival)} · ${escape(rowStatus(row) || (row.candidates.length ? 'To review' : 'No candidates'))}</small></button>`).join('') || '<p class="context">No films found.</p>';
}

const metadata = (label, value, different = false) => `<div><dt>${label}</dt><dd${different ? ' class="difference"' : ''}>${escape(value || 'Unknown')}</dd></div>`;
const reasons = {
  review_pending: 'A plausible match needs confirmation.', search_truncated: 'Search reached its limit. Other matches may exist.',
  no_accepted_candidate: 'No candidate passed every check.', multiple_passing_candidates: 'More than one candidate passed the checks.',
  provider_unavailable: 'The previously linked TMDB record is unavailable.', provider_identity_changed: 'The linked TMDB identity changed.',
  source_identity_changed: 'Catalogue details changed since the previous decision.', provider_id_in_use: 'This TMDB record already belongs to another film.',
};

function renderDetail() {
  const row = data.rows.find(r => r.key === selected);
  if (!row) {
    $('#review').innerHTML = '<div class="empty"><h2>Queue clear</h2><p>Change the filter to revisit decisions. Export your decisions when finished.</p></div>';
    return;
  }
  const preferred = row.candidates.find(c => currentChoice(row, c.id)?.decision === 'accepted') || row.candidates[0];
  const candidate = row.candidates.find(c => c.id === candidateSelection.get(row.key)) || preferred;
  const saved = candidate && currentChoice(row, candidate.id);
  const disposition = currentChoice(row);
  const draft = disposition || saved;
  const stale = Object.values(choices).some(choice => choice.key === row.key && choice.decision !== 'pending' && !currentChoice(row, choice.tmdbId ?? 'film'));
  const difference = (problem, label) => candidate?.problems.includes(problem) ? label : '';
  $('#review').innerHTML = `
    <p class="eyebrow">${escape(row.festival)}</p><h2>${escape(row.title)}</h2>
    <p class="context">${escape(row.reviewReason || reasons[row.reason] || 'Confirm the film identity.')} ${stale ? 'Saved observations changed; review again.' : ''}</p>
    <div class="comparison">
      <article class="panel"><h3>Festival catalogue</h3><p class="film-title">${escape(row.title)}</p>
        <p class="original">${escape(row.originalTitle !== row.title ? row.originalTitle : '')}</p>
        <dl>${metadata('Director', row.director)}${metadata('Year', row.year)}${metadata('Runtime', row.duration ? `${row.duration} min` : '')}${metadata('Country', row.countries)}</dl>
        <div class="links">${link(row.source, 'Official film page')}${link(row.letterboxd ? `https://letterboxd.com/film/${row.letterboxd}/` : '', 'Letterboxd')}${link(row.yearSource, 'Year source')}</div>
      </article>
      <article class="panel"><h3>TMDB candidate${candidate ? ` · ${candidate.id}` : ''}</h3>
        ${candidate ? `${candidate.poster ? `<img class="poster" src="https://image.tmdb.org/t/p/w185${escape(candidate.poster)}" alt="Poster for ${escape(candidate.title)}">` : ''}
        <p class="film-title">${escape(candidate.title)}</p><p class="original">${escape(candidate.originalTitle !== candidate.title ? candidate.originalTitle : '')}</p>
        <dl>${metadata('Director', candidate.directors.join(', '), candidate.problems.includes('director'))}
        ${metadata('Year', candidate.year, !!row.year && row.year !== candidate.year)}
        ${metadata('Runtime', candidate.duration ? `${candidate.duration} min` : '', candidate.problems.includes('runtime'))}${metadata('Country', candidate.countries)}</dl>
        <div class="links">${link(`https://www.themoviedb.org/movie/${candidate.id}`, 'TMDB')}${link(`https://www.themoviedb.org/movie/${candidate.id}/releases`, 'Release dates')}${link(candidate.imdbId ? `https://www.imdb.com/title/${candidate.imdbId}/` : '', 'IMDb')}</div>
        <p class="flags">${escape([difference('title', 'Title differs'), difference('director', 'Director name differs'), difference('year', 'Year differs'), difference('runtime', 'Runtime differs'), difference('unavailable', 'Cached details unavailable'), candidate.registryStatus === 'rejected' ? 'Previously rejected' : ''].filter(Boolean).join(' · ') || 'No flagged differences in the saved checks.')}</p>
        ${candidate.overview ? `<p class="synopsis">${escape(candidate.overview)}</p>` : ''}
        ${candidate.evidence.length ? `<details><summary>Previous review notes</summary><ul class="evidence">${candidate.evidence.map(e => `<li>${escape(e.note)} ${link(e.source, 'Source')}</li>`).join('')}</ul></details>` : ''}`
        : '<p class="context">No cached candidates. Use the official film page to identify the work; leave a note or mark unsure.</p>'}
      </article>
    </div>
    ${row.candidates.length > 1 ? `<div class="candidate-picker"><label for="candidate">Compare another candidate · ${row.candidates.length} available</label>
      <select id="candidate">${row.candidates.map(c => `<option value="${c.id}"${c.id === candidate.id ? ' selected' : ''}>${escape(`${c.title} · ${c.year || 'year unknown'} · ${c.directors.join(', ') || 'director unknown'} · #${c.id}${c.registryStatus === 'needs_review' ? ' · suggested' : ''}${currentChoice(row, c.id) ? ` · ${decisionLabel[currentChoice(row, c.id).decision]}` : ''}`)}</option>`).join('')}</select></div>` : ''}
    <div class="review-form">
      <label for="evidence">Evidence URL <span>(optional)</span></label><input id="evidence" type="url" placeholder="Official festival, producer or distributor page" value="${escape(draft?.evidence || '')}">
      <label for="note">Note <span>(optional)</span></label><textarea id="note" rows="2" placeholder="Alternate title, director spelling, different cut…">${escape(draft?.note || '')}</textarea>
      <div class="actions">
        <button class="accept" data-decision="accepted" aria-pressed="${saved?.decision === 'accepted'}"${!candidate ? ' disabled' : ''}>Correct match</button>
        <button data-decision="rejected" aria-pressed="${saved?.decision === 'rejected'}"${!candidate ? ' disabled' : ''}>Wrong match</button>
        <button data-decision="unsure" aria-pressed="${disposition?.decision === 'unsure'}">Unsure</button>
        <button data-decision="no_match" aria-pressed="${disposition?.decision === 'no_match'}"${!candidate ? ' disabled' : ''}>None correct</button>
        ${saved || disposition ? '<button id="clear">Clear decision</button>' : ''}
        <button id="next">Next →</button>
      </div>
      <p class="review-status" role="status">${escape(disposition ? `${decisionLabel[disposition.decision]} saved.` : saved ? `${decisionLabel[saved.decision]} saved for TMDB ${candidate.id}.` : 'No decision yet.')}</p>
    </div>
    <div class="navigation"><button id="previous">← Previous</button><p>Screening runtimes stay unchanged.</p></div>`;
  $('#candidate')?.addEventListener('change', event => {
    candidateSelection.set(row.key, Number(event.target.value)); renderDetail(); $('#candidate')?.focus({ preventScroll: true });
  });
  $('#review').querySelectorAll('[data-decision]').forEach(button => button.addEventListener('click', () => {
    const decision = button.dataset.decision;
    const filmDecision = ['unsure', 'no_match'].includes(decision);
    // A film has one accepted identity; rejecting one candidate leaves the others available.
    clearChoice(row);
    if (decision !== 'rejected') {
      for (const c of row.candidates) if (currentChoice(row, c.id)?.decision === 'accepted') clearChoice(row, c.id);
    }
    setChoice(choiceKey(row, filmDecision ? 'film' : candidate.id), {
      key: row.key, sourceFingerprint: row.sourceFingerprint, tmdbId: filmDecision ? null : candidate.id,
      candidateFingerprint: filmDecision ? null : candidate.fingerprint, decision,
      evidence: $('#evidence').value.trim(), note: $('#note').value.trim(), reviewedAt: new Date().toISOString(),
    });
    persist(); renderQueue(); renderDetail();
    $(`[data-decision="${decision}"]`).focus({ preventScroll: true });
  }));
  $('#clear')?.addEventListener('click', () => {
    if (disposition) clearChoice(row);
    else if (candidate) clearChoice(row, candidate.id);
    persist(); renderQueue(); renderDetail();
    $('[data-decision="unsure"]').focus({ preventScroll: true });
  });
  for (const selector of ['#note', '#evidence']) $(selector).addEventListener('input', () => {
    const choice = currentChoice(row) || (candidate && currentChoice(row, candidate.id));
    if (choice) {
      setChoice(choiceKey(row, choice.tmdbId ?? 'film'), { ...choice, note: $('#note').value.trim(), evidence: $('#evidence').value.trim() });
      persist();
    }
  });
  $('#previous').addEventListener('click', () => navigate(-1));
  $('#next').addEventListener('click', () => navigate(1));
  $('#review').querySelector('img')?.addEventListener('error', event => { event.target.hidden = true; });
}

function navigate(direction) {
  const rows = filteredRows();
  const index = rows.findIndex(row => row.key === selected);
  const next = rows[index + direction];
  selected = next?.key || (direction > 0 ? filteredRows(false).find(row => row.key !== selected)?.key : rows[0]?.key);
  renderQueue(); renderDetail();
  $('#review h2')?.scrollIntoView({ block: 'nearest' });
}

function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, choices: overrides })); }
  catch { storageAvailable = false; }
  $('#storage-status').textContent = storageAvailable
    ? 'Saved in this browser. Export your decisions when finished; nothing is published automatically.'
    : 'Browser storage unavailable. Export decisions before closing this page.';
}

function validChoices() {
  return Object.values(choices).filter(choice => {
    const row = data.rows.find(r => r.key === choice.key);
    return row && currentChoice(row, choice.tmdbId ?? 'film') === choice;
  });
}

$('#export').addEventListener('click', () => {
  const reviews = validChoices().map(choice => {
    const row = data.rows.find(r => r.key === choice.key);
    const candidate = row.candidates.find(c => c.id === choice.tmdbId);
    return { ...choice, title: row.title, catalogueSource: row.source, yearSource: row.yearSource,
      candidate: candidate ? { title: candidate.title, directors: candidate.directors, year: candidate.year,
        duration: candidate.duration, imdbId: candidate.imdbId, directorIds: candidate.directorIds,
        source: `https://www.themoviedb.org/movie/${candidate.id}`, retrievedAt: candidate.retrievedAt } : null };
  });
  const blob = new Blob([`${JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), observationsGeneratedAt: data.generatedAt, reviews }, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = `vivaelcine-reviews-${new Date().toISOString().slice(0, 10)}.json`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

$('#queue').addEventListener('click', event => {
  const button = event.target.closest('[data-key]');
  if (button) { selected = button.dataset.key; renderQueue(); renderDetail(); }
});
for (const selector of ['#search', '#filter']) $(selector).addEventListener(selector === '#search' ? 'input' : 'change', () => {
  selected = filteredRows(false)[0]?.key; renderQueue(); renderDetail();
});

try {
  const [response, defaultsResponse] = await Promise.all([
    fetch('./assets/tmdb/review-data.json', { cache: 'no-store' }),
    fetch('./data/film-review-decisions.json', { cache: 'no-store' }),
  ]);
  if (!response.ok || !defaultsResponse.ok) throw new Error('Review data unavailable');
  data = await response.json();
  const defaults = await defaultsResponse.json();
  if (defaults.version !== 1 || !Array.isArray(defaults.reviews)) throw new Error('Invalid review defaults');
  for (const choice of defaults.reviews) choices[`${choice.key}::${choice.tmdbId ?? 'film'}`] = choice;
  const pending = new Map((defaults.pending || []).map(item => [item.key, item.reason]));
  for (const row of data.rows) if (pending.has(row.key)) row.reviewReason = pending.get(row.key);
  data.rows.sort((a, b) => Number(!pending.has(a.key)) - Number(!pending.has(b.key)));
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved?.version === 1 && saved.choices && typeof saved.choices === 'object') overrides = saved.choices;
  } catch { storageAvailable = false; }
  choices = { ...choices, ...overrides };
  selected = data.rows.find(row => !rowStatus(row))?.key;
  persist(); renderQueue(); renderDetail();
} catch {
  $('#storage-status').textContent = 'Could not load the review queue. Start the local server and run npm run import:tmdb -- --offline, then reload.';
}
