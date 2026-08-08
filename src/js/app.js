import { createIcons, icons } from 'lucide';
import Sortable from 'sortablejs';
import confetti from 'canvas-confetti';
import { init3DScene } from './3d-scene.js';
import { PhotoEditor } from './editor.js';
import { PDFEngine } from './pdf-engine.js';
import { PrivacyManager } from './privacy.js';

// Global State
const appState = {
  photos: [], // { id, originalSrc, thumbnailSrc, rotation, filter, brightness, contrast, crop }
  activeEditingId: null,
  editingState: null,
  sortableInstance: null
};

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  createIcons({ icons });

  // Initialize 3D Scene
  init3DScene();

  // Initialize Privacy Manager
  PrivacyManager.init();

  // Setup Event Listeners
  setupDropzone();
  setupSettingsToggle();
  setupBulkActions();
  setupEditorModal();
  setupPreviewModal();
  setupPrivacyModal();
  setupFAQAccordion();
  setupSampleImages();
});

// Toast System
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''}`;

  let icon = 'info';
  if (type === 'success') icon = 'check-circle';
  if (type === 'error') icon = 'alert-circle';

  toast.innerHTML = `
    <i data-lucide="${icon}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  createIcons({ icons });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Dropzone & File Handling
function setupDropzone() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');

  dropzone.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
  });

  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    fileInput.value = '';
  });
}

async function handleFiles(files) {
  if (!files || files.length === 0) return;

  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/svg+xml'];
  const imageFiles = Array.from(files).filter(file => validTypes.includes(file.type) || file.type.startsWith('image/'));

  if (imageFiles.length === 0) {
    showToast('Please select valid image files (JPG, PNG, WEBP, etc.)', 'error');
    return;
  }

  showToast(`Loading ${imageFiles.length} photo(s)...`, 'info');

  for (const file of imageFiles) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const src = e.target.result;
      const thumbnailSrc = await PhotoEditor.createThumbnail(src);

      const newItem = {
        id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        originalSrc: src,
        thumbnailSrc: thumbnailSrc,
        filename: file.name,
        rotation: 0,
        filter: 'none',
        brightness: 0,
        contrast: 0,
        crop: null
      };

      appState.photos.push(newItem);
      renderGrid();
    };
    reader.readAsDataURL(file);
  }
}

// Render Photo Grid with Sortable Drag-and-Drop
function renderGrid() {
  const grid = document.getElementById('photo-grid');
  const gridHeader = document.getElementById('grid-header');
  const countBadge = document.getElementById('photo-count-badge');
  const dropzone = document.getElementById('dropzone');

  if (appState.photos.length === 0) {
    grid.innerHTML = '';
    gridHeader.style.display = 'none';
    dropzone.style.display = 'block';
    return;
  }

  gridHeader.style.display = 'flex';
  countBadge.textContent = `${appState.photos.length} Page${appState.photos.length > 1 ? 's' : ''}`;

  grid.innerHTML = appState.photos.map((item, index) => `
    <div class="photo-card" data-id="${item.id}">
      <div class="photo-card-header">
        <div class="page-num">${index + 1}</div>
        <div class="drag-handle" title="Drag to reorder">
          <i data-lucide="grip-vertical"></i>
        </div>
      </div>

      <div class="photo-preview-box">
        <img class="photo-preview-img" src="${item.thumbnailSrc}" style="transform: rotate(${item.rotation}deg); filter: ${getCSSFilterString(item)};" alt="Page ${index + 1}">
      </div>

      <div class="photo-card-footer">
        <span class="photo-title" title="${item.filename}">${item.filename || 'Photo ' + (index + 1)}</span>

        <div class="photo-actions">
          <button class="btn-card-action btn-rot-left" data-id="${item.id}" title="Rotate Left">
            <i data-lucide="rotate-ccw"></i>
          </button>
          <button class="btn-card-action btn-rot-right" data-id="${item.id}" title="Rotate Right">
            <i data-lucide="rotate-cw"></i>
          </button>
          <button class="btn-card-action btn-edit" data-id="${item.id}" title="Edit Filters">
            <i data-lucide="sliders"></i>
          </button>
          <button class="btn-card-action btn-delete" data-id="${item.id}" title="Remove">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  createIcons({ icons });

  // Initialize or update Sortable JS
  if (!appState.sortableInstance) {
    appState.sortableInstance = new Sortable(grid, {
      handle: '.drag-handle',
      animation: 250,
      ghostClass: 'sortable-ghost',
      onEnd: (evt) => {
        const itemEl = evt.item;
        const oldIndex = evt.oldIndex;
        const newIndex = evt.newIndex;

        const movedItem = appState.photos.splice(oldIndex, 1)[0];
        appState.photos.splice(newIndex, 0, movedItem);

        renderGrid();
      }
    });
  }

  // Attach card button actions
  grid.querySelectorAll('.btn-rot-left').forEach(btn => {
    btn.addEventListener('click', () => rotatePhoto(btn.dataset.id, -90));
  });

  grid.querySelectorAll('.btn-rot-right').forEach(btn => {
    btn.addEventListener('click', () => rotatePhoto(btn.dataset.id, 90));
  });

  grid.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openEditorModal(btn.dataset.id));
  });

  grid.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deletePhoto(btn.dataset.id));
  });
}

function getCSSFilterString(item) {
  let filterCss = '';
  if (item.filter === 'grayscale') filterCss += 'grayscale(100%) ';
  if (item.filter === 'scanner') filterCss += 'grayscale(100%) contrast(160%) ';
  if (item.filter === 'vintage') filterCss += 'sepia(80%) ';
  if (item.brightness !== 0) filterCss += `brightness(${100 + Number(item.brightness)}%) `;
  if (item.contrast !== 0) filterCss += `contrast(${100 + Number(item.contrast)}%) `;
  return filterCss || 'none';
}

function rotatePhoto(id, deg) {
  const item = appState.photos.find(p => p.id === id);
  if (!item) return;
  item.rotation = (item.rotation + deg + 360) % 360;
  renderGrid();
}

function deletePhoto(id) {
  appState.photos = appState.photos.filter(p => p.id !== id);
  renderGrid();
  showToast('Photo removed from document', 'info');
}

// Global Controls & Bulk Actions
function setupSettingsToggle() {
  const btnToggle = document.getElementById('btn-toggle-settings');
  const panel = document.getElementById('settings-panel');
  btnToggle.addEventListener('click', () => {
    panel.style.display = panel.style.display === 'none' ? 'grid' : 'none';
  });
}

function setupBulkActions() {
  document.getElementById('btn-clear-all').addEventListener('click', () => {
    if (appState.photos.length === 0) return;
    if (confirm('Clear all uploaded photos?')) {
      appState.photos = [];
      renderGrid();
      showToast('All photos cleared', 'info');
    }
  });

  document.getElementById('btn-rotate-all-left').addEventListener('click', () => {
    appState.photos.forEach(p => p.rotation = (p.rotation - 90 + 360) % 360);
    renderGrid();
  });

  document.getElementById('btn-rotate-all-right').addEventListener('click', () => {
    appState.photos.forEach(p => p.rotation = (p.rotation + 90) % 360);
    renderGrid();
  });

  document.getElementById('btn-scanner-all').addEventListener('click', () => {
    appState.photos.forEach(p => p.filter = p.filter === 'scanner' ? 'none' : 'scanner');
    renderGrid();
    showToast('Toggled Document Scanner Filter on all pages', 'success');
  });

  document.getElementById('btn-add-more').addEventListener('click', () => {
    document.getElementById('file-input').click();
  });

  document.getElementById('btn-download-pdf').addEventListener('click', () => executePDFExport('download'));
  document.getElementById('btn-preview-pdf').addEventListener('click', () => executePDFExport('preview'));
}

// Editor Modal Controller
function setupEditorModal() {
  const modal = document.getElementById('modal-editor');
  const btnClose = document.getElementById('btn-close-editor');
  const btnCancel = document.getElementById('btn-cancel-editor');
  const btnSave = document.getElementById('btn-save-editor');

  const btnRotL = document.getElementById('btn-ed-rot-left');
  const btnRotR = document.getElementById('btn-ed-rot-right');

  const sliderB = document.getElementById('slider-brightness');
  const sliderC = document.getElementById('slider-contrast');
  const valB = document.getElementById('val-brightness');
  const valC = document.getElementById('val-contrast');

  const filterBtns = modal.querySelectorAll('.filter-btn');

  btnClose.addEventListener('click', closeEditorModal);
  btnCancel.addEventListener('click', closeEditorModal);

  btnRotL.addEventListener('click', () => {
    if (!appState.editingState) return;
    appState.editingState.rotation = (appState.editingState.rotation - 90 + 360) % 360;
    updateEditorCanvas();
  });

  btnRotR.addEventListener('click', () => {
    if (!appState.editingState) return;
    appState.editingState.rotation = (appState.editingState.rotation + 90) % 360;
    updateEditorCanvas();
  });

  sliderB.addEventListener('input', (e) => {
    valB.textContent = e.target.value;
    if (appState.editingState) {
      appState.editingState.brightness = Number(e.target.value);
      updateEditorCanvas();
    }
  });

  sliderC.addEventListener('input', (e) => {
    valC.textContent = e.target.value;
    if (appState.editingState) {
      appState.editingState.contrast = Number(e.target.value);
      updateEditorCanvas();
    }
  });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (appState.editingState) {
        appState.editingState.filter = btn.dataset.filter;
        updateEditorCanvas();
      }
    });
  });

  btnSave.addEventListener('click', () => {
    if (!appState.activeEditingId || !appState.editingState) return;
    const item = appState.photos.find(p => p.id === appState.activeEditingId);
    if (item) {
      Object.assign(item, appState.editingState);
      renderGrid();
      showToast('Photo changes applied!', 'success');
    }
    closeEditorModal();
  });
}

function openEditorModal(id) {
  const item = appState.photos.find(p => p.id === id);
  if (!item) return;

  appState.activeEditingId = id;
  appState.editingState = {
    rotation: item.rotation || 0,
    filter: item.filter || 'none',
    brightness: item.brightness || 0,
    contrast: item.contrast || 0
  };

  const modal = document.getElementById('modal-editor');
  document.getElementById('slider-brightness').value = item.brightness || 0;
  document.getElementById('slider-contrast').value = item.contrast || 0;
  document.getElementById('val-brightness').textContent = item.brightness || 0;
  document.getElementById('val-contrast').textContent = item.contrast || 0;

  modal.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === (item.filter || 'none'));
  });

  modal.classList.add('active');
  updateEditorCanvas();
}

function closeEditorModal() {
  document.getElementById('modal-editor').classList.remove('active');
  appState.activeEditingId = null;
  appState.editingState = null;
}

async function updateEditorCanvas() {
  if (!appState.activeEditingId || !appState.editingState) return;
  const item = appState.photos.find(p => p.id === appState.activeEditingId);
  if (!item) return;

  const canvas = document.getElementById('editor-canvas');
  const processedDataUrl = await PhotoEditor.applyFiltersAndTransform(
    item.originalSrc,
    appState.editingState
  );

  const img = new Image();
  img.onload = () => {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
  };
  img.src = processedDataUrl;
}

// PDF Export Execution & Live Preview Modal
async function executePDFExport(mode = 'download') {
  if (appState.photos.length === 0) {
    showToast('Please add at least one photo before converting!', 'error');
    return;
  }

  const btnDownload = document.getElementById('btn-download-pdf');
  const originalBtnText = btnDownload.innerHTML;

  try {
    btnDownload.disabled = true;
    btnDownload.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Generating PDF...`;
    createIcons({ icons });

    const settings = {
      pageSize: document.getElementById('setting-page-size').value,
      orientation: document.getElementById('setting-orientation').value,
      margin: document.getElementById('setting-margin').value,
      fitMode: document.getElementById('setting-fit-mode').value,
      quality: Number(document.getElementById('setting-quality').value),
      showPageNumbers: document.getElementById('setting-page-num-pos').value !== 'none',
      pageNumPosition: document.getElementById('setting-page-num-pos').value,
      headerText: document.getElementById('setting-header-text').value,
      footerText: document.getElementById('setting-footer-text').value
    };

    const doc = await PDFEngine.generatePDF(appState.photos, settings, (current, total) => {
      btnDownload.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Page ${current}/${total}...`;
    });

    if (mode === 'download') {
      try {
        window.open('https://omg10.com/4/11530048', '_blank');
      } catch (e) {}
      PDFEngine.downloadPDF(doc, 'PHOTO_TO_PDF_DOCUMENT.pdf');
      
      // Trigger Celebration Confetti
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });

      showToast('PDF downloaded successfully! 100% Client-Side.', 'success');
    } else if (mode === 'preview') {
      const blobUrl = PDFEngine.getPDFUrl(doc);
      openPreviewModal(blobUrl, doc);
    }
  } catch (err) {
    console.error('PDF Generation Error:', err);
    showToast('Failed to generate PDF. Please try again.', 'error');
  } finally {
    btnDownload.disabled = false;
    btnDownload.innerHTML = originalBtnText;
    createIcons({ icons });
  }
}

function setupPreviewModal() {
  const modal = document.getElementById('modal-preview');
  const btnClose = document.getElementById('btn-close-preview');
  const btnDownload = document.getElementById('btn-download-preview');
  const btnPrint = document.getElementById('btn-print-preview');

  btnClose.addEventListener('click', () => modal.classList.remove('active'));

  btnDownload.addEventListener('click', () => {
    if (window.currentPdfDoc) {
      try {
        window.open('https://omg10.com/4/11530048', '_blank');
      } catch (e) {}
      const filename = document.getElementById('preview-filename').value || 'PHOTO_TO_PDF.pdf';
      PDFEngine.downloadPDF(window.currentPdfDoc, filename);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      showToast('PDF downloaded!', 'success');
    }
  });

  btnPrint.addEventListener('click', () => {
    const iframe = document.getElementById('pdf-preview-iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
    }
  });
}

function openPreviewModal(blobUrl, pdfDoc) {
  window.currentPdfDoc = pdfDoc;
  const modal = document.getElementById('modal-preview');
  const iframe = document.getElementById('pdf-preview-iframe');
  const meta = document.getElementById('preview-meta');

  iframe.src = blobUrl;
  meta.textContent = `${appState.photos.length} Pages • Ready to Download/Print`;

  modal.classList.add('active');
}

// Privacy Policy & Legal Modal
function setupPrivacyModal() {
  const modal = document.getElementById('modal-privacy');
  const btnClose = document.getElementById('btn-close-privacy');
  const btnCloseFooter = document.getElementById('btn-close-privacy-footer');

  const btnOpenNav = document.getElementById('btn-open-privacy');
  const btnReadFull = document.getElementById('btn-read-full-privacy');
  const btnReadTerms = document.getElementById('btn-read-terms');
  const btnFooterPriv = document.getElementById('btn-footer-privacy');

  const bodyEl = document.getElementById('privacy-modal-body');

  function openPrivacy(type = 'policy') {
    if (type === 'policy') {
      bodyEl.innerHTML = PrivacyManager.getPrivacyPolicyHTML();
    } else {
      bodyEl.innerHTML = PrivacyManager.getTermsHTML();
    }
    modal.classList.add('active');
  }

  btnClose.addEventListener('click', () => modal.classList.remove('active'));
  btnCloseFooter.addEventListener('click', () => modal.classList.remove('active'));

  btnOpenNav.addEventListener('click', () => openPrivacy('policy'));
  btnReadFull.addEventListener('click', () => openPrivacy('policy'));
  btnReadTerms.addEventListener('click', () => openPrivacy('terms'));
  btnFooterPriv.addEventListener('click', () => openPrivacy('policy'));
}

// FAQ Accordion
function setupFAQAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const qBtn = item.querySelector('.faq-question');
    qBtn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      faqItems.forEach(i => i.classList.remove('active'));
      if (!isActive) item.classList.add('active');
    });
  });
}

// Sample Image Generator for Testing
function setupSampleImages() {
  const btn = document.getElementById('btn-add-samples');
  btn.addEventListener('click', async () => {
    showToast('Generating sample document photos...', 'info');

    const sample1 = createSampleCanvas('DOCUMENT SCAN', '#1e293b', '#38bdf8', 'Receipt / Invoice Document\nTotal: $148.50\nDate: 2026-08-07');
    const sample2 = createSampleCanvas('PHOTO PAGE 2', '#312e81', '#a5b4fc', 'HD Photo Sample Page\nLandscape View');
    const sample3 = createSampleCanvas('CERTIFICATE', '#064e3b', '#6ee7b7', 'Certificate of Completion\nPrivacy Verified 100%');

    const samples = [
      { name: 'sample_document.png', src: sample1 },
      { name: 'sample_photo.png', src: sample2 },
      { name: 'sample_certificate.png', src: sample3 }
    ];

    for (const s of samples) {
      const thumb = await PhotoEditor.createThumbnail(s.src);
      appState.photos.push({
        id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        originalSrc: s.src,
        thumbnailSrc: thumb,
        filename: s.name,
        rotation: 0,
        filter: 'none',
        brightness: 0,
        contrast: 0,
        crop: null
      });
    }

    renderGrid();
    showToast('3 Sample photos added!', 'success');
  });
}

function createSampleCanvas(title, bgHex, textHex, subtitle) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1600;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Decorative border
  ctx.strokeStyle = textHex;
  ctx.lineWidth = 20;
  ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

  // Title
  ctx.fillStyle = textHex;
  ctx.font = 'bold 70px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, canvas.width / 2, 400);

  // Lines
  ctx.font = '36px sans-serif';
  ctx.fillStyle = '#ffffff';
  const lines = subtitle.split('\n');
  lines.forEach((l, idx) => {
    ctx.fillText(l, canvas.width / 2, 600 + idx * 70);
  });

  // Footer stamp
  ctx.fillStyle = textHex;
  ctx.font = '28px sans-serif';
  ctx.fillText('100% CLIENT-SIDE PRIVACY DEMO', canvas.width / 2, 1450);

  return canvas.toDataURL('image/png');
}
