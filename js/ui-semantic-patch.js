(() => {
  const DATA_KEY = 'tes_curriculum_v5';
  const USER_KEY = 'tes_user_v5';
  const SETTINGS_KEY = 'tes_settings_v5';

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }

  function addDeleteButton() {
    const tools = document.querySelector('.subject-tools');
    const importBtn = document.querySelector('#subjectImportBtn');
    if (!tools || !importBtn || document.querySelector('#deleteSubjectDataBtn')) return;
    const active = document.querySelector('#subjectBar [data-subject].active');
    if (!active) return;
    const btn = document.createElement('button');
    btn.id = 'deleteSubjectDataBtn';
    btn.className = 'danger-btn';
    btn.textContent = `${active.textContent.trim()} 자료 삭제`;
    btn.addEventListener('click', () => deleteCurrentSubject(active.dataset.subject, active.textContent.trim()));
    tools.insertBefore(btn, importBtn);
  }

  function deleteCurrentSubject(subjectId, subjectName) {
    const data = read(DATA_KEY, { subjects: [] });
    const user = read(USER_KEY, { itemState: {}, rounds: {} });
    const settings = read(SETTINGS_KEY, { sectionPrefs: {} });
    const sub = (data.subjects || []).find(s => s.id === subjectId);
    if (!sub) return;
    const itemIds = (sub.sections || []).flatMap(sec => (sec.items || []).map(item => item.id));
    const ok = confirm(`${subjectName}에 등록된 교육과정 자료를 모두 삭제할까요?\n\n해당 자료의 가리기·오답·회독 기록도 함께 초기화됩니다.`);
    if (!ok) return;
    itemIds.forEach(id => { if (user.itemState) delete user.itemState[id]; });
    if (user.rounds) delete user.rounds[subjectId];
    sub.sections = [];
    sub.reviewItems = [];
    if (settings.sectionPrefs) delete settings.sectionPrefs[subjectId];
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    location.reload();
  }

  function splitTextNode(node) {
    if (!node?.nodeValue || !/\n{2,}/.test(node.nodeValue)) return;
    const parts = node.nodeValue.split(/(\n{2,})/);
    const frag = document.createDocumentFragment();
    parts.forEach(part => {
      if (!part) return;
      if (/^\n{2,}$/.test(part)) {
        frag.appendChild(document.createTextNode('\n'));
        const line = document.createElement('span');
        line.className = 'semantic-separator';
        line.setAttribute('aria-hidden', 'true');
        frag.appendChild(line);
        frag.appendChild(document.createTextNode('\n'));
      } else frag.appendChild(document.createTextNode(part));
    });
    node.replaceWith(frag);
  }

  function addSemanticSeparators(root = document) {
    root.querySelectorAll?.('.token-editor,.mask-study,.typing-inline,.original-text').forEach(box => {
      const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(splitTextNode);
    });
  }

  function enhance() {
    addDeleteButton();
    addSemanticSeparators();
  }

  const observer = new MutationObserver(enhance);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhance);
  else enhance();
})();