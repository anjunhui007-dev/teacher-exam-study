const DATA_KEY = 'tes_curriculum_v5';
const USER_KEY = 'tes_user_v5';
const SETTINGS_KEY = 'tes_settings_v5';

const DEFAULT_SUBJECTS = [
  ['general', '총론'], ['korean', '국어'], ['ethics', '도덕'], ['social', '사회'],
  ['math', '수학'], ['science', '과학'], ['practical', '실과'], ['pe', '체육'],
  ['music', '음악'], ['art', '미술'], ['english', '영어'], ['integrated', '통합교과']
].map(([id, name]) => ({ id, name }));

const EMPTY_DATA = {
  schemaVersion: 5,
  subjects: DEFAULT_SUBJECTS.map(s => ({ ...s, sections: [], reviewItems: [] }))
};

const DEFAULT_SETTINGS = {
  visibleSubjects: DEFAULT_SUBJECTS.map(s => s.id),
  sectionPrefs: {},
  gradingMode: 'flexible',
  aiProvider: 'none'
};

const DEFAULT_USER = {
  itemState: {},
  rounds: {}
};

const clone = v => JSON.parse(JSON.stringify(v));
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[c]));

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? clone(fallback); }
  catch { return clone(fallback); }
}

function migrateLegacy() {
  if (localStorage.getItem(DATA_KEY)) return;
  for (const legacy of ['tes_curriculum_v4', 'tes_curriculum_v2', 'tes_curriculum_v1']) {
    const raw = localStorage.getItem(legacy);
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data.subjects)) {
        data.schemaVersion = 5;
        data.subjects.forEach(s => { s.reviewItems ??= []; });
        localStorage.setItem(DATA_KEY, JSON.stringify(data));
        break;
      }
    } catch {}
  }
  if (!localStorage.getItem(USER_KEY)) {
    for (const legacy of ['tes_user_v4', 'tes_user_v2', 'tes_user_v1']) {
      const raw = localStorage.getItem(legacy);
      if (raw) { localStorage.setItem(USER_KEY, raw); break; }
    }
  }
  if (!localStorage.getItem(SETTINGS_KEY)) {
    const raw = localStorage.getItem('tes_settings_v4');
    if (raw) {
      try {
        const old = JSON.parse(raw);
        const next = { ...clone(DEFAULT_SETTINGS), ...old, sectionPrefs: {} };
        const oldStudy = old.studySections || {};
        Object.entries(oldStudy).forEach(([sid, ids]) => {
          next.sectionPrefs[sid] = {};
          (ids || []).forEach(secId => next.sectionPrefs[sid][secId] = { visible: true, study: true });
        });
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {}
    }
  }
}

migrateLegacy();

const state = {
  data: load(DATA_KEY, EMPTY_DATA),
  user: load(USER_KEY, DEFAULT_USER),
  settings: load(SETTINGS_KEY, DEFAULT_SETTINGS),
  subjectId: 'general',
  sectionId: null,
  itemId: null,
  view: 'home',
  studyMode: 'mask-edit',
  weaknessOnly: false,
  importFile: null,
  reviewFilter: 'pending'
};

function save() {
  localStorage.setItem(DATA_KEY, JSON.stringify(state.data));
  localStorage.setItem(USER_KEY, JSON.stringify(state.user));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

function allSubjects() {
  const map = new Map(DEFAULT_SUBJECTS.map(s => [s.id, s]));
  (state.data.subjects || []).forEach(s => map.set(s.id, { id: s.id, name: s.name }));
  return [...map.values()];
}

function subjectData(id) { return (state.data.subjects || []).find(s => s.id === id); }
function currentSubject() { return subjectData(state.subjectId); }
function currentSection() { return currentSubject()?.sections?.find(s => s.id === state.sectionId); }
function currentItem() { return currentSection()?.items?.find(i => i.id === state.itemId); }
function visibleSubjects() { return allSubjects().filter(s => state.settings.visibleSubjects.includes(s.id)); }

function sectionPref(subjectId, sectionId) {
  const pref = state.settings.sectionPrefs?.[subjectId]?.[sectionId];
  return { visible: pref?.visible !== false, study: pref?.study !== false };
}

function visibleSections(sub) {
  return (sub?.sections || []).filter(sec => sectionPref(sub.id, sec.id).visible);
}

function studySections(sub) {
  return (sub?.sections || []).filter(sec => sectionPref(sub.id, sec.id).study);
}

function ensureSubjectExists(id, name) {
  let sub = subjectData(id);
  if (!sub) {
    sub = { id, name: name || id, sections: [], reviewItems: [] };
    state.data.subjects.push(sub);
  }
  sub.sections ??= [];
  sub.reviewItems ??= [];
  return sub;
}

function ensureSelection() {
  const visible = visibleSubjects();
  if (!visible.some(s => s.id === state.subjectId)) state.subjectId = visible[0]?.id || null;
  const sub = currentSubject();
  if (!sub) { state.sectionId = state.itemId = null; return; }
  const secs = visibleSections(sub);
  if (!secs.some(s => s.id === state.sectionId)) state.sectionId = secs[0]?.id || null;
  const sec = currentSection();
  if (!sec?.items?.some(i => i.id === state.itemId)) state.itemId = sec?.items?.[0]?.id || null;
}

function allStudyItems(sub) {
  return studySections(sub).flatMap(section => (section.items || []).map(item => ({ section, item })));
}

function roundState(subjectId) {
  state.user.rounds[subjectId] ??= { count: 0, completed: [] };
  return state.user.rounds[subjectId];
}

function roundProgress(sub) {
  const r = roundState(sub.id);
  const all = allStudyItems(sub).map(x => x.item.id);
  r.completed = (r.completed || []).filter(id => all.includes(id));
  const done = all.filter(id => r.completed.includes(id)).length;
  return { count: r.count || 0, done, total: all.length, pct: all.length ? Math.round(done / all.length * 100) : 0 };
}

function markComplete(itemId) {
  const sub = currentSubject();
  if (!sub) return;
  const r = roundState(sub.id);
  if (!r.completed.includes(itemId)) r.completed.push(itemId);
  const all = allStudyItems(sub).map(x => x.item.id);
  if (all.length && all.every(id => r.completed.includes(id))) {
    r.count = (r.count || 0) + 1;
    r.completed = [];
    save();
    alert(`${sub.name} ${r.count}회독 완료!`);
  } else save();
  render();
}

function itemState(id) {
  state.user.itemState[id] ??= { masked: [], wrongTokens: [], wrongCount: 0, attempts: 0, correct: 0 };
  return state.user.itemState[id];
}

function render() {
  ensureSelection();
  renderSubjectBar();
  renderSectionBar();
  updateWeaknessBadge();
  if (state.view === 'home') renderHome();
  else if (state.view === 'weakness') renderWeakness();
  else if (state.view === 'review') renderReviewInbox();
  else if (state.view === 'study') renderStudy();
  else renderReader();
}

function renderSubjectBar() {
  const bar = $('#subjectBar');
  bar.innerHTML = visibleSubjects().map(s => `<button class="nav-tab ${s.id === state.subjectId ? 'active' : ''}" data-subject="${esc(s.id)}">${esc(s.name)}</button>`).join('');
  bar.querySelectorAll('[data-subject]').forEach(btn => btn.onclick = () => {
    state.subjectId = btn.dataset.subject;
    state.sectionId = state.itemId = null;
    state.view = 'reader';
    state.weaknessOnly = false;
    render();
  });
}

function renderSectionBar() {
  const sub = currentSubject();
  const bar = $('#sectionBar');
  if (!sub || ['home', 'weakness'].includes(state.view)) { bar.innerHTML = ''; return; }
  const sections = visibleSections(sub);
  bar.innerHTML = sections.map(sec => `<button class="nav-tab ${sec.id === state.sectionId && state.view !== 'review' ? 'active' : ''}" data-section="${esc(sec.id)}">${esc(sec.name)}</button>`).join('');
  bar.querySelectorAll('[data-section]').forEach(btn => btn.onclick = () => {
    state.sectionId = btn.dataset.section;
    state.itemId = null;
    state.view = 'reader';
    render();
  });
}

function renderHome() {
  const cards = visibleSubjects().map(s => {
    const sub = subjectData(s.id) || ensureSubjectExists(s.id, s.name);
    const p = roundProgress(sub);
    const pending = (sub.reviewItems || []).filter(x => (x.status || 'pending') === 'pending').length;
    return `<article class="card round-card">
      <div class="round-card-head"><strong>${esc(s.name)}</strong><span>${p.count}회독</span></div>
      <div class="round-progress"><i style="width:${p.pct}%"></i></div>
      <p>${p.done}/${p.total} 항목 · ${p.pct}%</p>
      ${pending ? `<p class="review-count">검토 필요 ${pending}개</p>` : ''}
      <button class="ghost-btn" data-open-sub="${esc(s.id)}">열기</button>
    </article>`;
  }).join('');
  $('#appMain').innerHTML = `<section class="hero"><div><span class="eyebrow">Curriculum Study</span><h1>교육과정 학습 현황</h1><p>과목별 회독과 현재 회독 진행률을 확인하세요.</p></div></section><div class="round-grid">${cards}</div>`;
  $$('[data-open-sub]').forEach(btn => btn.onclick = () => {
    state.subjectId = btn.dataset.openSub;
    state.sectionId = state.itemId = null;
    state.view = 'reader';
    render();
  });
}

function renderSegments(segments = []) {
  return segments.map(s => `<span class="${s.highlight ? 'source-highlight' : ''}">${esc(s.text)}</span>`).join('');
}

function renderTable(block) {
  const occupied = new Set();
  const byPos = new Map((block.cells || []).map(c => [`${c.row}:${c.col}`, c]));
  let html = '<div class="table-scroll"><table class="source-table"><tbody>';
  for (let r = 0; r < (block.rows || 0); r++) {
    html += '<tr>';
    for (let c = 0; c < (block.cols || 0); c++) {
      if (occupied.has(`${r}:${c}`)) continue;
      const cell = byPos.get(`${r}:${c}`);
      if (!cell) { html += '<td></td>'; continue; }
      for (let rr = r; rr < r + (cell.rowspan || 1); rr++) {
        for (let cc = c; cc < c + (cell.colspan || 1); cc++) {
          if (rr !== r || cc !== c) occupied.add(`${rr}:${cc}`);
        }
      }
      html += `<td rowspan="${cell.rowspan || 1}" colspan="${cell.colspan || 1}">${renderSegments(cell.segments || [{ text: cell.text || '' }])}</td>`;
    }
    html += '</tr>';
  }
  return html + '</tbody></table></div>';
}

function renderBlocks(item) {
  if (!item?.blocks?.length) return `<div class="original-text">${esc(item?.originalText || '')}</div>`;
  return `<div class="source-document">${item.blocks.map(block => {
    if (block.type === 'table') return renderTable(block);
    if (block.type === 'heading') return `<h3 class="source-heading">${renderSegments(block.segments || [{ text: block.text || '' }])}</h3>`;
    if (block.type === 'note') return `<div class="source-note">${renderSegments(block.segments || [{ text: block.text || '' }])}</div>`;
    return `<p>${renderSegments(block.segments || [{ text: block.text || '' }])}</p>`;
  }).join('')}</div>`;
}

function renderReader() {
  const sub = currentSubject();
  if (!sub) return renderHome();
  const sec = currentSection();
  const item = currentItem();
  const items = sec?.items || [];
  const rp = roundProgress(sub);
  const pending = (sub.reviewItems || []).filter(x => (x.status || 'pending') === 'pending').length;
  $('#appMain').innerHTML = `
    <section class="hero compact subject-hero">
      <div><span class="eyebrow">${esc(sub.name)}</span><h1>${esc(sec?.name || '영역을 선택하세요')}</h1><p>${sec?.group ? `구분: ${esc(sec.group)}` : '과목별 영역은 업로드한 교육과정 구조를 그대로 사용합니다.'}</p></div>
      <div class="subject-tools">
        <div class="round-mini"><strong>${rp.count}회독</strong><span>${rp.done}/${rp.total}</span></div>
        <button id="reviewInboxBtn" class="ghost-btn">검수함${pending ? ` <span class="badge">${pending}</span>` : ''}</button>
        <button id="subjectImportBtn" class="primary-btn">${esc(sub.name)} 자료 업로드</button>
      </div>
    </section>
    <div class="content-layout">
      <aside class="card toc"><div class="toc-title">세부 목차</div>${items.length ? items.map(i => `<button class="${i.id === state.itemId ? 'active' : ''}" data-item="${esc(i.id)}">${esc(i.title || '제목 없음')}</button>`).join('') : '<div class="empty-state small">이 영역에는 아직 자료가 없습니다.</div>'}</aside>
      <article class="card reader">${item ? `
        <div class="breadcrumb">${esc(sub.name)} / ${esc(sec.name)}</div>
        <div class="reader-heading"><div><h1>${esc(item.title || '교육과정 원문')}</h1>${item.source?.page ? `<p class="reader-note">출처: PDF ${esc(item.source.page)}쪽</p>` : ''}</div>${hasHighlights(item) ? '<span class="highlight-legend"><i></i> 원문 강조</span>' : ''}</div>
        ${renderBlocks(item)}
        <div class="reader-actions"><button id="completeItemBtn" class="ghost-btn">학습 완료</button><button id="maskStartBtn" class="soft-btn">가리기 설정</button><button id="typingStartBtn" class="primary-btn">타이핑 학습</button></div>` : `
        <div class="empty-state"><h2>${esc(sec?.name || sub.name)}</h2><p>이 영역에 아직 등록된 원문이 없습니다.</p><button id="emptyUploadBtn" class="primary-btn">${esc(sub.name)} 자료 업로드</button></div>`}
      </article>
    </div>`;
  $$('[data-item]').forEach(btn => btn.onclick = () => { state.itemId = btn.dataset.item; render(); });
  $('#subjectImportBtn').onclick = () => openImportDialog(sub.id);
  $('#reviewInboxBtn').onclick = () => { state.view = 'review'; state.reviewFilter = 'pending'; render(); };
  if ($('#emptyUploadBtn')) $('#emptyUploadBtn').onclick = () => openImportDialog(sub.id);
  if (item) {
    $('#completeItemBtn').onclick = () => markComplete(item.id);
    $('#maskStartBtn').onclick = () => { state.studyMode = 'mask-edit'; state.view = 'study'; render(); };
    $('#typingStartBtn').onclick = () => { state.studyMode = 'typing'; state.view = 'study'; render(); };
  }
}

function hasHighlights(item) {
  if ((item.highlightWords || []).length) return true;
  return (item.blocks || []).some(b => (b.segments || []).some(s => s.highlight) || (b.cells || []).some(c => (c.segments || []).some(s => s.highlight)));
}

function tokenize(text) {
  return String(text || '').split(/(\s+)/).map((text, index) => ({ index, text, isSpace: /^\s+$/.test(text) }));
}
function norm(v) { return String(v || '').toLowerCase().replace(/[\s.,!?;:'"“”‘’·⋅()\[\]{}<>/\\\-_~`]+/g, ''); }

function collectHighlightWords(item) {
  const words = new Set(item.highlightWords || []);
  const addSegments = segs => (segs || []).filter(s => s.highlight).forEach(s => String(s.text || '').split(/\s+/).filter(Boolean).forEach(w => words.add(w)));
  (item.blocks || []).forEach(b => {
    addSegments(b.segments);
    (b.cells || []).forEach(c => addSegments(c.segments));
  });
  return [...words];
}

function sourceIndexes(item) {
  const terms = new Set(collectHighlightWords(item).map(norm).filter(Boolean));
  return tokenize(item.originalText).filter(t => !t.isSpace && terms.has(norm(t.text))).map(t => t.index);
}

function renderStudy() {
  const item = currentItem();
  if (!item) { state.view = 'reader'; return render(); }
  const u = itemState(item.id), sub = currentSubject(), sec = currentSection();
  $('#appMain').innerHTML = `<article class="card study-card">
    <div class="study-titlebar"><div><span class="eyebrow">${esc(sub.name)} · ${esc(sec.name)}</span><h2>${esc(item.title || '학습')}</h2></div>
    <div class="mode-switch"><button data-mode="mask-edit" class="${state.studyMode === 'mask-edit' ? 'active' : ''}">가리기 설정</button><button data-mode="mask-study" class="${state.studyMode === 'mask-study' ? 'active' : ''}">가리기 학습</button><button data-mode="typing" class="${state.studyMode === 'typing' ? 'active' : ''}">타이핑</button></div></div>
    <div id="studyContent"></div>
    <div class="study-footer"><button id="backReaderBtn" class="ghost-btn">원문으로</button><div id="studyFooterRight"></div></div>
  </article>`;
  $$('[data-mode]').forEach(btn => btn.onclick = () => { state.studyMode = btn.dataset.mode; state.weaknessOnly = false; renderStudy(); });
  $('#backReaderBtn').onclick = () => { state.view = 'reader'; state.weaknessOnly = false; render(); };
  if (state.studyMode === 'mask-edit') renderMaskEditor(item, u);
  else if (state.studyMode === 'mask-study') renderMaskStudy(item, u);
  else renderTyping(item, u);
}

function renderMaskEditor(item, u) {
  const tokens = tokenize(item.originalText), highlighted = sourceIndexes(item);
  $('#studyContent').innerHTML = `<div class="helper">암기할 <strong>어절을 터치</strong>하세요. 다시 터치하면 해제됩니다.</div><div class="token-editor">${tokens.map(t => t.isSpace ? esc(t.text) : `<span class="token selectable ${u.masked.includes(t.index) ? 'selected' : ''} ${highlighted.includes(t.index) ? 'source-token' : ''}" data-token="${t.index}">${esc(t.text)}</span>`).join('')}</div>`;
  $('#studyFooterRight').innerHTML = `<button id="clearMaskBtn" class="ghost-btn">전체 해제</button>${highlighted.length ? '<button id="redAllBtn" class="ghost-btn">원문 강조 모두 선택</button>' : ''}<button id="maskStudyBtn" class="primary-btn">가리기 학습 시작</button>`;
  $$('[data-token]').forEach(el => el.onclick = () => {
    const idx = Number(el.dataset.token);
    u.masked = u.masked.includes(idx) ? u.masked.filter(v => v !== idx) : [...u.masked, idx].sort((a, b) => a - b);
    save(); renderMaskEditor(item, u);
  });
  $('#clearMaskBtn').onclick = () => { u.masked = []; save(); renderMaskEditor(item, u); };
  if ($('#redAllBtn')) $('#redAllBtn').onclick = () => { u.masked = [...new Set([...u.masked, ...highlighted])].sort((a, b) => a - b); save(); renderMaskEditor(item, u); };
  $('#maskStudyBtn').onclick = () => { state.studyMode = 'mask-study'; renderStudy(); };
}

function renderMaskStudy(item, u) {
  const tokens = tokenize(item.originalText);
  const mask = state.weaknessOnly && u.wrongTokens.length ? u.wrongTokens : u.masked;
  if (!mask.length) {
    $('#studyContent').innerHTML = '<div class="empty-state"><h2>가리기 설정이 필요합니다.</h2><p>가리기 설정에서 암기할 어절을 먼저 선택하세요.</p></div>';
    $('#studyFooterRight').innerHTML = '<button id="toMaskEdit" class="primary-btn">가리기 설정</button>';
    $('#toMaskEdit').onclick = () => { state.studyMode = 'mask-edit'; renderStudy(); };
    return;
  }
  $('#studyContent').innerHTML = `<div class="mask-study">${tokens.map(t => t.isSpace ? esc(t.text) : `<span class="token ${mask.includes(t.index) ? 'masked' : ''}" ${mask.includes(t.index) ? `data-reveal="${t.index}"` : ''}>${esc(t.text)}</span>`).join('')}</div>`;
  $('#studyFooterRight').innerHTML = '<button id="doneStudyBtn" class="primary-btn">학습 완료</button>';
  $$('[data-reveal]').forEach(el => el.onclick = () => el.classList.toggle('revealed'));
  $('#doneStudyBtn').onclick = () => markComplete(item.id);
}

function grade(expected, actual) {
  if (state.settings.gradingMode === 'strict') return actual.trim() === expected.trim();
  if (state.settings.gradingMode === 'self') return null;
  return norm(actual) === norm(expected);
}

function renderTyping(item, u) {
  const tokens = tokenize(item.originalText);
  const mask = state.weaknessOnly && u.wrongTokens.length ? u.wrongTokens : u.masked;
  if (!mask.length) {
    $('#studyContent').innerHTML = '<div class="empty-state"><h2>타이핑할 빈칸이 없습니다.</h2><p>가리기 설정에서 빈칸으로 만들 어절을 먼저 선택하세요.</p></div>';
    $('#studyFooterRight').innerHTML = '<button id="typingSetupBtn" class="primary-btn">가리기 설정</button>';
    $('#typingSetupBtn').onclick = () => { state.studyMode = 'mask-edit'; renderStudy(); };
    return;
  }
  let number = 0;
  const prompt = tokens.map(t => {
    if (t.isSpace) return esc(t.text);
    if (!mask.includes(t.index)) return `<span>${esc(t.text)}</span>`;
    const n = number++;
    const width = Math.max(76, Math.min(240, t.text.length * 22 + 28));
    return `<input class="inline-answer" data-token="${t.index}" data-n="${n}" style="width:${width}px" autocomplete="off" spellcheck="false" aria-label="빈칸 ${n + 1}">`;
  }).join('');
  $('#studyContent').innerHTML = `<div class="helper">빈칸에 <strong>들어갈 말만</strong> 입력하세요. Enter를 누르거나 다음 칸으로 이동하면 자동 채점됩니다.</div><div class="typing-inline">${prompt}</div><div id="typingResult"></div>`;
  $('#studyFooterRight').innerHTML = '<button id="checkAllBtn" class="ghost-btn">입력한 답 모두 확인</button>';
  const inputs = $$('.inline-answer');
  const check = input => {
    if (!input.value.trim()) return;
    const idx = Number(input.dataset.token);
    const expected = tokens.find(t => t.index === idx)?.text || '';
    const result = grade(expected, input.value);
    input.classList.remove('input-correct', 'input-wrong', 'input-self');
    input.dataset.graded = 'true';
    u.attempts = (u.attempts || 0) + 1;
    if (result === null) {
      input.classList.add('input-self');
      showSelfCheck(input, expected, idx, u);
    } else if (result) {
      input.classList.add('input-correct');
      u.correct = (u.correct || 0) + 1;
      u.wrongTokens = (u.wrongTokens || []).filter(x => x !== idx);
    } else {
      input.classList.add('input-wrong');
      if (!u.wrongTokens.includes(idx)) u.wrongTokens.push(idx);
      u.wrongCount = (u.wrongCount || 0) + 1;
      input.title = `정답: ${expected}`;
    }
    save(); updateTypingSummary(inputs, u);
  };
  inputs.forEach((input, i) => {
    input.addEventListener('blur', () => check(input));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); check(input); inputs[i + 1]?.focus(); }
    });
  });
  $('#checkAllBtn').onclick = () => inputs.forEach(check);
  inputs[0]?.focus();
}

function showSelfCheck(input, expected, idx, u) {
  const box = $('#typingResult');
  box.innerHTML = `<div class="result-box"><strong>정답:</strong> ${esc(expected)} <button id="selfGood" class="primary-btn mini">맞음</button> <button id="selfBad" class="ghost-btn mini">틀림</button></div>`;
  $('#selfGood').onclick = () => { input.classList.remove('input-self'); input.classList.add('input-correct'); u.wrongTokens = u.wrongTokens.filter(x => x !== idx); save(); box.innerHTML = ''; };
  $('#selfBad').onclick = () => { input.classList.remove('input-self'); input.classList.add('input-wrong'); if (!u.wrongTokens.includes(idx)) u.wrongTokens.push(idx); u.wrongCount = (u.wrongCount || 0) + 1; save(); box.innerHTML = ''; updateWeaknessBadge(); };
}

function updateTypingSummary(inputs, u) {
  const graded = inputs.filter(i => i.dataset.graded === 'true');
  const correct = graded.filter(i => i.classList.contains('input-correct')).length;
  const result = $('#typingResult');
  if (!result || !graded.length) return;
  result.innerHTML = `<div class="result-box ${correct === graded.length ? 'good' : 'bad'}"><strong>${correct} / ${graded.length}</strong> 현재 채점 · 틀린 어절은 약점 보충에 자동 저장됩니다.</div>`;
  updateWeaknessBadge();
}

function findItem(itemId) {
  for (const subject of state.data.subjects || []) for (const section of subject.sections || []) {
    const item = (section.items || []).find(i => i.id === itemId);
    if (item) return { subject, section, item };
  }
  return null;
}

function weaknessEntries() {
  return Object.entries(state.user.itemState || {}).map(([id, u]) => ({ id, u, found: findItem(id) })).filter(x => x.found && (x.u.wrongTokens || []).length);
}

function updateWeaknessBadge() {
  const total = weaknessEntries().reduce((a, x) => a + x.u.wrongTokens.length, 0);
  const badge = $('#weaknessBadge');
  if (!badge) return;
  badge.textContent = total;
  badge.classList.toggle('hidden', total === 0);
}

function renderWeakness() {
  const entries = weaknessEntries();
  $('#appMain').innerHTML = `<section class="hero"><div><span class="eyebrow">Weakness Review</span><h1>약점 보충</h1><p>타이핑에서 틀렸던 어절만 다시 모아 학습합니다.</p></div></section>${entries.length ? `<div class="weakness-grid">${entries.map(({ id, u, found }) => `<article class="card weak-card"><div><span class="weak-meta">${esc(found.subject.name)} · ${esc(found.section.name)}</span><h3>${esc(found.item.title || '교육과정 원문')}</h3><p>남은 약점 <strong>${u.wrongTokens.length}</strong>개 · 누적 오답 ${u.wrongCount || 0}회</p></div><div class="weak-actions"><button class="ghost-btn" data-weak-mask="${esc(id)}">가리기 복습</button><button class="primary-btn" data-weak-type="${esc(id)}">타이핑 재도전</button></div></article>`).join('')}</div>` : '<div class="card empty-state"><h2>현재 약점이 없어요 🎉</h2><p>틀린 답이 생기면 자동으로 이곳에 모입니다.</p></div>'}`;
  $$('[data-weak-type]').forEach(btn => btn.onclick = () => openWeakStudy(btn.dataset.weakType, 'typing'));
  $$('[data-weak-mask]').forEach(btn => btn.onclick = () => openWeakStudy(btn.dataset.weakMask, 'mask-study'));
}

function openWeakStudy(id, mode) {
  const found = findItem(id);
  if (!found) return;
  state.subjectId = found.subject.id;
  state.sectionId = found.section.id;
  state.itemId = found.item.id;
  state.weaknessOnly = true;
  state.studyMode = mode;
  state.view = 'study';
  render();
}

function renderReviewInbox() {
  const sub = currentSubject();
  if (!sub) return renderHome();
  const all = sub.reviewItems || [];
  const list = all.filter(x => state.reviewFilter === 'all' || (x.status || 'pending') === state.reviewFilter);
  $('#appMain').innerHTML = `<section class="hero compact subject-hero"><div><span class="eyebrow">${esc(sub.name)}</span><h1>검수함</h1><p>자동 분류에서 애매했던 자료를 보관합니다. 원문은 삭제하지 않고 나중에 직접 포함하거나 제외할 수 있습니다.</p></div><div class="subject-tools"><button id="backSubjectBtn" class="ghost-btn">${esc(sub.name)}로 돌아가기</button><button id="subjectImportBtn" class="primary-btn">${esc(sub.name)} 자료 업로드</button></div></section>
  <div class="review-toolbar card"><button data-review-filter="pending" class="${state.reviewFilter === 'pending' ? 'active' : ''}">검토 필요</button><button data-review-filter="included" class="${state.reviewFilter === 'included' ? 'active' : ''}">포함 완료</button><button data-review-filter="excluded" class="${state.reviewFilter === 'excluded' ? 'active' : ''}">제외</button><button data-review-filter="all" class="${state.reviewFilter === 'all' ? 'active' : ''}">전체</button></div>
  ${list.length ? `<div class="review-list">${list.map(r => renderReviewCard(sub, r)).join('')}</div>` : '<div class="card empty-state"><h2>해당 항목이 없습니다.</h2></div>'}`;
  $('#backSubjectBtn').onclick = () => { state.view = 'reader'; render(); };
  $('#subjectImportBtn').onclick = () => openImportDialog(sub.id);
  $$('[data-review-filter]').forEach(btn => btn.onclick = () => { state.reviewFilter = btn.dataset.reviewFilter; renderReviewInbox(); });
  $$('[data-review-include]').forEach(btn => btn.onclick = () => includeReviewItem(sub, btn.dataset.reviewInclude));
  $$('[data-review-exclude]').forEach(btn => btn.onclick = () => setReviewStatus(sub, btn.dataset.reviewExclude, 'excluded'));
  $$('[data-review-pending]').forEach(btn => btn.onclick = () => setReviewStatus(sub, btn.dataset.reviewPending, 'pending'));
}

function renderReviewCard(sub, review) {
  const status = review.status || 'pending';
  const options = (sub.sections || []).map(s => `<option value="${esc(s.id)}" ${s.id === review.suggestedSectionId ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  const preview = review.originalText || (review.blocks || []).map(b => b.text || (b.segments || []).map(s => s.text).join('')).join(' ');
  return `<article class="card review-card"><div class="review-card-head"><div><span class="status-chip ${status}">${status === 'pending' ? '검토 필요' : status === 'included' ? '포함 완료' : '제외'}</span><h3>${esc(review.title || review.suggestedSectionName || '검토 항목')}</h3></div>${review.source?.page ? `<span class="page-chip">PDF ${esc(review.source.page)}쪽</span>` : ''}</div><p class="review-reason">${esc(review.reason || '분류 근거가 명확하지 않아 검토 대상으로 보관됨')}</p><div class="review-preview">${esc(preview.slice(0, 600))}${preview.length > 600 ? '…' : ''}</div>${status === 'pending' ? `<div class="review-actions"><select id="review-target-${esc(review.id)}">${options}<option value="__new__">+ 새 영역 만들기</option></select><button class="primary-btn" data-review-include="${esc(review.id)}">선택 영역에 포함</button><button class="ghost-btn" data-review-exclude="${esc(review.id)}">제외로 표시</button></div>` : `<div class="review-actions"><button class="ghost-btn" data-review-pending="${esc(review.id)}">다시 검토 필요로</button></div>`}</article>`;
}

function includeReviewItem(sub, reviewId) {
  const review = (sub.reviewItems || []).find(r => r.id === reviewId);
  if (!review) return;
  const select = $(`#review-target-${CSS.escape(reviewId)}`);
  let sectionId = select?.value;
  let section;
  if (sectionId === '__new__') {
    const name = prompt('새 영역 이름을 입력하세요.');
    if (!name?.trim()) return;
    sectionId = `section-${Date.now()}`;
    section = { id: sectionId, name: name.trim(), items: [] };
    sub.sections.push(section);
  } else section = sub.sections.find(s => s.id === sectionId);
  if (!section) return alert('포함할 영역을 선택해 주세요.');
  const item = {
    id: review.itemId || `review-item-${review.id}`,
    title: review.title || review.suggestedSectionName || '검토 후 포함 항목',
    originalText: review.originalText || '',
    blocks: review.blocks || [],
    highlightWords: review.highlightWords || [],
    source: review.source || null
  };
  if (!section.items.some(i => i.id === item.id)) section.items.push(item);
  review.status = 'included';
  review.includedSectionId = section.id;
  save(); renderReviewInbox();
}

function setReviewStatus(sub, reviewId, status) {
  const review = (sub.reviewItems || []).find(r => r.id === reviewId);
  if (!review) return;
  review.status = status;
  save(); renderReviewInbox();
}

function openImportDialog(subjectId) {
  state.subjectId = subjectId;
  const sub = subjectData(subjectId) || ensureSubjectExists(subjectId, allSubjects().find(s => s.id === subjectId)?.name);
  $('#importDialogTitle').textContent = `${sub.name} 자료 업로드`;
  $('#importDialogText').textContent = `${sub.name}용 JSON만 이 과목에 병합됩니다. 기존 자료는 유지됩니다.`;
  $('#selectedFileName').textContent = '아직 선택된 파일이 없습니다.';
  state.importFile = null;
  $('#importFile').value = '';
  $('#importDialog').showModal();
}

function normalizeIncoming(payload, targetSubjectId) {
  if (payload?.subject && typeof payload.subject === 'object') return payload.subject;
  if (Array.isArray(payload?.subjects)) {
    const match = payload.subjects.find(s => s.id === targetSubjectId);
    if (match) return match;
    if (payload.subjects.length === 1) return payload.subjects[0];
  }
  if (Array.isArray(payload?.sections)) return { id: targetSubjectId, name: subjectData(targetSubjectId)?.name || targetSubjectId, sections: payload.sections, reviewItems: payload.reviewItems || [] };
  throw new Error('지원하는 교육과정 JSON 형식이 아닙니다.');
}

function mergeItems(oldItems = [], newItems = []) {
  const map = new Map(oldItems.map(i => [i.id, i]));
  newItems.forEach(i => map.set(i.id, { ...(map.get(i.id) || {}), ...i }));
  return [...map.values()];
}

function mergeReviewItems(oldItems = [], newItems = []) {
  const map = new Map(oldItems.map(i => [i.id, i]));
  newItems.forEach(i => map.set(i.id, { ...(map.get(i.id) || {}), ...i, status: map.get(i.id)?.status || i.status || 'pending' }));
  return [...map.values()];
}

function importForSubject(payload, targetSubjectId) {
  const incoming = normalizeIncoming(payload, targetSubjectId);
  if (incoming.id && incoming.id !== targetSubjectId) {
    const name = incoming.name || incoming.id;
    throw new Error(`이 파일은 '${name}' 자료입니다. 현재 선택한 과목과 일치하지 않습니다.`);
  }
  const target = ensureSubjectExists(targetSubjectId, incoming.name || subjectData(targetSubjectId)?.name);
  target.name = incoming.name || target.name;
  const sections = new Map((target.sections || []).map(s => [s.id, s]));
  (incoming.sections || []).forEach(sec => {
    const old = sections.get(sec.id);
    if (!old) sections.set(sec.id, { ...sec, items: sec.items || [] });
    else sections.set(sec.id, { ...old, ...sec, items: mergeItems(old.items, sec.items) });
  });
  target.sections = [...sections.values()];
  target.reviewItems = mergeReviewItems(target.reviewItems, incoming.reviewItems || payload.reviewItems || []);
  save();
}

function renderSettings() {
  $('#subjectSettings').innerHTML = allSubjects().map(s => `<label class="check-row"><input type="checkbox" value="${esc(s.id)}" ${state.settings.visibleSubjects.includes(s.id) ? 'checked' : ''}> ${esc(s.name)}</label>`).join('');
  $('#areaSettings').innerHTML = allSubjects().map(s => {
    const sub = subjectData(s.id);
    const sections = sub?.sections || [];
    return `<details class="area-subject"><summary><strong>${esc(s.name)}</strong><span>${sections.length}개 영역</span></summary>${sections.length ? `<div class="area-table">${sections.map(sec => {
      const pref = sectionPref(s.id, sec.id);
      return `<div class="area-row" data-area-row><div><strong>${esc(sec.name)}</strong>${sec.group ? `<small>${esc(sec.group)}</small>` : ''}</div><label><input type="checkbox" data-area-visible="${esc(s.id)}::${esc(sec.id)}" ${pref.visible ? 'checked' : ''}> 표시</label><label><input type="checkbox" data-area-study="${esc(s.id)}::${esc(sec.id)}" ${pref.study ? 'checked' : ''}> 회독/학습</label></div>`;
    }).join('')}</div>` : '<p class="muted area-empty">자료를 업로드하면 PDF의 실제 영역이 여기에 자동으로 추가됩니다.</p>'}</details>`;
  }).join('');
  $$('input[name="gradingMode"]').forEach(r => r.checked = r.value === state.settings.gradingMode);
  $('#aiProvider').value = state.settings.aiProvider || 'none';
  $$('[data-area-visible]').forEach(box => box.addEventListener('change', () => {
    if (!box.checked) {
      const study = $(`[data-area-study="${CSS.escape(box.dataset.areaVisible)}"]`);
      if (study) study.checked = false;
    }
  }));
}

function saveSettingsFromDialog() {
  const visibleSubjects = $$('#subjectSettings input:checked').map(i => i.value);
  state.settings.visibleSubjects = visibleSubjects.length ? visibleSubjects : ['general'];
  const prefs = {};
  $$('[data-area-row]').forEach(row => {
    const visible = row.querySelector('[data-area-visible]');
    const study = row.querySelector('[data-area-study]');
    if (!visible || !study) return;
    const [sid, secId] = visible.dataset.areaVisible.split('::');
    prefs[sid] ??= {};
    prefs[sid][secId] = { visible: visible.checked, study: visible.checked && study.checked };
  });
  state.settings.sectionPrefs = prefs;
  state.settings.gradingMode = $('input[name="gradingMode"]:checked')?.value || 'flexible';
  state.settings.aiProvider = $('#aiProvider').value;
  save();
  $('#settingsDialog').close();
  render();
}

$('#homeBtn').onclick = () => { state.view = 'home'; state.weaknessOnly = false; render(); };
$('#weaknessBtn').onclick = () => { state.view = 'weakness'; state.weaknessOnly = false; render(); };
$('#settingsBtn').onclick = () => { renderSettings(); $('#settingsDialog').showModal(); };
$('#saveSettingsBtn').onclick = saveSettingsFromDialog;
$('#importFile').onchange = e => {
  state.importFile = e.target.files?.[0] || null;
  $('#selectedFileName').textContent = state.importFile ? state.importFile.name : '아직 선택된 파일이 없습니다.';
};
$('#doImportBtn').onclick = async () => {
  if (!state.importFile) return alert('JSON 파일을 선택해 주세요.');
  try {
    const payload = JSON.parse(await state.importFile.text());
    importForSubject(payload, state.subjectId);
    $('#importDialog').close();
    state.sectionId = state.itemId = null;
    state.view = 'reader';
    alert(`${currentSubject()?.name || '과목'} 자료를 추가했습니다.`);
    render();
  } catch (err) {
    alert(err.message || 'JSON 파일을 읽지 못했습니다.');
  }
};

render();