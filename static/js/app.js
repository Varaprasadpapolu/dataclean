/**
 * Clean Data - Dashboard JS controller
 * Manages UI interactions, file uploads, AJAX requests, and data preview.
 */

// Global App State
const state = {
    fileId: null,
    filename: null,
    columns: [],
    dbConnected: false,
    uploadXhr: null, // Track XHR for cancelling
    table: {
        page: 1,
        limit: 15,
        search: '',
        sortCol: null,
        sortDir: 'asc',
        totalPages: 1
    }
};

// DOM Elements
const elements = {
    // Navigation
    menuItems: document.querySelectorAll('.menu-item'),
    sections: document.querySelectorAll('.content-section'),
    pageTitle: document.getElementById('pageTitle'),
    mobileToggleBtn: document.getElementById('mobileToggleBtn'),
    mobileCloseBtn: document.getElementById('mobileCloseBtn'),
    sidebar: document.getElementById('sidebar'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeIconSun: document.getElementById('themeIconSun'),
    themeIconMoon: document.getElementById('themeIconMoon'),
    
    // Status Bar & Overview
    dbStatusDot: document.getElementById('dbStatusDot'),
    dbStatusText: document.getElementById('dbStatusText'),
    statTotalUploaded: document.getElementById('statTotalUploaded'),
    statTotalCleaned: document.getElementById('statTotalCleaned'),
    statDbConnected: document.getElementById('statDbConnected'),
    statDbSub: document.getElementById('statDbSub'),
    dbStatIconBox: document.getElementById('dbStatIconBox'),
    recentFilesBody: document.getElementById('recentFilesBody'),
    refreshHistoryBtn: document.getElementById('refreshHistoryBtn'),
    startCleaningBtn: document.querySelector('.start-cleaning-btn'),
    
    // File Upload
    dropzoneContainer: document.getElementById('dropzoneContainer'),
    dragDropArea: document.getElementById('dragDropArea'),
    fileInput: document.getElementById('fileInput'),
    browseBtn: document.getElementById('browseBtn'),
    uploadProgressCard: document.getElementById('uploadProgressCard'),
    selectedFilename: document.getElementById('selectedFilename'),
    selectedFilesize: document.getElementById('selectedFilesize'),
    progressBar: document.getElementById('progressBar'),
    progressPercentage: document.getElementById('progressPercentage'),
    progressStatus: document.getElementById('progressStatus'),
    cancelUploadBtn: document.getElementById('cancelUploadBtn'),
    
    // Cleaning configuration
    cleaningPanel: document.getElementById('cleaningPanel'),
    cleaningForm: document.getElementById('cleaningOptionsForm'),
    btnText: document.getElementById('btnText'),
    btnSpinner: document.getElementById('btnSpinner'),
    navPreviewBtn: document.getElementById('navPreviewBtn'),
    navDownloadBtn: document.getElementById('navDownloadBtn'),
    
    // Cleaning Summary
    sumOrigRows: document.getElementById('sumOrigRows'),
    sumFinalRows: document.getElementById('sumFinalRows'),
    sumOrigCols: document.getElementById('sumOrigCols'),
    sumFinalCols: document.getElementById('sumFinalCols'),
    sumDupRemoved: document.getElementById('sumDupRemoved'),
    sumNullRemoved: document.getElementById('sumNullRemoved'),
    sumMissingFilled: document.getElementById('sumMissingFilled'),
    sumProcTime: document.getElementById('sumProcTime'),
    proceedToExportBtn: document.getElementById('proceedToExportBtn'),
    
    // Preview Table
    tableSearchInput: document.getElementById('tableSearchInput'),
    recordCountText: document.getElementById('recordCountText'),
    previewTableHead: document.getElementById('previewTableHead'),
    previewTableBody: document.getElementById('previewTableBody'),
    prevPageBtn: document.getElementById('prevPageBtn'),
    nextPageBtn: document.getElementById('nextPageBtn'),
    currentPageNum: document.getElementById('currentPageNum'),
    totalPagesNum: document.getElementById('totalPagesNum'),
    
    // Export & Database
    downloadCleanedCsvBtn: document.getElementById('downloadCleanedCsvBtn'),
    dbSaveFormGroup: document.getElementById('dbSaveFormGroup'),
    dbDisabledMsg: document.getElementById('dbDisabledMsg'),
    dbTableNameInput: document.getElementById('dbTableNameInput'),
    saveToPostgresBtn: document.getElementById('saveToPostgresBtn'),
    saveBtnText: document.getElementById('saveBtnText'),
    saveBtnSpinner: document.getElementById('saveBtnSpinner'),
    cleanAnotherFileBtn: document.getElementById('cleanAnotherFileBtn'),
    toastContainer: document.getElementById('toastContainer')
};

/* ==========================================================================
   Initialization
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial State Fetch
    fetchStatus();
    
    // 2. Setup Event Listeners
    setupNavigation();
    setupThemeToggle();
    setupUploadHandlers();
    setupCleaningHandlers();
    setupPreviewTableHandlers();
    setupExportHandlers();
    
    // Initialize lucide icons
    lucide.createIcons();
});

/* ==========================================================================
   Navigation Logic
   ========================================================================== */
function setupNavigation() {
    // Section switching
    elements.menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            if (item.classList.contains('disabled')) return;
            
            const targetSection = item.getAttribute('data-section');
            switchSection(targetSection);
        });
    });
    
    // Start cleaning button in overview welcome card
    if (elements.startCleaningBtn) {
        elements.startCleaningBtn.addEventListener('click', () => {
            switchSection('upload-section');
        });
    }

    // Mobile sidebar toggle
    elements.mobileToggleBtn.addEventListener('click', () => {
        elements.sidebar.classList.add('open');
    });
    
    elements.mobileCloseBtn.addEventListener('click', () => {
        elements.sidebar.classList.remove('open');
    });
    
    // Refresh history
    elements.refreshHistoryBtn.addEventListener('click', fetchStatus);
}

function switchSection(sectionId) {
    // Update menu items active class
    elements.menuItems.forEach(item => {
        if (item.getAttribute('data-section') === sectionId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Hide all sections and display target
    elements.sections.forEach(sec => {
        if (sec.id === sectionId || 
            (sec.id === 'overviewSection' && sectionId === 'overview') || 
            (sec.id === 'uploadSection' && sectionId === 'upload-section') || 
            (sec.id === 'previewSection' && sectionId === 'preview-section') || 
            (sec.id === 'downloadSection' && sectionId === 'download-section')) {
            sec.classList.add('active');
        } else {
            sec.classList.remove('active');
        }
    });
    
    // Update Page Header Title
    let title = 'Dashboard Overview';
    if (sectionId === 'upload-section') title = 'Upload & Clean Dataset';
    if (sectionId === 'preview-section') title = 'Cleaned Data Preview';
    if (sectionId === 'download-section') title = 'Export & Save Data';
    elements.pageTitle.innerText = title;
    
    // Close mobile menu if open
    elements.sidebar.classList.remove('open');
    
    // Scroll content container back to top
    document.getElementById('mainContent').scrollTop = 0;
}

/* ==========================================================================
   Theme Management
   ========================================================================== */
function setupThemeToggle() {
    // Check local storage for preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        elements.themeIconSun.classList.add('hidden');
        elements.themeIconMoon.classList.remove('hidden');
    }
    
    elements.themeToggleBtn.addEventListener('click', () => {
        if (document.body.classList.contains('dark-theme')) {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            elements.themeIconSun.classList.add('hidden');
            elements.themeIconMoon.classList.remove('hidden');
            localStorage.setItem('theme', 'light');
        } else {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            elements.themeIconMoon.classList.add('hidden');
            elements.themeIconSun.classList.remove('hidden');
            localStorage.setItem('theme', 'dark');
        }
    });
}

/* ==========================================================================
   Status Polling & API fetch
   ========================================================================== */
function fetchStatus() {
    fetch('/api/status')
        .then(res => res.json())
        .then(data => {
            // Update db connectivity
            state.dbConnected = data.db_connected;
            
            // Sidebar DB Badge
            if (data.db_connected) {
                elements.dbStatusDot.classList.add('connected');
                elements.dbStatusText.innerText = "PostgreSQL: Connected";
                
                // Welcome card DB Badge
                elements.statDbConnected.innerText = "Connected";
                elements.statDbSub.innerText = "Database is ready for tables persistence";
                elements.dbStatIconBox.className = "metric-icon-box green-glow";
                
                // Save form enablement
                elements.dbSaveFormGroup.classList.remove('hidden');
                elements.dbDisabledMsg.classList.add('hidden');
            } else {
                elements.dbStatusDot.classList.remove('connected');
                elements.dbStatusText.innerText = "PostgreSQL: Disconnected";
                
                elements.statDbConnected.innerText = "Offline";
                elements.statDbSub.innerText = "Table persistence disabled (Check port 5432)";
                elements.dbStatIconBox.className = "metric-icon-box red-glow";
                
                elements.dbSaveFormGroup.classList.add('hidden');
                elements.dbDisabledMsg.classList.remove('hidden');
            }
            
            // Update card counters
            elements.statTotalUploaded.innerText = data.total_uploaded || 0;
            elements.statTotalCleaned.innerText = data.total_cleaned || 0;
            
            // Build recent history records table
            renderHistoryTable(data.recent_history || []);
        })
        .catch(err => {
            console.error('Error fetching dashboard status:', err);
            showToast('Unable to reach server. Please check backend connection.', 'error');
        });
}

function renderHistoryTable(history) {
    if (history.length === 0) {
        elements.recentFilesBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-table" style="padding: 20px !important;">
                    <i data-lucide="info" style="vertical-align: middle; margin-right: 6px; width:16px; height:16px;"></i>
                    No datasets cleaned yet. Run your first file upload to start!
                </td>
            </tr>
        `;
        lucide.createIcons();
        return;
    }
    
    let html = '';
    history.forEach(item => {
        html += `
            <tr>
                <td style="font-weight: 500;"><i data-lucide="file-spreadsheet" style="width: 16px; height: 16px; margin-right:8px; vertical-align:middle; color:#3b82f6;"></i>${item.filename}</td>
                <td style="font-family: var(--font-mono);">${item.original_rows.toLocaleString()}</td>
                <td style="font-family: var(--font-mono); font-weight: 600; color:#10b981;">${item.cleaned_rows.toLocaleString()}</td>
                <td style="font-family: var(--font-mono);">${item.processing_time}s</td>
                <td>${item.created_at}</td>
            </tr>
        `;
    });
    elements.recentFilesBody.innerHTML = html;
    lucide.createIcons();
}

/* ==========================================================================
   File Drag & Drop / Upload Progress Logic
   ========================================================================== */
function setupUploadHandlers() {
    // Browse File Button triggers file input click
    elements.browseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        elements.fileInput.click();
    });
    
    // File input changes
    elements.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFileSelected(file);
    });
    
    // Drag and Drop event bindings
    const dropzone = elements.dragDropArea;
    
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
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelected(file);
    });
    
    // Cancel upload button
    elements.cancelUploadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (state.uploadXhr) {
            state.uploadXhr.abort();
            state.uploadXhr = null;
        }
        resetUploadState();
        showToast('File upload cancelled.', 'info');
    });
}

function handleFileSelected(file) {
    // 1. Validate file extension
    const allowedExts = ['csv', 'xls', 'xlsx'];
    const filename = file.name;
    const ext = filename.split('.').pop().toLowerCase();
    
    if (!allowedExts.includes(ext)) {
        showToast(`Unsupported file format. Supported types: ${allowedExts.join(', ').toUpperCase()}`, 'error');
        return;
    }
    
    // 2. Validate file size (16MB max)
    const maxSizeBytes = 16 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        showToast(`File size exceeds the 16MB limit. Choose a smaller file.`, 'error');
        return;
    }
    
    // Hide drag/drop zone area, show upload details
    elements.dragDropArea.classList.add('hidden');
    elements.uploadProgressCard.classList.remove('hidden');
    elements.selectedFilename.innerText = file.name;
    elements.selectedFilesize.innerText = formatSize(file.size);
    
    // Start AJAX upload via XMLHttpRequest (supports upload progress listener)
    uploadFileAjax(file);
}

function uploadFileAjax(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const xhr = new XMLHttpRequest();
    state.uploadXhr = xhr;
    
    // Progress Listener
    xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            elements.progressBar.style.width = percent + '%';
            elements.progressPercentage.innerText = percent + '%';
            
            if (percent === 100) {
                elements.progressStatus.innerText = 'Analyzing headers & structures...';
            } else {
                elements.progressStatus.innerText = `Uploading... (${formatSize(e.loaded)} / ${formatSize(e.total)})`;
            }
        }
    });
    
    // Complete Listener
    xhr.addEventListener('load', () => {
        state.uploadXhr = null;
        if (xhr.status === 201) {
            const response = JSON.parse(xhr.responseText);
            state.fileId = response.file_id;
            state.filename = response.filename;
            
            showToast('File uploaded and verified successfully!', 'success');
            elements.progressStatus.innerText = 'Upload completed';
            elements.progressBar.className = 'progress-bar bg-success';
            
            // Display cleaning options panel
            elements.cleaningPanel.classList.remove('hidden');
            
            // Prefill database table name with safe name based on filename
            const cleanName = filenameToTableName(response.filename);
            elements.dbTableNameInput.value = cleanName;
            
        } else {
            let errMsg = 'Upload failed';
            try {
                const response = JSON.parse(xhr.responseText);
                errMsg = response.error || errMsg;
            } catch(e) {}
            showToast(errMsg, 'error');
            resetUploadState();
        }
    });
    
    // Error Listener
    xhr.addEventListener('error', () => {
        state.uploadXhr = null;
        showToast('Network error during file upload.', 'error');
        resetUploadState();
    });
    
    xhr.open('POST', '/api/upload');
    xhr.send(formData);
}

function resetUploadState() {
    state.fileId = null;
    state.filename = null;
    elements.fileInput.value = '';
    
    elements.progressBar.style.width = '0%';
    elements.progressBar.className = 'progress-bar';
    elements.progressPercentage.innerText = '0%';
    elements.progressStatus.innerText = 'Uploading...';
    
    elements.uploadProgressCard.classList.add('hidden');
    elements.cleaningPanel.classList.add('hidden');
    elements.dragDropArea.classList.remove('hidden');
    
    elements.downloadCleanedCsvBtn.href = '#';
    elements.downloadCleanedCsvBtn.removeAttribute('download');
    elements.downloadCleanedCsvBtn.classList.add('disabled');
    elements.downloadCleanedCsvBtn.style.pointerEvents = 'none';
    elements.downloadCleanedCsvBtn.style.opacity = '0.6';
}

/* ==========================================================================
   Cleaning Configuration
   ========================================================================== */
function setupCleaningHandlers() {
    elements.cleaningForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!state.fileId) {
            showToast('No uploaded file detected. Please upload first.', 'error');
            return;
        }
        
        // 1. Gather checkbox selections
        const formData = new FormData(elements.cleaningForm);
        const options = {};
        
        // Form data contains only checked values. We explicitly map active selections to true
        // and missing fields to false
        const checkboxes = elements.cleaningForm.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(chk => {
            options[chk.name] = chk.checked;
        });
        
        // Show spinner
        elements.btnText.classList.add('hidden');
        elements.btnSpinner.classList.remove('hidden');
        elements.startCleaningBtn.disabled = true;
        
        // 2. Fetch clean API
        fetch('/api/clean', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_id: state.fileId,
                options: options
            })
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(d => { throw new Error(d.error || 'Cleaning error'); });
            }
            return res.json();
        })
        .then(data => {
            showToast('Data cleaned successfully! Your cleaned CSV file is ready for download.', 'success');
            
            // Populate stats summary
            populateSummary(data.summary);
            
            // Populate removed rows report
            populateRemovedRows(data.removed_rows || []);
            
            // Enable Sidebar Routes
            elements.navPreviewBtn.classList.remove('disabled');
            elements.navDownloadBtn.classList.remove('disabled');
            
            // Generate clean original filename format: cleaned_<original_filename>.csv
            const origName = state.filename || 'data.csv';
            const baseName = origName.includes('.') ? origName.substring(0, origName.lastIndexOf('.')) : origName;
            
            // Set native download link and filename hint
            elements.downloadCleanedCsvBtn.href = `/download/${state.fileId}/cleaned_${baseName}.csv`;
            elements.downloadCleanedCsvBtn.setAttribute('download', `cleaned_${baseName}.csv`);
            
            // Enable download button
            elements.downloadCleanedCsvBtn.classList.remove('disabled');
            elements.downloadCleanedCsvBtn.style.pointerEvents = 'auto';
            elements.downloadCleanedCsvBtn.style.opacity = '1';
            
            // Reset preview table page state
            state.table.page = 1;
            state.table.search = '';
            elements.tableSearchInput.value = '';
            state.table.sortCol = null;
            state.table.sortDir = 'asc';
            
            // Load and render Preview data
            renderPreviewTable(data.preview);
            
            // Transition view to preview section
            setTimeout(() => {
                switchSection('preview-section');
            }, 300);
        })
        .catch(err => {
            console.error('Cleaning failed:', err);
            showToast(err.message || 'Data cleaning execution failed.', 'error');
        })
        .finally(() => {
            // Restore button
            elements.btnSpinner.classList.add('hidden');
            elements.btnText.classList.remove('hidden');
            elements.startCleaningBtn.disabled = false;
        });
    });
    
    // Proceed to download screen btn
    elements.proceedToExportBtn.addEventListener('click', () => {
        switchSection('download-section');
    });
    
    // Copy removed row numbers to clipboard
    document.getElementById('copyRemovedRowsBtn').addEventListener('click', () => {
        const listEl = document.getElementById('removedRowsList');
        const chips = listEl.querySelectorAll('.row-chip');
        if (chips.length === 0) {
            showToast('No removed rows to copy.', 'info');
            return;
        }
        const text = Array.from(chips).map(c => c.textContent.trim()).join(', ');
        navigator.clipboard.writeText(text).then(() => {
            showToast('Removed row numbers copied to clipboard!', 'success');
        }).catch(() => {
            showToast('Copy failed — please copy manually.', 'error');
        });
    });
}

function populateSummary(summary) {
    elements.sumOrigRows.innerText = summary.original_rows.toLocaleString();
    elements.sumFinalRows.innerText = summary.final_rows.toLocaleString();
    elements.sumOrigCols.innerText = summary.original_columns.toLocaleString();
    elements.sumFinalCols.innerText = summary.final_columns.toLocaleString();
    elements.sumDupRemoved.innerText = summary.duplicates_removed.toLocaleString();
    elements.sumNullRemoved.innerText = (summary.null_rows_removed + summary.empty_rows_removed).toLocaleString();
    elements.sumMissingFilled.innerText = summary.missing_values_filled.toLocaleString();
    elements.sumProcTime.innerText = summary.processing_time + 's';
}

/**
 * Render the Removed Rows report card.
 * @param {Array} removedRows - Array of objects: [{row_number, id?}, ...]
 */
function populateRemovedRows(removedRows) {
    const totalCountEl   = document.getElementById('removedTotalCount');
    const emptyEl        = document.getElementById('removedRowsEmpty');
    const bodyEl         = document.getElementById('removedRowsBody');
    const rowListEl      = document.getElementById('removedRowsList');
    const idsSectionEl   = document.getElementById('removedIdsSection');
    const idsListEl      = document.getElementById('removedIdsList');
    const copyBtn        = document.getElementById('copyRemovedRowsBtn');
    
    // Update total badge
    totalCountEl.innerText = removedRows.length.toLocaleString();
    
    if (removedRows.length === 0) {
        // Show empty state
        emptyEl.classList.remove('hidden');
        bodyEl.classList.add('hidden');
        copyBtn.disabled = true;
        copyBtn.style.opacity = '0.5';
        return;
    }
    
    // Show body, hide empty state
    emptyEl.classList.add('hidden');
    bodyEl.classList.remove('hidden');
    copyBtn.disabled = false;
    copyBtn.style.opacity = '1';
    
    // Render row-number chips
    const rowNums = removedRows.map(r => r.row_number);
    rowListEl.innerHTML = rowNums
        .map(n => `<span class="row-chip">${n}</span>`)
        .join('');
    
    // Render ID chips if present
    const hasIds = removedRows.some(r => r.id !== undefined && r.id !== null);
    if (hasIds) {
        idsSectionEl.classList.remove('hidden');
        idsListEl.innerHTML = removedRows
            .filter(r => r.id !== undefined && r.id !== null)
            .map(r => `<span class="row-chip id-chip">${r.id}</span>`)
            .join('');
    } else {
        idsSectionEl.classList.add('hidden');
        idsListEl.innerHTML = '';
    }
}

/* ==========================================================================
   Preview Table Controllers (Pagination, Sort, Search)
   ========================================================================== */
function setupPreviewTableHandlers() {
    // Pagination buttons
    elements.prevPageBtn.addEventListener('click', () => {
        if (state.table.page > 1) {
            state.table.page--;
            fetchPreviewData();
        }
    });
    
    elements.nextPageBtn.addEventListener('click', () => {
        if (state.table.page < state.table.totalPages) {
            state.table.page++;
            fetchPreviewData();
        }
    });
    
    // Debounced Search Keyup Handler (300ms)
    let searchTimeout = null;
    elements.tableSearchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.table.search = e.target.value;
            state.table.page = 1; // Reset to page 1 for search query
            fetchPreviewData();
        }, 300);
    });
}

function fetchPreviewData() {
    if (!state.fileId) return;
    
    let url = `/api/preview?file_id=${state.fileId}&page=${state.table.page}&limit=${state.table.limit}&search=${encodeURIComponent(state.table.search)}`;
    if (state.table.sortCol) {
        url += `&sort_col=${encodeURIComponent(state.table.sortCol)}&sort_dir=${state.table.sortDir}`;
    }
    
    // Render loading indicator inside body
    elements.previewTableBody.innerHTML = `
        <tr>
            <td colspan="${state.columns.length + 1 || 1}" class="loading-placeholder">
                <i data-lucide="loader-2" class="animate-spin" style="width: 20px; height: 20px;"></i> Fetching data records...
            </td>
        </tr>
    `;
    lucide.createIcons();
    
    fetch(url)
        .then(res => res.json())
        .then(data => {
            renderPreviewTable(data);
        })
        .catch(err => {
            console.error('Error fetching preview data:', err);
            showToast('Failed to load table page.', 'error');
        });
}

function renderPreviewTable(preview) {
    if (!preview || !preview.columns || preview.columns.length === 0) {
        elements.previewTableHead.innerHTML = '<tr><th>No columns loaded</th></tr>';
        elements.previewTableBody.innerHTML = '<tr><td class="empty-table">No matching records found.</td></tr>';
        return;
    }
    
    // Store columns list in app state for headers size matching
    state.columns = preview.columns;
    state.table.totalPages = preview.total_pages || 1;
    
    // 1. Render Table Head Headers (with Sort Icons)
    let headHtml = '<tr><th style="width: 60px;">#</th>'; // Row numbering column
    preview.columns.forEach(col => {
        let sortIconHtml = '';
        if (state.table.sortCol === col) {
            sortIconHtml = state.table.sortDir === 'asc' ? '<i data-lucide="chevron-up"></i>' : '<i data-lucide="chevron-down"></i>';
        } else {
            sortIconHtml = '<i data-lucide="chevrons-up-down" style="opacity: 0.25;"></i>';
        }
        headHtml += `<th class="sortable-header" data-column="${col}">${col} ${sortIconHtml}</th>`;
    });
    headHtml += '</tr>';
    elements.previewTableHead.innerHTML = headHtml;
    
    // 2. Render Table Body Rows
    if (!preview.rows || preview.rows.length === 0) {
        elements.previewTableBody.innerHTML = `<tr><td colspan="${preview.columns.length + 1}" class="empty-table">No matching records found.</td></tr>`;
    } else {
        let bodyHtml = '';
        preview.rows.forEach((row, rIdx) => {
            // Row number calculation based on pagination offset
            const rowNum = (preview.page - 1) * preview.limit + rIdx + 1;
            
            bodyHtml += `<tr><td style="color: var(--text-muted); font-weight: 500;">${rowNum}</td>`;
            row.forEach(val => {
                let displayVal = val;
                
                // Format display formatting
                if (val === null || val === undefined) {
                    displayVal = '<span class="cell-null">null</span>';
                } else if (typeof val === 'boolean') {
                    displayVal = val ? '<span class="cell-bool true">TRUE</span>' : '<span class="cell-bool false">FALSE</span>';
                } else if (typeof val === 'number') {
                    // Check if decimal
                    if (val % 1 !== 0) {
                        displayVal = val.toFixed(4); // Keep float decimals neat
                    } else {
                        displayVal = val.toLocaleString();
                    }
                }
                
                bodyHtml += `<td>${displayVal}</td>`;
            });
            bodyHtml += '</tr>';
        });
        elements.previewTableBody.innerHTML = bodyHtml;
    }
    
    // 3. Update Pagination Text & Controls State
    elements.currentPageNum.innerText = preview.page;
    elements.totalPagesNum.innerText = preview.total_pages || 1;
    
    elements.prevPageBtn.disabled = (preview.page <= 1);
    elements.nextPageBtn.disabled = (preview.page >= preview.total_pages);
    
    // Update count labels
    const rangeStart = (preview.page - 1) * preview.limit + 1;
    const rangeEnd = Math.min(preview.page * preview.limit, preview.total_records);
    if (preview.total_records === 0) {
        elements.recordCountText.innerText = "No records found";
    } else {
        elements.recordCountText.innerText = `Showing ${rangeStart.toLocaleString()} - ${rangeEnd.toLocaleString()} of ${preview.total_records.toLocaleString()} records`;
    }
    
    // 4. Bind Column Sorting Clicks
    const headers = elements.previewTableHead.querySelectorAll('.sortable-header');
    headers.forEach(h => {
        h.addEventListener('click', () => {
            const col = h.getAttribute('data-column');
            if (state.table.sortCol === col) {
                // Toggle direction
                state.table.sortDir = state.table.sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                state.table.sortCol = col;
                state.table.sortDir = 'asc';
            }
            state.table.page = 1; // Reset to first page
            fetchPreviewData();
        });
    });
    
    // Render Lucide Icons
    lucide.createIcons();
}


//    Export & Database Integration handlers

function setupExportHandlers() {
    //  Download Clean CSV Button click
    elements.downloadCleanedCsvBtn.addEventListener('click', (e) => {
        if (!state.fileId) {
            e.preventDefault();
            showToast('No clean dataset file available for download.', 'error');
            return;
        }
        
        showToast('Downloading cleaned CSV file...', 'success');
    });
    
    //  Save to PostgreSQL Button click
    elements.saveToPostgresBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const tableName = elements.dbTableNameInput.value.trim();
        
        if (!state.fileId) {
            showToast('No dataset available to save.', 'error');
            return;
        }
        if (!tableName) {
            showToast('Please enter a target table name.', 'error');
            return;
        }
        
        // Show spinner
        elements.saveBtnText.classList.add('hidden');
        elements.saveBtnSpinner.classList.remove('hidden');
        elements.saveToPostgresBtn.disabled = true;
        
        // POST to save endpoint
        fetch('/api/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_id: state.fileId,
                table_name: tableName
            })
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(d => { throw new Error(d.error || 'Database save error'); });
            }
            return res.json();
        })
        .then(data => {
            showToast(`Data saved successfully to PostgreSQL table "${data.table_name}" (${data.rows_saved} rows)!`, 'success');
            fetchStatus(); // Refresh history table & totals
        })
        .catch(err => {
            console.error('Database save error:', err);
            showToast(err.message || 'Failed to save dataset into PostgreSQL.', 'error');
        })
        .finally(() => {
            // Restore button
            elements.saveBtnSpinner.classList.add('hidden');
            elements.saveBtnText.classList.remove('hidden');
            elements.saveToPostgresBtn.disabled = false;
        });
    });
    
    //  Clean Another File / reset state button
    elements.cleanAnotherFileBtn.addEventListener('click', () => {
        // Reset navigation routes
        elements.navPreviewBtn.classList.add('disabled');
        elements.navDownloadBtn.classList.add('disabled');
        
        // Reset file upload zone
        resetUploadState();
        
        // Refresh overview totals
        fetchStatus();
        
        // Move back to upload panel view
        switchSection('upload-section');
    });
}


//    Helper Utilities

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function filenameToTableName(filename) {
    // Convert to lowercase and take basename
    let name = filename.split('.').shift().toLowerCase();
    // Replace non-alphanumeric with underscore
    name = name.replace(/[^a-z0-9_]/g, '_');
    // Ensure doesn't start with digit
    if (/^[0-9]/.test(name)) {
        name = '_' + name;
    }
    // Remove consecutive underscores
    name = name.replace(/_+/g, '_');
    // Trim underscores from ends
    name = name.replace(/^_+|_+$/g, '');
    
    return name || 'cleaned_dataset';
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'alert-triangle';
    
    toast.innerHTML = `
        <i data-lucide="${icon}"></i>
        <span style="flex: 1;">${message}</span>
    `;
    
    elements.toastContainer.appendChild(toast);
    lucide.createIcons();
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}
