import React from 'react';

const Header = ({ darkMode, toggleDarkMode, onExport, onClear }) => {
  return (
    <div className="flex justify-between items-center mb-8">
      <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        Rate Limiter Dashboard
      </h1>
      <div className="flex items-center gap-4">
        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className={`p-2 rounded-md transition-colors ${
            darkMode 
              ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
          title="Toggle dark mode"
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
        
        {/* Export button */}
        <button
          onClick={onExport}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          title="Export all data to JSON"
        >
          📥 Export
        </button>
        
        {/* Clear data button */}
        <button
          onClick={onClear}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          title="Clear all data"
        >
          🗑️ Clear
        </button>
      </div>
    </div>
  );
};

export default Header;
