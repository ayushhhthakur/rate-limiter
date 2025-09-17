import React from 'react';

const CustomAPITestingPanel = ({
  customEndpoint,
  setCustomEndpoint,
  customMethod,
  setCustomMethod,
  customLimit,
  setCustomLimit,
  customWindow,
  setCustomWindow,
  customLoading,
  customStatus,
  onTestCustom,
  customMessage,
  isFloodTesting,
  onFloodTest,
  onCancelFlood,
  floodResults
}) => {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Custom API Endpoint Testing</h2>
      <div className="bg-purple-50 border border-purple-200 rounded p-3 mb-4">
        <p className="text-sm text-purple-800">
          ⚙️ <strong>Configure custom rate limits</strong> for any API endpoint and test with your settings
        </p>
      </div>
      
      {/* Quick Examples */}
      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
        <h4 className="font-medium text-yellow-900 mb-2">💡 Try these examples:</h4>
        <div className="grid md:grid-cols-2 gap-2 text-sm">
          <button 
            onClick={() => {
              setCustomEndpoint('https://api.github.com/user');
              setCustomLimit('5');
              setCustomWindow('60');
            }}
            className="text-left p-2 bg-white rounded border hover:bg-gray-50 text-purple-600"
          >
            🐙 GitHub API
            <span className="block text-xs text-gray-500">5 requests per minute</span>
          </button>
          <button 
            onClick={() => {
              setCustomEndpoint('https://httpbin.org/get');
              setCustomLimit('10');
              setCustomWindow('30');
            }}
            className="text-left p-2 bg-white rounded border hover:bg-gray-50 text-purple-600"
          >
            🔧 HTTPBin
            <span className="block text-xs text-gray-500">10 requests per 30 seconds</span>
          </button>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Endpoint *
            </label>
            <input
              type="url"
              value={customEndpoint}
              onChange={(e) => setCustomEndpoint(e.target.value)}
              placeholder="https://api.example.com/data"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              HTTP Method
            </label>
            <select
              value={customMethod}
              onChange={(e) => setCustomMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
              <option value="HEAD">HEAD</option>
              <option value="OPTIONS">OPTIONS</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Requests
            </label>
            <input
              type="number"
              value={customLimit}
              onChange={(e) => setCustomLimit(e.target.value)}
              min="1"
              max="1000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum requests allowed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Window (seconds)
            </label>
            <input
              type="number"
              value={customWindow}
              onChange={(e) => setCustomWindow(e.target.value)}
              min="1"
              max="3600"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Cooldown period in seconds</p>
          </div>
        </div>

        <div className="bg-blue-50 rounded p-3">
          <p className="text-sm text-blue-700">
            <strong>Rate Limit Preview:</strong> {customLimit} requests per {customWindow} seconds
            {parseInt(customWindow) >= 60 && ` (${(parseInt(customLimit) / (parseInt(customWindow) / 60)).toFixed(1)} req/min)`}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            ⚠️ Note: If server has different limits, actual limits will be detected from 429 responses
          </p>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>⚙️ <strong>Single Test:</strong> One request with custom limits</p>
          <p>🌊 <strong>Flood Test:</strong> Multiple requests until custom rate limit is hit</p>
          <p>🔍 <strong>Auto-Detection:</strong> Server's actual limits override configured limits when 429 is received</p>
          <p>📊 <strong>Real-time Monitoring:</strong> Track requests and cooldowns in real-time</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onTestCustom}
            disabled={customLoading || isFloodTesting || !customStatus.canRequest}
            className={`px-6 py-2 rounded-md transition-colors ${
              customLoading || isFloodTesting || !customStatus.canRequest
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {customLoading ? 'Testing...' : `${customMethod} Single Test`}
          </button>
          
          {!isFloodTesting ? (
            <button
              onClick={onFloodTest}
              disabled={customLoading || isFloodTesting || !customEndpoint}
              className={`px-6 py-2 rounded-md transition-colors ${
                customLoading || isFloodTesting || !customEndpoint
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              🌊 Flood Test
            </button>
          ) : (
            <button
              onClick={onCancelFlood}
              className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
            >
              🛑 Cancel Flood Test
            </button>
          )}
          
          {(!customStatus.canRequest || !customEndpoint) && (
            <p className="text-xs text-red-600">
              {!customEndpoint ? 'Endpoint required' : customStatus.reason}
            </p>
          )}
        </div>

        {customMessage && (
          <div className="p-3 bg-gray-50 rounded-md border">
            <pre className="text-sm whitespace-pre-wrap font-mono">{customMessage}</pre>
          </div>
        )}

        {/* Custom Flood Test Results */}
        {floodResults && (
          <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-md">
            <h4 className="font-semibold text-purple-900 mb-3">🌊 Custom Flood Test Results</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-white p-3 rounded">
                <div className="text-gray-600">Total Requests</div>
                <div className="text-lg font-bold text-blue-600">{floodResults.totalRequests}</div>
              </div>
              <div className="bg-white p-3 rounded">
                <div className="text-gray-600">Successful</div>
                <div className="text-lg font-bold text-green-600">{floodResults.successfulRequests}</div>
              </div>
              <div className="bg-white p-3 rounded">
                <div className="text-gray-600">Rate Limited At</div>
                <div className="text-lg font-bold text-red-600">
                  {floodResults.rateLimitAt ? `#${floodResults.rateLimitAt}` : 'Not hit'}
                </div>
              </div>
              <div className="bg-white p-3 rounded">
                <div className="text-gray-600">Avg Rate</div>
                <div className="text-lg font-bold text-purple-600">
                  {((floodResults.totalRequests / ((floodResults.endTime - floodResults.startTime) / 1000))).toFixed(1)} req/s
                </div>
              </div>
            </div>
            
            {floodResults.responses.length > 0 && (
              <div className="mt-4">
                <h5 className="font-medium text-gray-900 mb-2">Recent Responses:</h5>
                <div className="max-h-40 overflow-y-auto bg-white rounded border">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1 text-left">#</th>
                        <th className="px-2 py-1 text-left">Status</th>
                        <th className="px-2 py-1 text-left">Time</th>
                        <th className="px-2 py-1 text-left">Usage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {floodResults.responses.slice(-10).map((resp, idx) => (
                        <tr key={idx} className={resp.status === 429 ? 'bg-red-50' : ''}>
                          <td className="px-2 py-1">{resp.requestNumber}</td>
                          <td className="px-2 py-1">
                            <span className={`px-1 rounded text-xs ${
                              resp.status === 200 ? 'bg-green-100 text-green-800' :
                              resp.status === 429 ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {resp.status}
                            </span>
                          </td>
                          <td className="px-2 py-1">{resp.responseTime}ms</td>
                          <td className="px-2 py-1 text-gray-500">
                            {resp.usage || `${resp.requestNumber}/${customLimit}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomAPITestingPanel;
