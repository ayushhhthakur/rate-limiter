import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Notifications from './components/Notifications';
import StatsDashboard from './components/StatsDashboard';
import TabNavigation from './components/TabNavigation';
import APITestingPanel from './components/APITestingPanel';
import CustomAPITestingPanel from './components/CustomAPITestingPanel';
import MonitorTable from './components/MonitorTable';

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
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [analytics, setAnalytics] = useState(null);

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

  // Fetch analytics
  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${API_BASE}/analytics`);
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  // Add notification
  const addNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: Date.now()
    };
    setNotifications(prev => [...prev, notification]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  // Export data to JSON
  const exportData = () => {
    const exportObj = {
      exportDate: new Date().toISOString(),
      urlData: urlData,
      customData: customData,
      floodResults: floodResults
    };
    
    const dataStr = JSON.stringify(exportObj, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `rate-limiter-data-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    addNotification('Data exported successfully!', 'success');
  };

  // Clear all data
  const clearAllData = () => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      // Clear frontend state
      setUrlData([]);
      setCustomData([]);
      setFloodResults(null);
      setUrlMessage('');
      setCustomMessage('');
      
      // Call backend to clear data
      fetch(`${API_BASE}/clear-data`, { method: 'POST' })
        .then(() => {
          fetchAnalytics(); // Refresh analytics after clearing
          addNotification('All data cleared successfully!', 'success');
        })
        .catch(() => addNotification('Failed to clear backend data', 'error'));
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
          addNotification(`Rate limit detected: ${rateLimitInfo.limit} req/${rateLimitInfo.window}s`, 'info');
        } else {
          message += `\n⚙️ Using defaults: ${appliedLimits?.limit || 60} requests/${appliedLimits?.window || 3600}s`;
          message += `\n❌ No rate limit headers found. Checked: X-RateLimit-*, RateLimit-*, Retry-After, etc.`;
        }
        
        message += `\n⏱️ Response time: ${data.responseTime}`;
        
        setUrlMessage(message);
      } else {
        setUrlMessage(`❌ ${data.error}: ${data.message}`);
        addNotification(`Request failed: ${data.error}`, 'error');
      }
    } catch (error) {
      setUrlMessage(`❌ Error: ${error.message}`);
      addNotification(`Network error: ${error.message}`, 'error');
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
    fetchAnalytics(); // Add analytics fetch
    if (activeTab === 'url') {
      fetchUrlMonitorData();
    } else if (activeTab === 'custom') {
      fetchCustomMonitorData();
    }
    
    const interval = setInterval(() => {
      fetchAnalytics(); // Update analytics every second
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
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} p-8 transition-colors`}>
      <div className="max-w-6xl mx-auto">
        <Header 
          darkMode={darkMode} 
          toggleDarkMode={() => setDarkMode(!darkMode)} 
          onExport={exportData} 
          onClear={clearAllData} 
        />

        <Notifications 
          notifications={notifications} 
          onDismiss={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} 
        />

        <StatsDashboard 
          darkMode={darkMode} 
          urlData={urlData} 
          customData={customData} 
          analytics={analytics} 
        />

        <TabNavigation 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />

        {activeTab === 'url' && (
          <APITestingPanel
            testUrl={testUrl}
            setTestUrl={setTestUrl}
            httpMethod={httpMethod}
            setHttpMethod={setHttpMethod}
            urlLoading={urlLoading}
            isFloodTesting={isFloodTesting}
            urlStatus={urlStatus}
            onTestUrl={testUrlRequest}
            onFloodTest={floodTestUrl}
            urlMessage={urlMessage}
            floodResults={floodResults}
          />
        )}

        {activeTab === 'custom' && (
          <CustomAPITestingPanel
            customEndpoint={customEndpoint}
            setCustomEndpoint={setCustomEndpoint}
            customMethod={customMethod}
            setCustomMethod={setCustomMethod}
            customLimit={customLimit}
            setCustomLimit={setCustomLimit}
            customWindow={customWindow}
            setCustomWindow={setCustomWindow}
            customLoading={customLoading}
            customStatus={customStatus}
            onTestCustom={testCustomEndpoint}
            customMessage={customMessage}
          />
        )}

        <MonitorTable
          darkMode={darkMode}
          activeTab={activeTab}
          currentData={currentData}
          currentItems={currentItems}
          currentPage={currentPage}
          totalPages={totalPages}
          onPaginate={paginate}
        />
      </div>
    </div>
  );
}

export default App;
