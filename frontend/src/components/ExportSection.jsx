import React, { useState } from 'react';
import { PartyPopper, FileDown, Download, Plus } from 'lucide-react';

export default function ExportSection({
  state,
  dbConnected,
  onSaveToPostgres,
  isSavingToDb,
  onCleanAnotherFile
}) {
  // Generate clean original filename format
  const origName = state.filename || 'data.csv';
  const baseName = origName.includes('.') ? origName.substring(0, origName.lastIndexOf('.')) : origName;
  const downloadUrl = `/download/${state.fileId}/cleaned_${baseName}.csv`;

  return (
    <section id="downloadSection" className="content-section active">
      <div className="success-card glass-card">
        <div className="success-header">
          <div className="success-icon-wrapper">
            <PartyPopper size={32} />
          </div>
          <h2>Cleaning Completed Successfully!</h2>
          <p>Your clean dataset is compiled, validated, and ready to be downloaded.</p>
        </div>
        
        {/* Centered single Download CSV card */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 24px 0' }}>
          <div className="export-option-card glass-card" style={{ maxWidth: '420px', width: '100%' }}>
            <FileDown className="export-icon blue-glow" />
            <h3>Download Clean CSV</h3>
            <p>Save the fully cleaned dataset directly to your local computer as a standard CSV format.</p>
            <a 
              href={downloadUrl} 
              className="btn btn-primary btn-block btn-lg" 
              id="downloadCleanedCsvBtn"
            >
              <Download size={18} /> Download Clean CSV
            </a>
          </div>
        </div>
        
        <div className="success-footer">
          <button className="btn btn-secondary" id="cleanAnotherFileBtn" onClick={onCleanAnotherFile}>
            <Plus size={16} /> Clean Another File
          </button>
        </div>
      </div>
    </section>
  );
}
