// ===== Exercise Catalog Application =====
// Main application logic for the bodyweight exercise catalog

(function () {
    'use strict';

    // ───── State ─────
    let activeCategory = 'all';
    let searchQuery = '';
    let workoutLists = loadLists();
    let sidebarLang = localStorage.getItem('sidebarLang') || 'ru';
    let currentModalExercise = null;
    let renameListId = null;

    // ───── DOM References ─────
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const grid = $('#exerciseGrid');
    const emptyState = $('#emptyState');
    const searchInput = $('#searchInput');
    const searchClear = $('#searchClear');
    const filterPills = $('#filterPills');
    const countAll = $('#count-all');
    const toggleListsBtn = $('#toggleLists');
    const sidebar = $('#sidebar');
    const sidebarOverlay = $('#sidebarOverlay');
    const closeSidebarBtn = $('#closeSidebar');
    const createListBtn = $('#createList');
    const listsContainer = $('#listsContainer');
    const noLists = $('#noLists');
    const listsBadge = $('#listsBadge');
    const modalOverlay = $('#modalOverlay');
    const modalGif = $('#modalGif');
    const modalImages = $('#modalImages');
    const modalTitle = $('#modalTitle');
    const modalTitleRu = $('#modalTitleRu');
    const modalDescription = $('#modalDescription');
    const modalCategory = $('#modalCategory');
    const modalJefitLink = $('#modalJefitLink');
    const modalClose = $('#modalClose');
    const addToListSelect = $('#addToListSelect');
    const addToListBtn = $('#addToListBtn');
    const renameOverlay = $('#renameOverlay');
    const renameInput = $('#renameInput');
    const renameSave = $('#renameSave');
    const renameCancel = $('#renameCancel');
    const toastContainer = $('#toastContainer');

    // ───── Init ─────
    function init() {
        renderFilterPills();
        renderGrid();
        updateBadge();
        bindEvents();
    }

    // ───── Filter Pills ─────
    function renderFilterPills() {
        countAll.textContent = EXERCISES.length;

        filterPills.innerHTML = EXERCISE_CATEGORIES.map(cat => {
            const count = EXERCISES.filter(e => e.category === cat.id).length;
            return `
        <button class="filter-pill" data-category="${cat.id}" style="--cat-color: ${cat.color}">
          <span class="filter-icon">${cat.icon}</span>
          <span>${cat.name}</span>
          <span class="filter-count">${count}</span>
        </button>
      `;
        }).join('');
    }

    // ───── Exercise Grid ─────
    function getFilteredExercises() {
        let filtered = EXERCISES;

        if (activeCategory !== 'all') {
            filtered = filtered.filter(e => e.category === activeCategory);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(e =>
                e.name.toLowerCase().includes(q) ||
                e.nameRu.toLowerCase().includes(q) ||
                e.description.toLowerCase().includes(q)
            );
        }

        return filtered;
    }

    function renderGrid() {
        const exercises = getFilteredExercises();

        if (exercises.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = '';
            return;
        }

        grid.style.display = '';
        emptyState.style.display = 'none';

        grid.innerHTML = exercises.map(ex => {
            const cat = EXERCISE_CATEGORIES.find(c => c.id === ex.category);
            return `
        <div class="exercise-card" data-id="${ex.id}">
          <div class="card-media">
            <img class="card-gif"
                 src="${gifUrl(ex.id)}"
                 alt="${ex.nameRu}"
                 loading="lazy"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="card-gif-placeholder" style="display:none">🏋️</div>
            <span class="card-category-badge" style="background: ${cat.color}88">${cat.icon} ${cat.name}</span>
            <button class="card-add-btn" data-id="${ex.id}" title="Добавить в тренировку">+</button>
          </div>
          <div class="card-body">
            <div class="card-name">${ex.name}</div>
            <div class="card-name-ru">${ex.nameRu}</div>
          </div>
        </div>
      `;
        }).join('');
    }

    // ───── Modal ─────
    function openModal(exerciseId) {
        const ex = EXERCISES.find(e => e.id === exerciseId);
        if (!ex) return;

        currentModalExercise = ex;
        const cat = EXERCISE_CATEGORIES.find(c => c.id === ex.category);

        modalGif.src = gifUrl(ex.id);
        modalGif.alt = ex.nameRu;
        modalTitle.textContent = ex.name;
        modalTitleRu.textContent = ex.nameRu;
        modalDescription.textContent = ex.description;
        modalCategory.textContent = `${cat.icon} ${cat.name}`;
        modalCategory.style.background = cat.color;

        const slug = ex.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        modalJefitLink.href = jefitLink(ex.id, slug);

        // Static images
        modalImages.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const img = document.createElement('img');
            img.src = imgUrl(ex.id, i);
            img.alt = `${ex.nameRu} step ${i + 1}`;
            img.loading = 'lazy';
            img.onerror = function () { this.remove(); };
            img.onclick = function () { modalGif.src = this.src; };
            modalImages.appendChild(img);
        }

        // Populate list select
        updateListSelect();

        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        currentModalExercise = null;
    }

    function updateListSelect() {
        const lists = workoutLists;
        if (lists.length === 0) {
            addToListSelect.innerHTML = '<option value="">Сначала создайте тренировку</option>';
            addToListBtn.disabled = true;
        } else {
            addToListSelect.innerHTML = lists.map(l =>
                `<option value="${l.id}">${l.name} (${l.exercises.length})</option>`
            ).join('');
            addToListBtn.disabled = false;
        }
    }

    // ───── Quick Add (from card button) ─────
    function showQuickAddMenu(exerciseId, buttonEl) {
        if (workoutLists.length === 0) {
            showToast('Сначала создайте тренировку!', 'info');
            openSidebar();
            return;
        }

        // Always add to the last (most recently created) list
        const targetList = workoutLists[workoutLists.length - 1];
        addExerciseToList(targetList.id, exerciseId);
    }

    // ───── Workout Lists ─────
    function loadLists() {
        try {
            return JSON.parse(localStorage.getItem('workoutLists') || '[]');
        } catch { return []; }
    }

    function saveLists() {
        localStorage.setItem('workoutLists', JSON.stringify(workoutLists));
        updateBadge();
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function createNewList() {
        const list = {
            id: generateId(),
            name: `Тренировка ${workoutLists.length + 1}`,
            exercises: [],
            createdAt: Date.now()
        };
        workoutLists.push(list);
        saveLists();
        renderLists();
        showToast(`Создана: ${list.name}`, 'success');
    }

    function deleteList(listId) {
        const list = workoutLists.find(l => l.id === listId);
        if (!list) return;
        if (!confirm(`Удалить тренировку "${list.name}"?`)) return;
        workoutLists = workoutLists.filter(l => l.id !== listId);
        saveLists();
        renderLists();
        showToast(`Удалена: ${list.name}`, 'info');
    }

    function addExerciseToList(listId, exerciseId) {
        const list = workoutLists.find(l => l.id === listId);
        if (!list) return;

        if (list.exercises.includes(exerciseId)) {
            showToast('Упражнение уже в списке', 'info');
            return;
        }

        list.exercises.push(exerciseId);
        saveLists();
        renderLists();

        const ex = EXERCISES.find(e => e.id === exerciseId);
        showToast(`${ex.nameRu} → ${list.name}`, 'success');

        // Visual feedback on card button
        const btn = document.querySelector(`.card-add-btn[data-id="${exerciseId}"]`);
        if (btn) {
            btn.classList.add('added');
            btn.textContent = '✓';
            setTimeout(() => {
                btn.classList.remove('added');
                btn.textContent = '+';
            }, 1500);
        }
    }

    function removeExerciseFromList(listId, exerciseId) {
        const list = workoutLists.find(l => l.id === listId);
        if (!list) return;
        list.exercises = list.exercises.filter(id => id !== exerciseId);
        saveLists();
        renderLists();
    }

    function moveExerciseInList(listId, exerciseId, direction) {
        const list = workoutLists.find(l => l.id === listId);
        if (!list) return;
        const idx = list.exercises.indexOf(exerciseId);
        if (idx === -1) return;
        const newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= list.exercises.length) return;
        // Swap
        [list.exercises[idx], list.exercises[newIdx]] = [list.exercises[newIdx], list.exercises[idx]];
        saveLists();
        renderLists();
    }

    function updateBadge() {
        const total = workoutLists.reduce((sum, l) => sum + l.exercises.length, 0);
        listsBadge.textContent = total;
        listsBadge.style.display = total > 0 ? '' : 'none';
    }

    // ───── Render Lists ─────
    function renderLists() {
        if (workoutLists.length === 0) {
            noLists.style.display = '';
            // Remove old list elements
            const existingLists = listsContainer.querySelectorAll('.workout-list');
            existingLists.forEach(el => el.remove());
            return;
        }

        noLists.style.display = 'none';

        // Keep track of which lists are expanded
        const expandedIds = new Set();
        listsContainer.querySelectorAll('.workout-list.expanded').forEach(el => {
            expandedIds.add(el.dataset.listId);
        });

        // Remove old list elements
        const existingLists = listsContainer.querySelectorAll('.workout-list');
        existingLists.forEach(el => el.remove());

        workoutLists.forEach(list => {
            const div = document.createElement('div');
            div.className = `workout-list${expandedIds.has(list.id) ? ' expanded' : ''}`;
            div.dataset.listId = list.id;

            const exercises = list.exercises.map(id => EXERCISES.find(e => e.id === id)).filter(Boolean);

            div.innerHTML = `
        <div class="list-header">
          <div class="list-header-left">
            <svg class="list-expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
            <span class="list-title">${escapeHtml(list.name)}</span>
            <span class="list-count">${exercises.length}</span>
          </div>
          <div class="list-header-actions">
            <button class="btn-icon list-lang-btn" title="RU / EN">
              <span style="font-size:11px;font-weight:600;opacity:0.7">${sidebarLang === 'ru' ? 'RU' : 'EN'}</span>
            </button>
            <button class="btn-icon list-rename-btn" data-list-id="${list.id}" title="Переименовать">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon list-delete-btn" data-list-id="${list.id}" title="Удалить" style="color:var(--danger)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </div>
        <div class="list-body">
          <div class="list-exercises">
            ${exercises.map((ex, i) => {
                const cat = EXERCISE_CATEGORIES.find(c => c.id === ex.category);
                return `
                <div class="list-exercise-item" data-exercise-id="${ex.id}">
                  <div class="list-exercise-reorder">
                    <button class="reorder-btn reorder-up" data-list-id="${list.id}" data-exercise-id="${ex.id}" title="Вверх" ${i === 0 ? 'disabled' : ''}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><polyline points="18 15 12 9 6 15"/></svg>
                    </button>
                    <button class="reorder-btn reorder-down" data-list-id="${list.id}" data-exercise-id="${ex.id}" title="Вниз" ${i === exercises.length - 1 ? 'disabled' : ''}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                  </div>
                  <span class="list-exercise-num">${i + 1}</span>
                  <img class="list-exercise-thumb" src="${gifUrl(ex.id)}" alt="" loading="lazy" onerror="this.style.display='none'">
                  <div class="list-exercise-info">
                    <div class="list-exercise-name">${sidebarLang === 'en' ? ex.name : ex.nameRu}</div>
                    <div class="list-exercise-muscle">${cat ? cat.icon + ' ' + (sidebarLang === 'en' ? cat.nameEn : cat.name) : ''}</div>
                  </div>
                  <button class="list-exercise-remove" data-list-id="${list.id}" data-exercise-id="${ex.id}" title="Убрать">&times;</button>
                </div>
              `;
            }).join('')}
          </div>
          <div class="list-footer">
            <button class="btn btn-ghost btn-sm list-export-pdf" data-list-id="${list.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              PDF
            </button>
            <button class="btn btn-ghost btn-sm list-export-gifs" data-list-id="${list.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              GIF ZIP
            </button>
            <button class="btn btn-ghost btn-sm list-export-gallery" data-list-id="${list.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              Галерея
            </button>
          </div>
        </div>
      `;

            listsContainer.appendChild(div);
        });

        updateListSelect();
    }

    // ───── Sidebar ─────
    function openSidebar() {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('active');
        renderLists();
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
    }

    // ───── Rename ─────
    function showRenameModal(listId) {
        const list = workoutLists.find(l => l.id === listId);
        if (!list) return;
        renameListId = listId;
        renameInput.value = list.name;
        renameOverlay.classList.add('active');
        setTimeout(() => renameInput.focus(), 100);
    }

    function performRename() {
        if (!renameListId) return;
        const newName = renameInput.value.trim();
        if (!newName) return;
        const list = workoutLists.find(l => l.id === renameListId);
        if (list) {
            list.name = newName;
            saveLists();
            renderLists();
        }
        closeRenameModal();
    }

    function closeRenameModal() {
        renameOverlay.classList.remove('active');
        renameListId = null;
    }

    // ───── Export: PDF ─────
    let _fontCache = null;

    async function loadCyrillicFont() {
        if (_fontCache) return _fontCache;

        // Use lightweight NotoSans static Latin+Cyrillic (~100KB instead of ~800KB variable)
        const fontUrl = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosans/NotoSans[wdth,wght].ttf';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout for mobile
        try {
            const resp = await fetch(fontUrl, { signal: controller.signal });
            clearTimeout(timeout);
            if (!resp.ok) throw new Error('Font fetch failed');
            const buffer = await resp.arrayBuffer();
            const binary = new Uint8Array(buffer);
            let base64 = '';
            const chunkSize = 8192;
            for (let i = 0; i < binary.length; i += chunkSize) {
                base64 += String.fromCharCode.apply(null, binary.subarray(i, i + chunkSize));
            }
            _fontCache = btoa(base64);
            return _fontCache;
        } catch (e) {
            clearTimeout(timeout);
            console.warn('Failed to load Cyrillic font:', e);
            return null;
        }
    }

    // Local image loading is now handled by loadImageAsDataUrl directly via fetch/Image


    async function exportListToPDF(listId) {
        const list = workoutLists.find(l => l.id === listId);
        if (!list || list.exercises.length === 0) {
            showToast('Список пуст — добавьте упражнения', 'info');
            return;
        }

        showExportProgress('Загрузка шрифтов...');
        const exercises = list.exercises.map(id => EXERCISES.find(e => e.id === id)).filter(Boolean);

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageW = 210;
            const margin = 12;
            const contentW = pageW - margin * 2;

            // Load Cyrillic font
            const fontBase64 = await loadCyrillicFont();
            if (fontBase64) {
                pdf.addFileToVFS('NotoSans.ttf', fontBase64);
                pdf.addFont('NotoSans.ttf', 'NotoSans', 'normal');
                pdf.setFont('NotoSans', 'normal');
            }

            // Title page header
            let y = margin;
            pdf.setFontSize(20);
            pdf.setTextColor(124, 58, 237); // purple
            pdf.text(list.name, margin, y + 7);
            y += 12;

            pdf.setFontSize(9);
            pdf.setTextColor(150, 150, 150);
            pdf.text(`${exercises.length} упражнений`, margin, y + 3);
            y += 8;

            // Separator line
            pdf.setDrawColor(124, 58, 237);
            pdf.setLineWidth(0.5);
            pdf.line(margin, y, pageW - margin, y);
            y += 6;

            // Preload all images (parallel per exercise)
            const imageMap = {};
            for (let i = 0; i < exercises.length; i++) {
                updateExportProgress(Math.round((i / exercises.length) * 60), `Изображения ${i + 1}/${exercises.length}`);
                const ex = exercises[i];
                // Load all 3 images in parallel from local storage
                const promises = [0, 1, 2].map(idx => loadImageAsDataUrl(imgUrl(ex.id, idx)));
                imageMap[ex.id] = await Promise.all(promises);

                // Small delay to prevent browser throttling
                await new Promise(r => setTimeout(r, 50));
            }

            // Render exercises
            for (let i = 0; i < exercises.length; i++) {
                updateExportProgress(60 + Math.round((i / exercises.length) * 35), `Упражнение ${i + 1}/${exercises.length}`);
                const ex = exercises[i];
                const cat = EXERCISE_CATEGORIES.find(c => c.id === ex.category);

                // Check if needs new page (need ~100mm per exercise)
                if (y > 200) {
                    pdf.addPage();
                    y = margin;
                }

                // Exercise number + English name (bold)
                pdf.setFontSize(13);
                pdf.setTextColor(124, 58, 237);
                const numText = `${i + 1}. `;
                pdf.text(numText, margin, y + 5);
                const numW = pdf.getTextWidth(numText);

                pdf.setTextColor(30, 30, 30);
                pdf.setFontSize(13);
                pdf.text(ex.name, margin + numW, y + 5);
                y += 7;

                // Russian name (normal, lighter)
                pdf.setFontSize(10);
                pdf.setTextColor(100, 100, 100);
                pdf.text(ex.nameRu, margin + 4, y + 4);
                y += 6;

                // Category badge
                if (cat) {
                    pdf.setFontSize(8);
                    pdf.setTextColor(120, 120, 120);
                    pdf.text(`${cat.icon} ${cat.nameEn}`, margin + 4, y + 3);
                    y += 5;
                }

                // Images row (3 images)
                const imgW = 55;
                const imgH = 41;
                const imgGap = 5;
                const exImages = imageMap[ex.id] || [];

                for (let idx = 0; idx < 3; idx++) {
                    const imgX = margin + idx * (imgW + imgGap);
                    if (exImages[idx]) {
                        try {
                            pdf.addImage(exImages[idx], 'JPEG', imgX, y, imgW, imgH);
                        } catch {
                            // Draw placeholder
                            pdf.setDrawColor(220, 220, 220);
                            pdf.setFillColor(245, 245, 245);
                            pdf.roundedRect(imgX, y, imgW, imgH, 2, 2, 'FD');
                        }
                    } else {
                        // Draw placeholder
                        pdf.setDrawColor(220, 220, 220);
                        pdf.setFillColor(245, 245, 245);
                        pdf.roundedRect(imgX, y, imgW, imgH, 2, 2, 'FD');
                    }
                }
                y += imgH + 4;

                // Description
                pdf.setFontSize(8);
                pdf.setTextColor(80, 80, 80);
                const descLines = pdf.splitTextToSize(ex.description, contentW - 8);
                const maxLines = Math.min(descLines.length, 4);
                for (let j = 0; j < maxLines; j++) {
                    pdf.text(descLines[j], margin + 4, y + 3);
                    y += 3.5;
                }
                y += 4;

                // Separator
                if (i < exercises.length - 1) {
                    pdf.setDrawColor(235, 235, 235);
                    pdf.setLineWidth(0.3);
                    pdf.line(margin, y, pageW - margin, y);
                    y += 5;
                }
            }

            updateExportProgress(100, 'Сохранение...');
            const fileName = `${list.name.replace(/[^а-яА-Яa-zA-Z0-9\s-]/g, '').trim()}.pdf`;
            pdf.save(fileName);
            showToast('PDF сохранён!', 'success');
        } catch (err) {
            console.error('PDF export error:', err);
            showToast('Ошибка создания PDF', 'error');
        } finally {
            hideExportProgress();
        }
    }

    // ───── Export: GIF ZIP ─────
    async function exportListAsZip(listId) {
        const list = workoutLists.find(l => l.id === listId);
        if (!list || list.exercises.length === 0) {
            showToast('Список пуст', 'info');
            return;
        }

        showExportProgress('Подготовка GIF архива...');
        const exercises = list.exercises.map(id => EXERCISES.find(e => e.id === id)).filter(Boolean);

        try {
            const zip = new JSZip();

            for (let i = 0; i < exercises.length; i++) {
                const ex = exercises[i];
                updateExportProgress(Math.round((i / exercises.length) * 90), `Загрузка ${i + 1} из ${exercises.length}`);

                try {
                    const response = await fetch(gifUrl(ex.id));
                    if (response.ok) {
                        const blob = await response.blob();
                        const num = String(i + 1).padStart(2, '0');
                        const safeName = ex.name.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '_');
                        zip.file(`${num}_${safeName}.gif`, blob);
                    }
                } catch (e) {
                    console.warn(`Failed to fetch GIF for ${ex.name}:`, e);
                }
            }

            updateExportProgress(95, 'Создание архива...');
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const fileName = `${list.name.replace(/[^а-яА-Яa-zA-Z0-9\s-]/g, '').trim()}_gifs.zip`;
            saveAs(zipBlob, fileName);

            updateExportProgress(100, 'Готово!');
            showToast('ZIP архив скачан!', 'success');
        } catch (err) {
            console.error('ZIP export error:', err);
            showToast('Ошибка создания архива', 'error');
        } finally {
            hideExportProgress();
        }
    }

    // ───── Export: Gallery (sequential download) ─────
    async function exportToGallery(listId) {
        const list = workoutLists.find(l => l.id === listId);
        if (!list || list.exercises.length === 0) {
            showToast('Список пуст', 'info');
            return;
        }

        showExportProgress('Сохранение в галерею...');
        const exercises = list.exercises.map(id => EXERCISES.find(e => e.id === id)).filter(Boolean);

        let saved = 0;
        for (let i = 0; i < exercises.length; i++) {
            const ex = exercises[i];
            updateExportProgress(Math.round((i / exercises.length) * 100), `Сохранение ${i + 1} из ${exercises.length}: ${ex.nameRu}`);

            try {
                const response = await fetch(gifUrl(ex.id));
                if (response.ok) {
                    const blob = await response.blob();
                    const num = String(i + 1).padStart(2, '0');
                    const safeName = ex.name.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '_');
                    saveAs(blob, `${num}_${safeName}.gif`);
                    saved++;
                    // Small delay between downloads for sequential gallery saving
                    await new Promise(r => setTimeout(r, 500));
                }
            } catch (e) {
                console.warn(`Failed to save GIF for ${ex.name}:`, e);
            }
        }

        updateExportProgress(100, 'Готово!');
        showToast(`Сохранено ${saved} из ${exercises.length} GIF`, 'success');
        hideExportProgress();
    }

    // ───── Helpers ─────
    async function loadImageAsDataUrl(url, attempt = 1) {
        try {
            // Try fetch-as-blob first (works for same-origin & CORS-enabled)
            // Add cache busting to ensure we get fresh file if it was 404 before
            const response = await fetch(url, { cache: 'reload' });
            if (!response.ok) throw new Error(response.status);
            const blob = await response.blob();
            return await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('FileReader error'));
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            // Retry logic (3 attempts total)
            if (attempt < 3) {
                // Exponential backoff: 500ms, 1000ms
                await new Promise(r => setTimeout(r, attempt * 500));
                return loadImageAsDataUrl(url, attempt + 1);
            }

            // Fallback to Image + canvas (works for same-origin only)
            // This is last resort
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous'; // Just in case
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL('image/jpeg', 0.8));
                    } catch (err) {
                        console.error('Canvas error for', url, err);
                        resolve(null);
                    }
                };
                img.onerror = () => {
                    console.warn(`Failed to load image: ${url} (after ${attempt} attempts)`);
                    resolve(null);
                };
                img.src = url;
            });
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ───── Toast ─────
    function showToast(message, type = 'info') {
        const icons = { success: '✅', error: '❌', info: 'ℹ️' };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${escapeHtml(message)}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ───── Export Progress ─────
    function showExportProgress(title) {
        $('#exportTitle').textContent = title;
        $('#exportProgress').style.width = '0%';
        $('#exportStatus').textContent = 'Подготовка...';
        $('#exportOverlay').style.display = 'flex';
        $('#exportOverlay').classList.add('active');
    }

    function updateExportProgress(percent, status) {
        $('#exportProgress').style.width = `${percent}%`;
        $('#exportStatus').textContent = status;
    }

    function hideExportProgress() {
        setTimeout(() => {
            $('#exportOverlay').classList.remove('active');
            setTimeout(() => {
                $('#exportOverlay').style.display = 'none';
            }, 300);
        }, 500);
    }

    // ───── Events ─────
    function bindEvents() {
        // Search
        searchInput.addEventListener('input', () => {
            searchQuery = searchInput.value.trim();
            renderGrid();
        });

        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            searchQuery = '';
            renderGrid();
            searchInput.focus();
        });

        // Filter pills (the "All" button)
        document.querySelector('.filter-pill[data-category="all"]').addEventListener('click', function () {
            setActiveFilter('all', this);
        });

        // Category filter pills
        filterPills.addEventListener('click', (e) => {
            const pill = e.target.closest('.filter-pill');
            if (!pill) return;
            const cat = pill.dataset.category;
            setActiveFilter(cat, pill);
        });

        // Grid: card click
        grid.addEventListener('click', (e) => {
            const addBtn = e.target.closest('.card-add-btn');
            if (addBtn) {
                e.stopPropagation();
                const id = parseInt(addBtn.dataset.id);
                showQuickAddMenu(id, addBtn);
                return;
            }
            const card = e.target.closest('.exercise-card');
            if (card) {
                openModal(parseInt(card.dataset.id));
            }
        });

        // Modal
        modalClose.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });

        addToListBtn.addEventListener('click', () => {
            if (!currentModalExercise) return;
            const listId = addToListSelect.value;
            if (!listId) return;
            addExerciseToList(listId, currentModalExercise.id);
        });

        // Sidebar
        toggleListsBtn.addEventListener('click', openSidebar);
        closeSidebarBtn.addEventListener('click', closeSidebar);
        sidebarOverlay.addEventListener('click', closeSidebar);

        // Create list
        createListBtn.addEventListener('click', createNewList);

        // List actions (delegated)
        listsContainer.addEventListener('click', (e) => {
            // Expand/collapse
            const header = e.target.closest('.list-header');
            if (header && !e.target.closest('.list-header-actions')) {
                const wl = header.closest('.workout-list');
                wl.classList.toggle('expanded');
                return;
            }

            // Delete list
            const deleteBtn = e.target.closest('.list-delete-btn');
            if (deleteBtn) {
                deleteList(deleteBtn.dataset.listId);
                return;
            }

            // Language toggle
            const langBtn = e.target.closest('.list-lang-btn');
            if (langBtn) {
                sidebarLang = sidebarLang === 'ru' ? 'en' : 'ru';
                localStorage.setItem('sidebarLang', sidebarLang);
                renderLists();
                return;
            }

            // Rename list
            const renameBtn = e.target.closest('.list-rename-btn');
            if (renameBtn) {
                showRenameModal(renameBtn.dataset.listId);
                return;
            }

            // Move exercise up
            const upBtn = e.target.closest('.reorder-up');
            if (upBtn) {
                moveExerciseInList(upBtn.dataset.listId, parseInt(upBtn.dataset.exerciseId), -1);
                return;
            }

            // Move exercise down
            const downBtn = e.target.closest('.reorder-down');
            if (downBtn) {
                moveExerciseInList(downBtn.dataset.listId, parseInt(downBtn.dataset.exerciseId), 1);
                return;
            }

            // Remove exercise from list
            const removeBtn = e.target.closest('.list-exercise-remove');
            if (removeBtn) {
                removeExerciseFromList(removeBtn.dataset.listId, parseInt(removeBtn.dataset.exerciseId));
                return;
            }

            // Open Preview Page (PDF + Photo export)
            const pdfBtn = e.target.closest('.list-export-pdf');
            if (pdfBtn) {
                window.open(`preview.html?list=${encodeURIComponent(pdfBtn.dataset.listId)}`, '_blank');
                return;
            }

            // Export GIF ZIP
            const zipBtn = e.target.closest('.list-export-gifs');
            if (zipBtn) {
                exportListAsZip(zipBtn.dataset.listId);
                return;
            }

            // Export Gallery
            const galleryBtn = e.target.closest('.list-export-gallery');
            if (galleryBtn) {
                exportToGallery(galleryBtn.dataset.listId);
                return;
            }
        });

        // Rename modal
        renameSave.addEventListener('click', performRename);
        renameCancel.addEventListener('click', closeRenameModal);
        renameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') performRename();
            if (e.key === 'Escape') closeRenameModal();
        });
        renameOverlay.addEventListener('click', (e) => {
            if (e.target === renameOverlay) closeRenameModal();
        });

        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (renameOverlay.classList.contains('active')) {
                    closeRenameModal();
                } else if (modalOverlay.classList.contains('active')) {
                    closeModal();
                } else if (sidebar.classList.contains('open')) {
                    closeSidebar();
                }
            }
        });
    }

    function setActiveFilter(category, pillEl) {
        activeCategory = category;
        $$('.filter-pill.active').forEach(p => p.classList.remove('active'));
        pillEl.classList.add('active');
        renderGrid();
    }

    // ───── Boot ─────
    document.addEventListener('DOMContentLoaded', init);
    // Fallback if DOM already loaded
    if (document.readyState !== 'loading') init();
})();
