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
  customMessage
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
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>⚙️ <strong>Custom Limits:</strong> Set your own rate limits for testing</p>
          <p>🔄 <strong>Flexible Testing:</strong> Test any API endpoint with custom constraints</p>
          <p>📊 <strong>Real-time Monitoring:</strong> Track requests and cooldowns in real-time</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onTestCustom}
            disabled={customLoading || !customStatus.canRequest}
            className={`px-6 py-2 rounded-md transition-colors ${
              customLoading || !customStatus.canRequest
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {customLoading ? 'Testing...' : `${customMethod} Test Endpoint`}
          </button>
          
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
      </div>
    </div>
  );
};

export default CustomAPITestingPanel;
