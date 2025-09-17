import React, { useRef } from 'react';

const APITestingPanel = ({
  testUrl,
  setTestUrl,
  httpMethod,
  setHttpMethod,
  urlLoading,
  isFloodTesting,
  urlStatus,
  onTestUrl,
  onFloodTest,
  onCancelFlood,
  urlMessage,
  floodResults
}) => {
  const abortControllerRef = useRef(null);

  const handleTestUrl = async () => {
    if (!testUrl) return;
    
    abortControllerRef.current = new AbortController();
    try {
      await onTestUrl(abortControllerRef.current.signal);
    } catch (error) {
      if (error.name === 'AbortError') {
        // Request was canceled
      }
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">API Testing Test</h2>
      <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
        <p className="text-sm text-blue-800">
          🔍 <strong>Auto-detects rate limits</strong> from response headers or by flood testing until 429 error
        </p>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL to Test *
            </label>
            <input
              type="url"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="https://api.github.com/user"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Method
            </label>
            <select
              value={httpMethod}
              onChange={(e) => setHttpMethod(e.target.value)}
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
        <div className="text-xs text-gray-500 space-y-1">
          <p>✅ <strong>Single Test:</strong> One request to detect headers</p>
          <p>🌊 <strong>Flood Test:</strong> Multiple requests until rate limit (429) is hit</p>
          <p>🔍 <strong>Detected headers:</strong> X-RateLimit-*, RateLimit-*, Retry-After, CF-RateLimit-*, etc.</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleTestUrl}
            disabled={urlLoading || isFloodTesting || !urlStatus.canRequest}
            className={`px-6 py-2 rounded-md transition-colors ${
              urlLoading || isFloodTesting || !urlStatus.canRequest
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {urlLoading ? 'Testing...' : `${httpMethod} Single Test`}
          </button>
          
          {!isFloodTesting ? (
            <button
              onClick={onFloodTest}
              disabled={urlLoading || isFloodTesting || !testUrl}
              className={`px-6 py-2 rounded-md transition-colors ${
                urlLoading || isFloodTesting || !testUrl
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
          
          {(!urlStatus.canRequest || !testUrl) && (
            <p className="text-xs text-red-600">
              {!testUrl ? 'URL required' : urlStatus.reason}
            </p>
          )}
        </div>
        {urlMessage && (
          <div className="p-3 bg-gray-50 rounded-md border">
            <pre className="text-sm whitespace-pre-wrap font-mono">{urlMessage}</pre>
          </div>
        )}
        
        {/* Flood Test Results */}
        {floodResults && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-semibold text-blue-900 mb-3">🌊 Flood Test Results</h4>
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
                        <th className="px-2 py-1 text-left">Headers</th>
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
                          <td className="px-2 py-1 text-gray-500 truncate max-w-32">
                            {Object.keys(resp.rateLimitHeaders).join(', ') || 'None'}
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

export default APITestingPanel;
