import React from 'react';
import { Play, Database, FileText, CheckCircle2, Server, History, RefreshCw, Loader2 } from 'lucide-react';

export default function OverviewSection({
  stats,
  recentHistory,
  dbConnected,
  isLoadingHistory,
  onRefreshHistory,
  onStartCleaning
}) {
  return (
    <section id="overviewSection" className="content-section active">
      <div className="welcome-card glass-card">
        <div className="welcome-text">
          <h2>Welcome to Clean Data</h2>
          <p>Upload raw CSV or Excel datasets, execute advanced Pandas-powered cleaning rules in one click, preview your results instantly, and export directly back to your local PostgreSQL database.</p>
          <button className="btn btn-primary start-cleaning-btn" onClick={onStartCleaning}>
            <Play size={16} /> Start Cleaning
          </button>
        </div>
        <div className="welcome-illustration">
          <Database className="ill-icon" />
        </div>
      </div>
      
      {/* Overview Metrics */}
      <div className="metrics-grid">
        <div className="metric-card glass-card">
          <div className="metric-icon-box blue-glow">
            <FileText size={24} />
          </div>
          <div className="metric-info">
            <h3>Total Uploaded</h3>
            <span className="metric-value" id="statTotalUploaded">{stats.totalUploaded}</span>
            <p className="metric-sub">Files stored in uploads/</p>
          </div>
        </div>
        <div className="metric-card glass-card">
          <div className="metric-icon-box purple-glow">
            <CheckCircle2 size={24} />
          </div>
          <div className="metric-info">
            <h3>Total Cleaned</h3>
            <span className="metric-value" id="statTotalCleaned">{stats.totalCleaned}</span>
            <p className="metric-sub">Cleaned datasets ready</p>
          </div>
        </div>
        <div className="metric-card glass-card">
          <div className={`metric-icon-box ${dbConnected ? 'green-glow' : 'red-glow'}`} id="dbStatIconBox">
            <Server size={24} />
          </div>
          <div className="metric-info">
            <h3>Database Status</h3>
            <span className="metric-value" id="statDbConnected">
              {dbConnected ? 'Connected' : 'Disconnected'}
            </span>
            <p className="metric-sub" id="statDbSub">PostgreSQL public schema</p>
          </div>
        </div>
      </div>
      
      {/* Recent Files History */}
      <div className="history-table-container glass-card">
        <div className="card-header">
          <h3 class="card-title"><History size={18} /> Recently Processed Datasets</h3>
          <button 
            className="btn btn-sm btn-secondary refresh-history-btn" 
            id="refreshHistoryBtn"
            onClick={onRefreshHistory}
            disabled={isLoadingHistory}
          >
            <RefreshCw size={14} className={isLoadingHistory ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
        <div className="table-responsive">
          <table className="recent-table" id="recentFilesTable">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Original Rows</th>
                <th>Cleaned Rows</th>
                <th>Processing Time</th>
                <th>Processed Date</th>
              </tr>
            </thead>
            <tbody id="recentFilesBody">
              {isLoadingHistory ? (
                <tr>
                  <td colSpan="5" className="loading-placeholder">
                    <Loader2 size={16} className="animate-spin" /> Fetching history...
                  </td>
                </tr>
              ) : recentHistory.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                    No recently processed files found. Click "Start Cleaning" to process a file!
                  </td>
                </tr>
              ) : (
                recentHistory.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                        <FileText size={16} style={{ color: 'var(--accent-blue)' }} />
                        {item.filename}
                      </div>
                    </td>
                    <td>{item.original_rows}</td>
                    <td>{item.cleaned_rows}</td>
                    <td>{item.processing_time ? `${item.processing_time.toFixed(4)}s` : '0.00s'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{item.created_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
