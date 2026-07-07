import React from 'react';
import { Menu, Sun, Moon } from 'lucide-react';

export default function Header({
  activeSection,
  isSidebarOpen,
  setIsSidebarOpen,
  theme,
  toggleTheme
}) {
  const getPageTitle = () => {
    switch (activeSection) {
      case 'overview':
        return 'Dashboard Overview';
      case 'upload':
        return 'Upload & Clean Dataset';
      case 'preview':
        return 'Cleaned Data Preview';
      case 'download':
        return 'Export & Persist Dataset';
      default:
        return 'Dashboard';
    }
  };

  return (
    <header className="top-nav">
      <button 
        className="mobile-toggle" 
        id="mobileToggleBtn"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label="Toggle menu"
      >
        <Menu size={22} />
      </button>
      
      <div className="nav-search">
        <h1 id="pageTitle" className="section-title">{getPageTitle()}</h1>
      </div>
      
      <div className="nav-actions">
        <button 
          className="theme-toggle-btn" 
          id="themeToggleBtn" 
          title="Toggle Theme"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? (
            <Sun size={20} id="themeIconSun" />
          ) : (
            <Moon size={20} id="themeIconMoon" />
          )}
        </button>
        <div className="user-profile">
          <span className="avatar">CD</span>
          <span className="user-name">Guest User</span>
        </div>
      </div>
    </header>
  );
}
