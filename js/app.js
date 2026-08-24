const DATA_KEY = "tes_curriculum_v1";
const USER_KEY = "tes_user_v1";
const SETTINGS_KEY = "tes_settings_v1";

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

const SAMPLE_DATA = {
  schemaVersion: 1,
  contentType: "curriculum",
  subjects: [
    {
      id: "general",
      name: "총론",
      sections: [
        {
          id: "overview",
          name: "총론",
          items: [{
            id: "sample-general-1",
            title: "샘플 원문",
            originalText: "이 문장은 기능 확인을 위한 샘플입니다. 실제 교육과정 원문 파일을 업로드하면 이 자리에 그대로 표시됩니다."
          }]
        },
        {
          id: "creative",
          name: "창의적 체험활동",
          items: [{
            id: "sample-creative-1",
            title: "창의적 체험활동 샘플",
            originalText: "창의적 체험활동 자료도 총론 아래의 독립 영역으로 탐색할 수 있습니다."
          }]
        }
      ]
    },
    {
      id: "korean",
      name: "국어",
      sections: [
        { id: "character", name: "성격", items: [] },
        { id: "goals", name: "목표", items: [] },
        { id: "content", name: "내용 체계", items: [] },
        { id: "achievement", name: "성취기준", items: [] },
        { id: "teaching", name: "교수·학습", items: [{ id: "sample-korean-1", title: "가리기 기능 연습", originalText: "학습할 원문의 어절을 직접 터치하여 암기할 부분을 선택할 수 있습니다." }] },
        { id: "assessment", name: "평가", items: [] }
      ]
    },
    { id: "integrated", name: "통합교과", sections: [{ id: "overview", name: "교육과정", items: [] }] }
  ]
};

const state = {
  data: load(DATA_KEY, SAMPLE_DATA),
  user: load(USER_KEY, { itemState: {} }),
  settings: load(SETTINGS_KEY, {
    visibleSubjects: DEFAULT_SUBJECTS.map(s => s.id),
    gradingMode: "flexible",
    aiProvider: "none"
  }),
  subjectId: null,
  sectionId: null,
  itemId: null,
  view: "reader",
  studyMode: "mask-edit"
};

const $ = s => document.querySelector(s);
const esc = (v = "") => String(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? structuredClone(fallback); }
  catch { return structuredClone(fallback); }
}
function save() {
  localStorage.setItem(DATA_KEY, JSON.stringify(state.data));
  localStorage.setItem(USER_KEY, JSON.stringify(state.user));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

function allSubjects() {
  const map = new Map(DEFAULT_SUBJECTS.map(s => [s.id, s]));
  state.data.subjects.forEach(s => map.set(s.id, { id: s.id, name: s.name }));
  return [...map.values()];
}
function visibleSubjects() {
  return allSubjects().filter(s => state.settings.visibleSubjects.includes(s.id));
}
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

function renderHome() {
  const imported = state.data.subjects.reduce((a,s) => a + (s.sections ?? []).reduce((b,sec) => b + (sec.items?.length ?? 0),0),0);
  const masked = Object.values(state.user.itemState).filter(x => x.masked?.length).length;
  const attempts = Object.values(state.user.itemState).reduce((a,x) => a + (x.attempts ?? 0),0);
  $("#appMain").innerHTML = `
    <section class="hero"><div><span class="eyebrow">Curriculum Study</span><h1>교육과정을 내 방식대로 외우세요.</h1><p>과목과 파트를 선택하고, 원문에서 직접 암기할 어절을 지정해 반복 학습합니다.</p></div></section>
    <div class="metric-row">
      <article class="card metric"><span>등록 원문</span><strong>${imported}</strong></article>
      <article class="card metric"><span>가리기 설정</span><strong>${masked}</strong></article>
      <article class="card metric"><span>타이핑 시도</span><strong>${attempts}</strong></article>
    </div>
    <div class="dashboard-grid">
      <article class="card panel"><h2>바로 학습하기</h2><p>상단 과목 바에서 원하는 과목을 누르면 해당 교육과정으로 이동합니다.</p><div class="quick-actions"><button id="continueBtn" class="primary-btn">현재 과목 열기</button><button id="homeImportBtn" class="ghost-btn">JSON 자료 업로드</button></div></article>
      <article class="card panel"><h2>현재 설계</h2><p>가리기와 타이핑에 집중한 1차 버전입니다. 맥락형 문제와 AI 생성 기능은 이후 확장할 수 있도록 분리되어 있습니다.</p></article>
    </div>`;
  $("#continueBtn").onclick = () => { state.view = "reader"; render(); };
  $("#homeImportBtn").onclick = () => $("#importFile").click();
}

function renderReader() {
  const subject = currentSubject();
  const section = currentSection();
  const item = currentItem();
  if (!subject || !section) return renderHome();
  const items = section.items ?? [];
  $("#appMain").innerHTML = `
    <section class="hero"><div><span class="eyebrow">${esc(subject.name)}</span><h1>${esc(section.name)}</h1><p>왼쪽 목차에서 원문 항목을 선택하세요.</p></div></section>
    <div class="content-layout">
      <aside class="card toc"><div class="toc-title">목차</div>${items.length ? items.map(i => `<button class="${i.id === state.itemId ? "active" : ""}" data-item="${esc(i.id)}">${esc(i.title || "제목 없음")}</button>`).join("") : `<div class="empty-state" style="padding:24px 8px">자료 없음</div>`}</aside>
      <article class="card reader">${item ? `
        <div class="breadcrumb">${esc(subject.name)} / ${esc(section.name)}</div>
        <h1>${esc(item.title || "교육과정 원문")}</h1>
        <div class="original-text">${esc(item.originalText)}</div>
        <div class="reader-actions"><button id="maskStartBtn" class="soft-btn">가리기 설정</button><button id="typingStartBtn" class="primary-btn">타이핑 학습</button></div>` : `<div class="empty-state"><h2>아직 등록된 원문이 없어요.</h2><p>이 채팅에서 변환한 JSON 파일을 ‘자료 업로드’로 추가하면 됩니다.</p><button id="emptyImportBtn" class="primary-btn">자료 업로드</button></div>`}</article>
    </div>`;
  document.querySelectorAll("[data-item]").forEach(btn => btn.onclick = () => { state.itemId = btn.dataset.item; render(); });
  if (item) {
    $("#maskStartBtn").onclick = () => { state.view = "study"; state.studyMode = "mask-edit"; render(); };
    $("#typingStartBtn").onclick = () => { state.view = "study"; state.studyMode = "typing"; render(); };
  } else if ($("#emptyImportBtn")) $("#emptyImportBtn").onclick = () => $("#importFile").click();
}

function tokenize(text) {
  return text.split(/(\s+)/).map((text, index) => ({ index, text, isSpace: /^\s+$/.test(text) }));
}
function itemUserState(id) {
  state.user.itemState[id] ??= { masked: [], attempts: 0, correct: 0 };
  return state.user.itemState[id];
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
  document.querySelectorAll("[data-mode]").forEach(btn => btn.onclick = () => { state.studyMode = btn.dataset.mode; renderStudy(); });
  $("#backReaderBtn").onclick = () => { state.view = "reader"; render(); };
  if (state.studyMode === "mask-edit") renderMaskEditor(item, u);
  if (state.studyMode === "mask-study") renderMaskStudy(item, u);
  if (state.studyMode === "typing") renderTyping(item, u);
}

function renderMaskEditor(item, u) {
  const tokens = tokenize(item.originalText);
  $("#studyContent").innerHTML = `<div class="helper">암기하고 싶은 <strong>어절을 터치</strong>하세요. 다시 터치하면 선택이 해제됩니다. 선택 정보는 원문과 별도로 저장됩니다.</div><div id="tokenEditor" class="token-editor">${tokens.map(t => t.isSpace ? esc(t.text) : `<span class="token selectable ${u.masked.includes(t.index) ? "selected" : ""}" data-token="${t.index}">${esc(t.text)}</span>`).join("")}</div>`;
  $("#studyFooterRight").innerHTML = `<button id="clearMasksBtn" class="ghost-btn">전체 해제</button> <button id="goMaskStudyBtn" class="primary-btn">가리기 학습 시작</button>`;
  document.querySelectorAll("[data-token]").forEach(el => el.onclick = () => {
    const idx = Number(el.dataset.token);
    u.masked = u.masked.includes(idx) ? u.masked.filter(x => x !== idx) : [...u.masked, idx].sort((a,b)=>a-b);
    save(); renderMaskEditor(item, u);
  });
  $("#clearMasksBtn").onclick = () => { u.masked = []; save(); renderMaskEditor(item, u); };
  $("#goMaskStudyBtn").onclick = () => { state.studyMode = "mask-study"; renderStudy(); };
}

function renderMaskStudy(item, u) {
  if (!u.masked.length) {
    $("#studyContent").innerHTML = `<div class="empty-state"><h2>가릴 어절이 아직 없어요.</h2><p>먼저 가리기 설정에서 암기할 부분을 터치해 선택하세요.</p></div>`;
    $("#studyFooterRight").innerHTML = `<button id="setupMaskBtn" class="primary-btn">가리기 설정</button>`;
    $("#setupMaskBtn").onclick = () => { state.studyMode = "mask-edit"; renderStudy(); };
    return;
  }
  const tokens = tokenize(item.originalText);
  $("#studyContent").innerHTML = `<div class="helper">가려진 블록을 하나씩 터치해 정답을 확인하세요.</div><div class="mask-study">${tokens.map(t => t.isSpace ? esc(t.text) : `<span class="token ${u.masked.includes(t.index) ? "masked" : ""}" data-mask-token="${t.index}">${esc(t.text)}</span>`).join("")}</div>`;
  $("#studyFooterRight").innerHTML = `<button id="revealAllBtn" class="ghost-btn">모두 공개</button> <button id="resetMaskBtn" class="primary-btn">다시 가리기</button>`;
  document.querySelectorAll(".masked").forEach(el => el.onclick = () => el.classList.toggle("revealed"));
  $("#revealAllBtn").onclick = () => document.querySelectorAll(".masked").forEach(el => el.classList.add("revealed"));
  $("#resetMaskBtn").onclick = () => document.querySelectorAll(".masked").forEach(el => el.classList.remove("revealed"));
}

function normalizeFlexible(s) { return s.replace(/[\s.,!?·:;"'‘’“”()\[\]{}]/g, "").trim(); }
function renderTyping(item, u) {
  $("#studyContent").innerHTML = `<div class="typing-wrap"><div class="helper">현재 채점 방식: <strong>${gradingLabel(state.settings.gradingMode)}</strong></div><div class="typing-prompt">${esc(makeTypingPrompt(item, u.masked))}</div><textarea id="typingAnswer" class="typing-answer" placeholder="가려진 내용을 포함해 기억나는 문장을 입력하세요."></textarea><div id="typingResult"></div></div>`;
  $("#studyFooterRight").innerHTML = `<button id="checkTypingBtn" class="primary-btn">채점하기</button>`;
  $("#checkTypingBtn").onclick = () => gradeTyping(item, u);
}
function makeTypingPrompt(item, masked) {
  if (!masked?.length) return `${item.originalText}\n\n※ 아직 가리기 설정이 없어 원문 전체를 보고 타이핑 연습합니다.`;
  return tokenize(item.originalText).map(t => t.isSpace ? t.text : (masked.includes(t.index) ? "[          ]" : t.text)).join("");
}
function gradeTyping(item, u) {
  const answer = $("#typingAnswer").value.trim();
  const result = $("#typingResult");
  if (!answer) return result.innerHTML = `<div class="result-box bad">답안을 입력하세요.</div>`;
  u.attempts = (u.attempts ?? 0) + 1;
  if (state.settings.gradingMode === "self") {
    result.innerHTML = `<div class="result-box"><strong>교육과정 원문</strong><br>${esc(item.originalText)}<br><br><button id="selfGood" class="primary-btn">맞음</button> <button id="selfBad" class="ghost-btn">틀림</button></div>`;
    $("#selfGood").onclick = () => { u.correct = (u.correct ?? 0) + 1; save(); result.innerHTML = `<div class="result-box good">정답으로 기록했습니다.</div>`; };
    $("#selfBad").onclick = () => { save(); result.innerHTML = `<div class="result-box bad">오답으로 기록했습니다.</div>`; };
    return;
  }
  const correct = state.settings.gradingMode === "strict" ? answer === item.originalText.trim() : normalizeFlexible(answer) === normalizeFlexible(item.originalText);
  if (correct) u.correct = (u.correct ?? 0) + 1;
  save();
  result.innerHTML = `<div class="result-box ${correct ? "good" : "bad"}"><strong>${correct ? "정답입니다." : "원문과 차이가 있습니다."}</strong>${correct ? "" : `<br><br><strong>원문</strong><br>${esc(item.originalText)}`}</div>`;
}
function gradingLabel(mode) { return ({ flexible: "유연 채점", strict: "엄격 채점", self: "직접 확인" })[mode] ?? mode; }

function validateImport(data) {
  if (data?.schemaVersion !== 1 || data?.contentType !== "curriculum" || !Array.isArray(data.subjects)) throw new Error("지원하지 않는 자료 형식입니다.");
  data.subjects.forEach(s => {
    if (!s.id || !s.name || !Array.isArray(s.sections)) throw new Error("과목 구조가 올바르지 않습니다.");
    s.sections.forEach(sec => {
      if (!sec.id || !sec.name || !Array.isArray(sec.items)) throw new Error("영역 구조가 올바르지 않습니다.");
      sec.items.forEach(i => { if (!i.id || typeof i.originalText !== "string") throw new Error("원문 항목 구조가 올바르지 않습니다."); });
    });
  });
}
function mergeImport(incoming) {
  incoming.subjects.forEach(newSub => {
    let sub = state.data.subjects.find(s => s.id === newSub.id);
    if (!sub) { state.data.subjects.push(structuredClone(newSub)); return; }
    newSub.sections.forEach(newSec => {
      let sec = sub.sections.find(s => s.id === newSec.id);
      if (!sec) { sub.sections.push(structuredClone(newSec)); return; }
      newSec.items.forEach(newItem => {
        const idx = sec.items.findIndex(i => i.id === newItem.id);
        if (idx >= 0) sec.items[idx] = structuredClone(newItem); else sec.items.push(structuredClone(newItem));
      });
    });
  });
  const known = new Set(state.settings.visibleSubjects);
  incoming.subjects.forEach(s => known.add(s.id));
  state.settings.visibleSubjects = [...known];
  save();
}

function openSettings() {
  const list = $("#subjectSettings");
  list.innerHTML = allSubjects().map(s => `<label class="check-row"><input type="checkbox" value="${esc(s.id)}" ${state.settings.visibleSubjects.includes(s.id) ? "checked" : ""}> ${esc(s.name)}</label>`).join("");
  document.querySelectorAll('input[name="gradingMode"]').forEach(r => r.checked = r.value === state.settings.gradingMode);
  $("#aiProvider").value = state.settings.aiProvider;
  $("#settingsDialog").showModal();
}

$("#homeBtn").onclick = () => { state.view = "home"; render(); };
$("#settingsBtn").onclick = openSettings;
$("#importBtn").onclick = () => $("#importFile").click();
$("#importFile").onchange = async e => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    validateImport(data); mergeImport(data); state.view = "reader"; state.subjectId = data.subjects[0]?.id ?? state.subjectId; state.sectionId = null; state.itemId = null; render();
    alert("교육과정 자료를 가져왔습니다.");
  } catch (err) { alert(`가져오기 실패: ${err.message}`); }
  e.target.value = "";
};
$("#saveSettingsBtn").onclick = () => {
  state.settings.visibleSubjects = [...document.querySelectorAll("#subjectSettings input:checked")].map(i => i.value);
  state.settings.gradingMode = document.querySelector('input[name="gradingMode"]:checked')?.value ?? "flexible";
  state.settings.aiProvider = $("#aiProvider").value;
  if (!state.settings.visibleSubjects.length) state.settings.visibleSubjects = ["general"];
  save(); $("#settingsDialog").close(); render();
};

state.view = "home";
render();
