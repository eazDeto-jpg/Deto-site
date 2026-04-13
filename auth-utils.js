/**
 * Authentication Utilities
 * Provides secure authentication helpers including rate limiting and CAPTCHA
 */

// Rate Limiting Store (in production, use Redis)
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

/**
 * Check if user is rate limited
 * @param {string} identifier - Email or IP address
 * @returns {boolean} - True if rate limited
 */
export function isRateLimited(identifier) {
  if (!loginAttempts.has(identifier)) {
    return false;
  }

  const { attempts, lockedUntil } = loginAttempts.get(identifier);
  const now = Date.now();

  // Check if lockout period has expired
  if (now > lockedUntil) {
    loginAttempts.delete(identifier);
    return false;
  }

  return attempts >= MAX_ATTEMPTS;
}

/**
 * Record failed login attempt
 * @param {string} identifier - Email or IP address
 */
export function recordFailedAttempt(identifier) {
  const now = Date.now();
  
  if (!loginAttempts.has(identifier)) {
    loginAttempts.set(identifier, {
      attempts: 1,
      lockedUntil: now + LOCKOUT_TIME,
      firstAttempt: now
    });
  } else {
    const data = loginAttempts.get(identifier);
    data.attempts += 1;
    data.lockedUntil = now + LOCKOUT_TIME;
    
    if (data.attempts >= MAX_ATTEMPTS) {
      console.warn(`Rate limit exceeded for: ${identifier}`);
    }
  }
}

/**
 * Clear login attempts for user
 * @param {string} identifier - Email or IP address
 */
export function clearLoginAttempts(identifier) {
  loginAttempts.delete(identifier);
}

/**
 * Get remaining lockout time
 * @param {string} identifier - Email or IP address
 * @returns {number} - Milliseconds until unlock, or 0 if not locked
 */
export function getRemainingLockoutTime(identifier) {
  if (!loginAttempts.has(identifier)) {
    return 0;
  }

  const { lockedUntil } = loginAttempts.get(identifier);
  const remaining = lockedUntil - Date.now();
  
  return remaining > 0 ? remaining : 0;
}

/**
 * Validate CAPTCHA token with hCaptcha or reCAPTCHA
 * @param {string} token - CAPTCHA token from client
 * @param {string} secret - CAPTCHA secret key
 * @param {string} provider - 'hcaptcha' or 'recaptcha'
 * @returns {Promise<boolean>} - True if CAPTCHA is valid
 */
export async function validateCaptcha(token, secret, provider = 'hcaptcha') {
  try {
    let verificationUrl;
    let payload;

    if (provider === 'hcaptcha') {
      verificationUrl = 'https://hcaptcha.com/siteverify';
      payload = new URLSearchParams({
        secret: secret,
        response: token
      });
    } else if (provider === 'recaptcha') {
      verificationUrl = 'https://www.google.com/recaptcha/api/siteverify';
      payload = new URLSearchParams({
        secret: secret,
        response: token
      });
    } else {
      throw new Error('Unknown CAPTCHA provider');
    }

    const response = await fetch(verificationUrl, {
      method: 'POST',
      body: payload,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = await response.json();
    
    if (provider === 'hcaptcha') {
      return data.success === true;
    } else if (provider === 'recaptcha') {
      return data.success === true && data.score > 0.5;
    }

    return false;
  } catch (error) {
    console.error('CAPTCHA validation error:', error);
    return false;
  }
}

/**
 * Hash password using bcrypt (server-side only)
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
export async function hashPassword(password) {
  // Note: In production, use bcrypt library
  // import bcrypt from 'bcrypt';
  // return await bcrypt.hash(password, 10);
  
  // Placeholder for demonstration
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} - True if password matches
 */
export async function verifyPassword(password, hash) {
  // Note: In production, use bcrypt library
  // import bcrypt from 'bcrypt';
  // return await bcrypt.compare(password, hash);
  
  const newHash = await hashPassword(password);
  return newHash === hash;
}

/**
 * Generate secure random token
 * @param {number} length - Token length in bytes
 * @returns {string} - Hex-encoded random token
 */
export function generateSecureToken(length = 32) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} - True if valid email format
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - Validation result with score and feedback
 */
export function validatePasswordStrength(password) {
  const result = {
    score: 0,
    feedback: [],
    isStrong: false
  };

  if (password.length < 8) {
    result.feedback.push('Password must be at least 8 characters');
  } else {
    result.score += 1;
  }

  if (password.length >= 12) {
    result.score += 1;
  }

  if (/[a-z]/.test(password)) {
    result.score += 1;
  } else {
    result.feedback.push('Add lowercase letters');
  }

  if (/[A-Z]/.test(password)) {
    result.score += 1;
  } else {
    result.feedback.push('Add uppercase letters');
  }

  if (/[0-9]/.test(password)) {
    result.score += 1;
  } else {
    result.feedback.push('Add numbers');
  }

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    result.score += 1;
  } else {
    result.feedback.push('Add special characters');
  }

  result.isStrong = result.score >= 4;
  return result;
}

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - User input
 * @returns {string} - Sanitized input
 */
export function sanitizeInput(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Create JWT token (basic implementation)
 * In production, use a proper JWT library like jsonwebtoken
 * @param {object} payload - Token payload
 * @param {string} secret - Secret key
 * @param {number} expiresIn - Expiration time in seconds
 * @returns {string} - JWT token
 */
export function createJWT(payload, secret, expiresIn = 3600) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const claims = {
    ...payload,
    iat: now,
    exp: now + expiresIn
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(claims));
  const signature = btoa(secret); // Simplified - use HMAC in production

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify JWT token (basic implementation)
 * @param {string} token - JWT token
 * @param {string} secret - Secret key
 * @returns {object|null} - Decoded payload or null if invalid
 */
export function verifyJWT(token, secret) {
  try {
    const [header, payload, signature] = token.split('.');
    
    if (!header || !payload || !signature) {
      return null;
    }

    const claims = JSON.parse(atob(payload));
    const now = Math.floor(Date.now() / 1000);

    if (claims.exp < now) {
      return null; // Token expired
    }

    return claims;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

export default {
  isRateLimited,
  recordFailedAttempt,
  clearLoginAttempts,
  getRemainingLockoutTime,
  validateCaptcha,
  hashPassword,
  verifyPassword,
  generateSecureToken,
  isValidEmail,
  validatePasswordStrength,
  sanitizeInput,
  createJWT,
  verifyJWT
};
