/**
 * VSC — Video Speed Controller
 * Utility functions for common operations
 */

(function() {
  'use strict';

  // Debounce function to limit rapid calls
  window.VSC = window.VSC || {};
  window.VSC.utils = {
    
    /**
     * Debounce a function call
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @param {boolean} immediate - Execute immediately on first call
     * @returns {Function} Debounced function
     */
    debounce(func, wait, immediate = false) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          timeout = null;
          if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
      };
    },

    /**
     * Check if user is currently typing in an input field
     * @param {Element} target - Target element to check
     * @returns {boolean} True if typing in input
     */
    isTyping(target) {
      if (!target) return false;
      
      const tagName = target.tagName?.toLowerCase();
      const isInput = tagName === 'input' || tagName === 'textarea';
      const isContentEditable = target.contentEditable === 'true';
      const isSelect = tagName === 'select';
      
      return isInput || isContentEditable || isSelect;
    },

    /**
     * Format number to specified decimal places
     * @param {number} num - Number to format
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted number string
     */
    formatNumber(num, decimals = 2) {
      return Number(num).toFixed(decimals);
    },

    /**
     * Format time in seconds to MM:SS format
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time string
     */
    formatTime(seconds) {
      if (typeof seconds !== 'number' || !isFinite(seconds)) {
        return '0:00';
      }
      
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    },

    /**
     * Check if element is visible in viewport
     * @param {Element} element - Element to check
     * @returns {boolean} True if element is visible
     */
    isElementVisible(element) {
      if (!element) return false;
      
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.opacity !== '0'
      );
    },

    /**
     * Get element's intersection ratio with viewport
     * @param {Element} element - Element to check
     * @returns {number} Intersection ratio (0-1)
     */
    getIntersectionRatio(element) {
      if (!element) return 0;
      
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
      const visibleWidth = Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0);
      
      if (visibleHeight <= 0 || visibleWidth <= 0) return 0;
      
      const visibleArea = visibleHeight * visibleWidth;
      const totalArea = rect.height * rect.width;
      
      return totalArea > 0 ? visibleArea / totalArea : 0;
    },

    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    },

    /**
     * Get current domain from URL
     * @param {string} url - URL to extract domain from
     * @returns {string} Domain name
     */
    getDomain(url = window.location.href) {
      try {
        return new URL(url).origin;
      } catch (e) {
        return window.location.origin;
      }
    },

    /**
     * Check if current domain is in disabled list
     * @param {Array} disabledDomains - List of disabled domains
     * @returns {boolean} True if domain is disabled
     */
    isDomainDisabled(disabledDomains = []) {
      const currentDomain = this.getDomain();
      return disabledDomains.some(domain => 
        currentDomain === domain || currentDomain.endsWith('.' + domain)
      );
    },

    /**
     * Create a unique ID for elements
     * @returns {string} Unique ID
     */
    createId() {
      return 'vsc_' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Safe JSON parse with fallback
     * @param {string} str - JSON string to parse
     * @param {*} fallback - Fallback value if parsing fails
     * @returns {*} Parsed object or fallback
     */
    safeJsonParse(str, fallback = null) {
      try {
        return JSON.parse(str);
      } catch (e) {
        return fallback;
      }
    },

    /**
     * Check if browser supports required APIs
     * @returns {Object} Support status for various APIs
     */
    checkBrowserSupport() {
      return {
        shadowDom: typeof ShadowRoot !== 'undefined',
        mutationObserver: typeof MutationObserver !== 'undefined',
        intersectionObserver: typeof IntersectionObserver !== 'undefined',
        resizeObserver: typeof ResizeObserver !== 'undefined',
        customElements: typeof customElements !== 'undefined'
      };
    },

    /**
     * Log debug message (only in development)
     * @param {...any} args - Arguments to log
     */
    debug(...args) {
      if (window.VSC_DEBUG) {
        console.log('[VSC]', ...args);
      }
    },

    /**
     * Log error message
     * @param {...any} args - Arguments to log
     */
    error(...args) {
      console.error('[VSC]', ...args);
    }
  };

})();
