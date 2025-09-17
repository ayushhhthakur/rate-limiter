import React from 'react';

const TabNavigation = ({ activeTab, onTabChange }) => {
  return (
    <div className="bg-white rounded-lg shadow-md mb-8">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex">
          <button
            onClick={() => onTabChange('url')}
            className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'url'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🌐 API Testing
          </button>
          <button
            onClick={() => onTabChange('custom')}
            className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'custom'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ⚙️ Custom API Testing
          </button>
        </nav>
      </div>
    </div>
  );
};

export default TabNavigation;
