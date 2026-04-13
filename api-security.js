/**
 * API Security Middleware and Utilities
 * Provides CORS, authentication, validation, and rate limiting for APIs
 */

/**
 * CORS Configuration
 * Define allowed origins and methods
 */
export const corsConfig = {
  allowedOrigins: [
    'https://deto.site',
    'https://www.deto.site',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Detailer-Token', 'X-Admin-Secret'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

/**
 * Validate CORS request
 * @param {string} origin - Request origin
 * @returns {boolean} - True if origin is allowed
 */
export function isOriginAllowed(origin) {
  return corsConfig.allowedOrigins.includes(origin);
}

/**
 * Get CORS headers for response
 * @param {string} origin - Request origin
 * @returns {object} - CORS headers
 */
export function getCorsHeaders(origin) {
  const headers = {};
  
  if (isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Access-Control-Allow-Methods'] = corsConfig.allowedMethods.join(', ');
    headers['Access-Control-Allow-Headers'] = corsConfig.allowedHeaders.join(', ');
    headers['Access-Control-Max-Age'] = corsConfig.maxAge.toString();
  }
  
  return headers;
}

/**
 * Validate API request input
 * @param {object} data - Request data
 * @param {object} schema - Validation schema
 * @returns {object} - Validation result
 */
export function validateInput(data, schema) {
  const errors = {};
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    // Check if required
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors[field] = `${field} is required`;
      continue;
    }
    
    // Skip validation if not required and empty
    if (!rules.required && (value === undefined || value === null || value === '')) {
      continue;
    }
    
    // Validate type
    if (rules.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rules.type) {
        errors[field] = `${field} must be ${rules.type}`;
        continue;
      }
    }
    
    // Validate length
    if (rules.minLength && value.length < rules.minLength) {
      errors[field] = `${field} must be at least ${rules.minLength} characters`;
    }
    
    if (rules.maxLength && value.length > rules.maxLength) {
      errors[field] = `${field} must be at most ${rules.maxLength} characters`;
    }
    
    // Validate pattern (regex)
    if (rules.pattern && !rules.pattern.test(value)) {
      errors[field] = `${field} has invalid format`;
    }
    
    // Validate enum
    if (rules.enum && !rules.enum.includes(value)) {
      errors[field] = `${field} must be one of: ${rules.enum.join(', ')}`;
    }
    
    // Validate custom function
    if (rules.validate && !rules.validate(value)) {
      errors[field] = rules.validateMessage || `${field} is invalid`;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Sanitize output to prevent XSS
 * @param {any} data - Data to sanitize
 * @returns {any} - Sanitized data
 */
export function sanitizeOutput(data) {
  if (typeof data === 'string') {
    return data
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      return data.map(item => sanitizeOutput(item));
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeOutput(value);
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Verify API authentication token
 * @param {string} token - Authentication token
 * @param {string} type - Token type ('admin', 'detailer', 'bearer')
 * @returns {object|null} - Decoded token or null if invalid
 */
export function verifyToken(token, type = 'bearer') {
  if (!token) {
    return null;
  }
  
  try {
    // For bearer tokens (JWT)
    if (type === 'bearer') {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      
      // Decode payload (without verification - do this server-side)
      const payload = JSON.parse(atob(parts[1]));
      
      // Check expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }
      
      return payload;
    }
    
    // For custom tokens
    if (type === 'custom') {
      // Implement your custom token verification logic
      return { token };
    }
    
    return null;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

/**
 * Create error response
 * @param {number} status - HTTP status code
 * @param {string} message - Error message
 * @param {object} details - Additional error details
 * @returns {object} - Error response object
 */
export function createErrorResponse(status, message, details = {}) {
  return {
    status,
    error: {
      message,
      ...details
    }
  };
}

/**
 * Create success response
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @returns {object} - Success response object
 */
export function createSuccessResponse(data, message = 'Success') {
  return {
    status: 200,
    data,
    message
  };
}

/**
 * Log API request
 * @param {object} request - Request object
 * @param {object} response - Response object
 * @param {number} duration - Request duration in ms
 */
export function logApiRequest(request, response, duration) {
  const log = {
    timestamp: new Date().toISOString(),
    method: request.method,
    path: request.path,
    status: response.status,
    duration: `${duration}ms`,
    ip: request.ip,
    userAgent: request.userAgent
  };
  
  console.log(JSON.stringify(log));
}

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} - True if valid
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid
 */
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate UUID
 * @param {string} uuid - UUID to validate
 * @returns {boolean} - True if valid
 */
export function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate phone number
 * @param {string} phone - Phone number
 * @returns {boolean} - True if valid
 */
export function isValidPhone(phone) {
  const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Rate limit checker (simple in-memory implementation)
 */
export class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  isAllowed(identifier) {
    const now = Date.now();
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }
    
    const requests = this.requests.get(identifier);
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    this.requests.set(identifier, validRequests);
    
    // Check if limit exceeded
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    return true;
  }

  getRemainingRequests(identifier) {
    const requests = this.requests.get(identifier) || [];
    return Math.max(0, this.maxRequests - requests.length);
  }

  reset(identifier) {
    this.requests.delete(identifier);
  }
}

/**
 * Input sanitization for database queries
 * @param {string} input - User input
 * @returns {string} - Sanitized input
 */
export function sanitizeForDatabase(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  return input
    .replace(/'/g, "''")
    .replace(/\\/g, '\\\\')
    .slice(0, 1000); // Limit length
}

export default {
  corsConfig,
  isOriginAllowed,
  getCorsHeaders,
  validateInput,
  sanitizeOutput,
  verifyToken,
  createErrorResponse,
  createSuccessResponse,
  logApiRequest,
  isValidEmail,
  isValidUrl,
  isValidUUID,
  isValidPhone,
  RateLimiter,
  sanitizeForDatabase
};
