const DATA_KEY = "tes_curriculum_v2";
const USER_KEY = "tes_user_v2";
const SETTINGS_KEY = "tes_settings_v2";
const BUNDLE_MARKER_KEY = "tes_bundle_marker";
const BUNDLE_MARKER = "general-solli-20260824-1";

const DEFAULT_SUBJECTS = [
  { id: "general", name: "총론" },
  { id: "korean", name: "국어" },
  { id: "ethics", name: "도덕" },
  { id: "social", name: "사회" },
  { id: "math", name: "수학" },
  { id: "science", name: "과학" },
  { id: "practical", name: "실과" },
  { id: "pe", name: "체육" },
  { id: "music", name: "음악" },
  { id: "art", name: "미술" },
  { id: "english", name: "영어" },
  { id: "integrated", name: "통합교과" }
];

const EMPTY_DATA = {
  schemaVersion: 2,
  contentType: "curriculum",
  subjects: DEFAULT_SUBJECTS.map(s => ({ ...s, sections: [] }))
};

const state = {
  data: load(DATA_KEY, EMPTY_DATA),
  user: load(USER_KEY, { itemState: {} }),
  settings: load(SETTINGS_KEY, {
    visibleSubjects: DEFAULT_SUBJECTS.map(s => s.id),
    gradingMode: "flexible",
    aiProvider: "none"
  }),
  subjectId: "general",
  sectionId: null,
  itemId: null,
  view: "home",
  studyMode: "mask-edit"
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = (v = "") => String(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));

function clone(v) { return JSON.parse(JSON.stringify(v)); }
function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? clone(fallback); }
  catch { return clone(fallback); }
}
function save() {
  localStorage.setItem(DATA_KEY, JSON.stringify(state.data));
  localStorage.setItem(USER_KEY, JSON.stringify(state.user));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

function mergeSubject(subject, replace = true) {
  const idx = state.data.subjects.findIndex(s => s.id === subject.id);
  if (idx >= 0 && replace) state.data.subjects[idx] = subject;
  else if (idx < 0) state.data.subjects.push(subject);
}

async function loadBundledData() {
  if (localStorage.getItem(BUNDLE_MARKER_KEY) === BUNDLE_MARKER) return;
  try {
    const res = await fetch("./data/general_curriculum_solli.json", { cache: "no-store" });
    if (!res.ok) return;
    const bundle = await res.json();
    (bundle.subjects || []).forEach(subject => mergeSubject(subject, true));
    localStorage.setItem(BUNDLE_MARKER_KEY, BUNDLE_MARKER);
    save();
  } catch (err) {
    console.info("Bundled curriculum data is available after deployment or can be uploaded manually.", err);
  }
}

function allSubjects() {
  const map = new Map(DEFAULT_SUBJECTS.map(s => [s.id, s]));
  (state.data.subjects || []).forEach(s => map.set(s.id, { id: s.id, name: s.name }));
  return [...map.values()];
}
function visibleSubjects() { return allSubjects().filter(s => state.settings.visibleSubjects.includes(s.id)); }
function subjectData(id) { return state.data.subjects.find(s => s.id === id); }
function currentSubject() { return subjectData(state.subjectId); }
function currentSection() { return currentSubject()?.sections?.find(s => s.id === state.sectionId); }
function currentItem() { return currentSection()?.items?.find(i => i.id === state.itemId); }

function ensureSelection() {
  const visible = visibleSubjects();
  if (!visible.some(s => s.id === state.subjectId)) state.subjectId = visible[0]?.id ?? null;
  const subject = currentSubject();
  if (!subject) { state.sectionId = state.itemId = null; return; }
  if (!subject.sections?.some(s => s.id === state.sectionId)) state.sectionId = subject.sections?.[0]?.id ?? null;
  const section = currentSection();
  if (!section?.items?.some(i => i.id === state.itemId)) state.itemId = section?.items?.[0]?.id ?? null;
}

function render() {
  ensureSelection();
  renderSubjectBar();
  renderSectionBar();
  if (state.view === "home") renderHome();
  else if (state.view === "study") renderStudy();
  else renderReader();
}

function renderSubjectBar() {
  const bar = $("#subjectBar");
  bar.innerHTML = visibleSubjects().map(s => `<button class="nav-tab ${s.id === state.subjectId ? "active" : ""}" data-subject="${esc(s.id)}">${esc(s.name)}</button>`).join("");
  bar.querySelectorAll("[data-subject]").forEach(btn => btn.onclick = () => {
    state.subjectId = btn.dataset.subject;
    state.sectionId = state.itemId = null;
    state.view = "reader";
    render();
  });
}

function renderSectionBar() {
  const subject = currentSubject();
  const bar = $("#sectionBar");
  bar.innerHTML = (subject?.sections ?? []).map(s => `<button class="nav-tab ${s.id === state.sectionId ? "active" : ""}" data-section="${esc(s.id)}">${esc(s.name)}</button>`).join("");
  bar.querySelectorAll("[data-section]").forEach(btn => btn.onclick = () => {
    state.sectionId = btn.dataset.section;
    state.itemId = null;
    state.view = "reader";
    render();
  });
}

function countItems() {
  return state.data.subjects.reduce((a,s) => a + (s.sections || []).reduce((b,sec) => b + (sec.items?.length || 0), 0), 0);
}

function renderHome() {
  const masked = Object.values(state.user.itemState).filter(x => x.masked?.length).length;
  const attempts = Object.values(state.user.itemState).reduce((a,x) => a + (x.attempts || 0), 0);
  $("#appMain").innerHTML = `
    <section class="hero"><div><span class="eyebrow">Curriculum Study</span><h1>교육과정을 내 방식대로 외우세요.</h1><p>원문 형식과 강조 표시를 보존하고, 직접 암기할 어절을 골라 가리기와 타이핑으로 학습합니다.</p></div></section>
    <div class="metric-row">
      <article class="card metric"><span>등록 원문 항목</span><strong>${countItems()}</strong></article>
      <article class="card metric"><span>가리기 설정</span><strong>${masked}</strong></article>
      <article class="card metric"><span>타이핑 시도</span><strong>${attempts}</strong></article>
    </div>
    <div class="dashboard-grid">
      <article class="card panel"><h2>총론 실제 자료 탑재</h2><p>업로드한 HWPX의 문단, 표, 빨간 글자 강조를 보존해 총론 데이터로 변환했습니다. 상단의 <strong>총론</strong>을 눌러 확인하세요.</p><div class="quick-actions"><button id="openGeneralBtn" class="primary-btn">총론 열기</button><button id="homeImportBtn" class="ghost-btn">JSON 자료 업로드</button></div></article>
      <article class="card panel"><h2>빨간 글자 활용</h2><p>원문에서는 붉은 강조로 표시되고, 가리기 설정에서 <strong>붉은 강조 모두 선택</strong>으로 암기 범위를 한 번에 지정할 수 있습니다.</p></article>
    </div>`;
  $("#openGeneralBtn").onclick = () => { state.subjectId = "general"; state.sectionId = state.itemId = null; state.view = "reader"; render(); };
  $("#homeImportBtn").onclick = () => $("#importFile").click();
}

function renderSegments(segments = []) {
  return segments.map(s => `<span class="${s.highlight ? "source-highlight" : ""}">${esc(s.text)}</span>`).join("");
}

function renderTable(block) {
  const occupied = new Set();
  const byPos = new Map((block.cells || []).map(c => [`${c.row}:${c.col}`, c]));
  let html = `<div class="table-scroll"><table class="source-table"><tbody>`;
  for (let r = 0; r < (block.rows || 0); r++) {
    html += "<tr>";
    for (let c = 0; c < (block.cols || 0); c++) {
      if (occupied.has(`${r}:${c}`)) continue;
      const cell = byPos.get(`${r}:${c}`);
      if (!cell) { html += "<td></td>"; continue; }
      for (let rr = r; rr < r + (cell.rowspan || 1); rr++) for (let cc = c; cc < c + (cell.colspan || 1); cc++) if (rr !== r || cc !== c) occupied.add(`${rr}:${cc}`);
      html += `<td rowspan="${cell.rowspan || 1}" colspan="${cell.colspan || 1}">${renderSegments(cell.segments)}</td>`;
    }
    html += "</tr>";
  }
  return html + "</tbody></table></div>";
}

function renderBlocks(item) {
  if (!item?.blocks?.length) return `<div class="original-text">${esc(item?.originalText || "")}</div>`;
  return `<div class="source-document">${item.blocks.map(block => {
    if (block.type === "table") return renderTable(block);
    return `<p>${renderSegments(block.segments)}</p>`;
  }).join("")}</div>`;
}

function renderReader() {
  const subject = currentSubject();
  const section = currentSection();
  const item = currentItem();
  if (!subject) return renderHome();
  const items = section?.items ?? [];
  $("#appMain").innerHTML = `
    <section class="hero compact"><div><span class="eyebrow">${esc(subject.name)}</span><h1>${esc(section?.name || "자료 없음")}</h1><p>${items.length ? "왼쪽 목차에서 세부 항목을 선택하세요." : "아직 이 영역에 등록된 자료가 없습니다."}</p></div></section>
    <div class="content-layout">
      <aside class="card toc"><div class="toc-title">세부 목차</div>${items.length ? items.map(i => `<button class="${i.id === state.itemId ? "active" : ""}" data-item="${esc(i.id)}">${esc(i.title || "제목 없음")}</button>`).join("") : `<div class="empty-state small">자료 없음</div>`}</aside>
      <article class="card reader">${item ? `
        <div class="breadcrumb">${esc(subject.name)} / ${esc(section.name)}</div>
        <div class="reader-heading"><div><h1>${esc(item.title || "교육과정 원문")}</h1><p class="reader-note">원문 속 빨간 글자는 업로드된 HWPX의 강조를 그대로 반영했습니다.</p></div><span class="highlight-legend"><i></i> 원문 강조</span></div>
        ${renderBlocks(item)}
        <div class="reader-actions"><button id="maskStartBtn" class="soft-btn">가리기 설정</button><button id="typingStartBtn" class="primary-btn">타이핑 학습</button></div>` : `<div class="empty-state"><h2>등록된 원문이 없어요.</h2><p>이 채팅에서 변환한 JSON 파일을 자료 업로드로 추가할 수 있습니다.</p><button id="emptyImportBtn" class="primary-btn">자료 업로드</button></div>`}</article>
    </div>`;
  $$('[data-item]').forEach(btn => btn.onclick = () => { state.itemId = btn.dataset.item; render(); });
  if (item) {
    $("#maskStartBtn").onclick = () => { state.view = "study"; state.studyMode = "mask-edit"; render(); };
    $("#typingStartBtn").onclick = () => { state.view = "study"; state.studyMode = "typing"; render(); };
  } else if ($("#emptyImportBtn")) $("#emptyImportBtn").onclick = () => $("#importFile").click();
}

function tokenize(text) {
  return String(text || "").split(/(\s+)/).map((text, index) => ({ index, text, isSpace: /^\s+$/.test(text) }));
}
function itemUserState(id) {
  state.user.itemState[id] ??= { masked: [], attempts: 0, correct: 0 };
  return state.user.itemState[id];
}
function normalizeWord(v) { return String(v || "").toLowerCase().replace(/[\s.,!?;:'"“”‘’·⋅()\[\]{}<>/\\\-_~`]+/g, ""); }
function highlightedTokenIndexes(item) {
  const terms = new Set((item.highlightWords || []).map(normalizeWord).filter(Boolean));
  return tokenize(item.originalText).filter(t => !t.isSpace && terms.has(normalizeWord(t.text))).map(t => t.index);
}

function renderStudy() {
  const item = currentItem();
  if (!item) { state.view = "reader"; return render(); }
  const u = itemUserState(item.id);
  const subject = currentSubject(), section = currentSection();
  $("#appMain").innerHTML = `
    <article class="card study-card">
      <div class="study-titlebar">
        <div><span class="eyebrow">${esc(subject.name)} · ${esc(section.name)}</span><h2>${esc(item.title || "학습")}</h2></div>
        <div class="mode-switch"><button data-mode="mask-edit" class="${state.studyMode === "mask-edit" ? "active" : ""}">가리기 설정</button><button data-mode="mask-study" class="${state.studyMode === "mask-study" ? "active" : ""}">가리기 학습</button><button data-mode="typing" class="${state.studyMode === "typing" ? "active" : ""}">타이핑</button></div>
      </div>
      <div id="studyContent"></div>
      <div class="study-footer"><button id="backReaderBtn" class="ghost-btn">원문으로 돌아가기</button><div id="studyFooterRight"></div></div>
    </article>`;
  $$('[data-mode]').forEach(btn => btn.onclick = () => { state.studyMode = btn.dataset.mode; renderStudy(); });
  $("#backReaderBtn").onclick = () => { state.view = "reader"; render(); };
  if (state.studyMode === "mask-edit") renderMaskEditor(item, u);
  if (state.studyMode === "mask-study") renderMaskStudy(item, u);
  if (state.studyMode === "typing") renderTyping(item, u);
}

function renderMaskEditor(item, u) {
  const tokens = tokenize(item.originalText);
  const sourceIndexes = highlightedTokenIndexes(item);
  $("#studyContent").innerHTML = `<div class="helper">암기하고 싶은 <strong>어절을 터치</strong>하세요. 붉은색 테두리 어절은 원문에서 빨간 글자로 강조된 부분입니다.</div><div id="tokenEditor" class="token-editor">${tokens.map(t => t.isSpace ? esc(t.text) : `<span class="token selectable ${u.masked.includes(t.index) ? "selected" : ""} ${sourceIndexes.includes(t.index) ? "source-token" : ""}" data-token="${t.index}">${esc(t.text)}</span>`).join("")}</div>`;
  $("#studyFooterRight").innerHTML = `<button id="selectSourceBtn" class="soft-btn">붉은 강조 모두 선택</button> <button id="clearMasksBtn" class="ghost-btn">전체 해제</button> <button id="goMaskStudyBtn" class="primary-btn">가리기 학습 시작</button>`;
  $$('[data-token]').forEach(el => el.onclick = () => {
    const idx = Number(el.dataset.token);
    u.masked = u.masked.includes(idx) ? u.masked.filter(x => x !== idx) : [...u.masked, idx].sort((a,b)=>a-b);
    save(); renderMaskEditor(item, u);
  });
  $("#selectSourceBtn").onclick = () => { u.masked = [...new Set([...u.masked, ...sourceIndexes])].sort((a,b)=>a-b); save(); renderMaskEditor(item, u); };
  $("#clearMasksBtn").onclick = () => { u.masked = []; save(); renderMaskEditor(item, u); };
  $("#goMaskStudyBtn").onclick = () => { state.studyMode = "mask-study"; renderStudy(); };
}

function renderMaskStudy(item, u) {
  if (!u.masked.length) {
    $("#studyContent").innerHTML = `<div class="empty-state"><h2>가릴 어절이 아직 없어요.</h2><p>먼저 가리기 설정에서 암기할 부분을 선택하세요.</p></div>`;
    $("#studyFooterRight").innerHTML = `<button id="setupMaskBtn" class="primary-btn">가리기 설정</button>`;
    $("#setupMaskBtn").onclick = () => { state.studyMode = "mask-edit"; renderStudy(); };
    return;
  }
  const tokens = tokenize(item.originalText);
  $("#studyContent").innerHTML = `<div class="helper">가려진 어절을 하나씩 터치하면 정답이 열립니다.</div><div class="mask-study">${tokens.map(t => {
    if (t.isSpace) return esc(t.text);
    const masked = u.masked.includes(t.index);
    return `<span class="token ${masked ? "masked" : ""}" ${masked ? `data-reveal="${t.index}"` : ""}>${esc(t.text)}</span>`;
  }).join("")}</div>`;
  $("#studyFooterRight").innerHTML = `<button id="revealAllBtn" class="primary-btn">모두 공개</button>`;
  $$('[data-reveal]').forEach(el => el.onclick = () => el.classList.toggle("revealed"));
  $("#revealAllBtn").onclick = () => $$('[data-reveal]').forEach(el => el.classList.add("revealed"));
}

function renderTyping(item, u) {
  if (!u.masked.length) {
    $("#studyContent").innerHTML = `<div class="empty-state"><h2>먼저 암기할 부분을 선택해 주세요.</h2><p>타이핑 학습은 가리기 설정에서 선택한 어절을 직접 입력하는 방식입니다.</p></div>`;
    $("#studyFooterRight").innerHTML = `<button id="typingSetupBtn" class="primary-btn">가리기 설정</button>`;
    $("#typingSetupBtn").onclick = () => { state.studyMode = "mask-edit"; renderStudy(); };
    return;
  }
  const tokens = tokenize(item.originalText);
  let inputNo = 0;
  const prompt = tokens.map(t => {
    if (t.isSpace) return esc(t.text);
    if (!u.masked.includes(t.index)) return `<span>${esc(t.text)}</span>`;
    const n = inputNo++;
    const width = Math.max(72, Math.min(220, t.text.length * 22 + 24));
    return `<input class="inline-answer" data-answer-index="${n}" data-token-index="${t.index}" style="width:${width}px" autocomplete="off" aria-label="빈칸 ${n+1}" />`;
  }).join("");
  $("#studyContent").innerHTML = `<div class="helper">현재 채점 방식: <strong>${gradingLabel(state.settings.gradingMode)}</strong>. 설정에서 언제든 바꿀 수 있습니다.</div><div class="typing-inline">${prompt}</div><div id="typingResult"></div>`;
  $("#studyFooterRight").innerHTML = `<button id="gradeBtn" class="primary-btn">채점하기</button>`;
  $("#gradeBtn").onclick = () => gradeTyping(item, u);
}

function gradingLabel(mode) { return ({ flexible:"유연 채점", strict:"엄격 채점", self:"직접 확인" })[mode] || "유연 채점"; }
function flexible(v) { return normalizeWord(v); }

function gradeTyping(item, u) {
  const tokens = tokenize(item.originalText);
  const inputs = $$(".inline-answer");
  const result = $("#typingResult");
  u.attempts = (u.attempts || 0) + 1;
  if (state.settings.gradingMode === "self") {
    inputs.forEach(input => {
      const expected = tokens[Number(input.dataset.tokenIndex)]?.text || "";
      input.value = expected;
      input.classList.add("answer-revealed");
    });
    result.innerHTML = `<div class="result-box"><strong>정답을 표시했습니다.</strong><br>직접 비교한 뒤 학습을 이어가세요.</div>`;
    save(); return;
  }
  let correct = 0;
  inputs.forEach(input => {
    const expected = tokens[Number(input.dataset.tokenIndex)]?.text || "";
    const ok = state.settings.gradingMode === "strict" ? input.value.trim() === expected.trim() : flexible(input.value) === flexible(expected);
    input.classList.toggle("input-correct", ok);
    input.classList.toggle("input-wrong", !ok);
    if (!ok) input.title = `정답: ${expected}`;
    if (ok) correct++;
  });
  const all = correct === inputs.length;
  if (all) u.correct = (u.correct || 0) + 1;
  result.innerHTML = `<div class="result-box ${all ? "good" : "bad"}"><strong>${correct} / ${inputs.length}</strong> 정답${all ? " · 완벽해요." : " · 틀린 칸에 마우스를 올리면 정답을 확인할 수 있어요."}</div>`;
  save();
}

function renderSettings() {
  $("#subjectSettings").innerHTML = allSubjects().map(s => `<label class="check-row"><input type="checkbox" value="${esc(s.id)}" ${state.settings.visibleSubjects.includes(s.id) ? "checked" : ""}> ${esc(s.name)}</label>`).join("");
  $$('input[name="gradingMode"]').forEach(r => r.checked = r.value === state.settings.gradingMode);
  $("#aiProvider").value = state.settings.aiProvider || "none";
}

function importPayload(payload) {
  if (!payload || !Array.isArray(payload.subjects)) throw new Error("지원하지 않는 JSON 형식입니다.");
  payload.subjects.forEach(subject => {
    const existing = subjectData(subject.id);
    if (!existing) { state.data.subjects.push(subject); return; }
    const sectionMap = new Map((existing.sections || []).map(s => [s.id, s]));
    (subject.sections || []).forEach(sec => sectionMap.set(sec.id, sec));
    existing.name = subject.name || existing.name;
    existing.sections = [...sectionMap.values()];
  });
  save();
}

$("#homeBtn").onclick = () => { state.view = "home"; render(); };
$("#importBtn").onclick = () => $("#importFile").click();
$("#importFile").onchange = async e => {
  const file = e.target.files[0]; if (!file) return;
  try { importPayload(JSON.parse(await file.text())); alert("자료를 추가했습니다."); state.view = "reader"; render(); }
  catch (err) { alert(err.message || "JSON 파일을 읽지 못했습니다."); }
  e.target.value = "";
};
$("#settingsBtn").onclick = () => { renderSettings(); $("#settingsDialog").showModal(); };
$("#saveSettingsBtn").onclick = () => {
  const checked = $$("#subjectSettings input:checked").map(i => i.value);
  state.settings.visibleSubjects = checked.length ? checked : ["general"];
  state.settings.gradingMode = $('input[name="gradingMode"]:checked')?.value || "flexible";
  state.settings.aiProvider = $("#aiProvider").value;
  save(); $("#settingsDialog").close(); render();
};

(async function init(){
  await loadBundledData();
  render();
})();
