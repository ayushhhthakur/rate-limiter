import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:3001';

function App() {
  const [urlData, setUrlData] = useState([]);
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlMessage, setUrlMessage] = useState('');
  const [testUrl, setTestUrl] = useState('');
  const [httpMethod, setHttpMethod] = useState('GET');
  const [apiInfo, setApiInfo] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [isFloodTesting, setIsFloodTesting] = useState(false);
  const [floodResults, setFloodResults] = useState(null);
  const [activeTab, setActiveTab] = useState('url'); // 'url' or 'custom'
  
  // Custom API endpoint states
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [customLimit, setCustomLimit] = useState('10');
  const [customWindow, setCustomWindow] = useState('60');
  const [customMethod, setCustomMethod] = useState('GET');
  const [customLoading, setCustomLoading] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [customData, setCustomData] = useState([]);

  // Get current URL status for button state
  const getCurrentUrlStatus = () => {
    if (!testUrl) return { canRequest: false, reason: 'URL required' };
    
    const urlInfo = urlData.find(item => item.url === testUrl);
    
    if (!urlInfo) return { canRequest: true, reason: '' };
    
    if (urlInfo.status === 'Blocked') {
      return { 
        canRequest: false, 
        reason: `Blocked for ${urlInfo.timeLeft}s` 
      };
    }
    
    if (urlInfo.requestCount >= urlInfo.limits?.maxRequests) {
      return { 
        canRequest: false, 
        reason: 'Rate limit reached' 
      };
    }
    
    return { canRequest: true, reason: '' };
  };

  // Fetch API info
  const fetchApiInfo = async () => {
    try {
      const response = await fetch(`${API_BASE}/`);
      const data = await response.json();
      setApiInfo(data);
    } catch (error) {
      console.error('Error fetching API info:', error);
    }
  };

  // Fetch URL monitoring data
  const fetchUrlMonitorData = async () => {
    try {
      const response = await fetch(`${API_BASE}/monitor-urls`);
      const data = await response.json();
      // Sort by last request time (latest first)
      const sortedData = (data.data || []).sort((a, b) => {
        if (!a.lastRequest && !b.lastRequest) return 0;
        if (!a.lastRequest) return 1;
        if (!b.lastRequest) return -1;
        return new Date(b.lastRequest) - new Date(a.lastRequest);
      });
      setUrlData(sortedData);
    } catch (error) {
      console.error('Error fetching URL monitor data:', error);
    }
  };

  // Fetch custom API monitoring data
  const fetchCustomMonitorData = async () => {
    try {
      const response = await fetch(`${API_BASE}/monitor-custom`);
      const data = await response.json();
      setCustomData(data.data || []);
    } catch (error) {
      console.error('Error fetching custom monitor data:', error);
    }
  };

  // Test URL with automatic rate limit detection
  const testUrlRequest = async () => {
    if (!testUrl) return;
    
    setUrlLoading(true);
    setUrlMessage('');
    
    try {
      const response = await fetch(`${API_BASE}/test-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: testUrl,
          method: httpMethod
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        const rateLimitInfo = data.rateLimitInfo?.detected;
        const appliedLimits = data.rateLimitInfo?.applied;
        
        let message = `✅ ${httpMethod} ${data.responseStatus}: ${data.message}`;
        
        if (rateLimitInfo?.limit && rateLimitInfo.source !== 'unknown') {
          message += `\n🔍 Auto-detected: ${rateLimitInfo.limit} requests/${rateLimitInfo.window}s from '${rateLimitInfo.source}' headers`;
          if (rateLimitInfo.remaining !== null) {
            message += ` (${rateLimitInfo.remaining} remaining)`;
          }
          if (Object.keys(data.responseHeaders || {}).length > 0) {
            message += `\n📋 Rate limit headers: ${Object.keys(data.responseHeaders).join(', ')}`;
          }
        } else {
          message += `\n⚙️ Using defaults: ${appliedLimits?.limit || 60} requests/${appliedLimits?.window || 3600}s`;
          message += `\n❌ No rate limit headers found. Checked: X-RateLimit-*, RateLimit-*, Retry-After, etc.`;
        }
        
        message += `\n⏱️ Response time: ${data.responseTime}`;
        
        setUrlMessage(message);
      } else {
        setUrlMessage(`❌ ${data.error}: ${data.message}`);
      }
    } catch (error) {
      setUrlMessage(`❌ Error: ${error.message}`);
    } finally {
      setUrlLoading(false);
    }
  };

  // Flood test to find rate limit threshold
  const floodTestUrl = async () => {
    if (!testUrl) return;
    
    setIsFloodTesting(true);
    setUrlMessage('');
    setFloodResults(null);
    
    const results = {
      totalRequests: 0,
      successfulRequests: 0,
      rateLimitHit: false,
      rateLimitAt: null,
      responses: [],
      startTime: Date.now(),
      endTime: null,
      detectedLimits: null,
      errors: []
    };

    try {
      let requestCount = 0;
      let rateLimitHit = false;
      const maxRequests = 100; // Safety limit
      const requestDelay = 100; // 100ms between requests

      while (!rateLimitHit && requestCount < maxRequests) {
        requestCount++;
        results.totalRequests = requestCount;

        try {
          const requestStart = Date.now();
          const response = await fetch(`${API_BASE}/test-url`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: testUrl,
              method: httpMethod
            })
          });
          
          const responseTime = Date.now() - requestStart;
          const data = await response.json();
          
          const responseLog = {
            requestNumber: requestCount,
            status: response.status,
            responseTime,
            timestamp: new Date().toISOString(),
            rateLimitHeaders: data.responseHeaders || {}
          };

          results.responses.push(responseLog);

          if (response.status === 429) {
            rateLimitHit = true;
            results.rateLimitHit = true;
            results.rateLimitAt = requestCount;
            results.detectedLimits = data.rateLimitInfo?.detected;
            
            setUrlMessage(`🚫 Rate limit hit! Got 429 after ${requestCount} requests`);
            break;
          } else if (response.ok) {
            results.successfulRequests++;
            
            // Store detected limits from first successful response
            if (requestCount === 1 && data.rateLimitInfo?.detected) {
              results.detectedLimits = data.rateLimitInfo.detected;
            }
            
            setUrlMessage(`🔄 Flood testing... ${requestCount} requests sent (${response.status})`);
          } else {
            results.errors.push({
              requestNumber: requestCount,
              status: response.status,
              error: data.error || 'Unknown error'
            });
          }

          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, requestDelay));

        } catch (error) {
          results.errors.push({
            requestNumber: requestCount,
            error: error.message
          });
          
          // Continue on network errors
          setUrlMessage(`⚠️ Request ${requestCount} failed: ${error.message}. Continuing...`);
          await new Promise(resolve => setTimeout(resolve, requestDelay));
        }
      }

      results.endTime = Date.now();
      const totalTime = results.endTime - results.startTime;

      // Final summary
      let summary = `🏁 Flood test completed!\n`;
      summary += `📊 Total requests: ${results.totalRequests}\n`;
      summary += `✅ Successful: ${results.successfulRequests}\n`;
      summary += `⏱️ Total time: ${(totalTime / 1000).toFixed(2)}s\n`;
      summary += `🔄 Avg rate: ${(results.totalRequests / (totalTime / 1000)).toFixed(1)} req/s\n`;
      
      if (results.rateLimitHit) {
        summary += `🚫 Rate limit hit at request #${results.rateLimitAt}\n`;
        if (results.detectedLimits?.limit) {
          summary += `🔍 Detected limit: ${results.detectedLimits.limit} req/${results.detectedLimits.window}s\n`;
        }
      } else {
        summary += `✅ No rate limit encountered (tested up to ${maxRequests} requests)\n`;
      }

      if (results.errors.length > 0) {
        summary += `❌ Errors: ${results.errors.length}\n`;
      }

      setUrlMessage(summary);
      setFloodResults(results);

    } catch (error) {
      setUrlMessage(`❌ Flood test error: ${error.message}`);
    } finally {
      setIsFloodTesting(false);
    }
  };

  // Test custom API endpoint
  const testCustomEndpoint = async () => {
    if (!customEndpoint) return;
    
    setCustomLoading(true);
    setCustomMessage('');
    
    try {
      const response = await fetch(`${API_BASE}/test-custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: customEndpoint,
          method: customMethod,
          limit: parseInt(customLimit),
          window: parseInt(customWindow)
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        let message = `✅ ${customMethod} ${data.responseStatus}: ${data.message}`;
        message += `\n⚙️ Applied limits: ${data.customLimits.limit} requests/${data.customLimits.window}s`;
        message += `\n📊 Current usage: ${data.customLimits.current}/${data.customLimits.limit} (${data.customLimits.remaining} remaining)`;
        message += `\n⏱️ Response time: ${data.responseTime}`;
        
        setCustomMessage(message);
      } else {
        setCustomMessage(`❌ ${data.error}: ${data.message}`);
      }
    } catch (error) {
      // Better error handling for parsing issues
      if (error.message.includes('Unexpected token')) {
        setCustomMessage(`❌ Server Error: Received invalid response format. Please check if the backend server is running properly.`);
      } else {
        setCustomMessage(`❌ Network Error: ${error.message}`);
      }
    } finally {
      setCustomLoading(false);
    }
  };

  // Get current custom endpoint status
  const getCurrentCustomStatus = () => {
    if (!customEndpoint) return { canRequest: false, reason: 'Endpoint required' };
    
    const endpointInfo = customData.find(item => item.url === customEndpoint);
    
    if (!endpointInfo) return { canRequest: true, reason: '' };
    
    if (endpointInfo.status === 'Blocked') {
      return { 
        canRequest: false, 
        reason: `Blocked for ${endpointInfo.timeLeft}s` 
      };
    }
    
    if (endpointInfo.requestCount >= endpointInfo.limits?.maxRequests) {
      return { 
        canRequest: false, 
        reason: 'Rate limit reached' 
      };
    }
    
    return { canRequest: true, reason: '' };
  };

  // Poll for data every 1 second for real-time cooldown updates
  useEffect(() => {
    fetchApiInfo();
    if (activeTab === 'url') {
      fetchUrlMonitorData();
    } else if (activeTab === 'custom') {
      fetchCustomMonitorData();
    }
    
    const interval = setInterval(() => {
      if (activeTab === 'url') {
        fetchUrlMonitorData();
      } else if (activeTab === 'custom') {
        fetchCustomMonitorData();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [activeTab]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  // Get current data based on active tab
  const currentData = activeTab === 'url' ? urlData : customData;
  const currentItems = currentData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(currentData.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Real-time cooldown component
  const CooldownTimer = ({ timeLeft, lastRequest }) => {
    const [countdown, setCountdown] = useState(timeLeft);

    useEffect(() => {
      setCountdown(timeLeft);
    }, [timeLeft]);

    useEffect(() => {
      if (countdown > 0) {
        const timer = setTimeout(() => {
          setCountdown(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearTimeout(timer);
      }
    }, [countdown]);

    if (countdown > 0) {
      return <span className="text-red-600 font-medium">{countdown}s</span>;
    }
    return <span className="text-gray-400">-</span>;
  };

  const urlStatus = getCurrentUrlStatus();
  const customStatus = getCurrentCustomStatus();

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Rate Limiter Dashboard
        </h1>
        
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-md mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('url')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'url'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🌐 API Testing
              </button>
              <button
                onClick={() => setActiveTab('custom')}
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

          {/* API Testing Panel */}
          {activeTab === 'url' && (
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
                    onClick={testUrlRequest}
                    disabled={urlLoading || isFloodTesting || !urlStatus.canRequest}
                    className={`px-6 py-2 rounded-md transition-colors ${
                      urlLoading || isFloodTesting || !urlStatus.canRequest
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {urlLoading ? 'Testing...' : `${httpMethod} Single Test`}
                  </button>
                  
                  <button
                    onClick={floodTestUrl}
                    disabled={urlLoading || isFloodTesting || !testUrl}
                    className={`px-6 py-2 rounded-md transition-colors ${
                      urlLoading || isFloodTesting || !testUrl
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {isFloodTesting ? 'Flood Testing...' : '🌊 Flood Test'}
                  </button>
                  
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
          )}

          {/* Custom API Testing Panel */}
          {activeTab === 'custom' && (
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
                    onClick={testCustomEndpoint}
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
          )}
        </div>

        {/* Monitor Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
                        onClick={() => paginate(currentPage - 1)}
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
                          onClick={() => paginate(pageNumber)}
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
                        onClick={() => paginate(currentPage + 1)}
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
      </div>
    </div>
  );
}

export default App;
