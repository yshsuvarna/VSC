/**
 * VSC — Video Speed Controller
 * Page world bridge for advanced features
 * This script runs in the page world to intercept native APIs
 */

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.__VSC_PAGE_BRIDGE_INJECTED) {
    return;
  }
  window.__VSC_PAGE_BRIDGE_INJECTED = true;

  // Namespace for VSC page world functionality
  window.__VSC = window.__VSC || {
    preferredRate: null,
    originalPlaybackRate: null,
    isEnabled: false,
    mediaElements: new WeakMap()
  };

  /**
   * Store original playbackRate property descriptor
   */
  function storeOriginalPlaybackRate() {
    if (window.__VSC.originalPlaybackRate) return;

    const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'playbackRate');
    if (descriptor) {
      window.__VSC.originalPlaybackRate = {
        get: descriptor.get,
        set: descriptor.set,
        configurable: descriptor.configurable,
        enumerable: descriptor.enumerable
      };
    }
  }

  /**
   * Create guarded playbackRate setter
   */
  function createGuardedSetter() {
    return function(value) {
      const media = this;
      
      // Store the attempted rate
      window.__VSC.mediaElements.set(media, {
        attemptedRate: value,
        timestamp: Date.now()
      });

      // If VSC is controlling this media, respect preferred rate
      if (window.__VSC.isEnabled && window.__VSC.preferredRate !== null) {
        // Check if this is a VSC-initiated change (within last 100ms)
        const mediaData = window.__VSC.mediaElements.get(media);
        const isRecentVSCChange = mediaData && (Date.now() - mediaData.timestamp) < 100;
        
        if (!isRecentVSCChange) {
          // This is likely a site trying to reset the rate
          // Apply our preferred rate instead
          if (window.__VSC.originalPlaybackRate && window.__VSC.originalPlaybackRate.set) {
            window.__VSC.originalPlaybackRate.set.call(media, window.__VSC.preferredRate);
          } else {
            media.playbackRate = window.__VSC.preferredRate;
          }
          return;
        }
      }

      // Apply the original setter
      if (window.__VSC.originalPlaybackRate && window.__VSC.originalPlaybackRate.set) {
        window.__VSC.originalPlaybackRate.set.call(media, value);
      } else {
        media.playbackRate = value;
      }
    };
  }

  /**
   * Create guarded playbackRate getter
   */
  function createGuardedGetter() {
    return function() {
      if (window.__VSC.originalPlaybackRate && window.__VSC.originalPlaybackRate.get) {
        return window.__VSC.originalPlaybackRate.get.call(this);
      }
      return this.playbackRate;
    };
  }

  /**
   * Patch HTMLMediaElement.prototype.playbackRate
   */
  function patchPlaybackRate() {
    try {
      storeOriginalPlaybackRate();
      
      Object.defineProperty(HTMLMediaElement.prototype, 'playbackRate', {
        get: createGuardedGetter(),
        set: createGuardedSetter(),
        configurable: true,
        enumerable: true
      });

      console.log('[VSC] PlaybackRate patched successfully');
    } catch (error) {
      console.error('[VSC] Failed to patch playbackRate:', error);
    }
  }

  /**
   * Restore original playbackRate
   */
  function restorePlaybackRate() {
    try {
      if (window.__VSC.originalPlaybackRate) {
        Object.defineProperty(HTMLMediaElement.prototype, 'playbackRate', window.__VSC.originalPlaybackRate);
        console.log('[VSC] PlaybackRate restored');
      }
    } catch (error) {
      console.error('[VSC] Failed to restore playbackRate:', error);
    }
  }

  /**
   * Handle messages from content script
   */
  function handleMessage(event) {
    if (event.source !== window || !event.data || event.data.type !== 'VSC_PAGE_BRIDGE') {
      return;
    }

    const { action, data } = event.data;

    switch (action) {
      case 'SET_PREFERRED_RATE':
        window.__VSC.preferredRate = data.rate;
        window.__VSC.isEnabled = data.enabled;
        break;

      case 'ENABLE_PATCH':
        window.__VSC.isEnabled = true;
        if (!window.__VSC.originalPlaybackRate) {
          patchPlaybackRate();
        }
        break;

      case 'DISABLE_PATCH':
        window.__VSC.isEnabled = false;
        break;

      case 'RESTORE_PATCH':
        restorePlaybackRate();
        window.__VSC.originalPlaybackRate = null;
        break;
    }
  }

  /**
   * Setup keyboard event interception
   */
  function setupKeyboardInterception() {
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (type === 'keydown' && typeof listener === 'function') {
        const wrappedListener = function(event) {
          // Check if this is one of our target keys
          const vscKeys = ['KeyS', 'KeyD', 'KeyR', 'KeyZ', 'KeyX', 'KeyV'];
          
          if (vscKeys.includes(event.code) && !window.__VSC.isTyping(event.target)) {
            // Let VSC handle this key
            event.stopImmediatePropagation();
            return;
          }
          
          // Call original listener
          return listener.call(this, event);
        };
        
        return originalAddEventListener.call(this, type, wrappedListener, options);
      }
      
      return originalAddEventListener.call(this, type, listener, options);
    };
  }

  /**
   * Check if user is typing in an input field
   */
  window.__VSC.isTyping = function(target) {
    if (!target) return false;
    
    const tagName = target.tagName?.toLowerCase();
    const isInput = tagName === 'input' || tagName === 'textarea';
    const isContentEditable = target.contentEditable === 'true';
    const isSelect = tagName === 'select';
    
    return isInput || isContentEditable || isSelect;
  };

  /**
   * Initialize page bridge
   */
  function init() {
    // Listen for messages from content script
    window.addEventListener('message', handleMessage);

    // Setup keyboard interception if needed
    if (window.__VSC.forceKeys) {
      setupKeyboardInterception();
    }

    // Notify content script that bridge is ready
    window.postMessage({
      type: 'VSC_PAGE_BRIDGE_READY',
      source: 'page-bridge'
    }, '*');

    console.log('[VSC] Page bridge initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose API for content script
  window.__VSC_API = {
    setPreferredRate: (rate) => {
      window.__VSC.preferredRate = rate;
    },
    enable: () => {
      window.__VSC.isEnabled = true;
    },
    disable: () => {
      window.__VSC.isEnabled = false;
    },
    patch: patchPlaybackRate,
    restore: restorePlaybackRate
  };

})();
