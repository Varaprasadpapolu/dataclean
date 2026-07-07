import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Loader2, X } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OverviewSection from './components/OverviewSection';
import UploadSection from './components/UploadSection';
import PreviewSection from './components/PreviewSection';
import ExportSection from './components/ExportSection';

export default function App() {
  // Navigation & UI States
  const [activeSection, setActiveSection] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [toasts, setToasts] = useState([]);

  // API & Data States
  const [dbConnected, setDbConnected] = useState(false);
  const [stats, setStats] = useState({ totalUploaded: 0, totalCleaned: 0 });
  const [recentHistory, setRecentHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // File Upload States
  const [fileId, setFileId] = useState(null);
  const [filename, setFilename] = useState(null);
  const [filesize, setFilesize] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const uploadXhrRef = useRef(null);

  // Cleaning States
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleaningSummary, setCleaningSummary] = useState({});
  const [removedRows, setRemovedRows] = useState([]);

  // Preview States
  const [previewData, setPreviewData] = useState({ columns: [], data: [] });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [isSavingToDb, setIsSavingToDb] = useState(false);

  // 1. Toast Notification Helper
  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 2. Manage Theme
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (nextTheme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  };

  // 3. Fetch Overview Status
  const fetchStatus = () => {
    setIsLoadingHistory(true);
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          showToast(data.error, 'error');
        } else {
          setDbConnected(data.db_connected);
          setStats({
            totalUploaded: data.total_uploaded,
            totalCleaned: data.total_cleaned,
          });
          setRecentHistory(data.recent_history || []);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch status:', err);
        showToast('Could not fetch server status.', 'error');
      })
      .finally(() => {
        setIsLoadingHistory(false);
      });
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // 4. Debounce Search Input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [search]);

  // 5. Fetch Table Preview
  const fetchPreview = () => {
    if (!fileId) return;

    let url = `/api/preview?file_id=${fileId}&page=${currentPage}&limit=15`;
    if (debouncedSearch) {
      url += `&search=${encodeURIComponent(debouncedSearch)}`;
    }
    if (sortCol) {
      url += `&sort_col=${encodeURIComponent(sortCol)}&sort_dir=${sortDir}`;
    }

    fetch(url)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to load preview');
        }
        return res.json();
      })
      .then((data) => {
        setPreviewData({
          columns: data.columns || [],
          data: data.data || [],
        });
        setTotalPages(data.total_pages || 1);
        setTotalRecords(data.total_records || 0);
      })
      .catch((err) => {
        console.error('Error fetching preview data:', err);
        showToast('Error loading data preview.', 'error');
      });
  };

  // Re-fetch preview when pagination/sorting/search changes
  useEffect(() => {
    if (fileId && activeSection === 'preview') {
      fetchPreview();
    }
  }, [fileId, currentPage, debouncedSearch, sortCol, sortDir, activeSection]);

  // Reset pagination on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // 6. File Upload Handlers
  const handleUploadFile = (file) => {
    if (!file) return;

    // Reset previous upload state
    handleCancelUpload();

    setFilename(file.name);
    setFilesize(file.size);
    setUploadProgress(0);
    setUploadStatus('Initializing upload...');

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    uploadXhrRef.current = xhr;

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(percent);
        if (percent === 100) {
          setUploadStatus('Analyzing headers & structures...');
        } else {
          setUploadStatus(`Uploading...`);
        }
      }
    });

    // Complete listener
    xhr.addEventListener('load', () => {
      uploadXhrRef.current = null;
      if (xhr.status === 201) {
        try {
          const response = JSON.parse(xhr.responseText);
          setFileId(response.file_id);
          showToast('File uploaded and verified successfully!', 'success');
          setUploadStatus('Upload completed');
        } catch (e) {
          showToast('Failed to parse upload response.', 'error');
          resetUploadState();
        }
      } else {
        let errMsg = 'Upload failed';
        try {
          const response = JSON.parse(xhr.responseText);
          errMsg = response.error || errMsg;
        } catch (e) {}
        showToast(errMsg, 'error');
        resetUploadState();
      }
    });

    // Error listener
    xhr.addEventListener('error', () => {
      uploadXhrRef.current = null;
      showToast('Network error during file upload.', 'error');
      resetUploadState();
    });

    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  };

  const handleCancelUpload = () => {
    if (uploadXhrRef.current) {
      uploadXhrRef.current.abort();
      uploadXhrRef.current = null;
    }
    resetUploadState();
    showToast('Upload cancelled.', 'info');
  };

  const resetUploadState = () => {
    setFileId(null);
    setFilename(null);
    setFilesize(null);
    setUploadProgress(null);
    setUploadStatus('');
  };

  // 7. Cleaning Handlers
  const handleCleanDataset = (options) => {
    if (!fileId) return;

    setIsCleaning(true);
    showToast('Executing data cleaning pipeline...', 'info');

    fetch('/api/clean', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_id: fileId,
        options: options,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((d) => {
            throw new Error(d.error || 'Cleaning error');
          });
        }
        return res.json();
      })
      .then((data) => {
        showToast('Data cleaned successfully! Preview is ready.', 'success');
        setCleaningSummary(data.summary || {});
        setRemovedRows(data.removed_rows || []);
        
        // Reset preview states
        setCurrentPage(1);
        setSearch('');
        setSortCol(null);
        setSortDir('asc');
        setPreviewData(data.preview || { columns: [], data: [] });
        setTotalPages(data.preview?.total_pages || 1);
        setTotalRecords(data.preview?.total_records || 0);

        // Success sound/confetti
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });

        // Switch to preview section
        setActiveSection('preview');
      })
      .catch((err) => {
        console.error('Cleaning failed:', err);
        showToast(err.message || 'Data cleaning execution failed.', 'error');
      })
      .finally(() => {
        setIsCleaning(false);
      });
  };

  // 8. Sorting Handler
  const handleSort = (colName) => {
    if (sortCol === colName) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(colName);
      setSortDir('asc');
    }
  };

  // 9. Database Persist Handler
  const handleSaveToPostgres = (tableName) => {
    if (!fileId || !tableName) return;

    setIsSavingToDb(true);
    showToast('Saving cleaned data to PostgreSQL...', 'info');

    fetch('/api/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_id: fileId,
        table_name: tableName,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((d) => {
            throw new Error(d.error || 'Database save error');
          });
        }
        return res.json();
      })
      .then((data) => {
        showToast(`Saved ${data.rows_saved} rows to table '${data.table_name}'!`, 'success');
        
        // Full screen victory confetti!
        const duration = 2.5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

        function randomInRange(min, max) {
          return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function() {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);
          confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
          confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);

        // Fetch new metrics count & history
        fetchStatus();
        
        // Redirect to overview
        setActiveSection('overview');
      })
      .catch((err) => {
        console.error('Save to DB failed:', err);
        showToast(err.message || 'Failed to save to PostgreSQL.', 'error');
      })
      .finally(() => {
        setIsSavingToDb(false);
      });
  };

  const handleCleanAnotherFile = () => {
    resetUploadState();
    setCleaningSummary({});
    setRemovedRows([]);
    setPreviewData({ columns: [], data: [] });
    setActiveSection('upload');
  };

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        dbConnected={dbConnected}
        hasCleanedData={!!cleaningSummary.final_rows}
      />
      
      {/* Main Content Wrapper */}
      <div className="main-wrapper">
        <Header
          activeSection={activeSection}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          theme={theme}
          toggleTheme={toggleTheme}
        />
        
        {/* Dynamic Section Renderer */}
        <main className="main-content" id="mainContent">
          {activeSection === 'overview' && (
            <OverviewSection
              stats={stats}
              recentHistory={recentHistory}
              dbConnected={dbConnected}
              isLoadingHistory={isLoadingHistory}
              onRefreshHistory={fetchStatus}
              onStartCleaning={() => setActiveSection('upload')}
            />
          )}

          {activeSection === 'upload' && (
            <UploadSection
              state={{ fileId, filename, filesize, uploadProgress, uploadStatus }}
              onUploadFile={handleUploadFile}
              onCancelUpload={handleCancelUpload}
              onCleanDataset={handleCleanDataset}
              isCleaning={isCleaning}
            />
          )}

          {activeSection === 'preview' && (
            <PreviewSection
              summary={cleaningSummary}
              removedRows={removedRows}
              previewData={previewData}
              search={search}
              setSearch={setSearch}
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={totalRecords}
              sortCol={sortCol}
              sortDir={sortDir}
              onSort={handleSort}
              onPageChange={setCurrentPage}
              onProceedToExport={() => setActiveSection('download')}
            />
          )}

          {activeSection === 'download' && (
            <ExportSection
              state={{ fileId, filename }}
              dbConnected={dbConnected}
              onSaveToPostgres={handleSaveToPostgres}
              isSavingToDb={isSavingToDb}
              onCleanAnotherFile={handleCleanAnotherFile}
            />
          )}
        </main>
      </div>

      {/* Toast Notification overlay */}
      <div className="toast-container" id="toastContainer">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <div className="toast-content">
              {toast.message}
            </div>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
