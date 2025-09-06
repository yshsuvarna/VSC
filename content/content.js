/**
 * VSC — Video Speed Controller
 * Main content script
 */

(function() {
  'use strict';

  // Prevent multiple initializations
  if (window.VSC_INITIALIZED) {
    return;
  }
  window.VSC_INITIALIZED = true;

  window.VSC = window.VSC || {};
  window.VSC.content = {
    
    _isInitialized: false,
    _mutationObserver: null,
    _mediaElements: new Set(),

    /**
     * Initialize the content script
     */
    async init() {
      if (this._isInitialized) return;

      try {
        // Check browser support
        const support = window.VSC.utils.checkBrowserSupport();
        if (!support.shadowDom || !support.mutationObserver) {
          window.VSC.utils.error('Browser does not support required APIs');
          return;
        }

        // Check if domain is disabled
        const isDisabled = await window.VSC.state.isCurrentDomainDisabled();
        if (isDisabled) {
          window.VSC.utils.debug('Extension disabled on this domain');
          return;
        }

        // Load settings
        await window.VSC.state.loadSettings();

        // Initialize keyboard handling
        window.VSC.keys.init();
        window.VSC.keys.onSettingsChange();

        // Start media discovery
        this.startMediaDiscovery();

        // Setup page world injection if needed
        await this.setupPageWorldInjection();

        this._isInitialized = true;
        window.VSC.utils.debug('Content script initialized');

      } catch (error) {
        window.VSC.utils.error('Failed to initialize content script:', error);
      }
    },

    /**
     * Start media discovery with MutationObserver
     */
    startMediaDiscovery() {
      // Find existing media elements
      this.discoverMedia();

      // Setup mutation observer for new media
      this._mutationObserver = new MutationObserver((mutations) => {
        let shouldCheck = false;
        
        mutations.forEach((mutation) => {
          // Check for added nodes
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if node is media element
              if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO') {
                shouldCheck = true;
              }
              // Check if node contains media elements
              else if (node.querySelector && (node.querySelector('video') || node.querySelector('audio'))) {
                shouldCheck = true;
              }
            }
          });

          // Check for attribute changes that might affect media
          if (mutation.type === 'attributes') {
            const target = mutation.target;
            if (target.tagName === 'VIDEO' || target.tagName === 'AUDIO') {
              shouldCheck = true;
            }
          }
        });

        if (shouldCheck) {
          // Debounce discovery to avoid excessive calls
          this._discoverDebounced = window.VSC.utils.debounce(() => {
            this.discoverMedia();
          }, 100);
          this._discoverDebounced();
        }
      });

      // Start observing
      this._mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'data-src', 'poster']
      });

      window.VSC.utils.debug('Media discovery started');
    },

    /**
     * Discover and setup media elements
     */
    async discoverMedia() {
      const settings = await window.VSC.state.loadSettings();
      const allMedia = window.VSC.media.findAllMedia();

      // Process each media element
      for (const media of allMedia) {
        if (this._mediaElements.has(media)) {
          continue; // Already processed
        }

        // Check if audio is enabled
        if (media.tagName === 'AUDIO' && !settings.includeAudio) {
          continue;
        }

        // Skip if already has VSC overlay
        if (media._vscOverlay) {
          continue;
        }

        try {
          await this.setupMediaElement(media);
          this._mediaElements.add(media);
        } catch (error) {
          window.VSC.utils.error('Failed to setup media element:', error);
        }
      }

      // Clean up removed media elements
      this.cleanupRemovedMedia();
    },

    /**
     * Setup a media element with overlay and event listeners
     * @param {HTMLMediaElement} media - Media element to setup
     */
    async setupMediaElement(media) {
      // Create overlay
      const overlay = window.VSC.dom.createOverlay(media);
      
      // Register with media manager
      window.VSC.media.registerMedia(media, overlay);
      
      // Setup anti-reset protection
      if (await this.shouldUseAntiReset()) {
        window.VSC.media.setupAntiReset(media);
      }

      // Setup event listeners
      this.setupMediaEventListeners(media);

      // Apply stored speed if needed
      await this.applyStoredSpeed(media);

      // Set pitch correction
      await this.setupPitchCorrection(media);

      window.VSC.utils.debug('Media element setup complete:', media);
    },

    /**
     * Setup event listeners for media element
     * @param {HTMLMediaElement} media - Media element
     */
    setupMediaEventListeners(media) {
      const entry = window.VSC.media.getMediaEntry(media);
      if (!entry) return;

      // Rate change handler
      const handleRateChange = () => {
        entry.overlay.updateSpeedDisplay();
      };

      // Loaded metadata handler
      const handleLoadedMetadata = async () => {
        await this.applyStoredSpeed(media);
        entry.overlay.updateSpeedDisplay();
      };

      // Source change handler
      const handleLoadStart = async () => {
        // Small delay to ensure new source is loaded
        setTimeout(async () => {
          await this.applyStoredSpeed(media);
        }, 100);
      };

      // Play/pause handlers for interaction tracking
      const handlePlay = () => {
        window.VSC.media.updateInteraction(media);
      };

      const handlePause = () => {
        window.VSC.media.updateInteraction(media);
      };

      // Add event listeners
      media.addEventListener('ratechange', handleRateChange);
      media.addEventListener('loadedmetadata', handleLoadedMetadata);
      media.addEventListener('loadstart', handleLoadStart);
      media.addEventListener('play', handlePlay);
      media.addEventListener('pause', handlePause);

      // Store cleanup function
      entry.cleanup = () => {
        media.removeEventListener('ratechange', handleRateChange);
        media.removeEventListener('loadedmetadata', handleLoadedMetadata);
        media.removeEventListener('loadstart', handleLoadStart);
        media.removeEventListener('play', handlePlay);
        media.removeEventListener('pause', handlePause);
      };
    },

    /**
     * Apply stored speed to media element
     * @param {HTMLMediaElement} media - Media element
     */
    async applyStoredSpeed(media) {
      const settings = await window.VSC.state.loadSettings();
      
      if (settings.rememberSpeed === 'off') {
        return;
      }

      const storedSpeed = await window.VSC.state.getStoredSpeed();
      if (storedSpeed && storedSpeed !== media.playbackRate) {
        window.VSC.media.applySpeed(media, storedSpeed, true);
        window.VSC.media.setPreferredSpeed(media, storedSpeed);
      }
    },

        /**
     * Setup pitch correction for media element
     * @param {HTMLMediaElement} media - Media element
     */
    async setupPitchCorrection(media) {
      try {
        const settings = await window.VSC.state.loadSettings();
        const shouldPreservePitch = settings.preservePitch;
        
        // Set pitch preservation based on user preference
        if ('preservesPitch' in media) {
          media.preservesPitch = shouldPreservePitch;
        } else if ('webkitPreservesPitch' in media) {
          media.webkitPreservesPitch = shouldPreservePitch;
        } else if ('mozPreservesPitch' in media) {
          media.mozPreservesPitch = shouldPreservePitch;
        }
        
        window.VSC.utils.debug('Pitch preservation set to:', shouldPreservePitch, media);
      } catch (error) {
        window.VSC.utils.error('Failed to setup pitch correction:', error);
        // Fallback to default behavior (preserve pitch)
        try {
          if ('preservesPitch' in media) {
            media.preservesPitch = true;
          } else if ('webkitPreservesPitch' in media) {
            media.webkitPreservesPitch = true;
          } else if ('mozPreservesPitch' in media) {
            media.mozPreservesPitch = true;
          }
        } catch (fallbackError) {
          // Ignore errors - not all browsers support this
        }
      }
    },

    /**
     * Check if anti-reset should be used
     * @returns {Promise<boolean>} True if anti-reset should be used
     */
    async shouldUseAntiReset() {
      const settings = await window.VSC.state.loadSettings();
      return settings.antiResetPatch;
    },

    /**
     * Setup page world injection if needed
     */
    async setupPageWorldInjection() {
      const settings = await window.VSC.state.loadSettings();
      
      if (settings.forceKeysInPageWorld || settings.antiResetPatch) {
        // Inject page bridge script
        try {
          const script = document.createElement('script');
          script.src = chrome.runtime.getURL('content/page-bridge.js');
          script.onload = () => script.remove();
          (document.head || document.documentElement).appendChild(script);
        } catch (error) {
          window.VSC.utils.error('Failed to inject page bridge:', error);
        }
      }
    },

    /**
     * Clean up removed media elements
     */
    cleanupRemovedMedia() {
      const currentMedia = window.VSC.media.findAllMedia();
      const currentMediaSet = new Set(currentMedia);

      // Find removed media elements
      const removedMedia = Array.from(this._mediaElements).filter(media => 
        !currentMediaSet.has(media)
      );

      // Clean up removed media
      removedMedia.forEach(media => {
        window.VSC.media.unregisterMedia(media);
        this._mediaElements.delete(media);
      });
    },

    /**
     * Handle page visibility changes
     */
    handleVisibilityChange() {
      if (document.hidden) {
        // Page is hidden - pause any active anti-reset loops
        window.VSC.media.getAllMedia().forEach(entry => {
          if (entry.antiResetCleanup) {
            entry.antiResetCleanup();
          }
        });
      } else {
        // Page is visible - restart anti-reset for active media
        window.VSC.media.getAllMedia().forEach(entry => {
          if (entry.media && !entry.media.paused) {
            window.VSC.media.setupAntiReset(entry.media);
          }
        });
      }
    },

    /**
     * Clean up content script
     */
    cleanup() {
      // Stop mutation observer
      if (this._mutationObserver) {
        this._mutationObserver.disconnect();
        this._mutationObserver = null;
      }

      // Clean up media elements
      window.VSC.media.cleanup();

      // Clean up keyboard handling
      window.VSC.keys.destroy();

      // Clear media elements set
      this._mediaElements.clear();

      this._isInitialized = false;
      window.VSC.utils.debug('Content script cleaned up');
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.VSC.content.init();
    });
  } else {
    window.VSC.content.init();
  }

  // Handle page visibility changes
  document.addEventListener('visibilitychange', () => {
    window.VSC.content.handleVisibilityChange();
  });

  // Handle page unload
  window.addEventListener('beforeunload', () => {
    window.VSC.content.cleanup();
  });

  // Handle extension context invalidation
  if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'VSC_CLEANUP') {
        window.VSC.content.cleanup();
        sendResponse({ success: true });
      }
    });
  }

})();
