class RateLimiter {
  constructor() {
    this.storage = new Map();
    this.customLimits = new Map(); // Store custom limits per identifier
    this.WINDOW_SIZE = 60 * 1000; // Default: 60 seconds in milliseconds
    this.MAX_REQUESTS = 3; // Default: 3 requests
    
    // Clean up expired entries every 30 seconds
    setInterval(() => this.cleanup(), 30000);
  }
  
  // Set custom limits for a specific identifier (IP or URL)
  setCustomLimits(identifier, maxRequests, windowSize) {
    this.customLimits.set(identifier, {
      maxRequests,
      windowSize
    });
  }
  
  // Get limits for a specific identifier
  getLimits(identifier) {
    const custom = this.customLimits.get(identifier);
    return {
      maxRequests: custom?.maxRequests || this.MAX_REQUESTS,
      windowSize: custom?.windowSize || this.WINDOW_SIZE
    };
  }
  
  // Get existing limits for a specific identifier (without defaults)
  getExistingLimits(identifier) {
    return this.customLimits.get(identifier);
  }

  checkLimit(identifier) {
    const now = Date.now();
    const { maxRequests, windowSize } = this.getLimits(identifier);
    
    const ipData = this.storage.get(identifier) || {
      requests: [],
      blocked: false,
      blockedUntil: 0,
      lastRequest: null
    };
    
    // Check if identifier is currently blocked
    if (ipData.blocked && now < ipData.blockedUntil) {
      const timeLeft = Math.ceil((ipData.blockedUntil - now) / 1000);
      return {
        allowed: false,
        timeLeft,
        currentRequests: ipData.requests.length
      };
    }
    
    // Unblock if cooldown period has passed
    if (ipData.blocked && now >= ipData.blockedUntil) {
      ipData.blocked = false;
      ipData.blockedUntil = 0;
      ipData.requests = [];
    }
    
    // Filter out requests outside the current window
    ipData.requests = ipData.requests.filter(timestamp => 
      now - timestamp < windowSize
    );
    
    // Check if adding this request would exceed the limit
    if (ipData.requests.length >= maxRequests) {
      // Block the identifier
      ipData.blocked = true;
      ipData.blockedUntil = now + windowSize;
      this.storage.set(identifier, ipData);
      
      const timeLeft = Math.ceil(windowSize / 1000);
      return {
        allowed: false,
        timeLeft,
        currentRequests: ipData.requests.length
      };
    }
    
    // Add current request
    ipData.requests.push(now);
    ipData.lastRequest = new Date().toISOString();
    this.storage.set(identifier, ipData);
    
    return {
      allowed: true,
      currentRequests: ipData.requests.length
    };
  }
  
  getAllIPs() {
    const now = Date.now();
    const result = [];
    
    for (const [identifier, data] of this.storage.entries()) {
      const { maxRequests, windowSize } = this.getLimits(identifier);
      
      // Filter requests in current window
      const currentRequests = data.requests.filter(timestamp => 
        now - timestamp < windowSize
      ).length;
      
      let status = 'Active';
      let timeLeft = 0;
      
      if (data.blocked && now < data.blockedUntil) {
        status = 'Blocked';
        timeLeft = Math.ceil((data.blockedUntil - now) / 1000);
      } else if (data.blocked && now >= data.blockedUntil) {
        // Update storage to reflect unblocked status
        data.blocked = false;
        data.blockedUntil = 0;
        data.requests = data.requests.filter(timestamp => 
          now - timestamp < windowSize
        );
      }
      
      const customLimits = this.customLimits.get(identifier);
      
      result.push({
        ip: identifier,
        requestCount: currentRequests,
        status,
        timeLeft,
        lastRequest: data.lastRequest,
        limits: {
          maxRequests,
          windowSeconds: Math.floor(windowSize / 1000),
          source: customLimits ? 'detected' : 'default'
        }
      });
    }
    
    return result;
  }
  
  cleanup() {
    const now = Date.now();
    
    for (const [identifier, data] of this.storage.entries()) {
      const { windowSize } = this.getLimits(identifier);
      
      // Remove old requests
      data.requests = data.requests.filter(timestamp => 
        now - timestamp < windowSize
      );
      
      // Remove entries that are no longer blocked and have no recent requests
      if (!data.blocked && data.requests.length === 0) {
        this.storage.delete(identifier);
        this.customLimits.delete(identifier); // Also clean up custom limits
      }
    }
  }
}

module.exports = RateLimiter;
