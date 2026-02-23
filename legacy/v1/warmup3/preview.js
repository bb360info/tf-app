'use strict';

(() => {
    // ───── State ─────
    const params = new URLSearchParams(window.location.search);
    const listId = params.get('list');

    // ───── DOM ─────
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    const loadingProgress = document.getElementById('loadingProgress');
    const previewContent = document.getElementById('previewContent');
    const btnPDF = document.getElementById('btnPDF');
    const btnPhoto = document.getElementById('btnPhoto');
    const toastContainer = document.getElementById('toastContainer');

    // ───── Init ─────
    function init() {
        if (!listId) {
            showError('Не указан ID списка');
            return;
        }

        // Load workout lists from localStorage
        const stored = localStorage.getItem('workoutLists');
        if (!stored) {
            showError('Нет сохранённых тренировок');
            return;
        }

        let lists;
        try { lists = JSON.parse(stored); } catch { showError('Ошибка данных'); return; }

        const list = lists.find(l => l.id === listId);
        if (!list) {
            showError('Тренировка не найдена');
            return;
        }

        const exercises = list.exercises
            .map(id => EXERCISES.find(e => e.id === id))
            .filter(Boolean);

        if (exercises.length === 0) {
            showError('Список пуст');
            return;
        }

        document.title = `${list.name} — Предпросмотр`;
        renderPreview(list, exercises);
        trackImageLoading();

        // Toolbar buttons
        btnPDF.addEventListener('click', () => exportPDF(list.name));
        btnPhoto.addEventListener('click', () => saveToPhotos(list.name));
    }

    // ───── Render ─────
    function renderPreview(list, exercises) {
        let html = `
            <div class="preview-header">
                <h1 class="preview-title">${escapeHtml(list.name)}</h1>
                <p class="preview-subtitle">${exercises.length} упражнений</p>
            </div>
        `;

        exercises.forEach((ex, i) => {
            const cat = EXERCISE_CATEGORIES.find(c => c.id === ex.category);
            html += `
                <div class="exercise-block">
                    <div>
                        <span class="exercise-num">${i + 1}.</span>
                        <span class="exercise-name-en">${escapeHtml(ex.name)}</span>
                    </div>
                    <div class="exercise-name-ru">${escapeHtml(ex.nameRu)}</div>
                    ${cat ? `<span class="exercise-category">${cat.icon} ${cat.nameEn}</span>` : ''}
                    <div class="exercise-images">
                        ${[0, 1, 2].map(idx => `
                            <div class="exercise-img-wrap">
                                <img src="${imgUrl(ex.id, idx)}" 
                                     alt="${ex.name} ${idx + 1}" 
                                     class="loading"
                                     data-exercise-img>
                                <div class="img-placeholder">🏋️</div>
                            </div>
                        `).join('')}
                    </div>
                    <p class="exercise-desc">${escapeHtml(ex.description)}</p>
                </div>
            `;
        });

        previewContent.innerHTML = html;
    }

    // ───── Image Loading Tracker ─────
    function trackImageLoading() {
        const images = previewContent.querySelectorAll('img[data-exercise-img]');
        const total = images.length;
        let loaded = 0;
        let failed = 0;

        function updateProgress() {
            const done = loaded + failed;
            const pct = Math.round((done / total) * 100);
            loadingProgress.style.width = pct + '%';
            loadingText.textContent = `Загрузка изображений: ${done}/${total}`;

            if (done >= total) {
                // All done
                setTimeout(() => {
                    loadingOverlay.classList.add('hidden');
                    btnPDF.disabled = false;
                    btnPhoto.disabled = false;

                    if (failed > 0) {
                        showToast(`${failed} из ${total} изображений не загрузились`, 'info');
                    }
                }, 300);
            }
        }

        images.forEach(img => {
            img.addEventListener('load', () => {
                loaded++;
                img.classList.remove('loading');
                img.classList.add('loaded');
                // Hide placeholder
                const placeholder = img.parentElement.querySelector('.img-placeholder');
                if (placeholder) placeholder.style.display = 'none';
                updateProgress();
            });

            img.addEventListener('error', () => {
                failed++;
                img.classList.remove('loading');
                img.classList.add('error');
                updateProgress();
            });

            // If already cached
            if (img.complete && img.naturalWidth > 0) {
                loaded++;
                img.classList.remove('loading');
                img.classList.add('loaded');
                const placeholder = img.parentElement.querySelector('.img-placeholder');
                if (placeholder) placeholder.style.display = 'none';
                updateProgress();
            }
        });

        // Safety timeout: if something hangs, enable buttons after 15s
        setTimeout(() => {
            if (btnPDF.disabled) {
                loadingOverlay.classList.add('hidden');
                btnPDF.disabled = false;
                btnPhoto.disabled = false;
                showToast('Некоторые изображения могут не загрузиться', 'info');
            }
        }, 15000);
    }

    // ───── Export: PDF ─────
    async function exportPDF(listName) {
        btnPDF.disabled = true;
        btnPDF.innerHTML = '<span>⏳</span>';

        try {
            showToast('Генерация PDF...', 'info');

            // Use html2canvas to capture the preview content
            const canvas = await html2canvas(previewContent, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                // Scroll fix
                windowWidth: previewContent.scrollWidth,
                windowHeight: previewContent.scrollHeight
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.92);

            // Calculate PDF dimensions
            const { jsPDF } = window.jspdf;
            const pdfW = 210; // A4 width mm
            const pdfH = 297; // A4 height mm
            const margin = 8;
            const contentW = pdfW - margin * 2;

            // Scale canvas to fit A4 width
            const imgW = canvas.width;
            const imgH = canvas.height;
            const ratio = contentW / imgW;
            const scaledH = imgH * ratio;

            // Calculate how many pages needed
            const pageContentH = pdfH - margin * 2;
            const totalPages = Math.ceil(scaledH / pageContentH);

            const pdf = new jsPDF('p', 'mm', 'a4');

            for (let page = 0; page < totalPages; page++) {
                if (page > 0) pdf.addPage();

                // Source coordinates in canvas pixels
                const srcY = page * (pageContentH / ratio);
                const srcH = Math.min(pageContentH / ratio, imgH - srcY);

                // Create a slice canvas for this page
                const sliceCanvas = document.createElement('canvas');
                sliceCanvas.width = imgW;
                sliceCanvas.height = Math.round(srcH);
                const ctx = sliceCanvas.getContext('2d');
                ctx.drawImage(canvas, 0, Math.round(srcY), imgW, Math.round(srcH), 0, 0, imgW, Math.round(srcH));

                const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92);
                const sliceScaledH = srcH * ratio;

                pdf.addImage(sliceData, 'JPEG', margin, margin, contentW, sliceScaledH);
            }

            const fileName = `${listName.replace(/[^а-яА-Яa-zA-Z0-9\s-]/g, '').trim() || 'workout'}.pdf`;
            pdf.save(fileName);
            showToast('PDF сохранён! ✅', 'success');
        } catch (err) {
            console.error('PDF export error:', err);
            showToast('Ошибка создания PDF', 'error');
        } finally {
            btnPDF.disabled = false;
            btnPDF.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <span>PDF</span>
            `;
        }
    }

    // ───── Export: Save to Photos (Camera Roll) ─────
    async function saveToPhotos(listName) {
        btnPhoto.disabled = true;
        btnPhoto.innerHTML = '<span>⏳</span>';

        try {
            showToast('Создание изображения...', 'info');

            const canvas = await html2canvas(previewContent, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                windowWidth: previewContent.scrollWidth,
                windowHeight: previewContent.scrollHeight
            });

            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const fileName = `${listName.replace(/[^а-яА-Яa-zA-Z0-9\s-]/g, '').trim() || 'workout'}.png`;

            // Try Web Share API (iOS Camera Roll / Android Share)
            if (navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: 'image/png' })] })) {
                const file = new File([blob], fileName, { type: 'image/png' });
                try {
                    await navigator.share({
                        title: listName,
                        files: [file]
                    });
                    showToast('Сохранено! ✅', 'success');
                } catch (err) {
                    // User cancelled share sheet
                    if (err.name !== 'AbortError') {
                        console.warn('Share failed, falling back:', err);
                        saveAs(blob, fileName);
                        showToast('Изображение скачано', 'success');
                    }
                }
            } else {
                // Desktop / unsupported: download as file
                saveAs(blob, fileName);
                showToast('Изображение скачано ✅', 'success');
            }
        } catch (err) {
            console.error('Photo export error:', err);
            showToast('Ошибка создания изображения', 'error');
        } finally {
            btnPhoto.disabled = false;
            btnPhoto.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>Фото</span>
            `;
        }
    }

    // ───── Helpers ─────
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showToast(msg, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = msg;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    function showError(msg) {
        loadingOverlay.classList.add('hidden');
        previewContent.innerHTML = `
            <div style="text-align:center; padding:60px 20px;">
                <div style="font-size:48px; margin-bottom:16px;">😕</div>
                <h2 style="margin-bottom:8px;">${msg}</h2>
                <p style="color:#999;">Вернитесь в <a href="index.html">каталог</a> и попробуйте снова</p>
            </div>
        `;
    }

    // ───── Start ─────
    init();
})();
