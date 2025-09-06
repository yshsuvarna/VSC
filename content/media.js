/**
 * VSC — Video Speed Controller
 * Media element discovery and management
 */

(function() {
  'use strict';

  window.VSC = window.VSC || {};
  window.VSC.media = {
    
    // Registry of media elements and their overlays
    _registry: new Map(),
    _activeMedia: null,
    _lastInteractionTime: 0,

    /**
     * Deep query selector that traverses shadow DOM
     * @param {Array<string>} selectors - CSS selectors to search for
     * @param {Element} root - Root element to search from (default: document)
     * @returns {Array<Element>} Found elements
     */
    deepQuerySelectorAll(selectors, root = document) {
      const results = [];
      const selectorString = selectors.join(', ');
      
      // Search in regular DOM
      try {
        const regularResults = root.querySelectorAll(selectorString);
        results.push(...regularResults);
      } catch (e) {
        // Ignore invalid selectors
      }

      // Search in shadow roots
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: (node) => {
            // Check if node has shadow root
            if (node.shadowRoot) {
              try {
                const shadowResults = node.shadowRoot.querySelectorAll(selectorString);
                results.push(...shadowResults);
              } catch (e) {
                // Ignore errors in shadow DOM
              }
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      // Walk through all elements
      let node;
      while (node = walker.nextNode()) {
        // Already handled in acceptNode
      }

      return Array.from(results);
    },

    /**
     * Find all media elements on the page
     * @returns {Array<HTMLMediaElement>} Array of media elements
     */
    findAllMedia() {
      return this.deepQuerySelectorAll(['video', 'audio']);
    },

    /**
     * Register a media element
     * @param {HTMLMediaElement} media - Media element to register
     * @param {Object} overlay - Overlay controller for this media
     */
    registerMedia(media, overlay) {
      const id = window.VSC.utils.createId();
      media._vscId = id;
      
      this._registry.set(id, {
        media,
        overlay,
        lastInteraction: 0,
        isPlaying: false,
        isVisible: false
      });

      window.VSC.utils.debug('Media registered:', id, media);
    },

    /**
     * Unregister a media element
     * @param {HTMLMediaElement} media - Media element to unregister
     */
    unregisterMedia(media) {
      if (media._vscId) {
        const entry = this._registry.get(media._vscId);
        if (entry && entry.overlay) {
          entry.overlay.destroy();
        }
        this._registry.delete(media._vscId);
        delete media._vscId;
        window.VSC.utils.debug('Media unregistered:', media);
      }
    },

    /**
     * Get all registered media
     * @returns {Array<Object>} Array of media entries
     */
    getAllMedia() {
      return Array.from(this._registry.values());
    },

    /**
     * Get media entry by element
     * @param {HTMLMediaElement} media - Media element
     * @returns {Object|null} Media entry or null
     */
    getMediaEntry(media) {
      if (media._vscId) {
        return this._registry.get(media._vscId);
      }
      return null;
    },

    /**
     * Update media interaction time
     * @param {HTMLMediaElement} media - Media element
     */
    updateInteraction(media) {
      const entry = this.getMediaEntry(media);
      if (entry) {
        entry.lastInteraction = Date.now();
        this._lastInteractionTime = Date.now();
      }
    },

    /**
     * Choose the most appropriate active media
     * @returns {HTMLMediaElement|null} Active media element
     */
    chooseActiveMedia() {
      const allMedia = this.getAllMedia();
      if (allMedia.length === 0) return null;
      if (allMedia.length === 1) return allMedia[0].media;

      // Score each media element
      const scored = allMedia.map(entry => {
        const { media } = entry;
        let score = 0;

        // Playing media gets highest priority
        if (!media.paused) {
          score += 1000;
        }

        // Visible media gets priority
        const visibility = window.VSC.utils.getIntersectionRatio(media);
        score += visibility * 500;

        // Recently interacted media gets priority
        const timeSinceInteraction = Date.now() - entry.lastInteraction;
        if (timeSinceInteraction < 5000) { // 5 seconds
          score += (5000 - timeSinceInteraction) / 10;
        }

        // Larger media gets slight priority
        const rect = media.getBoundingClientRect();
        score += (rect.width * rect.height) / 10000;

        return { entry, score };
      });

      // Sort by score and return the best one
      scored.sort((a, b) => b.score - a.score);
      return scored[0].entry.media;
    },

    /**
     * Get or set the active media
     * @param {HTMLMediaElement} media - Media to set as active (optional)
     * @returns {HTMLMediaElement|null} Current active media
     */
    activeMedia(media = null) {
      if (media) {
        this._activeMedia = media;
        this.updateInteraction(media);
      } else if (!this._activeMedia || !this._registry.has(this._activeMedia._vscId)) {
        this._activeMedia = this.chooseActiveMedia();
      }
      return this._activeMedia;
    },

    /**
     * Apply speed to media element
     * @param {HTMLMediaElement} media - Media element
     * @param {number} speed - Speed to apply
     * @param {boolean} force - Force application even if anti-reset is active
     */
    applySpeed(media, speed, force = false) {
      if (!media || typeof speed !== 'number') return;

      const entry = this.getMediaEntry(media);
      if (!entry) return;

      // Check if we should respect anti-reset protection
      if (!force && entry.antiResetUntil && Date.now() < entry.antiResetUntil) {
        return;
      }

      try {
        // Clamp speed to reasonable range
        speed = window.VSC.utils.clamp(speed, 0.25, 4.0);
        
        // Apply speed
        media.playbackRate = speed;
        
        // Set anti-reset protection
        entry.antiResetUntil = Date.now() + 500; // 500ms protection
        
        // Update overlay display
        if (entry.overlay) {
          entry.overlay.updateSpeedDisplay(speed);
        }

        window.VSC.utils.debug('Speed applied:', speed, media);
      } catch (error) {
        window.VSC.utils.error('Failed to apply speed:', error);
      }
    },

    /**
     * Seek media element
     * @param {HTMLMediaElement} media - Media element
     * @param {number} seconds - Seconds to seek (positive = forward, negative = backward)
     */
    seekMedia(media, seconds) {
      if (!media || typeof seconds !== 'number') return;

      try {
        const currentTime = media.currentTime;
        const duration = media.duration;
        
        if (isFinite(duration)) {
          const newTime = window.VSC.utils.clamp(currentTime + seconds, 0, duration);
          media.currentTime = newTime;
          window.VSC.utils.debug('Seeked:', seconds, 'seconds', media);
        }
      } catch (error) {
        window.VSC.utils.error('Failed to seek media:', error);
      }
    },

    /**
     * Reset media speed to 1.0
     * @param {HTMLMediaElement} media - Media element
     */
    resetSpeed(media) {
      this.applySpeed(media, 1.0, true);
    },

    /**
     * Set up anti-reset protection for media
     * @param {HTMLMediaElement} media - Media element
     */
    setupAntiReset(media) {
      const entry = this.getMediaEntry(media);
      if (!entry) return;

      // Remove existing listeners
      if (entry.antiResetCleanup) {
        entry.antiResetCleanup();
      }

      const handleRateChange = () => {
        if (entry.antiResetUntil && Date.now() < entry.antiResetUntil) {
          // Re-apply user's preferred speed
          const preferredSpeed = entry.preferredSpeed || 1.0;
          if (Math.abs(media.playbackRate - preferredSpeed) > 0.01) {
            media.playbackRate = preferredSpeed;
          }
        }
      };

      const handlePlaying = () => {
        handleRateChange();
      };

      // Add event listeners
      media.addEventListener('ratechange', handleRateChange);
      media.addEventListener('playing', handlePlaying);

      // Store cleanup function
      entry.antiResetCleanup = () => {
        media.removeEventListener('ratechange', handleRateChange);
        media.removeEventListener('playing', handlePlaying);
      };
    },

    /**
     * Set preferred speed for anti-reset
     * @param {HTMLMediaElement} media - Media element
     * @param {number} speed - Preferred speed
     */
    setPreferredSpeed(media, speed) {
      const entry = this.getMediaEntry(media);
      if (entry) {
        entry.preferredSpeed = speed;
        entry.antiResetUntil = Date.now() + 500;
      }
    },

    /**
     * Clean up all media registrations
     */
    cleanup() {
      for (const [id, entry] of this._registry) {
        if (entry.overlay) {
          entry.overlay.destroy();
        }
        if (entry.antiResetCleanup) {
          entry.antiResetCleanup();
        }
      }
      this._registry.clear();
      this._activeMedia = null;
    },

    /**
     * Get media statistics for debugging
     * @returns {Object} Statistics object
     */
    getStats() {
      const allMedia = this.getAllMedia();
      return {
        totalMedia: allMedia.length,
        playingMedia: allMedia.filter(entry => !entry.media.paused).length,
        visibleMedia: allMedia.filter(entry => 
          window.VSC.utils.getIntersectionRatio(entry.media) > 0
        ).length,
        activeMedia: this._activeMedia ? this._activeMedia._vscId : null
      };
    }
  };

})();
