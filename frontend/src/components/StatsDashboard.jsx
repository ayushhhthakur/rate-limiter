import React from 'react';

const StatsDashboard = ({ darkMode, urlData, customData, analytics }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6`}>
        <div className="text-2xl mb-2">🌐</div>
        <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {urlData.length}
        </div>
        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          URLs Tracked
        </div>
      </div>
      
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6`}>
        <div className="text-2xl mb-2">⚙️</div>
        <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {customData.length}
        </div>
        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Custom Endpoints
        </div>
      </div>
      
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6`}>
        <div className="text-2xl mb-2">📊</div>
        <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {analytics?.totalRequests || 0}
        </div>
        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Total Requests
        </div>
      </div>
      
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6`}>
        <div className="text-2xl mb-2">🚫</div>
        <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {[...urlData, ...customData].filter(item => item.status === 'Blocked').length}
        </div>
        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Currently Blocked
        </div>
      </div>
    </div>
  );
};

export default StatsDashboard;
