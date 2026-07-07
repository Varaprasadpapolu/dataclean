import React, { useState } from 'react';
import { ClipboardList, CheckCircle, Search, ChevronLeft, ChevronRight, ArrowRight, ArrowUpDown, ArrowUp, ArrowDown, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export default function PreviewSection({
  summary,
  removedRows = [],
  previewData,
  search,
  setSearch,
  currentPage,
  totalPages,
  totalRecords,
  sortCol,
  sortDir,
  onSort,
  onPageChange,
  onProceedToExport
}) {
  const [showRemovedRows, setShowRemovedRows] = useState(true);
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  const getSortIcon = (colName) => {
    if (sortCol !== colName) {
      return <ArrowUpDown size={14} style={{ opacity: 0.4, marginLeft: '6px' }} />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp size={14} style={{ color: 'var(--accent-blue)', marginLeft: '6px' }} />
    ) : (
      <ArrowDown size={14} style={{ color: 'var(--accent-blue)', marginLeft: '6px' }} />
    );
  };

  const renderHeaders = () => {
    if (!previewData || !previewData.columns || previewData.columns.length === 0) {
      return <tr><th>No columns loaded</th></tr>;
    }
    return (
      <tr>
        {previewData.columns.map((colName, index) => (
          <th 
            key={index} 
            onClick={() => onSort(colName)}
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{colName}</span>
              {getSortIcon(colName)}
            </div>
          </th>
        ))}
      </tr>
    );
  };

  const renderRows = () => {
    if (!previewData || !previewData.data || previewData.data.length === 0) {
      return (
        <tr>
          <td colSpan={previewData?.columns?.length || 1} className="empty-table">
            No data matching search results.
          </td>
        </tr>
      );
    }

    return previewData.data.map((row, rowIndex) => (
      <tr key={rowIndex}>
        {previewData.columns.map((colName, colIndex) => {
          const val = row[colName];
          return (
            <td key={colIndex}>
              {val === null || val === undefined ? (
                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>null</span>
              ) : (
                String(val)
              )}
            </td>
          );
        })}
      </tr>
    ));
  };

  const startRowIndex = (currentPage - 1) * 15 + 1;
  const endRowIndex = Math.min(currentPage * 15, totalRecords);

  return (
    <section id="previewSection" className="content-section active">
      {/* Cleaning Summary Cards */}
      <div className="summary-header">
        <h2><ClipboardList size={22} /> Data Cleaning Summary</h2>
        <span className="success-badge"><CheckCircle size={16} /> Clean Completed</span>
      </div>
      
      <div className="summary-stats-grid" id="summaryStatsGrid">
        <div className="stat-card glass-card">
          <span className="stat-label">Original Rows</span>
          <span className="stat-value" id="sumOrigRows">{summary.original_rows || 0}</span>
        </div>
        <div className="stat-card glass-card">
          <span className="stat-label">Final Rows</span>
          <span className="stat-value" id="sumFinalRows">{summary.final_rows || 0}</span>
        </div>
        <div className="stat-card glass-card">
          <span className="stat-label">Original Columns</span>
          <span className="stat-value" id="sumOrigCols">{summary.original_columns || 0}</span>
        </div>
        <div className="stat-card glass-card">
          <span className="stat-label">Final Columns</span>
          <span className="stat-value" id="sumFinalCols">{summary.final_columns || 0}</span>
        </div>
        <div className="stat-card glass-card warning">
          <span className="stat-label">Duplicates Removed</span>
          <span className="stat-value" id="sumDupRemoved">{summary.duplicates_removed || 0}</span>
        </div>
        <div className="stat-card glass-card warning">
          <span className="stat-label">Null Rows Removed</span>
          <span className="stat-value" id="sumNullRemoved">{summary.null_rows_removed || 0}</span>
        </div>
        <div className="stat-card glass-card info">
          <span className="stat-label">Missing Filled</span>
          <span className="stat-value" id="sumMissingFilled">{summary.missing_values_filled || 0}</span>
        </div>
        <div className="stat-card glass-card info">
          <span className="stat-label">Processing Time</span>
          <span className="stat-value" id="sumProcTime">
            {summary.processing_time ? `${summary.processing_time.toFixed(4)}s` : '0.0s'}
          </span>
        </div>
      </div>

      {/* Removed Rows Panel */}
      {(removedRows.length > 0 || (summary.original_rows - summary.final_rows) > 0) && (
        <div className="glass-card" style={{ marginBottom: '24px', overflow: 'hidden' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: showRemovedRows ? '1px solid var(--border-color)' : 'none',
              cursor: 'pointer',
              userSelect: 'none',
            }}
            onClick={() => setShowRemovedRows((v) => !v)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Trash2 size={18} style={{ color: 'var(--accent-red, #f87171)' }} />
              <span style={{ fontWeight: 600, fontSize: '1rem' }}>Removed Rows Report</span>
              <span
                style={{
                  background: 'rgba(248,113,113,0.15)',
                  color: 'var(--accent-red, #f87171)',
                  border: '1px solid rgba(248,113,113,0.35)',
                  borderRadius: '999px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '2px 10px',
                }}
              >
                {removedRows.length} rows removed
              </span>
              <span
                style={{
                  background: 'rgba(99,179,237,0.12)',
                  color: 'var(--accent-blue, #63b3ed)',
                  border: '1px solid rgba(99,179,237,0.30)',
                  borderRadius: '999px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '2px 10px',
                }}
              >
                {(summary.original_columns || 0) - (summary.final_columns || 0)} cols removed
              </span>
            </div>
            {showRemovedRows ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>

          {showRemovedRows && (
            <div style={{ padding: '18px 20px' }}>
              {removedRows.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                  No rows were removed (only column-level changes were applied).
                </p>
              ) : (
                <>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px', marginTop: 0 }}>
                    Original row numbers that were deleted during cleaning (1-based index from the uploaded file):
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {removedRows.map((r, i) => (
                      <span
                        key={i}
                        title={r.id !== undefined ? `ID: ${r.id}` : `Row #${r.row_number}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'rgba(248,113,113,0.12)',
                          color: 'var(--accent-red, #f87171)',
                          border: '1px solid rgba(248,113,113,0.30)',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          padding: '4px 10px',
                          fontFamily: 'monospace',
                        }}
                      >
                        Row {r.row_number}
                        {r.id !== undefined && (
                          <span
                            style={{
                              marginLeft: '4px',
                              padding: '1px 6px',
                              background: 'rgba(248,113,113,0.20)',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              color: 'var(--accent-red, #f87171)',
                            }}
                          >
                            id={r.id}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Data Preview Table */}
      <div className="preview-table-card glass-card">
        <div className="table-toolbar">
          <div className="toolbar-search">
            <Search size={16} />
            <input 
              type="text" 
              id="tableSearchInput" 
              placeholder="Search preview records..."
              value={search}
              onChange={handleSearchChange}
            />
          </div>
          <div className="toolbar-info">
            <span className="record-count" id="recordCountText">
              {totalRecords > 0 ? (
                `Showing ${startRowIndex}-${endRowIndex} of ${totalRecords} records`
              ) : (
                'Showing 0 records'
              )}
            </span>
          </div>
        </div>
        
        <div className="table-container">
          <table className="data-table" id="previewDataTable">
            <thead id="previewTableHead">
              {renderHeaders()}
            </thead>
            <tbody id="previewTableBody">
              {renderRows()}
            </tbody>
          </table>
        </div>
        
        {/* Table Pagination */}
        <div className="table-pagination">
          <button 
            className="btn btn-sm btn-secondary pagination-btn" 
            id="prevPageBtn"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <div className="pagination-pages" id="paginationPagesInfo">
            Page <span id="currentPageNum">{currentPage}</span> of <span id="totalPagesNum">{totalPages || 1}</span>
          </div>
          <button 
            className="btn btn-sm btn-secondary pagination-btn" 
            id="nextPageBtn"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
      
      <div className="nav-next-step">
        <button className="btn btn-primary btn-lg" id="proceedToExportBtn" onClick={onProceedToExport}>
          Proceed to Export <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}
