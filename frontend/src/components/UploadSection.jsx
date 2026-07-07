import React, { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, Trash2, Sliders, Wand2, Loader2, FileSearch } from 'lucide-react';

export default function UploadSection({
  state,
  onUploadFile,
  onCancelUpload,
  onCleanDataset,
  isCleaning
}) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Initial options matching templates/index.html checked attributes
  const [options, setOptions] = useState({
    remove_duplicates: true,
    remove_empty_rows: true,
    remove_null_values: false,
    remove_duplicate_cols: true,
    remove_empty_cols: true,
    lowercase_cols: true,
    underscore_cols: true,
    clean_col_names: false,
    trim_spaces: true,
    fill_missing: true,
    detect_types: true,
    convert_dates: true,
    handle_outliers: false,
    standardize_text: false,
    remove_special_char: false
  });

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setOptions(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFile(e.target.files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onCleanDataset(options);
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const rowOps = [
    { id: 'remove_duplicates', label: 'Remove Duplicate Rows', desc: 'Drops rows with identical data across all columns' },
    { id: 'remove_empty_rows', label: 'Remove Empty Rows', desc: 'Drops rows where every cell is null or empty' },
    { id: 'remove_null_values', label: 'Remove Null Values', desc: 'Aggressive: drops rows containing any null cell' },
  ];

  const colOps = [
    { id: 'remove_duplicate_cols', label: 'Remove Duplicate Columns', desc: 'Removes columns with matching titles (keeps first)' },
    { id: 'remove_empty_cols', label: 'Remove Empty Columns', desc: 'Removes columns where every single cell is null' },
    { id: 'lowercase_cols', label: 'Convert Columns to Lowercase', desc: 'Replaces column header case to lowercase' },
    { id: 'underscore_cols', label: 'Replace Spaces with Underscores', desc: 'Formats column headers: converts space to _' },
    { id: 'clean_col_names', label: 'Remove Column Special Characters', desc: 'Filters column names to only alphanumeric and _' },
  ];

  const integrityOps = [
    { id: 'trim_spaces', label: 'Trim Extra Spaces', desc: 'Strips outer space and drops double inner space' },
    { id: 'fill_missing', label: 'Fill Missing Values', desc: 'Fills NaNs: numeric with median, text with mode' },
    { id: 'detect_types', label: 'Detect & Optimize Types', desc: 'Parses numeric strings and downcasts memory size' },
    { id: 'convert_dates', label: 'Convert Date Columns', desc: 'Autodetects and formats dates to YYYY-MM-DD' },
    { id: 'handle_outliers', label: 'Handle Outliers', desc: 'Caps extreme values inside [Q1-1.5IQR, Q3+1.5IQR]' },
    { id: 'standardize_text', label: 'Standardize Text formatting', desc: 'Standardizes text columns to Title Case' },
    { id: 'remove_special_char', label: 'Remove Special Characters', desc: 'Removes symbols from text columns' },
  ];

  return (
    <section id="uploadSection" className="content-section active">
      {/* File Drag & Drop Panel */}
      <div 
        className={`upload-container glass-card ${isDragOver ? 'dragover' : ''}`} 
        id="dropzoneContainer"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {!state.filename && !state.uploadProgress ? (
          <div className="drag-drop-area" id="dragDropArea">
            <input 
              type="file" 
              id="fileInput" 
              accept=".csv, .xls, .xlsx" 
              className="hidden-file-input"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <UploadCloud className="upload-icon" />
            <h3>Drag & Drop your dataset here</h3>
            <p className="upload-sub">Supports CSV, XLS, and XLSX files up to 16MB</p>
            <button className="btn btn-secondary browse-btn" id="browseBtn" onClick={handleBrowseClick}>
              <FileSearch size={16} /> Browse Files
            </button>
          </div>
        ) : (
          /* File Upload Info & Progress */
          <div className="upload-progress-card" id="uploadProgressCard">
            <div className="file-details">
              <FileSpreadsheet className="file-icon" />
              <div className="file-info-text">
                <h4 className="filename" id="selectedFilename">{state.filename || 'Uploading file...'}</h4>
                <span className="filesize" id="selectedFilesize">
                  {state.filesize ? formatSize(state.filesize) : 'Calculating size...'}
                </span>
              </div>
              <button 
                className="btn-icon btn-cancel" 
                id="cancelUploadBtn" 
                title="Cancel upload"
                onClick={onCancelUpload}
                disabled={isCleaning}
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="progress-bar-container">
              <div 
                className={`progress-bar ${state.uploadProgress === 100 ? 'bg-success' : ''}`}
                id="progressBar" 
                style={{ width: `${state.uploadProgress || 0}%` }}
              ></div>
            </div>
            <div className="progress-meta">
              <span className="progress-percentage" id="progressPercentage">{state.uploadProgress || 0}%</span>
              <span className="progress-status" id="progressStatus">{state.uploadStatus}</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Cleaning Configuration Panel */}
      {state.fileId && (
        <div className="cleaning-panel glass-card" id="cleaningPanel">
          <div className="panel-header">
            <h3><Sliders size={20} /> Cleaning Configuration</h3>
            <p className="panel-desc">Select the operations you want to execute on your DataFrame</p>
          </div>
          
          <form id="cleaningOptionsForm" onSubmit={handleSubmit}>
            <div className="cleaning-options-grid">
              
              {/* Group 1: General & Row Operations */}
              <div className="option-group">
                <h4>Row Operations</h4>
                {rowOps.map((op) => (
                  <label key={op.id} className="option-checkbox">
                    <input 
                      type="checkbox" 
                      name={op.id} 
                      checked={options[op.id]}
                      onChange={handleCheckboxChange}
                      disabled={isCleaning}
                    />
                    <span className="custom-chk"></span>
                    <span className="chk-label-box">
                      <span className="chk-title">{op.label}</span>
                      <span className="chk-desc">{op.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
              
              {/* Group 2: Column Operations */}
              <div className="option-group">
                <h4>Column Operations</h4>
                {colOps.map((op) => (
                  <label key={op.id} className="option-checkbox">
                    <input 
                      type="checkbox" 
                      name={op.id} 
                      checked={options[op.id]}
                      onChange={handleCheckboxChange}
                      disabled={isCleaning}
                    />
                    <span className="custom-chk"></span>
                    <span className="chk-label-box">
                      <span className="chk-title">{op.label}</span>
                      <span className="chk-desc">{op.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
              
              {/* Group 3: Data Integrity & Typing */}
              <div className="option-group">
                <h4>Data Integrity & Formatting</h4>
                {integrityOps.map((op) => (
                  <label key={op.id} className="option-checkbox">
                    <input 
                      type="checkbox" 
                      name={op.id} 
                      checked={options[op.id]}
                      onChange={handleCheckboxChange}
                      disabled={isCleaning}
                    />
                    <span className="custom-chk"></span>
                    <span className="chk-label-box">
                      <span className="chk-title">{op.label}</span>
                      <span className="chk-desc">{op.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
              
            </div>
            
            {/* Action button */}
            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-primary btn-lg" 
                id="startCleaningBtn"
                disabled={isCleaning}
              >
                {!isCleaning ? (
                  <span id="btnText"><Wand2 size={18} /> Clean Dataset</span>
                ) : (
                  <span id="btnSpinner"><Loader2 size={18} className="animate-spin" /> Processing...</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
