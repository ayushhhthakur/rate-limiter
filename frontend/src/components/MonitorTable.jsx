import React from 'react';
import CooldownTimer from './CooldownTimer';

const MonitorTable = ({
  darkMode,
  activeTab,
  currentData,
  currentItems,
  currentPage,
  totalPages,
  onPaginate
}) => {
  const indexOfLastItem = currentPage * 5;
  const indexOfFirstItem = indexOfLastItem - 5;

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md overflow-hidden`}>
      <div className="p-6 border-b bg-gray-50">
        <h2 className="text-xl font-semibold">
          {activeTab === 'url' ? 'URL Status Monitor' : 'Custom API Status Monitor'}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {activeTab === 'url' 
            ? 'Shows detected vs default rate limits • Real-time cooldown updates'
            : 'Custom configured rate limits • Real-time cooldown updates'
          }
        </p>
      </div>
      
      {currentData.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <div className="text-4xl mb-4">
            {activeTab === 'url' ? '🌐' : '⚙️'}
          </div>
          <p className="text-lg font-medium">
            No {activeTab === 'url' ? 'URL' : 'custom endpoint'} data available
          </p>
          <p className="text-sm">
            Test {activeTab === 'url' ? 'URLs' : 'custom endpoints'} above to see rate limit tracking
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {activeTab === 'url' ? 'URL' : 'API Endpoint'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client IP</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requests</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Limits</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cooldown</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {activeTab === 'url' ? 'Detection' : 'Type'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Request</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="font-mono text-xs truncate max-w-32" title={item.url}>
                        {item.url}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs">
                        <div className="font-mono">{item.clientIP || 'N/A'}</div>
                        {item.clientIPInfo && item.clientIPInfo.city && (
                          <div className="text-gray-500">
                            {item.clientIPInfo.city}, {item.clientIPInfo.country}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {item.requestCount}/{item.limits?.maxRequests || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <div>{item.limits?.maxRequests || 'N/A'} req</div>
                      <div className="text-gray-500">{item.limits?.windowSeconds || 'N/A'}s window</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'Blocked' 
                          ? 'bg-red-100 text-red-800 font-bold' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {item.status === 'Blocked' ? '🚫' : '✅'} {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <CooldownTimer timeLeft={item.timeLeft} lastRequest={item.lastRequest} />
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                        activeTab === 'url' && item.limits?.source === 'detected' 
                          ? 'bg-green-100 text-green-700' 
                          : activeTab === 'custom'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                      {activeTab === 'url' 
                        ? (item.limits?.source === 'detected' ? '🔍 Headers' : '⚙️ Default')
                        : '⚙️ Custom'
                      }
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-500">
                      {item.lastRequest ? (
                        <div>
                          <div>{new Date(item.lastRequest).toLocaleTimeString()}</div>
                          <div className="text-gray-400">{new Date(item.lastRequest).toLocaleDateString()}</div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, currentData.length)} of {currentData.length} {activeTab === 'url' ? 'URLs' : 'Endpoints'}
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => onPaginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 text-sm rounded-md ${
                      currentPage === 1
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      onClick={() => onPaginate(pageNumber)}
                      className={`px-3 py-1 text-sm rounded-md ${
                        currentPage === pageNumber
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => onPaginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 text-sm rounded-md ${
                      currentPage === totalPages
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MonitorTable;
