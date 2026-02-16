// === STATE ===
const state = {
  favorites: JSON.parse(localStorage.getItem('jmp_favs') || '[]'),
  workout: JSON.parse(localStorage.getItem('jmp_workout') || '[]'),
  activeCategory: null,
  activeEquipment: null,
  activeLevel: null,
  searchQuery: '',
  panelTab: 'favorites',
  fontScale: parseFloat(localStorage.getItem('jmp_fs') || '1'),
  theme: localStorage.getItem('jmp_theme') || 'light',
  expandedCards: new Set(),
  activeSection: 'exercises',
  activePhase: 'approach',
  activeRef: 'periodization',
  activeProg: 'warmup',
  checklist: JSON.parse(localStorage.getItem('jmp_checklist') || '{}'),
  breathingTimer: null,
  trainingPlans: JSON.parse(localStorage.getItem('jmp_plans') || '[]'),
  editingPlan: null,
  pickerPlanIdx: null,
  pickerSearch: '',
  pickerCat: null,
  weeklyPlans: JSON.parse(localStorage.getItem('jmp_weekly') || '[]'),
  customExercises: JSON.parse(localStorage.getItem('jmp_custom_ex') || '[]'),
  editingWeek: null,
  weekPickerDay: null
};

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(state.theme);
  applyFontScale(state.fontScale);
  renderCategoryFilters();
  renderEquipmentFilters();
  renderLevelFilters();
  renderCards();
  updateFabBadge();
  bindEvents();
});

// === TTS & SHOW ATHLETE ===
let _overlayLang = 'ru';
let _overlayText = '';

function escapeForAttr(text) {
  return text.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, ' ');
}

function speakPhrase(text, lang, btn) {
  if (typeof speechSynthesis === 'undefined') return;
  // If already speaking this text, stop
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    document.querySelectorAll('.btn-speak.speaking').forEach(b => b.classList.remove('speaking'));
    if (btn && btn.classList.contains('speaking')) { btn.classList.remove('speaking'); return; }
  }
  const langMap = { ru: 'ru-RU', en: 'en-US', cn: 'zh-CN' };
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = langMap[lang] || lang;
  utter.rate = lang === 'cn' ? 0.85 : 0.9;
  // Try to find best voice
  const voices = speechSynthesis.getVoices();
  const langCode = langMap[lang] || lang;
  const voice = voices.find(v => v.lang === langCode) || voices.find(v => v.lang.startsWith(langCode.split('-')[0]));
  if (voice) utter.voice = voice;
  if (btn) {
    btn.classList.add('speaking');
    utter.onend = () => btn.classList.remove('speaking');
    utter.onerror = () => btn.classList.remove('speaking');
  }
  speechSynthesis.speak(utter);
}

function showAthleteText(text, lang) {
  _overlayText = text;
  _overlayLang = lang;
  document.getElementById('athleteText').textContent = text;
  document.getElementById('athleteOverlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeAthleteOverlay(e) {
  if (e && e.target && e.target.id !== 'athleteOverlay' && !e.target.classList.contains('athlete-close')) return;
  document.getElementById('athleteOverlay').style.display = 'none';
  document.body.style.overflow = '';
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  document.querySelectorAll('.speaking').forEach(b => b.classList.remove('speaking'));
}

function speakFromOverlay() {
  const btn = document.getElementById('athleteSpeak');
  speakPhrase(_overlayText, _overlayLang, btn);
}

function ttsBtn(text, lang) {
  const escaped = escapeForAttr(text);
  return `<button class="btn-speak" onclick="event.stopPropagation();speakPhrase('${escaped}','${lang}',this)" title="Озвучить">🔊</button>`;
}

function showBtn(text, lang) {
  const escaped = escapeForAttr(text);
  return `<button class="btn-show" onclick="event.stopPropagation();showAthleteText('${escaped}','${lang}')" title="Показать крупно">👁️</button>`;
}

// === THEME ===
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggle');
  btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('jmp_theme', theme);
}
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(state.theme);
}

// === FONT SCALE ===
function applyFontScale(scale) {
  state.fontScale = Math.max(0.8, Math.min(1.4, scale));
  document.documentElement.style.setProperty('--fs-scale', state.fontScale);
  localStorage.setItem('jmp_fs', state.fontScale);
}

// === SECTION NAVIGATION ===
function switchSection(section) {
  state.activeSection = section;
  // Hide all sections
  document.getElementById('exerciseFilters').style.display = section === 'exercises' ? '' : 'none';
  document.getElementById('cardsContainer').style.display = section === 'exercises' ? '' : 'none';
  document.getElementById('sectionTechnique').style.display = section === 'technique' ? '' : 'none';
  document.getElementById('sectionReference').style.display = section === 'reference' ? '' : 'none';
  document.getElementById('sectionProgram').style.display = section === 'program' ? '' : 'none';
  // Update nav chips
  document.querySelectorAll('.section-chip').forEach(c => c.classList.remove('active'));
  document.querySelector(`.section-chip[data-section="${section}"]`).classList.add('active');
  // Scroll to top on section switch
  window.scrollTo({ top: 0, behavior: 'smooth' });
  // Render content on first visit
  if (section === 'technique') renderTechniqueSection();
  if (section === 'reference') renderRefSection();
  if (section === 'program') renderProgramSection();
}

// === FILTERS ===
function renderCategoryFilters() {
  const container = document.getElementById('catFilters');
  let html = '<button class="filter-chip active" data-cat="all">Все</button>';
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    html += `<button class="filter-chip" data-cat="${key}"><span class="dot" style="background:${cat.color}"></span>${cat.icon} ${cat.name}</button>`;
  }
  container.innerHTML = html;
}

function renderEquipmentFilters() {
  const container = document.getElementById('equipFilters');
  const used = new Set();
  EXERCISES.forEach(ex => ex.equipment.forEach(e => used.add(e)));
  let html = '';
  for (const eq of used) {
    if (EQUIPMENT_TAGS[eq]) {
      html += `<button class="filter-chip" data-equip="${eq}">${EQUIPMENT_TAGS[eq].ru}</button>`;
    }
  }
  container.innerHTML = html;
}

function renderLevelFilters() {
  const container = document.getElementById('levelFilters');
  container.innerHTML = `
    <button class="filter-chip" data-level="beginner">🟢 Начинающий</button>
    <button class="filter-chip" data-level="intermediate">🟡 Средний</button>
    <button class="filter-chip" data-level="advanced">🔴 Продвинутый</button>
  `;
}

// === RENDER CARDS ===
function getFilteredExercises() {
  return EXERCISES.filter(ex => {
    if (state.activeCategory && ex.cat !== state.activeCategory) return false;
    if (state.activeEquipment && !ex.equipment.includes(state.activeEquipment)) return false;
    if (state.activeLevel && ex.level !== state.activeLevel) return false;
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      return ex.nameRu.toLowerCase().includes(q) ||
        ex.nameEn.toLowerCase().includes(q) ||
        ex.descRu.toLowerCase().includes(q);
    }
    return true;
  });
}

function renderCards() {
  const container = document.getElementById('cardsContainer');
  const filtered = getFilteredExercises();
  document.getElementById('resultsCount').textContent = `Найдено: ${filtered.length} из ${EXERCISES.length}`;

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-muted)">Нет упражнений по заданным фильтрам</div>';
    return;
  }

  container.innerHTML = filtered.map((ex, i) => {
    const cat = CATEGORIES[ex.cat] || { name: ex.cat, color: '#999', icon: '?' };
    const isFav = state.favorites.includes(ex.id);
    const isInWorkout = state.workout.includes(ex.id);
    const isExpanded = state.expandedCards.has(ex.id);
    const levelClass = `level-${ex.level}`;
    const levelText = ex.level === 'beginner' ? 'Начинающий' : ex.level === 'intermediate' ? 'Средний' : 'Продвинутый';
    const equipTags = ex.equipment.map(e => EQUIPMENT_TAGS[e] ? `<span class="card-tag">${EQUIPMENT_TAGS[e].ru}</span>` : '').join('');

    return `<div class="exercise-card" style="animation-delay:${i * 0.03}s">
      <div class="card-header" onclick="toggleCard(${ex.id})">
        <div class="card-cat-bar" style="background:${cat.color}"></div>
        <div class="card-info">
          <div class="card-title">${ex.nameRu}</div>
          <div class="card-subtitle">${ex.nameEn}</div>
          <div class="card-meta">
            <span class="card-tag cat" style="background:${cat.color}">${cat.icon} ${cat.name}</span>
            <span class="card-level ${levelClass}">${levelText}</span>
            ${equipTags}
          </div>
        </div>
        <div class="card-actions">
          <button class="btn-fav ${isFav ? 'active' : ''}" onclick="event.stopPropagation();toggleFav(${ex.id})" title="Избранное">${isFav ? '★' : '☆'}</button>
          <button class="btn-add ${isInWorkout ? 'active' : ''}" onclick="event.stopPropagation();toggleWorkout(${ex.id})" title="В тренировку">${isInWorkout ? '✓' : '+'}</button>
        </div>
      </div>
      <div class="card-body ${isExpanded ? 'open' : ''}" id="body-${ex.id}">
        ${ex.img ? `<div class="card-illustration"><img src="${ex.img}" alt="${ex.nameRu}"></div>` : ''}
        <div class="card-section">
          <div class="card-section-title">📖 Описание</div>
          <div class="card-desc">${ex.descRu}</div>
          <div class="desc-actions">${ttsBtn(ex.descRu, 'ru')}${showBtn(ex.descRu, 'ru')}</div>
          <div class="card-desc" style="margin-top:4px;color:var(--text-muted);font-size:0.82rem">${ex.descEn}</div>
          <div class="desc-actions">${ttsBtn(ex.descEn, 'en')}${showBtn(ex.descEn, 'en')}</div>
          ${ex.descCn ? `<div class="card-desc" style="margin-top:4px;color:var(--text-muted);font-size:0.82rem">${ex.descCn}</div>
          <div class="desc-actions">${ttsBtn(ex.descCn, 'cn')}${showBtn(ex.descCn, 'cn')}</div>` : ''}
        </div>
        <div class="card-section">
          <div class="card-section-title">💊 Дозировка</div>
          <div class="card-dosage">${ex.dosage}</div>
        </div>
        <div class="card-section">
          <div class="card-section-title">🗣️ Фразы тренера</div>
          ${ex.coachRu.map((phrase, j) => {
      const enPhrase = ex.coachEn[j] || '';
      const cnPhrase = (ex.coachCn || [])[j] || '';
      return `
            <div class="coach-phrase">
              <div class="phrase-line"><div class="lang">🇷🇺</div><div class="phrase">"${phrase}"</div><span class="phrase-actions">${ttsBtn(phrase, 'ru')}${showBtn(phrase, 'ru')}</span></div>
              <div class="phrase-line"><div class="lang">🇬🇧</div><div class="phrase">"${enPhrase}"</div>${enPhrase ? `<span class="phrase-actions">${ttsBtn(enPhrase, 'en')}${showBtn(enPhrase, 'en')}</span>` : ''}</div>
              ${cnPhrase ? `<div class="phrase-line"><div class="lang">🇨🇳</div><div class="phrase">"${cnPhrase}"</div><span class="phrase-actions">${ttsBtn(cnPhrase, 'cn')}${showBtn(cnPhrase, 'cn')}</span></div>` : ''}
            </div>`;
    }).join('')}
        </div>
        <div class="card-section">
          <div class="card-section-title">🎯 Целевые мышцы</div>
          <div class="card-meta">${(ex.muscles || []).map(m => `<span class="card-tag">${m}</span>`).join('')}</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// === CARD TOGGLE ===
function toggleCard(id) {
  if (state.expandedCards.has(id)) {
    state.expandedCards.delete(id);
  } else {
    state.expandedCards.add(id);
  }
  const body = document.getElementById(`body-${id}`);
  if (body) body.classList.toggle('open');
}

// === FAVORITES ===
function toggleFav(id) {
  const idx = state.favorites.indexOf(id);
  if (idx > -1) state.favorites.splice(idx, 1);
  else state.favorites.push(id);
  localStorage.setItem('jmp_favs', JSON.stringify(state.favorites));
  renderCards();
  if (state.panelTab === 'favorites') renderPanelContent();
}

// === WORKOUT ===
function toggleWorkout(id) {
  const idx = state.workout.indexOf(id);
  if (idx > -1) state.workout.splice(idx, 1);
  else state.workout.push(id);
  localStorage.setItem('jmp_workout', JSON.stringify(state.workout));
  updateFabBadge();
  renderCards();
  if (state.panelTab === 'workout') renderPanelContent();
}

function updateFabBadge() {
  const badge = document.getElementById('fabBadge');
  const count = state.workout.length;
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

// === PANEL ===
function openPanel() {
  document.getElementById('panelOverlay').classList.add('open');
  document.getElementById('sidePanel').classList.add('open');
  renderPanelContent();
}
function closePanel() {
  document.getElementById('panelOverlay').classList.remove('open');
  document.getElementById('sidePanel').classList.remove('open');
}

function renderPanelContent() {
  const list = document.getElementById('panelList');
  const empty = document.getElementById('panelEmpty');
  const title = document.getElementById('panelTitle');
  const ids = state.panelTab === 'favorites' ? state.favorites : state.workout;
  title.textContent = state.panelTab === 'favorites' ? 'Избранное' : 'Тренировка';

  if (ids.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    empty.textContent = state.panelTab === 'favorites' ? 'Нет избранных. Нажмите ☆ на карточке.' : 'Тренировка пуста. Нажмите + на карточке.';
    return;
  }
  empty.style.display = 'none';
  let html = ids.map(id => {
    const ex = EXERCISES.find(e => e.id === id);
    if (!ex) return '';
    const cat = CATEGORIES[ex.cat];
    return `<li class="panel-item">
      <div class="card-cat-bar" style="background:${cat.color};min-height:30px"></div>
      <div>
        <div class="pi-name">${ex.nameRu}</div>
        <div class="pi-cat">${cat.icon} ${cat.name} · ${ex.dosage}</div>
      </div>
      <button class="btn-remove" onclick="${state.panelTab === 'favorites' ? `toggleFav(${id})` : `toggleWorkout(${id})`}" title="Удалить">✕</button>
    </li>`;
  }).join('');

  // Send to training button (workout tab only)
  if (state.panelTab === 'workout') {
    html += `<li class="panel-send-btn-wrap">
      <button class="panel-send-btn" onclick="openSendWorkoutModal()">📤 Закинуть в тренировку</button>
    </li>`;
  }
  list.innerHTML = html;
}

// === SEND WORKOUT TO TRAINING ===

function openSendWorkoutModal() {
  closePanel();
  const old = document.getElementById('sendWorkoutOverlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'sendWorkoutOverlay';
  overlay.className = 'send-modal-overlay';
  overlay.innerHTML = renderSendWorkoutModal();
  document.body.appendChild(overlay);
}

function closeSendWorkoutModal() {
  const el = document.getElementById('sendWorkoutOverlay');
  if (el) el.remove();
}

function renderSendWorkoutModal() {
  const exCount = state.workout.length;

  // Weekly plans section
  let weeklyHtml = '';
  if (state.weeklyPlans.length > 0) {
    state.weeklyPlans.forEach((week, wIdx) => {
      const lang = week.lang || 'ru';
      const dayBtns = DAY_KEYS.map(d => {
        const label = getDayLabel(d, lang).substring(0, 3);
        const count = (week.days[d] || []).length;
        return `<button class="send-day-btn" onclick="sendWorkoutToDay(${wIdx},'${d}')">
          ${label}${count > 0 ? ` <span class="send-day-count">${count}</span>` : ''}
        </button>`;
      }).join('');
      weeklyHtml += `<div class="send-target-group">
        <div class="send-target-title">📅 ${week.name}</div>
        <div class="send-day-row">${dayBtns}</div>
      </div>`;
    });
  } else {
    weeklyHtml = `<div class="send-empty">Нет недельных планов</div>`;
  }

  // Training plans section
  let plansHtml = '';
  if (state.trainingPlans.length > 0) {
    plansHtml = state.trainingPlans.map((plan, idx) => {
      const count = plan.exercises.length;
      return `<button class="send-plan-btn" onclick="sendWorkoutToPlan(${idx})">
        <span>🏋️ ${plan.name}</span>
        <span class="send-day-count">${count} упр.</span>
      </button>`;
    }).join('');
  } else {
    plansHtml = `<div class="send-empty">Нет тренировок</div>`;
  }

  return `<div class="send-modal">
    <div class="send-modal-header">
      <h3>📤 Закинуть ${exCount} упр.</h3>
      <button class="panel-close" onclick="closeSendWorkoutModal()">✕</button>
    </div>
    <div class="send-modal-body">
      <div class="send-section-label">В день недели</div>
      ${weeklyHtml}
      <div class="send-section-label" style="margin-top:16px">В тренировку</div>
      ${plansHtml}
    </div>
  </div>`;
}

function sendWorkoutToDay(wIdx, day) {
  const week = state.weeklyPlans[wIdx];
  if (!week) return;
  state.workout.forEach(exId => {
    const ex = EXERCISES.find(e => e.id === exId);
    if (!ex) return;
    // Skip if already in this day
    if (week.days[day].some(e => e.exId === ex.id)) return;
    week.days[day].push({ exId: ex.id, customId: null, dosage: ex.dosage });
  });
  saveWeekly();
  // Clear workout
  state.workout = [];
  localStorage.setItem('jmp_workout', JSON.stringify(state.workout));
  updateFabBadge();
  closeSendWorkoutModal();
  // Navigate to weekly tab and render
  state.activeProg = 'weekly';
  renderProgramSection();
  showToast(`✅ Добавлено в ${getDayLabel(day, week.lang || 'ru')}`);
}

function sendWorkoutToPlan(planIdx) {
  const plan = state.trainingPlans[planIdx];
  if (!plan) return;
  state.workout.forEach(exId => {
    const ex = EXERCISES.find(e => e.id === exId);
    if (!ex) return;
    plan.exercises.push({
      id: ex.id, cat: ex.cat,
      nameRu: ex.nameRu, nameEn: ex.nameEn, nameCn: ex.nameCn || '',
      dosage: ex.dosage,
      descRu: ex.descRu || '', descEn: ex.descEn || '', descCn: ex.descCn || '',
      coachRu: ex.coachRu || [], coachEn: ex.coachEn || [], coachCn: ex.coachCn || [],
      img: ex.img || '', level: ex.level || '', muscles: ex.muscles || []
    });
  });
  savePlans();
  // Clear workout
  state.workout = [];
  localStorage.setItem('jmp_workout', JSON.stringify(state.workout));
  updateFabBadge();
  closeSendWorkoutModal();
  // Navigate to plan editor
  state.activeProg = 'planner';
  state.editingPlan = planIdx;
  renderProgramSection();
  showToast(`✅ Добавлено в ${plan.name}`);
}

function showToast(msg) {
  const old = document.getElementById('appToast');
  if (old) old.remove();
  const toast = document.createElement('div');
  toast.id = 'appToast';
  toast.className = 'app-toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 2000);
}

// ================================================================
// === TECHNIQUE SECTION ===
// ================================================================
function renderTechniqueSection() {
  renderPhaseTabs();
  renderTechniqueCards();
  renderChecklist();
}

function renderPhaseTabs() {
  const container = document.getElementById('techniquePhaseTabs');
  container.innerHTML = TECHNIQUE_PHASES.map(p =>
    `<button class="technique-tab ${p.id === state.activePhase ? 'active' : ''}" data-phase="${p.id}" style="--tab-color:${p.color}">
      ${p.icon} ${p.nameRu}
      <span class="tech-tab-count">${TECHNIQUE_ERRORS.filter(e => e.phase === p.id).length}</span>
    </button>`
  ).join('');
}

function renderTechniqueCards() {
  const container = document.getElementById('techniqueCards');
  const errors = TECHNIQUE_ERRORS.filter(e => e.phase === state.activePhase);
  const phase = TECHNIQUE_PHASES.find(p => p.id === state.activePhase);

  container.innerHTML = errors.map((err, i) => `
    <div class="error-card" style="animation-delay:${i * 0.05}s">
      <div class="error-header" onclick="toggleErrorCard(${err.id})">
        <div class="card-cat-bar" style="background:${phase.color}"></div>
        <div class="error-info">
          <div class="error-title">❌ ${err.errorRu}</div>
          <div class="error-subtitle">${err.errorEn}</div>
        </div>
        <div class="error-chevron" id="chevron-err-${err.id}">▼</div>
      </div>
      <div class="error-body" id="err-body-${err.id}">
        <div class="error-block">
          <div class="error-label">❌ Проблема</div>
          <p>${err.descRu}</p>
          <p class="text-muted">${err.descEn}</p>
        </div>
        <div class="error-block fix">
          <div class="error-label">✅ Исправление</div>
          <p>${err.fixRu}</p>
          <p class="text-muted">${err.fixEn}</p>
        </div>
        <div class="error-block cues">
          <div class="error-label">🗣️ Фразы тренера</div>
          <div class="cue-list">
            ${err.cuesRu.map((cue, j) => {
    const enCue = err.cuesEn[j] || '';
    const cnCue = (err.cuesCn || [])[j] || '';
    return `
              <div class="cue-pair">
                <div class="cue-line"><span class="cue ru">🇷🇺 "${cue}"</span><span class="phrase-actions">${ttsBtn(cue, 'ru')}${showBtn(cue, 'ru')}</span></div>
                ${enCue ? `<div class="cue-line"><span class="cue en">🇬🇧 "${enCue}"</span><span class="phrase-actions">${ttsBtn(enCue, 'en')}${showBtn(enCue, 'en')}</span></div>` : ''}
                ${cnCue ? `<div class="cue-line"><span class="cue cn">🇨🇳 "${cnCue}"</span><span class="phrase-actions">${ttsBtn(cnCue, 'cn')}${showBtn(cnCue, 'cn')}</span></div>` : ''}
              </div>`;
  }).join('')}
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function toggleErrorCard(id) {
  const body = document.getElementById(`err-body-${id}`);
  const chevron = document.getElementById(`chevron-err-${id}`);
  if (body) {
    body.classList.toggle('open');
    if (chevron) chevron.textContent = body.classList.contains('open') ? '▲' : '▼';
  }
}

function renderChecklist() {
  const container = document.getElementById('checklistContainer');
  const total = TECHNIQUE_CHECKLIST.reduce((sum, g) => sum + g.items.length, 0);
  const checked = Object.values(state.checklist).filter(Boolean).length;

  container.innerHTML = `
    <div class="checklist-progress">
      <div class="checklist-bar">
        <div class="checklist-fill" style="width:${(checked / total) * 100}%"></div>
      </div>
      <span class="checklist-count">${checked} / ${total}</span>
      ${checked > 0 ? `<button class="checklist-reset" onclick="resetChecklist()">Сбросить</button>` : ''}
    </div>
    ${TECHNIQUE_CHECKLIST.map(group => {
    const phase = TECHNIQUE_PHASES.find(p => p.id === group.phase);
    return `
        <div class="checklist-group">
          <div class="checklist-phase" style="color:${phase.color}">${phase.icon} ${phase.nameRu}</div>
          ${group.items.map(item => `
            <label class="checklist-item ${state.checklist[item.id] ? 'checked' : ''}">
              <input type="checkbox" ${state.checklist[item.id] ? 'checked' : ''} onchange="toggleCheckItem('${item.id}', this.checked)">
              <span class="checkmark"></span>
              <span class="check-text">${item.textRu}</span>
              <span class="check-text-en">${item.textEn}</span>
            </label>
          `).join('')}
        </div>
      `;
  }).join('')}
  `;
}

function toggleCheckItem(id, checked) {
  state.checklist[id] = checked;
  localStorage.setItem('jmp_checklist', JSON.stringify(state.checklist));
  renderChecklist();
}

function resetChecklist() {
  state.checklist = {};
  localStorage.setItem('jmp_checklist', '{}');
  renderChecklist();
}

// ================================================================
// === REFERENCE SECTION ===
// ================================================================
function renderRefSection() {
  const content = document.getElementById('refContent');
  switch (state.activeRef) {
    case 'periodization': content.innerHTML = renderPeriodization(); break;
    case 'injuries': content.innerHTML = renderInjuries(); break;
    case 'mental': content.innerHTML = renderMental(); break;
    case 'benchmarks': content.innerHTML = renderBenchmarks(); break;
  }
}

function renderPeriodization() {
  return `
    <div class="periodization-timeline">
      ${PERIODIZATION.map(p => `
        <div class="period-card" style="--period-color:${p.color}">
          <div class="period-header">
            <span class="period-icon">${p.icon}</span>
            <div>
              <div class="period-name">${p.nameRu}</div>
              <div class="period-name-en">${p.nameEn}</div>
            </div>
            <span class="period-duration">${p.duration}</span>
          </div>
          <div class="period-body">
            <div class="period-meta">
              <span>📊 Объём: <strong>${p.volumeRu}</strong></span>
              <span>⚡ Интенсивность: <strong>${p.intensityRu}</strong></span>
              <span>👟 Контакты: <strong>${p.contacts}</strong></span>
            </div>
            <p class="period-goal">${p.goalRu}</p>
            <p class="period-goal text-muted">${p.goalEn}</p>
            <div class="period-exercises">
              ${p.exercisesRu.map(e => `<span class="card-tag">${e}</span>`).join('')}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="volume-guide">
      <h4>📏 Рекомендации по объёму (контакты/сессия)</h4>
      <div class="volume-table">
        ${VOLUME_GUIDELINES.map(v => `
          <div class="volume-row" style="border-left:4px solid ${v.color}">
            <strong>${v.levelRu}</strong>
            <span>${v.contacts} контактов</span>
            <span>Восст.: ${v.recovery}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderInjuries() {
  return INJURY_DATA.map(inj => `
    <div class="injury-card" style="--injury-color:${inj.color}">
      <div class="injury-header" onclick="toggleInjuryCard('${inj.id}')">
        <span class="injury-icon">${inj.icon}</span>
        <div>
          <div class="injury-name">${inj.nameRu}</div>
          <div class="injury-name-en">${inj.nameEn}</div>
        </div>
        <span class="error-chevron" id="chevron-inj-${inj.id}">▼</span>
      </div>
      <div class="injury-body" id="inj-body-${inj.id}">
        <div class="error-block">
          <div class="error-label">⚡ Причина</div>
          <p>${inj.causeRu}</p>
          <p class="text-muted">${inj.causeEn}</p>
        </div>
        <div class="error-block fix">
          <div class="error-label">🛡️ Профилактика</div>
          <ul class="prevention-list">
            ${inj.preventionRu.map(p => `<li>${p}</li>`).join('')}
          </ul>
        </div>
        <div class="error-block">
          <div class="error-label">🔄 Реабилитация</div>
          <p>${inj.rehabRu}</p>
          <p class="text-muted">${inj.rehabEn}</p>
        </div>
        ${inj.exerciseIds.length > 0 ? `
          <div class="error-block">
            <div class="error-label">📖 Связанные упражнения</div>
            <div class="linked-exercises">
              ${inj.exerciseIds.map(eid => {
    const ex = EXERCISES.find(e => e.id === eid);
    return ex ? `<button class="linked-ex-btn" onclick="goToExercise(${eid})">${ex.nameRu}</button>` : '';
  }).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function toggleInjuryCard(id) {
  const body = document.getElementById(`inj-body-${id}`);
  const chevron = document.getElementById(`chevron-inj-${id}`);
  if (body) {
    body.classList.toggle('open');
    if (chevron) chevron.textContent = body.classList.contains('open') ? '▲' : '▼';
  }
}

function goToExercise(id) {
  switchSection('exercises');
  state.expandedCards.add(id);
  renderCards();
  setTimeout(() => {
    const el = document.getElementById(`body-${id}`);
    if (el) {
      el.classList.add('open');
      el.closest('.exercise-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);
}

function renderMental() {
  return MENTAL_PREP.map(mp => `
    <div class="mental-card">
      <div class="mental-header">
        <span class="mental-icon">${mp.icon}</span>
        <div>
          <div class="mental-name">${mp.nameRu}</div>
          <div class="mental-name-en">${mp.nameEn}</div>
        </div>
      </div>
      <p class="mental-desc">${mp.descRu}</p>
      <p class="mental-desc text-muted">${mp.descEn}</p>
      <ol class="mental-steps">
        ${mp.stepsRu.map(s => `<li>${s}</li>`).join('')}
      </ol>
      ${mp.id === 'breathing' ? renderBreathingTimer() : ''}
    </div>
  `).join('');
}

function renderBreathingTimer() {
  return `
    <div class="breathing-timer" id="breathingTimer">
      <div class="breathing-circle" id="breathingCircle">
        <div class="breathing-text" id="breathingText">Старт</div>
        <div class="breathing-phase" id="breathingPhase"></div>
      </div>
      <button class="breathing-btn" id="breathingBtn" onclick="toggleBreathing()">▶ Начать</button>
    </div>
  `;
}

function toggleBreathing() {
  const btn = document.getElementById('breathingBtn');
  const circle = document.getElementById('breathingCircle');
  const text = document.getElementById('breathingText');
  const phase = document.getElementById('breathingPhase');

  if (state.breathingTimer) {
    clearInterval(state.breathingTimer);
    state.breathingTimer = null;
    circle.classList.remove('breathing-active');
    circle.removeAttribute('data-phase');
    text.textContent = 'Старт';
    phase.textContent = '';
    btn.textContent = '▶ Начать';
    return;
  }

  btn.textContent = '⏸ Стоп';
  const phases = [
    { labelRu: 'Вдох', labelEn: 'Inhale', phase: 'inhale' },
    { labelRu: 'Задержка', labelEn: 'Hold', phase: 'hold1' },
    { labelRu: 'Выдох', labelEn: 'Exhale', phase: 'exhale' },
    { labelRu: 'Задержка', labelEn: 'Hold', phase: 'hold2' }
  ];
  let pi = 0, sec = 4;

  function tick() {
    const p = phases[pi];
    circle.setAttribute('data-phase', p.phase);
    circle.classList.add('breathing-active');
    text.textContent = sec;
    phase.textContent = p.labelRu;
    sec--;
    if (sec < 0) {
      sec = 4;
      pi = (pi + 1) % 4;
    }
  }

  tick();
  state.breathingTimer = setInterval(tick, 1000);
}

function renderBenchmarks() {
  return Object.values(BENCHMARKS).map(table => `
    <div class="benchmark-table">
      <h4>${table.titleRu} <span class="text-muted">${table.titleEn}</span></h4>
      <table>
        <tbody>
          ${table.rows.map(r => `
            <tr>
              <td class="bm-label">${r.labelRu}</td>
              <td class="bm-value">${r.value}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('');
}

// ================================================================
// === PROGRAM SECTION ===
// ================================================================
function renderProgramSection() {
  const content = document.getElementById('programContent');
  switch (state.activeProg) {
    case 'warmup': content.innerHTML = renderWarmup(); break;
    case 'planner': content.innerHTML = renderPlanner(); break;
    case 'weekly': content.innerHTML = renderWeeklySection(); break;
  }
}

function renderWarmup() {
  return `
    <div class="warmup-presets">
      ${Object.entries(WARMUP_PROTOCOLS).map(([key, proto]) => `
        <button class="warmup-preset-btn ${key === 'training' ? 'active' : ''}" data-warmup="${key}" onclick="selectWarmup('${key}')">
          ${proto.nameRu}
        </button>
      `).join('')}
      <button class="warmup-preset-btn export" onclick="exportWarmupPDF()">📄 PDF</button>
    </div>
    <div id="warmupDetail">${renderWarmupDetail('training')}</div>
  `;
}

function selectWarmup(key) {
  document.querySelectorAll('.warmup-preset-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.warmup-preset-btn[data-warmup="${key}"]`).classList.add('active');
  document.getElementById('warmupDetail').innerHTML = renderWarmupDetail(key);
}

function renderWarmupDetail(key) {
  const proto = WARMUP_PROTOCOLS[key];
  return proto.phases.map(phase => `
    <div class="warmup-phase">
      <div class="warmup-phase-header">
        <strong>${phase.nameRu}</strong>
        <span class="warmup-time">${phase.time}</span>
      </div>
      <div class="warmup-items">
        ${phase.items.map(item => `
          <div class="warmup-item">
            <span class="warmup-name">${item.nameRu}</span>
            <span class="warmup-name-en">${item.nameEn}</span>
            <span class="warmup-dosage">${item.dosage}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function renderPlanner() {
  const plans = state.trainingPlans;
  const editing = state.editingPlan;

  if (editing !== null && editing !== undefined) {
    return renderPlanEditor(editing);
  }

  let html = `
    <div class="planner-toolbar">
      <button class="planner-btn primary" onclick="createNewPlan()">＋ Новая тренировка</button>
      ${plans.length > 0 ? `<button class="planner-btn secondary" onclick="exportAllPlansPDF()">📄 Экспорт PDF</button>` : ''}
    </div>`;

  if (plans.length === 0) {
    html += `
      <div class="planner-empty">
        <div class="planner-icon">🗓️</div>
        <h3>Планировщик тренировок</h3>
        <p>Создавайте программы, выбирая упражнения из энциклопедии.<br>Добавляйте свою дозировку, заметки и экспортируйте в PDF.</p>
      </div>`;
  } else {
    html += `<div class="plan-list">`;
    plans.forEach((plan, idx) => {
      const exCount = plan.exercises.length;
      const catSet = new Set(plan.exercises.map(e => e.cat));
      const catChips = [...catSet].map(c => {
        const cat = CATEGORIES[c] || { icon: '?', color: '#999' };
        return `<span class="card-tag cat" style="background:${cat.color}">${cat.icon}</span>`;
      }).join('');
      html += `
        <div class="plan-card" onclick="editPlan(${idx})">
          <div class="plan-card-header">
            <div class="plan-card-info">
              <div class="plan-card-title">${plan.name}</div>
              <div class="plan-card-meta">${exCount} упр. · ${plan.date || '—'}  ${catChips}</div>
            </div>
            <div class="plan-card-actions">
              <button class="btn-remove" onclick="event.stopPropagation();duplicatePlan(${idx})" title="Копия">📋</button>
              <button class="btn-remove" onclick="event.stopPropagation();deletePlan(${idx})" title="Удалить">✕</button>
            </div>
          </div>
        </div>`;
    });
    html += `</div>`;
  }
  return html;
}

function createNewPlan() {
  const now = new Date();
  const plan = {
    name: `Тренировка ${state.trainingPlans.length + 1}`,
    date: now.toISOString().slice(0, 10),
    dayOfWeek: null,
    exercises: [],
    notes: ''
  };
  state.trainingPlans.push(plan);
  state.editingPlan = state.trainingPlans.length - 1;
  savePlans();
  renderProgramSection();
}

function editPlan(idx) {
  state.editingPlan = idx;
  renderProgramSection();
}

function deletePlan(idx) {
  state.trainingPlans.splice(idx, 1);
  savePlans();
  renderProgramSection();
}

function duplicatePlan(idx) {
  const copy = JSON.parse(JSON.stringify(state.trainingPlans[idx]));
  copy.name += ' (копия)';
  copy.date = new Date().toLocaleDateString('ru-RU');
  state.trainingPlans.push(copy);
  savePlans();
  renderProgramSection();
}

function savePlans() {
  localStorage.setItem('jmp_plans', JSON.stringify(state.trainingPlans));
}

function renderPlanEditor(idx) {
  const plan = state.trainingPlans[idx];
  if (!plan) { state.editingPlan = null; return renderPlanner(); }

  const exCount = plan.exercises.length;
  let exListHtml = '';
  plan.exercises.forEach((ex, i) => {
    const cat = CATEGORIES[ex.cat] || { icon: '?', color: '#999', name: ex.cat };
    exListHtml += `
      <div class="plan-exercise" data-index="${i}">
        <div class="plan-ex-reorder">
          <button class="reorder-btn" onclick="moveExInPlan(${idx},${i},-1)" ${i === 0 ? 'disabled' : ''} title="Вверх">▲</button>
          <button class="reorder-btn" onclick="moveExInPlan(${idx},${i},1)" ${i === exCount - 1 ? 'disabled' : ''} title="Вниз">▼</button>
        </div>
        <div class="plan-ex-bar" style="background:${cat.color}"></div>
        <div class="plan-ex-info">
          <div class="plan-ex-name">${ex.nameRu}</div>
          <div class="plan-ex-sub">${ex.nameEn}</div>
        </div>
        <input class="plan-ex-dosage" value="${ex.dosage}" placeholder="3×10"
               onchange="updateExDosage(${idx},${i},this.value)" />
        <button class="btn-remove" onclick="removeExFromPlan(${idx},${i})" title="Удалить">✕</button>
      </div>`;
  });

  const PLAN_DAYS = [
    { key: 'mon', ru: 'Пн', en: 'Mon' }, { key: 'tue', ru: 'Вт', en: 'Tue' },
    { key: 'wed', ru: 'Ср', en: 'Wed' }, { key: 'thu', ru: 'Чт', en: 'Thu' },
    { key: 'fri', ru: 'Пт', en: 'Fri' }, { key: 'sat', ru: 'Сб', en: 'Sat' },
    { key: 'sun', ru: 'Вс', en: 'Sun' }
  ];
  const dayChips = PLAN_DAYS.map(d =>
    `<button class="day-chip ${plan.dayOfWeek === d.key ? 'active' : ''}" onclick="setPlanDay(${idx},'${d.key}')">${d.ru}</button>`
  ).join('');

  // Format display date
  const displayDate = plan.date ? new Date(plan.date + 'T00:00:00').toLocaleDateString('ru-RU') : '';
  const dayLabel = plan.dayOfWeek ? PLAN_DAYS.find(d => d.key === plan.dayOfWeek)?.ru || '' : '';

  return `
    <div class="plan-editor">
      <div class="plan-editor-header">
        <button class="planner-btn ghost" onclick="closePlanEditor()">← Назад</button>
        <div class="plan-editor-actions">
          <button class="planner-btn secondary" onclick="sendPlanToWeeklyModal(${idx})">📤 В недельный план</button>
          <button class="planner-btn secondary" onclick="exportPlanPDF(${idx})">📄 PDF</button>
        </div>
      </div>
      <input class="plan-name-input" value="${plan.name}"
             onchange="updatePlanName(${idx},this.value)" placeholder="Название тренировки" />
      <div class="plan-date-row">
        <input type="date" class="plan-date-input" value="${plan.date || ''}"
               onchange="updatePlanDate(${idx},this.value)" />
        <div class="plan-day-chips">${dayChips}</div>
      </div>
      <div class="plan-exercises-list" id="planExList">
        ${exListHtml || '<div class="plan-empty-ex">Добавьте упражнения из базы ↓</div>'}
      </div>
      <div class="plan-add-buttons">
        <button class="planner-btn add-ex" onclick="openExPicker(${idx})">＋ Добавить упражнение</button>
        <button class="planner-btn add-custom" onclick="openCustomExForm(${idx})">✏️ Своё упражнение</button>
      </div>
      <div class="plan-notes-section">
        <label class="plan-notes-label">📝 Заметки</label>
        <textarea class="plan-notes" rows="3" placeholder="Заметки к тренировке..."
                  onchange="updatePlanNotes(${idx},this.value)">${plan.notes || ''}</textarea>
      </div>
    </div>`;
}

function closePlanEditor() {
  state.editingPlan = null;
  renderProgramSection();
}

function updatePlanName(idx, name) {
  state.trainingPlans[idx].name = name;
  savePlans();
}

function updatePlanNotes(idx, notes) {
  state.trainingPlans[idx].notes = notes;
  savePlans();
}

function updateExDosage(planIdx, exIdx, dosage) {
  state.trainingPlans[planIdx].exercises[exIdx].dosage = dosage;
  savePlans();
}

function moveExInPlan(planIdx, exIdx, dir) {
  const exs = state.trainingPlans[planIdx].exercises;
  const newIdx = exIdx + dir;
  if (newIdx < 0 || newIdx >= exs.length) return;
  [exs[exIdx], exs[newIdx]] = [exs[newIdx], exs[exIdx]];
  savePlans();
  renderProgramSection();
}

function removeExFromPlan(planIdx, exIdx) {
  state.trainingPlans[planIdx].exercises.splice(exIdx, 1);
  savePlans();
  renderProgramSection();
}

function updatePlanDate(idx, dateStr) {
  state.trainingPlans[idx].date = dateStr;
  savePlans();
}

function setPlanDay(idx, day) {
  const plan = state.trainingPlans[idx];
  plan.dayOfWeek = plan.dayOfWeek === day ? null : day;
  savePlans();
  renderProgramSection();
}

// === SEND PLAN → WEEKLY DAY ===
function sendPlanToWeeklyModal(planIdx) {
  const plan = state.trainingPlans[planIdx];
  if (!plan || plan.exercises.length === 0) {
    showToast('⚠️ Тренировка пустая');
    return;
  }
  const old = document.getElementById('sendWorkoutOverlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'sendWorkoutOverlay';
  overlay.className = 'send-modal-overlay';

  const DAY_LABELS = { mon: 'Пн', tue: 'Вт', wed: 'Ср', thu: 'Чт', fri: 'Пт', sat: 'Сб', sun: 'Вс' };
  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  let weeklyHtml = '';
  state.weeklyPlans.forEach((w, wIdx) => {
    weeklyHtml += `<div class="send-week-label">📅 ${w.name}</div>
      <div class="send-day-row">
        ${DAYS.map(d => {
      const cnt = w.days[d].length;
      return `<button class="send-day-btn" onclick="sendPlanToDay(${planIdx},${wIdx},'${d}')">
            ${DAY_LABELS[d]} ${cnt ? `<span class="send-cnt">${cnt}</span>` : ''}
          </button>`;
    }).join('')}
      </div>`;
  });

  if (state.weeklyPlans.length === 0) {
    weeklyHtml = '<div class="send-empty">Нет недельных планов</div>';
  }

  overlay.innerHTML = `<div class="send-modal">
    <div class="send-modal-header">
      <h3>📤 Закинуть ${plan.exercises.length} упр. из "${plan.name}"</h3>
      <button class="panel-close" onclick="closeSendWorkoutModal()">✕</button>
    </div>
    <div class="send-modal-body">
      <div class="send-section-label">В день недели</div>
      ${weeklyHtml}
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

function sendPlanToDay(planIdx, wIdx, day) {
  const plan = state.trainingPlans[planIdx];
  const week = state.weeklyPlans[wIdx];
  if (!plan || !week) return;
  plan.exercises.forEach(ex => {
    const live = EXERCISES.find(e => e.id === ex.id);
    const entry = {
      exId: ex.id || null,
      customId: null,
      dosage: ex.dosage || ''
    };
    // For custom exercises, store inline
    if (!ex.id || ex.isCustom) {
      entry.exId = null;
      entry.customName = ex.nameRu || ex.nameEn || 'Custom';
      entry.customNameEn = ex.nameEn || '';
    }
    week.days[day].push(entry);
  });
  saveWeekly();
  closeSendWorkoutModal();
  state.activeProg = 'weekly';
  renderProgramSection();
  showToast(`✅ ${plan.exercises.length} упр. → ${getDayLabel(day, week.lang || 'ru')}`);
}

// === CUSTOM EXERCISE FORM ===
const GALLERY_IMAGES = [
  // Generic poses (AI-generated)
  'generic_running', 'generic_jumping', 'generic_stretching', 'generic_pushup',
  // Body parts (AI-generated)
  'bodypart_legs', 'bodypart_upperbody', 'bodypart_core', 'bodypart_ankles',
  // Exercise-specific (66 originals)
  '3pointstart', 'ankleflips', 'anklemobility', 'armcircles', 'askip', 'backarch', 'backover',
  'banddislocates', 'barbellrow', 'birddog', 'bounding', 'boxjump', 'bulgariansplitsquat',
  'butterflystretch', 'buttkicks', 'calfstretch', 'catcow', 'circleruns', 'clamshells',
  'crouchstart', 'deadlift', 'depthjump', 'dropjump', 'firehydrant', 'flying30', 'frogstretch',
  'frontplank', 'frontsquat', 'fullapproach', 'gallop', 'hamstringstretch', 'highknees',
  'hip9090', 'hipflexorstretch', 'hurdlehops', 'iceskaters', 'jumprope', 'kickout', 'kneedrive',
  'kneelingjump', 'longjump', 'medballslam', 'neckcircles', 'pallofpress', 'pogo', 'powerclean',
  'pushpress', 'quadstretch', 'rdl', 'resistedsprints', 'scissorjump', 'scorpion', 'seatedtwist',
  'shortapproach', 'sideplank', 'singlelegglutebridge', 'spiderman', 'squat', 'squatjump',
  'stepup', 'straightlegbounds', 'trapbarjump', 'tuckjump', 'walkinglunge', 'walldrills',
  'worldsgreatest'
];

let customExState = { planIdx: null, selectedImg: '' };

function openCustomExForm(planIdx) {
  customExState = { planIdx, selectedImg: '' };
  const old = document.getElementById('customExOverlay');
  if (old) old.remove();

  const catOptions = Object.entries(CATEGORIES).map(([key, cat]) =>
    `<option value="${key}">${cat.icon} ${cat.name}</option>`
  ).join('');

  const overlay = document.createElement('div');
  overlay.id = 'customExOverlay';
  overlay.className = 'custom-ex-overlay';
  overlay.innerHTML = `
    <div class="custom-ex-modal">
      <h3>✏️ Своё упражнение <button class="panel-close" onclick="closeCustomExForm()">✕</button></h3>

      <div class="custom-ex-row">
        <div class="custom-ex-field">
          <label>Название <span class="req">*</span></label>
          <input id="cex_nameRu" placeholder="Название упражнения" />
        </div>
      </div>
      <div class="custom-ex-row">
        <div class="custom-ex-field">
          <label>Name (EN)</label>
          <input id="cex_nameEn" placeholder="Exercise name" />
        </div>
        <div class="custom-ex-field">
          <label>名称 (CN)</label>
          <input id="cex_nameCn" placeholder="练习名称" />
        </div>
      </div>
      <div class="custom-ex-row">
        <div class="custom-ex-field">
          <label>Дозировка <span class="req">*</span></label>
          <input id="cex_dosage" placeholder="3×10, 30 сек, etc." />
        </div>
        <div class="custom-ex-field">
          <label>Категория</label>
          <select id="cex_cat">${catOptions}</select>
        </div>
        <div class="custom-ex-field">
          <label>Уровень</label>
          <select id="cex_level">
            <option value="">—</option>
            <option value="beginner">Начинающий</option>
            <option value="intermediate">Средний</option>
            <option value="advanced">Продвинутый</option>
          </select>
        </div>
      </div>

      <div class="custom-ex-row">
        <div class="custom-ex-img-preview" id="cex_imgPreview" onclick="openIllustrationPicker()">
          <span style="font-size:24px;opacity:0.3">🖼</span>
        </div>
        <div class="custom-ex-field" style="flex:1">
          <label>Иллюстрация</label>
          <small style="color:var(--text-secondary);font-size:0.75rem">Нажмите на рамку, чтобы выбрать из галереи</small>
        </div>
      </div>

      <div class="custom-ex-section">
        <div class="custom-ex-section-title">📖 Описание (необязательно)</div>
        <div class="custom-ex-row">
          <div class="custom-ex-field"><label>RU</label><textarea id="cex_descRu" rows="2" placeholder="Описание..."></textarea></div>
        </div>
        <div class="custom-ex-row">
          <div class="custom-ex-field"><label>EN</label><textarea id="cex_descEn" rows="2" placeholder="Description..."></textarea></div>
        </div>
        <div class="custom-ex-row">
          <div class="custom-ex-field"><label>CN</label><textarea id="cex_descCn" rows="2" placeholder="描述..."></textarea></div>
        </div>
      </div>

      <div class="custom-ex-section">
        <div class="custom-ex-section-title">💡 Coach Tips (необязательно)</div>
        <div class="custom-ex-row">
          <div class="custom-ex-field"><label>RU (по одному на строку)</label><textarea id="cex_tipsRu" rows="2" placeholder="Спина прямая\nКолени не за стопы"></textarea></div>
        </div>
        <div class="custom-ex-row">
          <div class="custom-ex-field"><label>EN</label><textarea id="cex_tipsEn" rows="2" placeholder="Keep back straight\nKnees behind toes"></textarea></div>
        </div>
        <div class="custom-ex-row">
          <div class="custom-ex-field"><label>CN</label><textarea id="cex_tipsCn" rows="2" placeholder="保持背部挺直\n膝盖不超过脚趾"></textarea></div>
        </div>
      </div>

      <div class="custom-ex-actions">
        <button class="btn-cancel" onclick="closeCustomExForm()">Отмена</button>
        <button class="btn-save" onclick="saveCustomExercise()">✅ Добавить</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
}

function closeCustomExForm() {
  const el = document.getElementById('customExOverlay');
  if (el) el.remove();
}

function saveCustomExercise() {
  const nameRu = document.getElementById('cex_nameRu').value.trim();
  const dosage = document.getElementById('cex_dosage').value.trim();
  if (!nameRu) { showToast('⚠️ Введите название'); return; }
  if (!dosage) { showToast('⚠️ Введите дозировку'); return; }

  const parseTips = (val) => val.split('\n').map(s => s.trim()).filter(Boolean);

  const ex = {
    id: null,
    isCustom: true,
    cat: document.getElementById('cex_cat').value,
    nameRu,
    nameEn: document.getElementById('cex_nameEn').value.trim(),
    nameCn: document.getElementById('cex_nameCn').value.trim(),
    dosage,
    level: document.getElementById('cex_level').value,
    descRu: document.getElementById('cex_descRu').value.trim(),
    descEn: document.getElementById('cex_descEn').value.trim(),
    descCn: document.getElementById('cex_descCn').value.trim(),
    coachRu: parseTips(document.getElementById('cex_tipsRu').value),
    coachEn: parseTips(document.getElementById('cex_tipsEn').value),
    coachCn: parseTips(document.getElementById('cex_tipsCn').value),
    img: customExState.selectedImg,
    muscles: []
  };

  const plan = state.trainingPlans[customExState.planIdx];
  if (plan) {
    plan.exercises.push(ex);
    savePlans();
  }
  closeCustomExForm();
  renderProgramSection();
  showToast(`✅ «${nameRu}» добавлено`);
}

// === ILLUSTRATION GALLERY PICKER ===
function openIllustrationPicker() {
  const old = document.getElementById('illustGalleryOverlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'illustGalleryOverlay';
  overlay.className = 'illust-gallery-overlay';

  const items = GALLERY_IMAGES.map(name => {
    const path = `images/${name}.png`;
    const sel = customExState.selectedImg === path ? 'selected' : '';
    return `<div class="illust-item ${sel}" onclick="pickIllustration('${path}')">
      <img src="${path}" alt="${name}" loading="lazy" />
    </div>`;
  }).join('');

  overlay.innerHTML = `
    <div class="illust-gallery">
      <h3>🖼 Выберите иллюстрацию <button class="panel-close" onclick="closeIllustPicker()">✕</button></h3>
      <div class="illust-grid">${items}</div>
    </div>`;
  document.body.appendChild(overlay);
}

function pickIllustration(path) {
  customExState.selectedImg = path;
  // Update preview in form
  const preview = document.getElementById('cex_imgPreview');
  if (preview) {
    preview.innerHTML = `<img src="${path}" />`;
  }
  closeIllustPicker();
}

function closeIllustPicker() {
  const el = document.getElementById('illustGalleryOverlay');
  if (el) el.remove();
}



function openExPicker(planIdx) {
  state.pickerPlanIdx = planIdx;
  state.pickerSearch = '';
  state.pickerCat = null;
  const overlay = document.createElement('div');
  overlay.id = 'exPickerOverlay';
  overlay.className = 'picker-overlay open';
  overlay.innerHTML = renderExPicker();
  document.body.appendChild(overlay);
}

function closeExPicker() {
  const el = document.getElementById('exPickerOverlay');
  if (el) el.remove();
}

function renderExPicker() {
  const search = (state.pickerSearch || '').toLowerCase();
  const cat = state.pickerCat;
  const plan = state.trainingPlans[state.pickerPlanIdx];
  const addedIds = new Set((plan?.exercises || []).map(e => e.id));

  let filtered = EXERCISES.filter(ex => {
    if (cat && ex.cat !== cat) return false;
    if (search && !ex.nameRu.toLowerCase().includes(search) && !ex.nameEn.toLowerCase().includes(search)) return false;
    return true;
  });

  // Sort: not-added first, already-added last
  filtered.sort((a, b) => (addedIds.has(a.id) ? 1 : 0) - (addedIds.has(b.id) ? 1 : 0));

  const catBtns = Object.entries(CATEGORIES).map(([k, c]) =>
    `<button class="filter-chip ${cat === k ? 'active' : ''}" onclick="pickerFilterCat('${k}')">${c.icon} ${c.name}</button>`
  ).join('');

  const exItems = filtered.slice(0, 40).map(ex => {
    const c = CATEGORIES[ex.cat] || { color: '#999', icon: '?' };
    const isAdded = addedIds.has(ex.id);
    return `<div class="picker-item ${isAdded ? 'already-added' : ''}" onclick="${isAdded ? '' : `addExToPlan(${ex.id})`}">
      <div class="card-cat-bar" style="background:${c.color}"></div>
      <div class="picker-item-info">
        <div class="picker-item-name">${ex.nameRu}</div>
        <div class="picker-item-sub">${ex.nameEn} · ${ex.dosage}</div>
      </div>
      ${isAdded ? '<span class="picker-added-badge">✓</span>' : '<span class="picker-add">＋</span>'}
    </div>`;
  }).join('');

  return `
    <div class="picker-panel">
      <div class="picker-header">
        <h3>Добавить упражнение</h3>
        <button class="panel-close" onclick="closeExPicker()">✕</button>
      </div>
      <input class="search-box" placeholder="Поиск..." value="${state.pickerSearch || ''}"
             oninput="pickerSearchUpdate(this.value)" id="pickerSearchInput" />
      <div class="filter-row picker-cats">
        <button class="filter-chip ${!cat ? 'active' : ''}" onclick="pickerFilterCat(null)">Все</button>
        ${catBtns}
      </div>
      <div class="picker-list" id="pickerList">${exItems}</div>
    </div>`;
}

function pickerSearchUpdate(val) {
  state.pickerSearch = val;
  document.getElementById('pickerList').innerHTML = renderPickerList();
}

function pickerFilterCat(cat) {
  state.pickerCat = cat;
  const overlay = document.getElementById('exPickerOverlay');
  if (overlay) overlay.innerHTML = renderExPicker();
  const inp = document.getElementById('pickerSearchInput');
  if (inp) inp.focus();
}

function renderPickerList() {
  const search = (state.pickerSearch || '').toLowerCase();
  const cat = state.pickerCat;
  const plan = state.trainingPlans[state.pickerPlanIdx];
  const addedIds = new Set((plan?.exercises || []).map(e => e.id));

  let filtered = EXERCISES.filter(ex => {
    if (cat && ex.cat !== cat) return false;
    if (search && !ex.nameRu.toLowerCase().includes(search) && !ex.nameEn.toLowerCase().includes(search)) return false;
    return true;
  });

  filtered.sort((a, b) => (addedIds.has(a.id) ? 1 : 0) - (addedIds.has(b.id) ? 1 : 0));

  return filtered.slice(0, 40).map(ex => {
    const c = CATEGORIES[ex.cat] || { color: '#999', icon: '?' };
    const isAdded = addedIds.has(ex.id);
    return `<div class="picker-item ${isAdded ? 'already-added' : ''}" onclick="${isAdded ? '' : `addExToPlan(${ex.id})`}">
      <div class="card-cat-bar" style="background:${c.color}"></div>
      <div class="picker-item-info">
        <div class="picker-item-name">${ex.nameRu}</div>
        <div class="picker-item-sub">${ex.nameEn} · ${ex.dosage}</div>
      </div>
      ${isAdded ? '<span class="picker-added-badge">✓</span>' : '<span class="picker-add">＋</span>'}
    </div>`;
  }).join('');
}

function addExToPlan(exId) {
  const ex = EXERCISES.find(e => e.id === exId);
  if (!ex) return;
  const plan = state.trainingPlans[state.pickerPlanIdx];
  plan.exercises.push({
    id: ex.id, cat: ex.cat,
    nameRu: ex.nameRu, nameEn: ex.nameEn, nameCn: ex.nameCn || '',
    dosage: ex.dosage,
    descRu: ex.descRu || '', descEn: ex.descEn || '', descCn: ex.descCn || '',
    coachRu: ex.coachRu || [], coachEn: ex.coachEn || [], coachCn: ex.coachCn || [],
    img: ex.img || '', level: ex.level || '', muscles: ex.muscles || []
  });
  savePlans();
  // Re-render picker to show ✓ on just-added item
  const overlay = document.getElementById('exPickerOverlay');
  if (overlay) overlay.innerHTML = renderExPicker();
  // Re-render plan editor behind overlay
  renderProgramSection();
}

// ================================================================
// === WEEKLY PLANNER ===
// ================================================================

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = { mon: 'Понедельник', tue: 'Вторник', wed: 'Среда', thu: 'Четверг', fri: 'Пятница', sat: 'Суббота', sun: 'Воскресенье' };
const DAY_LABELS_EN = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
const DAY_LABELS_CN = { mon: '星期一', tue: '星期二', wed: '星期三', thu: '星期四', fri: '星期五', sat: '星期六', sun: '星期日' };

function getDayLabel(day, lang) {
  if (lang === 'en') return DAY_LABELS_EN[day];
  if (lang === 'cn') return DAY_LABELS_CN[day];
  return DAY_LABELS[day];
}

function saveWeekly() {
  localStorage.setItem('jmp_weekly', JSON.stringify(state.weeklyPlans));
}

function saveCustomExercises() {
  localStorage.setItem('jmp_custom_ex', JSON.stringify(state.customExercises));
}

function getMonday(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function formatDateRange(startDate, lang) {
  const d = new Date(startDate);
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  const locale = lang === 'en' ? 'en-US' : lang === 'cn' ? 'zh-CN' : 'ru-RU';
  const fmt = dt => dt.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  return `${fmt(d)} — ${fmt(end)}`;
}

function getExName(entry, lang) {
  if (entry.customId) {
    const custom = state.customExercises.find(c => c.id === entry.customId);
    return custom ? custom.name : '?';
  }
  const ex = EXERCISES.find(e => e.id === entry.exId);
  if (!ex) return '?';
  if (lang === 'en') return ex.nameEn || ex.nameRu;
  if (lang === 'cn') return ex.nameCn || ex.nameEn || ex.nameRu;
  return ex.nameRu;
}

function getExDesc(entry, lang) {
  if (entry.customId) return '';
  const ex = EXERCISES.find(e => e.id === entry.exId);
  if (!ex) return '';
  if (lang === 'en') return ex.descEn || '';
  if (lang === 'cn') return ex.descCn || '';
  return ex.descRu || '';
}

function getExImg(entry) {
  if (entry.customId) return '';
  const ex = EXERCISES.find(e => e.id === entry.exId);
  return ex?.img || '';
}

function getExCatColor(entry) {
  if (entry.customId) return '#888';
  const ex = EXERCISES.find(e => e.id === entry.exId);
  if (!ex) return '#888';
  const cat = CATEGORIES[ex.cat];
  return cat ? cat.color : '#888';
}

// --- Weekly List View ---

function renderWeeklySection() {
  if (state.editingWeek !== null && state.editingWeek !== undefined) {
    return renderWeeklyEditor(state.editingWeek);
  }
  return renderWeeklyList();
}

function renderWeeklyList() {
  const plans = state.weeklyPlans;
  let html = `
    <div class="planner-toolbar">
      <button class="planner-btn primary" onclick="createNewWeek()">＋ Новая неделя</button>
      ${plans.length > 0 ? `<button class="planner-btn secondary" onclick="openCustomBank()">📦 Мои упражнения</button>` : ''}
    </div>`;

  if (plans.length === 0) {
    html += `
      <div class="planner-empty">
        <div class="planner-icon">📅</div>
        <h3>Недельный планировщик</h3>
        <p>Составляйте план на неделю — раскладывайте упражнения по дням.<br>Добавляйте свои упражнения, выбирайте язык, экспортируйте в PDF.</p>
      </div>`;
  } else {
    html += `<div class="plan-list">`;
    plans.forEach((week, idx) => {
      const totalEx = DAY_KEYS.reduce((s, d) => s + week.days[d].length, 0);
      const daysUsed = DAY_KEYS.filter(d => week.days[d].length > 0).length;
      html += `
        <div class="plan-card" onclick="editWeek(${idx})">
          <div class="plan-card-header">
            <div class="plan-card-info">
              <div class="plan-card-title">${week.name}</div>
              <div class="plan-card-meta">${totalEx} упр. · ${daysUsed}/7 дней · ${formatDateRange(week.startDate, week.lang)}</div>
            </div>
            <div class="plan-card-actions">
              <button class="btn-remove" onclick="event.stopPropagation();duplicateWeek(${idx})" title="Копия">📋</button>
              <button class="btn-remove" onclick="event.stopPropagation();deleteWeek(${idx})" title="Удалить">✕</button>
            </div>
          </div>
        </div>`;
    });
    html += `</div>`;
  }
  return html;
}

function createNewWeek() {
  const week = {
    id: Date.now(),
    name: `Неделя ${state.weeklyPlans.length + 1}`,
    startDate: getMonday(),
    lang: 'ru',
    days: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
    notes: ''
  };
  state.weeklyPlans.push(week);
  state.editingWeek = state.weeklyPlans.length - 1;
  saveWeekly();
  renderProgramSection();
}

function editWeek(idx) {
  state.editingWeek = idx;
  renderProgramSection();
}

function deleteWeek(idx) {
  state.weeklyPlans.splice(idx, 1);
  saveWeekly();
  renderProgramSection();
}

function duplicateWeek(idx) {
  const copy = JSON.parse(JSON.stringify(state.weeklyPlans[idx]));
  copy.id = Date.now();
  copy.name += ' (копия)';
  const nextMon = new Date(copy.startDate);
  nextMon.setDate(nextMon.getDate() + 7);
  copy.startDate = nextMon.toISOString().split('T')[0];
  state.weeklyPlans.push(copy);
  saveWeekly();
  renderProgramSection();
}

function closeWeekEditor() {
  state.editingWeek = null;
  renderProgramSection();
}

// --- Weekly Editor ---

function renderWeeklyEditor(idx) {
  const week = state.weeklyPlans[idx];
  if (!week) { state.editingWeek = null; return renderWeeklyList(); }
  const lang = week.lang || 'ru';

  const langPill = (code, label) =>
    `<button class="week-lang-btn ${lang === code ? 'active' : ''}" onclick="setWeekLang(${idx},'${code}')">${label}</button>`;

  // Build day cells for Mon-Sat (3 rows × 2 cols)
  const pairDays = [['mon', 'tue'], ['wed', 'thu'], ['fri', 'sat']];
  let gridHtml = '';
  pairDays.forEach(([d1, d2]) => {
    gridHtml += `<div class="week-row">`;
    gridHtml += renderDayCell(idx, d1, lang);
    gridHtml += renderDayCell(idx, d2, lang);
    gridHtml += `</div>`;
  });

  // Sunday row — full width, horizontal exercises
  gridHtml += `<div class="week-row week-row-sun">`;
  gridHtml += renderDayCell(idx, 'sun', lang, true);
  gridHtml += `</div>`;

  return `
    <div class="weekly-editor">
      <div class="plan-editor-header">
        <button class="planner-btn ghost" onclick="closeWeekEditor()">← Назад</button>
        <div class="plan-editor-actions">
          <button class="planner-btn secondary" onclick="exportWeeklyPDF(${idx})">📄 PDF</button>
        </div>
      </div>
      <div class="weekly-name-row">
        <input class="plan-name-input" value="${week.name}"
               onchange="updateWeekName(${idx},this.value)" placeholder="Название недели" />
        <div class="week-lang-toggle">
          ${langPill('ru', '🇷🇺')}
          ${langPill('en', '🇬🇧')}
          ${langPill('cn', '🇨🇳')}
        </div>
      </div>
      <div class="weekly-date">
        <input type="date" value="${week.startDate}" onchange="updateWeekDate(${idx},this.value)" class="week-date-input" />
        <span class="week-date-label">${formatDateRange(week.startDate, week.lang)}</span>
      </div>
      <div class="weekly-grid">
        ${gridHtml}
      </div>
      <div class="plan-notes-section">
        <label class="plan-notes-label">📝 Заметки</label>
        <textarea class="plan-notes" rows="2" placeholder="Заметки к неделе..."
                  onchange="updateWeekNotes(${idx},this.value)">${week.notes || ''}</textarea>
      </div>
    </div>`;
}

function renderDayCell(wIdx, day, lang, isSunday = false) {
  const week = state.weeklyPlans[wIdx];
  const entries = week.days[day] || [];
  const dayLabel = getDayLabel(day, lang);

  const entryCount = entries.length;
  let exHtml = '';
  entries.forEach((entry, i) => {
    const name = getExName(entry, lang);
    const catColor = getExCatColor(entry);
    const cls = isSunday ? 'day-ex day-ex-h' : 'day-ex';

    exHtml += `
      <div class="${cls}">
        <div class="day-ex-bar" style="background:${catColor}"></div>
        <div class="day-ex-name">${name}</div>
        <input class="day-ex-dosage" value="${entry.dosage}" placeholder="3×10"
               onchange="updateDayDosage(${wIdx},'${day}',${i},this.value)" />
        <div class="day-ex-reorder">
          <button class="reorder-btn-sm" onclick="moveExInDay(${wIdx},'${day}',${i},-1)" ${i === 0 ? 'disabled' : ''}>▲</button>
          <button class="reorder-btn-sm" onclick="moveExInDay(${wIdx},'${day}',${i},1)" ${i === entryCount - 1 ? 'disabled' : ''}>▼</button>
        </div>
        <button class="btn-remove btn-small" onclick="removeFromDay(${wIdx},'${day}',${i})">✕</button>
      </div>`;
  });

  return `
    <div class="day-cell ${isSunday ? 'day-cell-sun' : ''}">
      <div class="day-cell-header">${dayLabel}</div>
      <div class="day-cell-exlist ${isSunday ? 'day-cell-exlist-h' : ''}">
        ${exHtml || '<div class="day-cell-empty">—</div>'}
      </div>
      <button class="day-add-btn" onclick="openDayPicker(${wIdx},'${day}')">＋</button>
    </div>`;
}

// --- Day Picker (add exercise to a day) ---

function openDayPicker(wIdx, day) {
  state.weekPickerDay = day;
  state.pickerSearch = '';
  state.pickerCat = null;
  const overlay = document.createElement('div');
  overlay.id = 'dayPickerOverlay';
  overlay.className = 'picker-overlay open';
  overlay.innerHTML = renderDayPicker(wIdx, day);
  document.body.appendChild(overlay);
}

function closeDayPicker() {
  const el = document.getElementById('dayPickerOverlay');
  if (el) el.remove();
}

function renderDayPicker(wIdx, day) {
  const week = state.weeklyPlans[wIdx];
  const lang = week?.lang || 'ru';
  const dayLabel = getDayLabel(day, lang);
  const search = (state.pickerSearch || '').toLowerCase();
  const cat = state.pickerCat;

  // Collect already-added exercise IDs for this day
  const addedIds = new Set((week?.days[day] || []).filter(e => e.exId).map(e => e.exId));
  const addedCustomIds = new Set((week?.days[day] || []).filter(e => e.customId).map(e => e.customId));

  let filtered = EXERCISES.filter(ex => {
    if (cat && ex.cat !== cat) return false;
    if (search && !ex.nameRu.toLowerCase().includes(search) && !ex.nameEn.toLowerCase().includes(search)) return false;
    return true;
  });

  // Sort: not-added first, already-added last
  filtered.sort((a, b) => (addedIds.has(a.id) ? 1 : 0) - (addedIds.has(b.id) ? 1 : 0));

  const catBtns = Object.entries(CATEGORIES).map(([k, c]) =>
    `<button class="filter-chip ${cat === k ? 'active' : ''}" onclick="dayPickerFilterCat('${k}',${wIdx},'${day}')">${c.icon} ${c.name}</button>`
  ).join('');

  const exItems = filtered.slice(0, 40).map(ex => {
    const c = CATEGORIES[ex.cat] || { color: '#999', icon: '?' };
    const name = lang === 'en' ? ex.nameEn : (lang === 'cn' ? (ex.nameCn || ex.nameEn) : ex.nameRu);
    const isAdded = addedIds.has(ex.id);
    return `<div class="picker-item ${isAdded ? 'already-added' : ''}" onclick="${isAdded ? '' : `addExToDay(${wIdx},'${day}',${ex.id})`}">
      <div class="card-cat-bar" style="background:${c.color}"></div>
      <div class="picker-item-info">
        <div class="picker-item-name">${name}</div>
        <div class="picker-item-sub">${ex.dosage}</div>
      </div>
      ${isAdded ? '<span class="picker-added-badge">✓</span>' : '<span class="picker-add">＋</span>'}
    </div>`;
  }).join('');

  // Custom exercises section
  const customList = state.customExercises.map((c, i) => {
    const isAdded = addedCustomIds.has(c.id);
    return `<div class="picker-item ${isAdded ? 'already-added' : ''}" onclick="${isAdded ? '' : `addCustomToDay(${wIdx},'${day}','${c.id}')`}">
      <div class="card-cat-bar" style="background:#888"></div>
      <div class="picker-item-info">
        <div class="picker-item-name">⭐ ${c.name}</div>
        <div class="picker-item-sub">${c.dosage || '—'}</div>
      </div>
      ${isAdded ? '<span class="picker-added-badge">✓</span>' : '<span class="picker-add">＋</span>'}
    </div>`;
  }).join('');

  return `
    <div class="picker-panel">
      <div class="picker-header">
        <h3>${dayLabel} — добавить</h3>
        <button class="panel-close" onclick="closeDayPicker()">✕</button>
      </div>
      <input class="search-box" placeholder="Поиск..." value="${state.pickerSearch || ''}"
             oninput="dayPickerSearch(this.value,${wIdx},'${day}')" id="dayPickerSearchInput" />
      <div class="filter-row picker-cats">
        <button class="filter-chip ${!cat ? 'active' : ''}" onclick="dayPickerFilterCat(null,${wIdx},'${day}')">Все</button>
        ${catBtns}
      </div>
      <div class="picker-list" id="dayPickerList">
        ${customList ? `<div class="picker-section-label">⭐ Мои упражнения</div>${customList}<div class="picker-section-label">📋 Из базы</div>` : ''}
        ${exItems}
      </div>
      <div class="picker-custom-form">
        <div class="picker-section-label">✏️ Добавить своё</div>
        <div class="picker-custom-row">
          <input id="customExName" class="search-box" placeholder="Название" />
          <input id="customExDosage" class="search-box picker-dosage-input" placeholder="3×10" />
          <button class="planner-btn primary picker-add-custom" onclick="addNewCustomToDay(${wIdx},'${day}')">＋</button>
        </div>
      </div>
    </div>`;
}

function dayPickerSearch(val, wIdx, day) {
  state.pickerSearch = val;
  const overlay = document.getElementById('dayPickerOverlay');
  if (overlay) overlay.innerHTML = renderDayPicker(wIdx, day);
  const inp = document.getElementById('dayPickerSearchInput');
  if (inp) { inp.focus(); inp.selectionStart = inp.selectionEnd = val.length; }
}

function dayPickerFilterCat(cat, wIdx, day) {
  state.pickerCat = cat;
  const overlay = document.getElementById('dayPickerOverlay');
  if (overlay) overlay.innerHTML = renderDayPicker(wIdx, day);
}

function addExToDay(wIdx, day, exId) {
  const ex = EXERCISES.find(e => e.id === exId);
  if (!ex) return;
  const week = state.weeklyPlans[wIdx];
  week.days[day].push({ exId: ex.id, customId: null, dosage: ex.dosage });
  saveWeekly();
  // Re-render picker to show ✓ on just-added item
  const overlay = document.getElementById('dayPickerOverlay');
  if (overlay) overlay.innerHTML = renderDayPicker(wIdx, day);
  // Re-render grid behind overlay
  renderProgramSection();
}

function addCustomToDay(wIdx, day, customId) {
  const custom = state.customExercises.find(c => c.id === customId);
  if (!custom) return;
  const week = state.weeklyPlans[wIdx];
  week.days[day].push({ exId: null, customId: custom.id, dosage: custom.dosage || '' });
  saveWeekly();
  // Re-render picker + grid
  const overlay = document.getElementById('dayPickerOverlay');
  if (overlay) overlay.innerHTML = renderDayPicker(wIdx, day);
  renderProgramSection();
}

function addNewCustomToDay(wIdx, day) {
  const nameEl = document.getElementById('customExName');
  const dosageEl = document.getElementById('customExDosage');
  const name = nameEl?.value?.trim();
  const dosage = dosageEl?.value?.trim() || '';
  if (!name) return;

  // Save to personal bank
  const customId = 'c_' + Date.now();
  state.customExercises.push({ id: customId, name, dosage });
  saveCustomExercises();

  // Add to day
  state.weeklyPlans[wIdx].days[day].push({ exId: null, customId, dosage });
  saveWeekly();

  closeDayPicker();
  renderProgramSection();
}

function moveExInDay(wIdx, day, exIdx, dir) {
  const entries = state.weeklyPlans[wIdx].days[day];
  const newIdx = exIdx + dir;
  if (newIdx < 0 || newIdx >= entries.length) return;
  [entries[exIdx], entries[newIdx]] = [entries[newIdx], entries[exIdx]];
  saveWeekly();
  renderProgramSection();
}

function removeFromDay(wIdx, day, exIdx) {
  state.weeklyPlans[wIdx].days[day].splice(exIdx, 1);
  saveWeekly();
  renderProgramSection();
}

function updateDayDosage(wIdx, day, exIdx, val) {
  state.weeklyPlans[wIdx].days[day][exIdx].dosage = val;
  saveWeekly();
}

function updateWeekName(idx, name) {
  state.weeklyPlans[idx].name = name;
  saveWeekly();
}

function updateWeekDate(idx, dateStr) {
  state.weeklyPlans[idx].startDate = getMonday(dateStr);
  saveWeekly();
  renderProgramSection();
}

function updateWeekNotes(idx, notes) {
  state.weeklyPlans[idx].notes = notes;
  saveWeekly();
}

function setWeekLang(idx, lang) {
  state.weeklyPlans[idx].lang = lang;
  saveWeekly();
  renderProgramSection();
}

// --- Custom Exercise Bank ---

function openCustomBank() {
  const overlay = document.createElement('div');
  overlay.id = 'customBankOverlay';
  overlay.className = 'picker-overlay open';
  overlay.innerHTML = renderCustomBank();
  document.body.appendChild(overlay);
}

function closeCustomBank() {
  const el = document.getElementById('customBankOverlay');
  if (el) el.remove();
}

function renderCustomBank() {
  const items = state.customExercises.map((c, i) =>
    `<div class="picker-item">
      <div class="card-cat-bar" style="background:#888"></div>
      <div class="picker-item-info">
        <div class="picker-item-name">${c.name}</div>
        <div class="picker-item-sub">${c.dosage || '—'}</div>
      </div>
      <button class="btn-remove" onclick="deleteCustomEx(${i})" title="Удалить">✕</button>
    </div>`
  ).join('');

  return `
    <div class="picker-panel">
      <div class="picker-header">
        <h3>📦 Мои упражнения</h3>
        <button class="panel-close" onclick="closeCustomBank()">✕</button>
      </div>
      <div class="picker-list">
        ${items || '<div class="plan-empty-ex">Пока пусто. Добавьте упражнения через планировщик.</div>'}
      </div>
      <div class="picker-custom-form">
        <div class="picker-section-label">✏️ Добавить новое</div>
        <div class="picker-custom-row">
          <input id="bankExName" class="search-box" placeholder="Название" />
          <input id="bankExDosage" class="search-box picker-dosage-input" placeholder="Дозировка" />
          <button class="planner-btn primary picker-add-custom" onclick="addToBank()">＋</button>
        </div>
      </div>
    </div>`;
}

function addToBank() {
  const name = document.getElementById('bankExName')?.value?.trim();
  const dosage = document.getElementById('bankExDosage')?.value?.trim() || '';
  if (!name) return;
  state.customExercises.push({ id: 'c_' + Date.now(), name, dosage });
  saveCustomExercises();
  const overlay = document.getElementById('customBankOverlay');
  if (overlay) overlay.innerHTML = renderCustomBank();
}

function deleteCustomEx(i) {
  state.customExercises.splice(i, 1);
  saveCustomExercises();
  const overlay = document.getElementById('customBankOverlay');
  if (overlay) overlay.innerHTML = renderCustomBank();
}

// --- Weekly PDF Export ---

function exportWeeklyPDF(idx) {
  const week = state.weeklyPlans[idx];
  const lang = week.lang || 'ru';
  const content = buildWeeklyPDFContent(week);
  generateWeeklyPDF(week.name + ' — ' + formatDateRange(week.startDate, lang), content);
}

function buildWeeklyPDFContent(week) {
  const lang = week.lang || 'ru';
  let c = '';

  // Header
  c += `<div class="week-pdf-header">
    <div class="week-pdf-title">${week.name}</div>
    <div class="week-pdf-date">${formatDateRange(week.startDate, lang)}</div>
  </div>`;

  // Grid: 3 rows of 2 days
  const pairs = [['mon', 'tue'], ['wed', 'thu'], ['fri', 'sat']];
  pairs.forEach(([d1, d2]) => {
    c += `<div class="week-pdf-row">`;
    c += buildDayPDFCell(week, d1, lang);
    c += buildDayPDFCell(week, d2, lang);
    c += `</div>`;
  });

  // Sunday full width
  c += `<div class="week-pdf-row week-pdf-row-sun">`;
  c += buildDayPDFCell(week, 'sun', lang, true);
  c += `</div>`;

  // Notes
  if (week.notes) {
    c += `<div class="week-pdf-notes">
      <div class="week-pdf-notes-label">📝 Notes</div>
      <div class="week-pdf-notes-text">${week.notes}</div>
    </div>`;
  }

  // Motivational block
  if (typeof buildMotivationBlock === 'function') {
    c += buildMotivationBlock(lang, 3, 2);
  }

  return c;
}

function getDayDate(startDate, dayKey) {
  const offsets = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };
  const d = new Date(startDate);
  d.setDate(d.getDate() + (offsets[dayKey] || 0));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildDayPDFCell(week, day, lang, isSunday = false) {
  const entries = week.days[day] || [];
  const dayLabel = getDayLabel(day, lang);
  const dayDate = getDayDate(week.startDate, day);

  let exHtml = '';
  if (entries.length === 0) {
    exHtml = `<div class="pdf-day-empty">—</div>`;
  } else {
    entries.forEach(entry => {
      const name = getExName(entry, lang);
      const desc = getExDesc(entry, lang);
      const img = getExImg(entry);
      const truncDesc = desc.length > 50 ? desc.substring(0, 50) + '…' : desc;

      if (isSunday) {
        exHtml += `<div class="pdf-day-ex pdf-day-ex-h">
          ${img ? `<img class="pdf-day-img-h" src="${img}" />` : ''}
          <div class="pdf-day-ex-right">
            <div class="pdf-day-ex-info">
              <span class="pdf-day-name">${name}</span>
              <span class="pdf-day-dosage">${entry.dosage}</span>
            </div>
            ${truncDesc ? `<div class="pdf-day-desc">${truncDesc}</div>` : ''}
          </div>
        </div>`;
      } else {
        exHtml += `<div class="pdf-day-ex">
          ${img ? `<img class="pdf-day-img" src="${img}" />` : ''}
          <div class="pdf-day-ex-info">
            <span class="pdf-day-name">${name}</span>
            <span class="pdf-day-dosage">${entry.dosage}</span>
          </div>
          ${truncDesc ? `<div class="pdf-day-desc">${truncDesc}</div>` : ''}
        </div>`;
      }
    });
  }

  return `<div class="pdf-day-cell ${isSunday ? 'pdf-day-cell-sun' : ''}">
    <div class="pdf-day-header">${dayLabel} <span class="pdf-day-date">· ${dayDate}</span></div>
    <div class="pdf-day-exlist ${isSunday ? 'pdf-day-exlist-h' : ''}">${exHtml}</div>
  </div>`;
}

function generateWeeklyPDF(title, bodyContent) {
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>${title}</title>
    <style>
      @page { size: A4 portrait; margin: 10mm; margin-top: 5mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, 'Segoe UI', 'Helvetica Neue', sans-serif;
        max-width: 100%; margin: 0 auto; padding: 10px;
        color: #1a1a1a; font-size: 9pt; line-height: 1.3;
      }
      .week-pdf-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #2383e2; padding-bottom: 4px; margin-bottom: 8px; }
      .week-pdf-title { font-size: 14pt; font-weight: 700; }
      .week-pdf-date { font-size: 9pt; color: #888; }

      .week-pdf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin-bottom: 0; }
      .week-pdf-row-sun { grid-template-columns: 1fr; }

      .pdf-day-cell { border: 1px solid #ddd; padding: 6px 8px; min-height: 80px; }
      .pdf-day-cell-sun { min-height: 50px; }
      .pdf-day-header { font-size: 9pt; font-weight: 700; color: #fff; background: #2383e2; padding: 3px 8px; margin: -6px -8px 6px; border-radius: 0; }
      .pdf-day-date { font-weight: 400; opacity: 0.8; font-size: 8pt; }
      .pdf-day-exlist { display: flex; flex-direction: column; gap: 4px; }
      .pdf-day-exlist-h { flex-direction: row; flex-wrap: wrap; gap: 8px; }

      .pdf-day-ex { display: flex; align-items: center; gap: 5px; padding: 2px 0; border-bottom: 1px solid #f0f0f0; }
      .pdf-day-ex-h { flex-direction: row; align-items: flex-start; border: 1px solid #eee; border-radius: 4px; padding: 4px 6px; min-width: 140px; gap: 6px; }
      .pdf-day-ex-right { flex: 1; display: flex; flex-direction: column; gap: 1px; }
      .pdf-day-img { width: 28px; height: 22px; object-fit: contain; border-radius: 2px; }
      .pdf-day-img-h { width: 36px; height: 28px; object-fit: contain; border-radius: 2px; flex-shrink: 0; }
      .pdf-day-ex-info { display: flex; gap: 6px; align-items: baseline; flex: 1; }
      .pdf-day-name { font-size: 8.5pt; font-weight: 500; }
      .pdf-day-dosage { font-size: 8.5pt; font-weight: 700; color: #2383e2; white-space: nowrap; }
      .pdf-day-desc { font-size: 7pt; color: #888; line-height: 1.2; margin-top: 1px; }
      .pdf-day-empty { font-size: 8pt; color: #ccc; text-align: center; padding: 10px 0; }

      .week-pdf-notes { border: 1px solid #e0d9c8; border-radius: 4px; padding: 6px 10px; margin-top: 8px; background: #faf8f3; }
      .week-pdf-notes-label { font-size: 8pt; font-weight: 700; margin-bottom: 3px; }
      .week-pdf-notes-text { font-size: 8pt; color: #444; }

      /* Motivation block */
      .motivation-block { border: 1px solid #e8e0d0; border-radius: 6px; padding: 8px 10px; margin-top: 10px; background: linear-gradient(135deg, #faf8f3 0%, #f0ebe3 100%); page-break-inside: avoid; }
      .motivation-title { font-size: 9pt; font-weight: 700; color: #c57b2d; margin-bottom: 6px; }
      .motivation-content { display: flex; gap: 10px; }
      .motivation-quotes { flex: 3; display: flex; flex-direction: column; gap: 4px; }
      .motivation-quote { font-size: 7.5pt; line-height: 1.3; padding: 3px 0; border-bottom: 1px solid #e8e0d0; }
      .motivation-quote:last-child { border-bottom: none; }
      .mq-text { font-style: italic; color: #444; }
      .mq-author { font-size: 6.5pt; color: #999; margin-left: 4px; font-style: normal; }
      .motivation-principles { flex: 2; display: flex; flex-direction: column; gap: 4px; border-left: 1px solid #e8e0d0; padding-left: 10px; }
      .motivation-principle { display: flex; align-items: flex-start; gap: 4px; font-size: 7pt; line-height: 1.3; }
      .mp-icon { font-size: 9pt; flex-shrink: 0; }
      .mp-text { color: #555; }

      .print-btn { display: block; margin: 16px auto 0; padding: 10px 24px; background: #2383e2; color: #fff; border: none; border-radius: 8px; font-size: 12pt; font-weight: 600; cursor: pointer; }
      @media print { .print-btn { display: none; } }
      @page { margin-top: 5mm; }
      @page:first { margin-top: 5mm; }
    </style>
  </head><body>
    ${bodyContent}
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save PDF</button>
  </body></html>`);
}

// === PDF EXPORT ===

// Default PDF options
const PDF_DEFAULTS = {
  image: true, descEn: true, descRu: true, descCn: true,
  tips: true, checklist: true, summary: true, rpeGuide: true, notes: true, motivation: true
};

function showPDFOptionsModal(callback) {
  // Remove any existing modal
  const old = document.getElementById('pdfOptionsOverlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'pdfOptionsOverlay';
  overlay.className = 'pdf-modal-overlay';

  const toggles = [
    { key: 'image', label: '🖼  Illustration', def: true },
    { key: 'descEn', label: '🇬🇧 EN description', def: true },
    { key: 'descRu', label: '🇷🇺 RU description', def: true },
    { key: 'descCn', label: '🇨🇳 CN description', def: true },
    { key: 'tips', label: '💡 Coach Tips', def: true },
    { key: 'checklist', label: '☑️  Checklist + RPE', def: true },
    { key: 'summary', label: '📊 Session Summary', def: true },
    { key: 'rpeGuide', label: '📏 RPE Scale Guide', def: true },
    { key: 'notes', label: '📝 Coach Notes', def: true },
    { key: 'motivation', label: '🔥 Motivation & Principles', def: true }
  ];

  const rows = toggles.map(t => `
    <label class="pdf-toggle">
      <input type="checkbox" data-key="${t.key}" ${t.def ? 'checked' : ''}>
      <span class="pdf-toggle-label">${t.label}</span>
    </label>`).join('');

  overlay.innerHTML = `
    <div class="pdf-modal">
      <div class="pdf-modal-title">📄 PDF Settings</div>
      <div class="pdf-toggles">${rows}</div>
      <div class="pdf-modal-actions">
        <button class="pdf-modal-btn cancel" id="pdfCancel">Cancel</button>
        <button class="pdf-modal-btn generate" id="pdfGenerate">Generate PDF</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.getElementById('pdfCancel').addEventListener('click', close);
  document.getElementById('pdfGenerate').addEventListener('click', () => {
    const opts = {};
    overlay.querySelectorAll('input[type=checkbox]').forEach(cb => {
      opts[cb.dataset.key] = cb.checked;
    });
    close();
    callback(opts);
  });
}

function exportPlanPDF(idx) {
  showPDFOptionsModal(opts => {
    const plan = state.trainingPlans[idx];
    generatePDF(plan.name, buildPlanContent(plan, opts));
  });
}

function exportAllPlansPDF() {
  showPDFOptionsModal(opts => {
    const allContent = state.trainingPlans.map(p => buildPlanContent(p, opts)).join('<hr style="margin:14px 0;border:1px solid #ddd">');
    generatePDF('All Training Plans', allContent);
  });
}

function exportWarmupPDF() {
  const activeBtn = document.querySelector('.warmup-preset-btn.active');
  const key = activeBtn ? activeBtn.dataset.warmup : 'training';
  const proto = WARMUP_PROTOCOLS[key];
  let content = `<h2 style="margin-bottom:10px">${proto.nameRu} / ${proto.nameEn}</h2>`;
  proto.phases.forEach(phase => {
    content += `<h3 style="margin:12px 0 6px;color:#333">${phase.nameRu} <span style="color:#999;font-weight:normal">(${phase.time})</span></h3>`;
    content += `<table style="width:100%;border-collapse:collapse;margin-bottom:8px">`;
    phase.items.forEach(item => {
      content += `<tr style="border-bottom:1px solid #eee">
        <td style="padding:6px 0">${item.nameRu} <span style="color:#999;font-size:12px">${item.nameEn}</span></td>
        <td style="padding:6px 0;text-align:right;font-weight:600;white-space:nowrap">${item.dosage}</td>
      </tr>`;
    });
    content += `</table>`;
  });
  generatePDF(`Warmup — ${proto.nameEn}`, content);
}

function buildPlanContent(plan, opts = PDF_DEFAULTS) {
  // Chinese name lookup for exercises
  const CN_NAMES = {
    1: '弹跳跳', 2: '跳绳', 3: '踝关节翻越小栏', 4: '蹲跳', 5: '跪姿跳', 6: '收腹跳', 7: '箱跳',
    8: '深度跳', 9: '下落跳', 10: '立定跳远', 11: '跨步跳', 12: '跨栏跳', 13: '六角杠铃跳',
    14: '药球砸地', 15: '侧滑步跳', 16: '弧线跑', 17: '剪刀跳', 18: '短助跑跳', 19: '背越式翻转',
    20: '提膝弹起', 21: '倒数第二步训练', 22: '背弓/桥', 23: '全程助跑', 24: '踢腿出杆',
    25: '杠铃深蹲', 26: '前蹲', 27: '罗马尼亚硬拉', 28: '硬拉', 29: '保加利亚分腿蹲',
    30: '杠铃划船', 31: '爆发式上箱', 32: '推举', 33: '翻铃', 34: '杠铃臀桥', 35: '引体向上',
    36: '壶铃摆荡', 37: '北欧弯举', 38: '帕洛夫推举', 39: 'V字卷腹', 40: '帕洛夫侧步',
    41: '等长伸膝', 42: '离心提踵', 43: '终末伸膝', 44: '侧板走', 45: '平板交替碰肩',
    46: '十字提膝', 47: '砂地冲刺', 48: '阻力跑', 49: '飞行冲刺', 50: '变向改向跑',
    51: '加速冲刺', 52: '髋屈肌拉伸', 53: '腘绳肌拉伸', 54: '小腿拉伸', 55: '肩部拉伸',
    56: '鸽子式', 57: '90/90髋旋', 58: '世界最伟大拉伸', 59: '反跳', 60: '连续跳',
    61: '单腿跳远', 62: '交替弓步跳', 63: '侧向跨栏步', 64: '反向弓步', 65: '单腿箱跳',
    66: '弹震式小腿跳', 67: '跳跃触高', 68: '加重跳'
  };

  // Lookup full exercise data (merge saved + live EXERCISES data)
  const getFullEx = (ex) => {
    const live = EXERCISES.find(e => e.id === ex.id);
    const merged = live ? { ...live, dosage: ex.dosage } : ex;
    if (!merged.nameCn && CN_NAMES[merged.id]) merged.nameCn = CN_NAMES[merged.id];
    return merged;
  };

  let c = '';

  // Day label for PDF header
  const DAY_FULL = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
  const dayStr = plan.dayOfWeek && DAY_FULL[plan.dayOfWeek] ? DAY_FULL[plan.dayOfWeek] + ' · ' : '';
  const dateStr = plan.date ? new Date(plan.date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

  // Plan header — compact
  c += `<div class="plan-header">
    <div class="plan-title">${plan.name}</div>
    <div class="plan-date">${dayStr}${dateStr}</div>
  </div>`;

  if (plan.exercises.length === 0) {
    c += `<p style="color:#999;text-align:center;padding:30px 0">No exercises added</p>`;
    return c;
  }

  // Exercise cards
  plan.exercises.forEach((rawEx, i) => {
    const ex = getFullEx(rawEx);
    const cat = CATEGORIES[ex.cat] || { color: '#999', icon: '?', name: ex.cat };
    const levelMap = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
    const levelLabel = levelMap[ex.level] || ex.level || '';

    c += `<div class="ex-card" style="border-left:4px solid ${cat.color}">`;

    // Card header: number + trilingual name (EN primary)
    c += `<div class="ex-header">
      <div class="ex-num">${i + 1}</div>
      <div class="ex-names">
        <div class="ex-name-primary">${ex.nameEn || ex.nameRu}</div>
        <div class="ex-name-secondary">${ex.nameRu}${ex.nameCn ? ' · ' + ex.nameCn : ''}</div>
      </div>
      <div class="ex-meta">
        <span class="ex-badge" style="background:${cat.color}20;color:${cat.color}">${cat.icon} ${cat.nameEn || cat.name}</span>
        ${levelLabel ? `<span class="ex-level">${levelLabel}</span>` : ''}
      </div>
    </div>`;

    // === 2-column layout: image LEFT, content RIGHT ===
    c += `<div class="ex-row">`;

    // Left: illustration (full height)
    if (opts.image && ex.img) {
      c += `<div class="ex-img"><img src="${ex.img}" alt="${ex.nameEn}"></div>`;
    }

    // Right: all content stacked vertically
    c += `<div class="ex-right">`;

    // Dosage
    c += `<div class="ex-dosage">📋 <strong>${ex.dosage}</strong></div>`;

    // Trilingual descriptions
    if (opts.descEn && ex.descEn) c += `<div class="ex-desc"><span class="lang-tag">EN</span> ${ex.descEn}</div>`;
    if (opts.descRu && ex.descRu) c += `<div class="ex-desc"><span class="lang-tag">RU</span> ${ex.descRu}</div>`;
    if (opts.descCn && ex.descCn) c += `<div class="ex-desc"><span class="lang-tag">CN</span> ${ex.descCn}</div>`;

    // Coach tips inline in right column
    if (opts.tips) {
      const tips = [];
      if (ex.coachRu && ex.coachRu.length) ex.coachRu.forEach((t, j) => {
        tips.push({ ru: t, en: (ex.coachEn || [])[j] || '', cn: (ex.coachCn || [])[j] || '' });
      });
      if (tips.length > 0) {
        c += `<div class="ex-tips">
          <div class="tips-label">💡 Coach Tips:</div>
          <div class="tips-list">`;
        tips.forEach(t => {
          let line = '';
          if (t.en) line += `<span class="tip-en">${t.en}</span>`;
          if (t.ru) line += ` <span class="tip-ru">${t.ru}</span>`;
          if (t.cn) line += ` <span class="tip-cn">${t.cn}</span>`;
          c += `<div class="tip-row">${line}</div>`;
        });
        c += `</div></div>`;
      }
    }

    // Checklist + RPE at bottom of right column
    if (opts.checklist) {
      c += `<div class="ex-footer">
        <div class="ex-checklist">
          <label class="chk"><span class="chk-box">☐</span> Done</label>
          <label class="chk"><span class="chk-box">☐</span> Pain/discomfort</label>
          <label class="chk"><span class="chk-box">☐</span> Needs correction</label>
        </div>
        <div class="ex-rpe">
          <span class="rpe-label">RPE</span>
          <span class="rpe-box"></span>
          <span class="rpe-scale">1-10</span>
        </div>
      </div>`;
    }

    c += `</div>`; // ex-right
    c += `</div>`; // ex-row
    c += `</div>`; // ex-card
  });

  // Session summary (conditional, in English)
  if (opts.summary) {
    const catCounts = {};
    plan.exercises.forEach(ex => {
      const fullEx = getFullEx(ex);
      const cat = CATEGORIES[fullEx.cat] || { icon: '?', name: fullEx.cat, nameEn: fullEx.cat };
      const key = `${cat.icon} ${cat.nameEn || cat.name}`;
      catCounts[key] = (catCounts[key] || 0) + 1;
    });
    const catSummary = Object.entries(catCounts).map(([k, v]) => `${v} ${k}`).join(' · ');
    const estTime = plan.exercises.length * 3;

    c += `<div class="session-summary">
      <div class="summary-title">Session Summary</div>
      <div class="summary-row"><strong>Exercises:</strong> ${plan.exercises.length} total — ${catSummary}</div>
    </div>`;
  }

  // RPE reference guide (conditional)
  if (opts.rpeGuide) {
    c += `<div class="rpe-guide">
      <div class="rpe-guide-title">RPE Scale Reference</div>
      <div class="rpe-guide-table">
        <div class="rpe-row"><span class="rpe-val g">1-2</span><span class="rpe-txt">Very light — barely any effort</span></div>
        <div class="rpe-row"><span class="rpe-val g">3-4</span><span class="rpe-txt">Light — comfortable pace, can talk easily</span></div>
        <div class="rpe-row"><span class="rpe-val y">5-6</span><span class="rpe-txt">Moderate — noticeable effort, conversation harder</span></div>
        <div class="rpe-row"><span class="rpe-val o">7-8</span><span class="rpe-txt">Hard — challenging, short phrases only</span></div>
        <div class="rpe-row"><span class="rpe-val r">9</span><span class="rpe-txt">Very hard — near max, can barely speak</span></div>
        <div class="rpe-row"><span class="rpe-val r">10</span><span class="rpe-txt">Max effort — absolute limit</span></div>
      </div>
    </div>`;
  }

  // Coach notes (conditional)
  if (opts.notes && plan.notes) {
    c += `<div class="coach-notes">
      <div class="notes-label">📝 Coach Notes</div>
      <div class="notes-text">${plan.notes}</div>
    </div>`;
  }

  // Motivational block (conditional)
  if (opts.motivation && typeof buildMotivationBlock === 'function') {
    c += buildMotivationBlock('en', 3, 2);
  }

  return c;
}

function generatePDF(title, bodyContent) {
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>${title}</title>
    <style>
      @page { size: A4 portrait; margin: 10mm 8mm; margin-top: 5mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, 'Segoe UI', 'Helvetica Neue', sans-serif;
        max-width: 100%; margin: 0 auto; padding: 10px;
        color: #1a1a1a; font-size: 9.5pt; line-height: 1.35;
      }

      /* Plan header */
      .plan-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #2383e2; padding-bottom: 5px; margin-bottom: 8px; }
      .plan-title { font-size: 15pt; font-weight: 700; }
      .plan-date { font-size: 8.5pt; color: #888; }

      /* Exercise card */
      .ex-card { border: 1px solid #e0e0e0; border-radius: 5px; margin-bottom: 7px; padding: 6px 8px; page-break-inside: avoid; }
      .ex-header { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
      .ex-num { font-size: 13pt; font-weight: 800; color: #2383e2; min-width: 22px; }
      .ex-names { flex: 1; }
      .ex-name-primary { font-size: 10.5pt; font-weight: 700; }
      .ex-name-secondary { font-size: 7.5pt; color: #777; margin-top: 1px; }
      .ex-meta { display: flex; gap: 5px; align-items: center; }
      .ex-badge { font-size: 7pt; padding: 1px 5px; border-radius: 10px; font-weight: 600; white-space: nowrap; }
      .ex-level { font-size: 7pt; color: #999; }

      /* 2-column layout: image left, content right */
      .ex-row { display: flex; gap: 10px; }
      .ex-img { flex: 0 0 130px; align-self: stretch; display: flex; align-items: center; }
      .ex-img img { width: 130px; height: auto; max-height: 160px; object-fit: contain; border-radius: 4px; background: #f9f9f9; }
      .ex-right { flex: 1; display: flex; flex-direction: column; gap: 3px; }
      .ex-dosage { font-size: 9.5pt; font-weight: 600; margin-bottom: 2px; }
      .ex-desc { font-size: 7.5pt; color: #444; margin-bottom: 1px; line-height: 1.25; }
      .lang-tag { display: inline-block; font-size: 6pt; font-weight: 700; color: #fff; background: #888; padding: 0 3px; border-radius: 2px; margin-right: 2px; vertical-align: middle; }
      .lang-tag.en { background: #4a7ab5; }
      .lang-tag.ru { background: #8b5e3c; }
      .lang-tag.cn { background: #b5534a; }

      /* Coach tips */
      .ex-tips { background: #f8f9fa; border-radius: 4px; padding: 4px 7px; margin-bottom: 4px; }
      .tips-label { font-size: 7.5pt; font-weight: 700; margin-bottom: 2px; }
      .tips-list { font-size: 7pt; }
      .tip-row { margin-bottom: 1px; }
      .tip-en { font-weight: 600; }
      .tip-ru { color: #666; }
      .tip-cn { color: #999; }

      /* Footer: checklist + RPE */
      .ex-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #ddd; padding-top: 4px; }
      .ex-checklist { display: flex; gap: 10px; }
      .chk { font-size: 7.5pt; color: #555; cursor: default; }
      .chk-box { font-size: 10pt; margin-right: 2px; }
      .ex-rpe { display: flex; align-items: center; gap: 3px; }
      .rpe-label { font-size: 7.5pt; font-weight: 700; color: #2383e2; }
      .rpe-box { width: 26px; height: 18px; border: 1.5px solid #2383e2; border-radius: 4px; }
      .rpe-scale { font-size: 6pt; color: #999; }

      /* Session summary */
      .session-summary { background: #f0f4f8; border-radius: 6px; padding: 8px 12px; margin: 12px 0 8px; }
      .summary-title { font-size: 10pt; font-weight: 700; margin-bottom: 4px; color: #2383e2; }
      .summary-row { font-size: 8.5pt; margin-bottom: 2px; }

      /* RPE guide */
      .rpe-guide { border: 1px solid #dde4ee; border-radius: 6px; padding: 8px 12px; margin-bottom: 8px; page-break-inside: avoid; }
      .rpe-guide-title { font-size: 9pt; font-weight: 700; color: #2383e2; margin-bottom: 5px; }
      .rpe-guide-table { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 12px; }
      .rpe-row { display: flex; align-items: center; gap: 6px; font-size: 7.5pt; }
      .rpe-val { display: inline-block; min-width: 22px; text-align: center; padding: 1px 4px; border-radius: 3px; font-weight: 700; color: #fff; }
      .rpe-val.g { background: #27ae60; }
      .rpe-val.y { background: #f2c94c; color: #333; }
      .rpe-val.o { background: #f2994a; }
      .rpe-val.r { background: #eb5757; }
      .rpe-txt { color: #555; }

      /* Coach notes */
      .coach-notes { border: 1px solid #e0d9c8; border-radius: 6px; padding: 8px 12px; background: #faf8f3; }
      .notes-label { font-size: 9pt; font-weight: 700; margin-bottom: 4px; }
      .notes-text { font-size: 8.5pt; color: #444; white-space: pre-wrap; }

      /* Motivation block */
      .motivation-block { border: 1px solid #e8e0d0; border-radius: 6px; padding: 8px 12px; margin-top: 12px; background: linear-gradient(135deg, #faf8f3 0%, #f0ebe3 100%); page-break-inside: avoid; }
      .motivation-title { font-size: 9.5pt; font-weight: 700; color: #c57b2d; margin-bottom: 6px; }
      .motivation-content { display: flex; gap: 12px; }
      .motivation-quotes { flex: 3; display: flex; flex-direction: column; gap: 5px; }
      .motivation-quote { font-size: 8pt; line-height: 1.35; padding: 3px 0; border-bottom: 1px solid #e8e0d0; }
      .motivation-quote:last-child { border-bottom: none; }
      .mq-text { font-style: italic; color: #444; }
      .mq-author { font-size: 7pt; color: #999; margin-left: 4px; font-style: normal; }
      .motivation-principles { flex: 2; display: flex; flex-direction: column; gap: 5px; border-left: 1px solid #e8e0d0; padding-left: 12px; }
      .motivation-principle { display: flex; align-items: flex-start; gap: 5px; font-size: 7.5pt; line-height: 1.3; }
      .mp-icon { font-size: 10pt; flex-shrink: 0; }
      .mp-text { color: #555; }

      /* Footer */
      .pdf-footer { margin-top: 15px; padding-top: 6px; border-top: 1px solid #ddd; font-size: 7.5pt; color: #aaa; text-align: center; }

      /* Print */
      @media print {
        body { padding: 0; }
        .no-print { display: none !important; }
        .ex-card { page-break-inside: avoid; }
      }
      @page { margin-top: 5mm; }
      @page:first { margin-top: 5mm; }

      /* Screen button */
      .print-btn { padding: 10px 30px; font-size: 14px; cursor: pointer; border: 1px solid #2383e2; background: #e8f0fe; color: #2383e2; border-radius: 8px; font-weight: 600; }
      .print-btn:hover { background: #d0e3fc; }
    </style>
  </head><body>
    ${bodyContent}
    <div class="pdf-footer">Jump Encyclopedia · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
    <div class="no-print" style="margin-top:16px;text-align:center">
      <button class="print-btn" onclick="window.print()">🖨️ Print / Save PDF</button>
    </div>
  </body></html>`);
  win.document.close();
}

// === EVENTS ===
function bindEvents() {
  // Theme
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  // Font
  document.getElementById('fontPlus').addEventListener('click', () => applyFontScale(state.fontScale + 0.1));
  document.getElementById('fontMinus').addEventListener('click', () => applyFontScale(state.fontScale - 0.1));
  // Filter toggle (mobile)
  const filterToggle = document.getElementById('filterToggle');
  if (filterToggle) {
    filterToggle.addEventListener('click', () => {
      const filters = document.getElementById('exerciseFilters');
      filters.classList.toggle('filters-open');
      filterToggle.classList.toggle('open');
    });
  }
  // Search
  document.getElementById('searchInput').addEventListener('input', e => {
    state.searchQuery = e.target.value;
    renderCards();
  });
  // Category filters
  document.getElementById('catFilters').addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    const cat = chip.dataset.cat;
    document.querySelectorAll('#catFilters .filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.activeCategory = cat === 'all' ? null : cat;
    renderCards();
  });
  // Equipment filters
  document.getElementById('equipFilters').addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    const equip = chip.dataset.equip;
    if (chip.classList.contains('active')) {
      chip.classList.remove('active');
      state.activeEquipment = null;
    } else {
      document.querySelectorAll('#equipFilters .filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.activeEquipment = equip;
    }
    renderCards();
  });
  // Level filters
  document.getElementById('levelFilters').addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    const level = chip.dataset.level;
    if (chip.classList.contains('active')) {
      chip.classList.remove('active');
      state.activeLevel = null;
    } else {
      document.querySelectorAll('#levelFilters .filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.activeLevel = level;
    }
    renderCards();
  });
  // Panel
  document.getElementById('fabWorkout').addEventListener('click', openPanel);
  document.getElementById('panelOverlay').addEventListener('click', closePanel);
  document.getElementById('panelClose').addEventListener('click', closePanel);
  // Panel tabs
  document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.panelTab = tab.dataset.tab;
      renderPanelContent();
    });
  });

  // === Section navigation ===
  document.getElementById('sectionNav').addEventListener('click', e => {
    const chip = e.target.closest('.section-chip');
    if (!chip) return;
    switchSection(chip.dataset.section);
  });

  // === Technique phase tabs ===
  document.getElementById('techniquePhaseTabs').addEventListener('click', e => {
    const tab = e.target.closest('.technique-tab');
    if (!tab) return;
    state.activePhase = tab.dataset.phase;
    renderPhaseTabs();
    renderTechniqueCards();
  });

  // === Reference tabs ===
  document.getElementById('refTabs').addEventListener('click', e => {
    const tab = e.target.closest('.ref-tab');
    if (!tab || !tab.dataset.ref) return;
    state.activeRef = tab.dataset.ref;
    document.querySelectorAll('#refTabs .ref-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderRefSection();
  });

  // === Program tabs ===
  document.getElementById('programTabs').addEventListener('click', e => {
    const tab = e.target.closest('.ref-tab');
    if (!tab || !tab.dataset.prog) return;
    state.activeProg = tab.dataset.prog;
    document.querySelectorAll('#programTabs .ref-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderProgramSection();
  });
}

