/**
 * VSC — Video Speed Controller
 * Keyboard shortcut handling
 */

(function() {
  'use strict';

  window.VSC = window.VSC || {};
  window.VSC.keys = {
    
    _isEnabled: true,
    _pageWorldInjected: false,
    _keyHandlers: new Map(),

    /**
     * Initialize keyboard handling
     */
    init() {
      this.setupKeyListeners();
      this.setupPageWorldInjection();
    },

    /**
     * Setup key event listeners
     */
    setupKeyListeners() {
      // Remove existing listeners
      this.cleanup();

      // Add new listeners
      document.addEventListener('keydown', this.handleKeyDown.bind(this), true);
      window.addEventListener('keydown', this.handleKeyDown.bind(this), true);
      
      window.VSC.utils.debug('Keyboard listeners setup');
    },

    /**
     * Handle key down events
     * @param {KeyboardEvent} e - Key event
     */
    async handleKeyDown(e) {
      if (!this._isEnabled) return;

      // Check if user is typing
      if (window.VSC.utils.isTyping(e.target)) {
        return;
      }

      // Check if domain is disabled
      const isDisabled = await window.VSC.state.isCurrentDomainDisabled();
      if (isDisabled) return;

      // Get settings
      const settings = await window.VSC.state.loadSettings();
      
      // Check if keyboard should work when overlay is hidden
      if (!settings.kbWorksWhenHidden) {
        const activeMedia = window.VSC.media.activeMedia();
        if (activeMedia) {
          const entry = window.VSC.media.getMediaEntry(activeMedia);
          if (entry && entry.overlay && !entry.overlay.isVisible) {
            return;
          }
        }
      }

      // Map key to action
      const action = this.getActionForKey(e.code, settings.keymap);
      if (!action) return;

      // Prevent default and stop propagation
      e.preventDefault();
      e.stopPropagation();

      // Execute action
      await this.executeAction(action, settings);
    },

    /**
     * Get action for key code
     * @param {string} keyCode - Key code
     * @param {Object} keymap - Key mapping
     * @returns {string|null} Action name or null
     */
    getActionForKey(keyCode, keymap) {
      for (const [action, mappedKey] of Object.entries(keymap)) {
        if (mappedKey === keyCode) {
          return action;
        }
      }
      return null;
    },

    /**
     * Execute keyboard action
     * @param {string} action - Action to execute
     * @param {Object} settings - Current settings
     */
    async executeAction(action, settings) {
      const activeMedia = window.VSC.media.activeMedia();
      if (!activeMedia) return;

      // Update interaction time
      window.VSC.media.updateInteraction(activeMedia);

      switch (action) {
        case 'dec':
          const currentSpeed = activeMedia.playbackRate;
          const newSpeed = window.VSC.utils.clamp(currentSpeed - settings.step, 0.25, 4.0);
          window.VSC.media.applySpeed(activeMedia, newSpeed);
          window.VSC.media.setPreferredSpeed(activeMedia, newSpeed);
          await window.VSC.state.storeSpeed(newSpeed);
          break;

        case 'inc':
          const currentSpeed2 = activeMedia.playbackRate;
          const newSpeed2 = window.VSC.utils.clamp(currentSpeed2 + settings.step, 0.25, 4.0);
          window.VSC.media.applySpeed(activeMedia, newSpeed2);
          window.VSC.media.setPreferredSpeed(activeMedia, newSpeed2);
          await window.VSC.state.storeSpeed(newSpeed2);
          break;

        case 'reset':
          window.VSC.media.resetSpeed(activeMedia);
          window.VSC.media.setPreferredSpeed(activeMedia, 1.0);
          await window.VSC.state.storeSpeed(1.0);
          break;

        case 'back':
          window.VSC.media.seekMedia(activeMedia, -settings.seekSec);
          break;

        case 'fwd':
          window.VSC.media.seekMedia(activeMedia, settings.seekSec);
          break;

        case 'toggle':
          const entry = window.VSC.media.getMediaEntry(activeMedia);
          if (entry && entry.overlay) {
            entry.overlay.toggleVisibility();
          }
          break;
      }
    },

    /**
     * Setup page world injection for advanced mode
     */
    async setupPageWorldInjection() {
      const settings = await window.VSC.state.loadSettings();
      
      if (settings.forceKeysInPageWorld && !this._pageWorldInjected) {
        this.injectPageWorldScript();
      }
    },

    /**
     * Inject page world script for advanced key handling
     */
    injectPageWorldScript() {
      if (this._pageWorldInjected) return;

      try {
        // Create script element
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('content/page-bridge.js');
        script.onload = () => {
          script.remove();
          this._pageWorldInjected = true;
          window.VSC.utils.debug('Page world script injected');
        };
        script.onerror = () => {
          window.VSC.utils.error('Failed to inject page world script');
        };

        // Inject into page
        (document.head || document.documentElement).appendChild(script);
      } catch (error) {
        window.VSC.utils.error('Failed to inject page world script:', error);
      }
    },

    /**
     * Enable keyboard handling
     */
    enable() {
      this._isEnabled = true;
    },

    /**
     * Disable keyboard handling
     */
    disable() {
      this._isEnabled = false;
    },

    /**
     * Check for key conflicts
     * @param {Object} keymap - Key mapping to check
     * @returns {Array} Array of conflict objects
     */
    checkConflicts(keymap) {
      const conflicts = [];
      const reservedKeys = [
        'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
        'Escape', 'Tab', 'CapsLock', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
        'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'Space', 'Enter', 'Backspace',
        'Delete', 'Insert', 'Home', 'End', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown',
        'ArrowLeft', 'ArrowRight'
      ];

      // Check for duplicate mappings
      const usedKeys = new Set();
      for (const [action, key] of Object.entries(keymap)) {
        if (usedKeys.has(key)) {
          conflicts.push({
            type: 'duplicate',
            key,
            actions: Object.entries(keymap)
              .filter(([_, k]) => k === key)
              .map(([a, _]) => a)
          });
        }
        usedKeys.add(key);
      }

      // Check for reserved keys
      for (const [action, key] of Object.entries(keymap)) {
        if (reservedKeys.includes(key)) {
          conflicts.push({
            type: 'reserved',
            key,
            action
          });
        }
      }

      return conflicts;
    },

    /**
     * Get key display name
     * @param {string} keyCode - Key code
     * @returns {string} Display name
     */
    getKeyDisplayName(keyCode) {
      const keyMap = {
        'KeyA': 'A', 'KeyB': 'B', 'KeyC': 'C', 'KeyD': 'D', 'KeyE': 'E', 'KeyF': 'F',
        'KeyG': 'G', 'KeyH': 'H', 'KeyI': 'I', 'KeyJ': 'J', 'KeyK': 'K', 'KeyL': 'L',
        'KeyM': 'M', 'KeyN': 'N', 'KeyO': 'O', 'KeyP': 'P', 'KeyQ': 'Q', 'KeyR': 'R',
        'KeyS': 'S', 'KeyT': 'T', 'KeyU': 'U', 'KeyV': 'V', 'KeyW': 'W', 'KeyX': 'X',
        'KeyY': 'Y', 'KeyZ': 'Z',
        'Digit0': '0', 'Digit1': '1', 'Digit2': '2', 'Digit3': '3', 'Digit4': '4',
        'Digit5': '5', 'Digit6': '6', 'Digit7': '7', 'Digit8': '8', 'Digit9': '9',
        'Numpad0': 'Num 0', 'Numpad1': 'Num 1', 'Numpad2': 'Num 2', 'Numpad3': 'Num 3',
        'Numpad4': 'Num 4', 'Numpad5': 'Num 5', 'Numpad6': 'Num 6', 'Numpad7': 'Num 7',
        'Numpad8': 'Num 8', 'Numpad9': 'Num 9',
        'Comma': ',', 'Period': '.', 'Semicolon': ';', 'Quote': "'", 'BracketLeft': '[',
        'BracketRight': ']', 'Backslash': '\\', 'Slash': '/', 'Minus': '-', 'Equal': '=',
        'Backquote': '`'
      };

      return keyMap[keyCode] || keyCode;
    },

    /**
     * Listen for settings changes
     */
    onSettingsChange() {
      window.VSC.state.onStorageChange((changes) => {
        if (changes.keymap || changes.forceKeysInPageWorld) {
          this.setupKeyListeners();
          this.setupPageWorldInjection();
        }
      });
    },

    /**
     * Clean up event listeners
     */
    cleanup() {
      document.removeEventListener('keydown', this.handleKeyDown.bind(this), true);
      window.removeEventListener('keydown', this.handleKeyDown.bind(this), true);
    },

    /**
     * Destroy keyboard handler
     */
    destroy() {
      this.cleanup();
      this._isEnabled = false;
      this._pageWorldInjected = false;
    }
  };

})();
