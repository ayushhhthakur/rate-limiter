const express = require('express');
const cors = require('cors');
const RateLimiter = require('./rateLimiter');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize rate limiter
const rateLimiter = new RateLimiter();
const urlRateLimiter = new RateLimiter(); // For API Testing
const customRateLimiter = new RateLimiter(); // For custom API rate limiting

// Cumulative counters (do not reset with windows)
const cumulativeCounts = { ip: 0, url: 0, custom: 0 };

// Track last client IP per external URL / custom endpoint
const lastClientForURL = new Map();
const lastClientForCustom = new Map();

// ipinfo caching
const ipInfoCache = new Map();
async function fetchIPInfo(ip) {
  if (!ip || ip === 'localhost') {
    return {
      ip: 'localhost',
      city: 'Local',
      region: 'Local',
      country: 'LOCAL',
      org: 'Local Network',
      source: 'local'
    };
  }
  if (ipInfoCache.has(ip)) return ipInfoCache.get(ip);
  const token = process.env.IPINFO_TOKEN; // optional
  try {
    const url = token ? `https://ipinfo.io/${ip}?token=${token}` : `https://ipinfo.io/${ip}`;
    const resp = await fetch(url, { timeout: 5000 });
    if (!resp.ok) throw new Error('ipinfo response not ok');
    const data = await resp.json();
    const simplified = {
      ip: data.ip,
      city: data.city,
      region: data.region,
      country: data.country,
      org: data.org,
      loc: data.loc,
      source: 'ipinfo'
    };
    ipInfoCache.set(ip, simplified);
    return simplified;
  } catch {
    const fallback = { ip, city: null, region: null, country: null, org: null, source: 'unresolved' };
    ipInfoCache.set(ip, fallback);
    return fallback;
  }
}

// Normalize IP address
function normalizeIP(ip) {
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') {
    return 'localhost';
  }
  return ip;
}

// Get client IP
function getClientIP(req) {
  // Check for custom IP in query params (for testing)
  if (req.query.ip) {
    return req.query.ip;
  }
  
  const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  const normalizedIP = normalizeIP(ip);
  
  // If IP is still missing, assign fake one
  return normalizedIP === 'localhost' ? normalizedIP : (normalizedIP || 'test-ip-1');
}

// Rate limiting middleware
function rateLimitMiddleware(req, res, next) {
  const clientIP = getClientIP(req);
  const result = rateLimiter.checkLimit(clientIP);
  if (!result.allowed) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${result.timeLeft} seconds.`,
      timeLeft: result.timeLeft
    });
  }
  cumulativeCounts.ip++; // increment cumulative IP counter
  next();
}

// API Testing middleware
function urlRateLimitMiddleware(req, res, next) {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'URL is required'
    });
  }

  // Check if we have existing limits for this URL, if not we'll detect them first
  const existingLimits = urlRateLimiter.getExistingLimits(url);
  if (existingLimits) {
    const result = urlRateLimiter.checkLimit(url);
    
    if (!result.allowed) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded for ${url}. Try again in ${result.timeLeft} seconds.`,
        timeLeft: result.timeLeft,
        url: url,
        detectedLimits: existingLimits
      });
    }
  }
  
  next();
}

// Custom API rate limiting middleware
function customRateLimitMiddleware(req, res, next) {
  const { url, limit = 10, window = 60 } = req.body;
  
  if (!url) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'URL is required'
    });
  }

  // Set custom limits for this URL
  customRateLimiter.setCustomLimits(url, parseInt(limit), parseInt(window) * 1000);
  
  const result = customRateLimiter.checkLimit(url);
  
  if (!result.allowed) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded for ${url}. Try again in ${result.timeLeft} seconds.`,
      timeLeft: result.timeLeft,
      url: url,
      customLimits: {
        limit: parseInt(limit),
        window: parseInt(window)
      }
    });
  }
  
  next();
}

// Routes
app.get('/', (req, res) => {
  const baseUrl = `http://localhost:${PORT}`;
  res.json({
    message: 'Rate Limiter API',
    availableEndpoints: {
      home: {
        url: `${baseUrl}/home`,
        method: 'GET',
        description: 'Rate limited endpoint (3 requests per 60 seconds)',
        queryParams: {
          ip: 'Optional custom IP for testing (e.g., ?ip=192.168.1.100)'
        }
      },
      testUrl: {
        url: `${baseUrl}/test-url`,
        method: 'POST',
        description: 'Test rate limiting for any URL with auto-detection',
        body: {
          url: 'Required - URL to test (e.g., https://api.github.com)',
          method: 'Optional - HTTP method (default: GET)'
        }
      },
      testCustom: {
        url: `${baseUrl}/test-custom`,
        method: 'POST',
        description: 'Test any API endpoint with custom rate limits',
        body: {
          url: 'Required - API endpoint to test',
          method: 'Optional - HTTP method (default: GET)',
          limit: 'Optional - Max requests (default: 10)',
          window: 'Optional - Time window in seconds (default: 60)'
        }
      },
      monitor: {
        url: `${baseUrl}/monitor`,
        method: 'GET',
        description: 'Monitor all tracked IPs and their status'
      },
      monitorUrls: {
        url: `${baseUrl}/monitor-urls`,
        method: 'GET',
        description: 'Monitor all tracked URLs and their status'
      },
      monitorCustom: {
        url: `${baseUrl}/monitor-custom`,
        method: 'GET',
        description: 'Monitor all custom API endpoints and their status'
      }
    },
    examples: [
      `${baseUrl}/home`,
      `${baseUrl}/home?ip=test-ip-123`,
      `${baseUrl}/monitor`,
      `${baseUrl}/monitor-urls`,
      `${baseUrl}/monitor-custom`,
      `POST ${baseUrl}/test-url with body: {"url": "https://api.github.com", "method": "GET"}`,
      `POST ${baseUrl}/test-custom with body: {"url": "https://api.github.com/user", "method": "GET", "limit": 5, "window": 60}`
    ]
  });
});

app.get('/home', rateLimitMiddleware, async (req, res) => {
  const clientIP = getClientIP(req);
  const ipInfo = await fetchIPInfo(clientIP);
  res.json({
    message: 'Welcome to the home page!',
    ip: clientIP,
    ipInfo,
    timestamp: new Date().toISOString(),
    requestUrl: req.originalUrl,
    nextRequest: `Try: http://localhost:${PORT}/home${req.query.ip ? `?ip=${req.query.ip}` : ''}`
  });
});

app.get('/monitor', (req, res) => {
  const data = rateLimiter.getAllIPs();
  res.json({
    endpoint: `/monitor`,
    totalTrackedIPs: data.length,
    data: data,
    refreshUrl: `http://localhost:${PORT}/monitor`
  });
});

app.post('/test-url', urlRateLimitMiddleware, async (req, res) => {
  const { url, method = 'GET' } = req.body;
  const clientIP = getClientIP(req);
  const clientIPInfo = await fetchIPInfo(clientIP);
  cumulativeCounts.url++;
  lastClientForURL.set(url, { clientIP, clientIPInfo, lastAt: Date.now() });
  
  try {
    // Make actual request to the URL to detect rate limits
    const startTime = Date.now();
    
    const fetchOptions = {
      method: method.toUpperCase(),
      headers: {
        'User-Agent': 'Rate-Limiter-Test/1.0',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000 // 10 second timeout
    };

    // Add body for POST/PUT/PATCH methods
    if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      fetchOptions.headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify({ test: true, timestamp: new Date().toISOString() });
    }

    const response = await fetch(url, fetchOptions);
    const responseTime = Date.now() - startTime;
    
    // Extract rate limit information from response headers
    const rateLimitInfo = extractRateLimitFromHeaders(response.headers, response.status);
    
    // Set the detected limits for this URL
    if (rateLimitInfo.limit && rateLimitInfo.window) {
      urlRateLimiter.setCustomLimits(url, rateLimitInfo.limit, rateLimitInfo.window * 1000);
    } else {
      urlRateLimiter.setCustomLimits(url, 60, 3600000); // 60 requests per hour as default
    }
    
    // DON'T call checkLimit again here - it was already called in middleware
    // const limitResult = urlRateLimiter.checkLimit(url); // Remove this line
    
    // Get current status without incrementing
    const currentStatus = urlRateLimiter.storage.get(url) || { requests: [] };
    const currentRequests = currentStatus.requests.filter(timestamp => 
      Date.now() - timestamp < (rateLimitInfo.window * 1000 || 3600000)
    ).length;
    
    res.json({
      message: 'URL request successful!',
      url: url,
      method: method.toUpperCase(),
      clientIP,
      clientIPInfo,
      timestamp: new Date().toISOString(),
      responseStatus: response.status,
      responseTime: `${responseTime}ms`,
      rateLimitInfo: {
        detected: rateLimitInfo,
        applied: {
          limit: rateLimitInfo.limit || 60,
          window: rateLimitInfo.window || 3600,
          remaining: rateLimitInfo.remaining,
          resetTime: rateLimitInfo.resetTime
        }
      },
      currentUsage: {
        requestCount: currentRequests,
        allowed: true
      },
      responseHeaders: Object.fromEntries(
        Array.from(response.headers.entries()).filter(([key]) => 
          key.toLowerCase().includes('ratelimit') || 
          key.toLowerCase().includes('rate-limit') || 
          key.toLowerCase().includes('retry-after') ||
          key.toLowerCase().includes('x-ratelimit')
        )
      )
    });
  } catch (error) {
    // ...existing error handling...
    // DON'T call checkLimit here either
    const currentStatus = urlRateLimiter.storage.get(url) || { requests: [] };
    const currentRequests = currentStatus.requests.length;
    
    res.json({
      message: 'Rate limit test completed (URL may be unreachable)',
      url: url,
      method: method.toUpperCase(),
      clientIP,
      clientIPInfo,
      timestamp: new Date().toISOString(),
      error: error.message,
      rateLimitInfo: {
        detected: { limit: null, window: null, source: 'failed_request', error: error.message },
        applied: { limit: 60, window: 3600 }
      },
      currentUsage: {
        requestCount: currentRequests,
        allowed: true
      }
    });
  }
});

app.post('/test-custom', customRateLimitMiddleware, async (req, res) => {
  const { url, method = 'GET', limit = 10, window = 60 } = req.body;
  const clientIP = getClientIP(req);
  const clientIPInfo = await fetchIPInfo(clientIP);
  cumulativeCounts.custom++;
  lastClientForCustom.set(url, { clientIP, clientIPInfo, lastAt: Date.now() });
  
  try {
    const startTime = Date.now();
    
    const fetchOptions = {
      method: method.toUpperCase(),
      headers: {
        'User-Agent': 'Rate-Limiter-Custom-Test/1.0',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000
    };

    if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      fetchOptions.headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify({ 
        test: true, 
        timestamp: new Date().toISOString(),
        source: 'rate-limiter-custom-test'
      });
    }

    const response = await fetch(url, fetchOptions);
    const responseTime = Date.now() - startTime;
    
    // Check if we got a rate limit response (429)
    if (response.status === 429) {
      const rateLimitInfo = extractRateLimitFromHeaders(response.headers, response.status);
      
      if (rateLimitInfo.limit && rateLimitInfo.window) {
        customRateLimiter.setCustomLimits(url, rateLimitInfo.limit, rateLimitInfo.window * 1000);
        
        // Get current status without incrementing again
        const currentStatus = customRateLimiter.storage.get(url) || { requests: [] };
        const currentRequests = currentStatus.requests.length;
        
        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit detected from server: ${rateLimitInfo.limit} requests/${rateLimitInfo.window}s`,
          url: url,
          method: method.toUpperCase(),
          clientIP,
          clientIPInfo,
          timestamp: new Date().toISOString(),
          responseStatus: response.status,
          responseTime: `${responseTime}ms`,
          detectedLimits: rateLimitInfo,
          customLimits: {
            configured: { limit: parseInt(limit), window: parseInt(window) },
            detected: { limit: rateLimitInfo.limit, window: rateLimitInfo.window },
            actual: { limit: rateLimitInfo.limit, window: rateLimitInfo.window },
            current: currentRequests,
            remaining: rateLimitInfo.limit - currentRequests
          },
          currentUsage: {
            requestCount: currentRequests,
            allowed: false
          },
          note: 'Server returned 429 - actual limits detected and applied'
        });
      }
    }
    
    // DON'T call checkLimit again here - it was already called in middleware
    // Get current status without incrementing
    const currentStatus = customRateLimiter.storage.get(url) || { requests: [] };
    const currentRequests = currentStatus.requests.filter(timestamp => 
      Date.now() - timestamp < (parseInt(window) * 1000)
    ).length;
    
    res.json({
      message: 'Custom endpoint test successful!',
      url: url,
      method: method.toUpperCase(),
      clientIP,
      clientIPInfo,
      timestamp: new Date().toISOString(),
      responseStatus: response.status,
      responseTime: `${responseTime}ms`,
      customLimits: {
        limit: parseInt(limit),
        window: parseInt(window),
        current: currentRequests,
        remaining: parseInt(limit) - currentRequests
      },
      currentUsage: {
        requestCount: currentRequests,
        allowed: true
      }
    });
  } catch (error) {
    // ...existing error handling without calling checkLimit again...
    const currentStatus = customRateLimiter.storage.get(url) || { requests: [] };
    const currentRequests = currentStatus.requests.length;
    
    res.json({
      message: 'Custom endpoint test completed (URL may be unreachable)',
      url: url,
      method: method.toUpperCase(),
      clientIP,
      clientIPInfo,
      timestamp: new Date().toISOString(),
      error: error.message,
      customLimits: {
        limit: parseInt(limit),
        window: parseInt(window),
        current: currentRequests,
        remaining: parseInt(limit) - currentRequests
      },
      currentUsage: {
        requestCount: currentRequests,
        allowed: true
      }
    });
  }
});

app.get('/monitor-urls', async (req, res) => {
  const data = urlRateLimiter.getAllIPs();
  const enriched = await Promise.all(
    data.map(async item => {
      const urlKey = item.ip;
      const meta = lastClientForURL.get(urlKey);
      const clientIP = meta?.clientIP;
      const clientIPInfo = meta?.clientIPInfo;
      return {
        ...item,
        url: urlKey,
        ip: undefined,
        lastRequest: item.lastRequest || null,
        clientIP: clientIP || null,
        clientIPInfo: clientIPInfo || null
      };
    })
  );
  res.json({
    endpoint: `/monitor-urls`,
    totalTrackedUrls: enriched.length,
    data: enriched.filter(i => i.url),
    refreshUrl: `http://localhost:${PORT}/monitor-urls`
  });
});

app.get('/monitor-custom', async (req, res) => {
  const data = customRateLimiter.getAllIPs();
  const enriched = await Promise.all(
    data.map(async item => {
      const urlKey = item.ip;
      const meta = lastClientForCustom.get(urlKey);
      return {
        ...item,
        url: urlKey,
        ip: undefined,
        lastRequest: item.lastRequest || null,
        clientIP: meta?.clientIP || null,
        clientIPInfo: meta?.clientIPInfo || null
      };
    })
  );
  res.json({
    endpoint: `/monitor-custom`,
    totalTrackedEndpoints: enriched.length,
    data: enriched.filter(i => i.url),
    refreshUrl: `http://localhost:${PORT}/monitor-custom`
  });
});

// Clear all data endpoint
app.post('/clear-data', (req, res) => {
  try {
    rateLimiter.storage.clear();
    urlRateLimiter.storage.clear();
    customRateLimiter.storage.clear();
    
    // Reset cumulative counters
    cumulativeCounts.ip = 0;
    cumulativeCounts.url = 0;
    cumulativeCounts.custom = 0;
    
    // Clear client tracking maps
    lastClientForURL.clear();
    lastClientForCustom.clear();
    
    res.json({
      message: 'All rate limiter data cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to clear data'
    });
  }
});

// Analytics endpoint
app.get('/analytics', (req, res) => {
  const urlData = urlRateLimiter.getAllIPs();
  const customData = customRateLimiter.getAllIPs();
  const analytics = {
    totalUrls: urlData.length,
    totalCustomEndpoints: customData.length,
    blockedUrls: urlData.filter(item => item.status === 'Blocked').length,
    blockedCustom: customData.filter(item => item.status === 'Blocked').length,
    // Use cumulative counts instead of window-based snapshot
    totalRequests: cumulativeCounts.ip + cumulativeCounts.url + cumulativeCounts.custom,
    breakdown: {
      ip: cumulativeCounts.ip,
      url: cumulativeCounts.url,
      custom: cumulativeCounts.custom
    },
    detectedLimits: urlData.filter(item => item.limits?.source === 'detected').length,
    timestamp: new Date().toISOString()
  };
  res.json(analytics);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Function to extract rate limit information from response headers
function extractRateLimitFromHeaders(headers, statusCode) {
  const rateLimitInfo = {
    limit: null,
    remaining: null,
    window: null,
    resetTime: null,
    source: 'unknown'
  };

  // Convert headers to lowercase for easier matching
  const headerMap = new Map();
  for (const [key, value] of headers.entries()) {
    headerMap.set(key.toLowerCase(), value);
  }

  // Enhanced header patterns with more variations
  const headerPatterns = [
    // GitHub, GitLab style
    { limit: 'x-ratelimit-limit', remaining: 'x-ratelimit-remaining', reset: 'x-ratelimit-reset', source: 'x-ratelimit' },
    // Twitter style
    { limit: 'x-rate-limit-limit', remaining: 'x-rate-limit-remaining', reset: 'x-rate-limit-reset', source: 'x-rate-limit' },
    // Standard RateLimit headers (RFC draft)
    { limit: 'ratelimit-limit', remaining: 'ratelimit-remaining', reset: 'ratelimit-reset', source: 'ratelimit' },
    // Cloudflare style
    { limit: 'cf-ratelimit-limit', remaining: 'cf-ratelimit-remaining', reset: 'cf-ratelimit-reset', source: 'cloudflare' },
    // AWS API Gateway style
    { limit: 'x-amzn-ratelimit-limit', remaining: 'x-amzn-ratelimit-remaining', reset: 'x-amzn-ratelimit-reset', source: 'aws' },
    // Shopify style
    { limit: 'x-shopify-shop-api-call-limit', remaining: null, reset: null, source: 'shopify' },
    // Stripe style
    { limit: 'stripe-ratelimit-limit', remaining: 'stripe-ratelimit-remaining', reset: 'stripe-ratelimit-reset', source: 'stripe' }
  ];

  for (const pattern of headerPatterns) {
    const limit = headerMap.get(pattern.limit);
    const remaining = pattern.remaining ? headerMap.get(pattern.remaining) : null;
    const reset = pattern.reset ? headerMap.get(pattern.reset) : null;

    if (limit) {
      // Handle Shopify's special format "current/limit"
      if (pattern.source === 'shopify' && limit.includes('/')) {
        const [current, maxLimit] = limit.split('/');
        rateLimitInfo.limit = parseInt(maxLimit);
        rateLimitInfo.remaining = parseInt(maxLimit) - parseInt(current);
      } else {
        rateLimitInfo.limit = parseInt(limit);
        rateLimitInfo.remaining = remaining ? parseInt(remaining) : null;
      }
      
      rateLimitInfo.source = pattern.source;

      // Calculate window based on reset time
      if (reset) {
        const resetTimestamp = parseInt(reset);
        const now = Math.floor(Date.now() / 1000);
        
        // If reset is a Unix timestamp
        if (resetTimestamp > 1000000000 && resetTimestamp > now) {
          rateLimitInfo.window = resetTimestamp - now;
          rateLimitInfo.resetTime = new Date(resetTimestamp * 1000).toISOString();
        } else if (resetTimestamp < 86400) {
          // If reset is seconds from now
          rateLimitInfo.window = resetTimestamp;
          rateLimitInfo.resetTime = new Date(Date.now() + resetTimestamp * 1000).toISOString();
        }
      }

      // Default window if not detected but we have limits
      if (!rateLimitInfo.window) {
        rateLimitInfo.window = 3600; // 1 hour default
      }

      break;
    }
  }

  // Check for Retry-After header (usually present when rate limited)
  const retryAfter = headerMap.get('retry-after');
  if (retryAfter && statusCode === 429) {
    rateLimitInfo.window = parseInt(retryAfter);
    if (!rateLimitInfo.limit) {
      rateLimitInfo.limit = 10; // Conservative estimate when rate limited
    }
    rateLimitInfo.source = 'retry-after-429';
  }

  // Check for other common rate limit indicators
  if (!rateLimitInfo.limit) {
    // Some APIs use custom headers
    const customHeaders = [
      'x-rps-limit', 'x-requests-per-second', 'x-quota-limit', 
      'api-rate-limit', 'rate-limit', 'x-api-rate-limit'
    ];
    
    for (const header of customHeaders) {
      const value = headerMap.get(header);
      if (value && !isNaN(parseInt(value))) {
        rateLimitInfo.limit = parseInt(value);
        rateLimitInfo.window = 3600; // Assume hourly if not specified
        rateLimitInfo.source = `custom-${header}`;
        break;
      }
    }
  }

  return rateLimitInfo;
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
