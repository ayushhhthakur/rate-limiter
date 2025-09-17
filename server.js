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

app.get('/home', rateLimitMiddleware, (req, res) => {
  const clientIP = getClientIP(req);
  res.json({
    message: 'Welcome to the home page!',
    ip: clientIP,
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
      // Default limits if none detected - more conservative for unknown APIs
      urlRateLimiter.setCustomLimits(url, 60, 3600000); // 60 requests per hour as default
    }
    
    // Now check the rate limit after setting it
    const limitResult = urlRateLimiter.checkLimit(url);
    
    // Try to get response body for additional info
    let responseData = null;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
    
    res.json({
      message: limitResult.allowed ? 'URL request successful!' : 'Rate limit detected and applied',
      url: url,
      method: method.toUpperCase(),
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
        requestCount: limitResult.currentRequests,
        allowed: limitResult.allowed
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
    // Still count as a rate limit test even if URL fails
    urlRateLimiter.setCustomLimits(url, 60, 3600000); // Default fallback
    const limitResult = urlRateLimiter.checkLimit(url);
    
    res.json({
      message: 'Rate limit test completed (URL may be unreachable)',
      url: url,
      method: method.toUpperCase(),
      timestamp: new Date().toISOString(),
      error: error.message,
      rateLimitInfo: {
        detected: { limit: null, window: null, source: 'failed_request', error: error.message },
        applied: { limit: 60, window: 3600 } // Default fallback
      },
      currentUsage: {
        requestCount: limitResult.currentRequests,
        allowed: limitResult.allowed
      }
    });
  }
});

app.post('/test-custom', customRateLimitMiddleware, async (req, res) => {
  const { url, method = 'GET', limit = 10, window = 60 } = req.body;
  
  try {
    // Make actual request to the URL
    const startTime = Date.now();
    
    const fetchOptions = {
      method: method.toUpperCase(),
      headers: {
        'User-Agent': 'Rate-Limiter-Custom-Test/1.0',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000 // 10 second timeout
    };

    // Add body for POST/PUT/PATCH methods
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
    
    // Now check the rate limit after making the request
    const limitResult = customRateLimiter.checkLimit(url);
    
    res.json({
      message: 'Custom endpoint test successful!',
      url: url,
      method: method.toUpperCase(),
      timestamp: new Date().toISOString(),
      responseStatus: response.status,
      responseTime: `${responseTime}ms`,
      customLimits: {
        limit: parseInt(limit),
        window: parseInt(window),
        current: limitResult.currentRequests,
        remaining: parseInt(limit) - limitResult.currentRequests
      },
      currentUsage: {
        requestCount: limitResult.currentRequests,
        allowed: limitResult.allowed
      }
    });
  } catch (error) {
    // Still count as a rate limit test even if URL fails
    const limitResult = customRateLimiter.checkLimit(url);
    
    res.json({
      message: 'Custom endpoint test completed (URL may be unreachable)',
      url: url,
      method: method.toUpperCase(),
      timestamp: new Date().toISOString(),
      error: error.message,
      customLimits: {
        limit: parseInt(limit),
        window: parseInt(window),
        current: limitResult.currentRequests,
        remaining: parseInt(limit) - limitResult.currentRequests
      },
      currentUsage: {
        requestCount: limitResult.currentRequests,
        allowed: limitResult.allowed
      }
    });
  }
});

app.get('/monitor-urls', (req, res) => {
  const data = urlRateLimiter.getAllIPs(); // Reusing same method, but for URLs
  res.json({
    endpoint: `/monitor-urls`,
    totalTrackedUrls: data.length,
    data: data.map(item => ({
      ...item,
      url: item.ip, // ip field contains URL
      ip: undefined, // Remove ip field for clarity
      lastRequest: item.lastRequest || null
    })).filter(item => item.url), // Only return items with URLs
    refreshUrl: `http://localhost:${PORT}/monitor-urls`
  });
});

app.get('/monitor-custom', (req, res) => {
  const data = customRateLimiter.getAllIPs(); // Reusing same method, but for custom endpoints
  res.json({
    endpoint: `/monitor-custom`,
    totalTrackedEndpoints: data.length,
    data: data.map(item => ({
      ...item,
      url: item.ip, // ip field contains URL
      ip: undefined, // Remove ip field for clarity
      lastRequest: item.lastRequest || null
    })).filter(item => item.url), // Only return items with URLs
    refreshUrl: `http://localhost:${PORT}/monitor-custom`
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
