(function () {
  const opportunities = window.OPPORTUNITIES || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const icons = {
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
    award: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="5"/><path d="M8.5 12 7 22l5-3 5 3-1.5-10"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
    location: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 13 4 4L19 7"/></svg>'
  };

  function esc(v) {
    return String(v ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[c]));
  }

  function parseDate(iso) {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function daysUntil(iso) {
    const d = parseDate(iso);
    if (!d) return null;
    return Math.ceil((d - today) / 86400000);
  }

  function getStatus(op) {
    if (op.statusOverride) {
      const lower = op.statusOverride.toLowerCase();
      const upcomingSignals = ['opening', 'opens ', 'upcoming', 'pending', 'interest form'];
      if (upcomingSignals.some(signal => lower.includes(signal))) return { label: op.statusOverride, cls: 'upcoming' };
      if (lower.includes('open')) return { label: op.statusOverride, cls: 'open' };
      return { label: op.statusOverride, cls: 'rolling' };
    }
    if (op.rolling) return { label: 'Rolling', cls: 'rolling' };
    const open = parseDate(op.openDate);
    const deadline = parseDate(op.deadline);
    if (open && today < open) return { label: 'Upcoming', cls: 'upcoming' };
    if (deadline && today <= deadline) return { label: 'Open', cls: 'open' };
    if (deadline && today > deadline) return { label: 'Closed', cls: 'closed' };
    return { label: 'Check official site', cls: 'rolling' };
  }

  function deadlineText(op) {
    const status = getStatus(op);
    if (op.rolling) return op.deadlineNote || 'Rolling';
    if (status.cls === 'upcoming' && op.openDate) {
      const diff = daysUntil(op.openDate);
      if (diff !== null && diff >= 0 && diff <= 120) return `Opens in ${diff} day${diff === 1 ? '' : 's'}`;
    }
    if (op.deadline) {
      const diff = daysUntil(op.deadline);
      if (diff !== null && diff >= 0 && diff <= 180) return `${diff} day${diff === 1 ? '' : 's'} left`;
    }
    return op.deadlineNote || 'See official page';
  }

  function statusPill(op) {
    const st = getStatus(op);
    return `<span class="pill pill-${st.cls}">${esc(st.label)}</span>`;
  }

  function getSaved() {
    try { return JSON.parse(localStorage.getItem('opportunitybridge-saved') || '[]'); }
    catch { return []; }
  }

  function setSaved(ids) {
    try { localStorage.setItem('opportunitybridge-saved', JSON.stringify(ids)); return true; }
    catch { return false; }
  }
  function isSaved(id) { return getSaved().includes(id); }

  function updateSavedCounts() {
    const count = getSaved().length;
    document.querySelectorAll('[data-saved-count]').forEach(el => { el.textContent = count; });
  }

  let toastTimer;
  function showToast(title, copy) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    const titleEl = document.getElementById('toast-title');
    const copyEl = document.getElementById('toast-copy');
    if (titleEl) titleEl.textContent = title;
    if (copyEl) copyEl.textContent = copy;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function toggleSaved(id) {
    let ids = getSaved();
    const wasSaved = ids.includes(id);
    ids = wasSaved ? ids.filter(x => x !== id) : [...ids, id];
    setSaved(ids);
    document.querySelectorAll(`[data-save="${CSS.escape(id)}"]`).forEach(btn => {
      btn.classList.toggle('saved', ids.includes(id));
      btn.setAttribute('aria-label', ids.includes(id) ? 'Remove from saved' : 'Save opportunity');
      btn.title = ids.includes(id) ? 'Remove from saved' : 'Save opportunity';
      if (btn.matches('.modal-footer .btn')) btn.textContent = ids.includes(id) ? 'Saved' : 'Save opportunity';
    });
    updateSavedCounts();
    showToast(wasSaved ? 'Removed from saved' : 'Saved to your list', wasSaved ? 'You can add it again at any time.' : 'Use the Saved filter to see it later.');
    document.dispatchEvent(new CustomEvent('savedChanged'));
  }

  function orgInitials(name) {
    const cleaned = String(name || '').replace(/\([^)]*\)/g, '').replace(/[^A-Za-z0-9 ]/g, ' ').trim();
    const parts = cleaned.split(/\s+/).filter(Boolean).filter(w => !['the','of','and','for','foundation','program'].includes(w.toLowerCase()));
    if (!parts.length) return 'OB';
    if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
    return parts.slice(0, 3).map(w => w[0]).join('').toUpperCase();
  }

  function toneFor(op) {
    const str = `${op.organization}${op.name}`;
    let sum = 0;
    for (let i = 0; i < str.length; i++) sum += str.charCodeAt(i);
    return sum % 5;
  }

  function tagsFor(op) {
    const tags = [op.type];
    if (op.lowIncomeFocus) tags.push('Financial need');
    if (op.pellRequired) tags.push('Pell required');
    if (op.firstGenPriority) tags.push('First-gen friendly');
    if (op.inequitableAccessFocus) tags.push('Access-focused');
    return tags.slice(0, 4);
  }

  function cardHTML(op, opts = {}) {
    const saved = isSaved(op.id);
    const match = opts.match;
    const reasons = opts.reasons || [];
    const tone = toneFor(op);
    const matchUI = typeof match === 'number'
      ? `<div class="match-ring" style="--match:${match}" aria-label="${match}% match"><span>${match}%</span></div>`
      : '';
    const deadline = deadlineText(op);
    return `
      <article class="opportunity-card" data-opportunity-id="${esc(op.id)}">
        <div class="card-top">
          <div class="org-avatar tone-${tone}">${esc(orgInitials(op.organization))}</div>
          <div class="card-title-wrap"><div class="org">${esc(op.organization)}</div><h3>${esc(op.name)}</h3></div>
          <button class="bookmark ${saved ? 'saved' : ''}" data-save="${esc(op.id)}" aria-label="${saved ? 'Remove from saved' : 'Save opportunity'}" title="${saved ? 'Remove from saved' : 'Save opportunity'}">${icons.bookmark}</button>
        </div>
        <div class="card-status-row"><div class="card-tags">${statusPill(op)}${tagsFor(op).slice(0, 2).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>${matchUI}</div>
        <p class="card-summary">${esc(op.summary)}</p>
        ${reasons.length ? `<div class="match-reasons"><strong>Why it may fit</strong><div class="reason-list">${reasons.slice(0, 4).map(r => `<span class="reason">${esc(r)}</span>`).join('')}</div></div>` : ''}
        <div class="card-meta">
          <div class="meta-box">${icons.calendar}<span><strong>${esc(deadline)}</strong><br>${esc(op.deadlineNote || 'See official page for timing')}</span></div>
          <div class="meta-box">${icons.award}<span>${esc(op.award)}</span></div>
        </div>
        <div class="verification-line">${icons.shield}<span>Verified ${esc(op.verified)} · official source</span></div>
        <div class="card-actions"><button class="btn btn-secondary btn-sm" data-details="${esc(op.id)}">View details</button><a class="btn btn-primary btn-sm" href="${esc(op.sourceUrl)}" target="_blank" rel="noopener">Official site ${icons.arrow}</a></div>
      </article>`;
  }

  function bindCards(root = document) {
    root.querySelectorAll('[data-save]').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => toggleSaved(btn.dataset.save));
    });
    root.querySelectorAll('[data-details]').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => openModal(btn.dataset.details));
    });
  }

  function openModal(id) {
    const op = opportunities.find(o => o.id === id);
    const backdrop = document.getElementById('opportunity-modal');
    if (!op || !backdrop) return;
    const saved = isSaved(op.id);
    const tone = toneFor(op);
    backdrop.querySelector('.modal-content').innerHTML = `
      <div class="modal-title-row"><div class="org-avatar tone-${tone}">${esc(orgInitials(op.organization))}</div><div><div class="card-tags">${statusPill(op)} ${tagsFor(op).slice(0, 3).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div><h2>${esc(op.name)}</h2><div class="org">${esc(op.organization)}</div></div></div>
      <p class="modal-lead">${esc(op.summary)}</p>
      <div class="modal-grid">
        <div class="modal-section"><h3>What it offers</h3><p>${esc(op.award)}</p></div>
        <div class="modal-section"><h3>Timing</h3><p><strong>${esc(deadlineText(op))}</strong><br>${esc(op.deadlineNote || 'See the official site for current timing.')}</p></div>
        <div class="modal-section full"><h3>Key eligibility to check</h3><ul>${op.requirements.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>
        <div class="modal-section"><h3>Location / citizenship</h3><p>${esc(op.locations.join(', '))}. ${esc(op.citizenship || '')}</p></div>
        <div class="modal-section"><h3>Source verification</h3><p>${esc(op.sourceLabel)}. Verified ${esc(op.verified)}. Final eligibility and deadlines are controlled by the official program site.</p></div>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" data-save="${esc(op.id)}">${saved ? 'Saved' : 'Save opportunity'}</button><a class="btn btn-primary" href="${esc(op.sourceUrl)}" target="_blank" rel="noopener">Visit official site ${icons.arrow}</a></div>`;
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
    bindCards(backdrop);
    backdrop.querySelector('.modal-close')?.focus();
  }

  function closeModal() {
    const backdrop = document.getElementById('opportunity-modal');
    if (!backdrop) return;
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  function initNav() {
    const menu = document.querySelector('.mobile-menu');
    const links = document.querySelector('.nav-links');
    if (menu && links) {
      menu.addEventListener('click', () => {
        const open = links.classList.toggle('open');
        menu.setAttribute('aria-expanded', String(open));
      });
      links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
        links.classList.remove('open');
        menu.setAttribute('aria-expanded', 'false');
      }));
    }
    updateSavedCounts();
  }

  function initModal() {
    const backdrop = document.getElementById('opportunity-modal');
    if (!backdrop) return;
    backdrop.querySelector('.modal-close')?.addEventListener('click', closeModal);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  }

  function initHome() {
    const featured = document.getElementById('featured-opportunities');
    if (featured) {
      const ranked = opportunities
        .filter(o => ['open', 'upcoming', 'rolling'].includes(getStatus(o).cls))
        .sort((a, b) => (parseDate(a.deadline)?.getTime() || Number.MAX_SAFE_INTEGER) - (parseDate(b.deadline)?.getTime() || Number.MAX_SAFE_INTEGER))
        .slice(0, 6);
      featured.innerHTML = ranked.map(o => cardHTML(o)).join('');
      bindCards(featured);
    }
    const total = opportunities.length;
    const open = opportunities.filter(o => ['open', 'rolling'].includes(getStatus(o).cls)).length;
    const count = document.getElementById('opportunity-count');
    const openCount = document.getElementById('open-count');
    const floatCount = document.getElementById('float-program-count');
    if (count) count.textContent = total;
    if (openCount) openCount.textContent = open;
    if (floatCount) floatCount.textContent = `${total} verified programs`;

    const quick = document.getElementById('quick-match-form');
    quick?.addEventListener('submit', e => {
      e.preventDefault();
      const stage = quick.elements.stage.value;
      const interest = quick.elements.interest.value;
      const params = new URLSearchParams();
      if (stage) params.set('stage', stage);
      if (interest) params.set('interest', interest);
      location.href = `discover.html?${params.toString()}`;
    });
  }

  function profileFromForm(form) {
    const val = name => form.elements[name]?.value || '';
    const checked = name => !!form.elements[name]?.checked;
    const identities = Array.from(form.querySelectorAll('input[name="identity"]:checked')).map(x => x.value);
    return {
      stage: val('stage'), interest: val('interest'), state: val('state'),
      lowIncome: checked('lowIncome'), pell: checked('pell'), firstGen: checked('firstGen'), inequitableAccess: checked('inequitableAccess'), identities
    };
  }

  function scoreOpportunity(op, profile) {
    let score = 22;
    const reasons = [];
    let hardMismatch = false;
    if (profile.stage) {
      if (op.audience.includes(profile.stage)) { score += 30; reasons.push('Education stage fits'); }
      else { score -= 28; hardMismatch = true; }
    }
    if (profile.interest) {
      if (op.interests.includes('Any') || op.interests.includes(profile.interest)) { score += 18; reasons.push('Matches your interest'); }
      else score -= 5;
    }
    if (profile.lowIncome && op.lowIncomeFocus) { score += 14; reasons.push('Designed around financial need'); }
    if (profile.lowIncome && op.lowIncomeBonus) { score += 6; reasons.push('Low-income applicants receive an advantage'); }
    if (profile.pell && op.pellRequired) { score += 14; reasons.push('Pell eligibility aligns'); }
    if (!profile.pell && op.pellRequired && profile.stage) score -= 8;
    if (profile.firstGen && op.firstGenPriority) { score += 8; reasons.push('First-gen friendly'); }
    if (profile.inequitableAccess && op.inequitableAccessFocus) { score += 8; reasons.push('Built for access barriers'); }
    if (profile.identities.length && op.identity?.length) {
      const matches = op.identity.filter(i => profile.identities.includes(i));
      if (matches.length) { score += 12; reasons.push('Optional eligibility background matches'); }
      else { score -= 18; hardMismatch = true; }
    }
    if (profile.state && op.locations && !op.locations.includes('United States')) {
      const locMatch = op.locations.some(l => l === profile.state || l.startsWith(profile.state + ' -'));
      if (locMatch) { score += 8; reasons.push('Available in your state'); }
      else { score -= 18; hardMismatch = true; }
    }
    if (op.locations?.includes('United States') && profile.state) score += 3;
    if (getStatus(op).cls === 'closed') score -= 20;
    score = Math.max(5, Math.min(99, score));
    return { score, reasons, hardMismatch };
  }

  function profileCompletion(profile) {
    const fields = [profile.stage, profile.interest, profile.state, profile.lowIncome, profile.pell, profile.firstGen, profile.inequitableAccess, profile.identities.length > 0];
    const used = fields.filter(Boolean).length;
    return Math.round((used / fields.length) * 100);
  }

  function renderProfileUI(profile) {
    const progress = document.getElementById('profile-progress');
    if (progress) {
      const pct = profileCompletion(profile);
      progress.style.setProperty('--progress', pct);
      progress.querySelector('span').textContent = `${pct}%`;
    }
    const summary = document.getElementById('profile-summary');
    if (!summary) return;
    const chips = [];
    if (profile.stage) chips.push(profile.stage);
    if (profile.interest) chips.push(profile.interest);
    if (profile.lowIncome) chips.push('Financial need');
    if (profile.pell) chips.push('Pell');
    if (profile.firstGen) chips.push('First-gen');
    if (profile.inequitableAccess) chips.push('Access barriers');
    if (profile.state) chips.push(profile.state);
    summary.innerHTML = chips.map(x => `<span class="profile-chip">${esc(x)}</span>`).join('');
  }

  function initDiscover() {
    const form = document.getElementById('match-form');
    const grid = document.getElementById('results-grid');
    if (!form || !grid) return;
    const count = document.getElementById('results-number');
    const caption = document.getElementById('results-caption');
    const sort = document.getElementById('sort-results');
    const savedToggle = document.getElementById('saved-toggle');
    const likelyToggle = document.getElementById('likely-toggle');
    const searchBox = document.getElementById('keyword-search');
    const typeFilter = document.getElementById('type-filter');
    const statusFilter = document.getElementById('status-filter');
    const params = new URLSearchParams(location.search);
    let savedOnly = params.get('saved') === '1';
    let likelyOnly = false;

    if (params.get('stage')) form.elements.stage.value = params.get('stage');
    if (params.get('interest') && params.get('interest') !== 'Any') form.elements.interest.value = params.get('interest');
    if (savedOnly) savedToggle?.classList.add('active');

    const totalMetric = document.getElementById('discover-total');
    const openMetric = document.getElementById('discover-open');
    if (totalMetric) totalMetric.textContent = opportunities.length;
    if (openMetric) openMetric.textContent = opportunities.filter(o => ['open', 'rolling'].includes(getStatus(o).cls)).length;

    function render() {
      const profile = profileFromForm(form);
      renderProfileUI(profile);
      const query = (searchBox?.value || '').trim().toLowerCase();
      const savedIds = getSaved();
      let items = opportunities.map(op => ({ op, ...scoreOpportunity(op, profile) }));
      if (savedOnly) items = items.filter(x => savedIds.includes(x.op.id));
      if (likelyOnly) items = items.filter(x => !x.hardMismatch && x.score >= 55);
      if (query) items = items.filter(x => [x.op.name, x.op.organization, x.op.type, x.op.summary, ...(x.op.interests || [])].join(' ').toLowerCase().includes(query));
      if (typeFilter?.value) items = items.filter(x => x.op.type.toLowerCase().includes(typeFilter.value));
      if (statusFilter?.value) {
        items = items.filter(x => {
          const cls = getStatus(x.op).cls;
          if (statusFilter.value === 'open') return cls === 'open';
          if (statusFilter.value === 'upcoming') return cls === 'upcoming';
          if (statusFilter.value === 'rolling') return cls === 'rolling';
          return true;
        });
      }

      if (sort.value === 'deadline') {
        items.sort((a, b) => (parseDate(a.op.deadline)?.getTime() || Number.MAX_SAFE_INTEGER) - (parseDate(b.op.deadline)?.getTime() || Number.MAX_SAFE_INTEGER));
      } else if (sort.value === 'name') {
        items.sort((a, b) => a.op.name.localeCompare(b.op.name));
      } else {
        items.sort((a, b) => b.score - a.score || ((parseDate(a.op.deadline)?.getTime() || Number.MAX_SAFE_INTEGER) - (parseDate(b.op.deadline)?.getTime() || Number.MAX_SAFE_INTEGER)));
      }

      if (count) count.textContent = items.length;
      const hasProfile = Object.values(profile).some(v => Array.isArray(v) ? v.length : !!v);
      if (caption) caption.textContent = savedOnly ? 'Showing opportunities saved on this device.' : hasProfile ? 'Ranked using the profile information you selected.' : 'Showing all verified programs. Add profile details to improve ranking.';
      grid.innerHTML = items.length
        ? items.map(x => cardHTML(x.op, { match: x.score, reasons: x.reasons })).join('')
        : `<div class="empty-state"><div class="empty-illustration">${icons.search}</div><h3>No opportunities match those filters yet</h3><p>Try clearing a profile field, turning off “Likely matches,” or searching a broader term.</p></div>`;
      bindCards(grid);
      updateSavedCounts();
    }

    form.addEventListener('change', render);
    form.addEventListener('submit', e => { e.preventDefault(); render(); document.getElementById('results-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    form.querySelector('[data-reset]')?.addEventListener('click', () => {
      form.reset(); if (searchBox) searchBox.value = ''; if (typeFilter) typeFilter.value = ''; if (statusFilter) statusFilter.value = ''; savedOnly = false; likelyOnly = false;
      savedToggle?.classList.remove('active'); likelyToggle?.classList.remove('active'); render();
    });
    sort?.addEventListener('change', render);
    typeFilter?.addEventListener('change', render);
    statusFilter?.addEventListener('change', render);
    searchBox?.addEventListener('input', render);
    savedToggle?.addEventListener('click', () => { savedOnly = !savedOnly; savedToggle.classList.toggle('active', savedOnly); render(); });
    likelyToggle?.addEventListener('click', () => { likelyOnly = !likelyOnly; likelyToggle.classList.toggle('active', likelyOnly); render(); });
    document.addEventListener('savedChanged', render);

    const filterPanel = document.querySelector('.filter-panel');
    document.querySelector('.mobile-filter-button')?.addEventListener('click', () => filterPanel?.classList.toggle('mobile-open'));
    render();
  }

  function initResources() {
    const list = document.getElementById('resource-links');
    if (!list) return;
    list.innerHTML = (window.RESOURCE_LINKS || []).map((r, idx) => `
      <div class="resource-item"><div class="resource-copy"><div class="resource-icon">${esc(orgInitials(r.name))}</div><div><h3>${esc(r.name)}</h3><p>${esc(r.description)}</p></div></div><a class="btn btn-secondary btn-sm" target="_blank" rel="noopener" href="${esc(r.url)}">Open resource ${icons.arrow}</a></div>`).join('');
  }

  function sourceRow(op) {
    const tone = toneFor(op);
    const st = getStatus(op);
    return `<div class="resource-item source-item" data-source-row data-source-text="${esc(`${op.name} ${op.organization} ${op.type}`.toLowerCase())}"><div class="org-avatar tone-${tone}">${esc(orgInitials(op.organization))}</div><div><h3>${esc(op.name)}</h3><div class="source-meta"><span>${esc(op.organization)}</span><span>${statusPill(op)}</span><span>${icons.shield} Verified ${esc(op.verified)}</span><span>${icons.calendar} ${esc(op.deadlineNote || op.statusOverride || 'See official source')}</span></div></div><a class="btn btn-secondary btn-sm" target="_blank" rel="noopener" href="${esc(op.sourceUrl)}">Official source ${icons.arrow}</a></div>`;
  }

  function initSources() {
    const list = document.getElementById('source-links');
    if (!list) return;
    const search = document.getElementById('source-search');
    const summary = document.getElementById('source-summary');
    const total = document.getElementById('source-total');
    if (total) total.textContent = opportunities.length;

    function render() {
      const q = (search?.value || '').trim().toLowerCase();
      const items = q ? opportunities.filter(op => `${op.name} ${op.organization} ${op.type}`.toLowerCase().includes(q)) : opportunities;
      list.innerHTML = items.map(sourceRow).join('');
      if (summary) summary.textContent = q ? `${items.length} source${items.length === 1 ? '' : 's'} match your search` : `${opportunities.length} verified program sources`;
    }
    search?.addEventListener('input', render);
    render();
  }

  initNav();
  initModal();
  initHome();
  initDiscover();
  initResources();
  initSources();
  bindCards();
})();
