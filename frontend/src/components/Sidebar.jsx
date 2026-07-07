import React from 'react';
import { Sparkles, X, LayoutDashboard, UploadCloud, Table, Download } from 'lucide-react';

export default function Sidebar({
  activeSection,
  setActiveSection,
  isSidebarOpen,
  setIsSidebarOpen,
  dbConnected,
  hasCleanedData
}) {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, disabled: false },
    { id: 'upload', label: 'Upload & Clean', icon: UploadCloud, disabled: false },
    { id: 'preview', label: 'Data Preview', icon: Table, disabled: !hasCleanedData },
    { id: 'download', label: 'Export & Save', icon: Download, disabled: !hasCleanedData },
  ];

  return (
    <aside className={`sidebar ${isSidebarOpen ? 'active' : ''}`} id="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <Sparkles className="logo-icon animate-pulse" />
          <span className="logo-text">Clean<span>Data</span></span>
        </div>
        <button 
          className="mobile-close-btn" 
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>
      
      <nav className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`menu-item ${activeSection === item.id ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
              onClick={(e) => {
                if (item.disabled) {
                  e.preventDefault();
                  return;
                }
                setActiveSection(item.id);
                setIsSidebarOpen(false);
              }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
      
      <div className="sidebar-footer">
        <div className="db-status-container">
          <div className={`db-status-dot ${dbConnected ? 'connected' : ''}`} id="dbStatusDot"></div>
          <span className="db-status-text" id="dbStatusText">
            PostgreSQL: {dbConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </aside>
  );
}
