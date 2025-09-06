/**
 * VSC — Video Speed Controller
 * State management and storage utilities
 */

(function() {
  'use strict';

  window.VSC = window.VSC || {};
  window.VSC.state = {
    
    // Default settings
    DEFAULTS: {
      step: 0.1,
      seekSec: 10,
      rememberSpeed: 'global', // 'off' | 'global' | 'site'
      keymap: {
        dec: 'KeyS',
        inc: 'KeyD', 
        reset: 'KeyR',
        back: 'KeyZ',
        fwd: 'KeyX',
        toggle: 'KeyV'
      },
      includeAudio: true,
      kbWorksWhenHidden: true,
      forceKeysInPageWorld: false,
      antiResetPatch: true,
      preservePitch: true,
      draggableOverlay: true,
      disabledDomains: []
    },

    // Current settings cache
    _settings: null,
    _isLoading: false,

    /**
     * Load settings from storage
     * @returns {Promise<Object>} Settings object
     */
    async loadSettings() {
      if (this._isLoading) {
        // Wait for existing load to complete
        while (this._isLoading) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        return this._settings || this.DEFAULTS;
      }

      if (this._settings) {
        return this._settings;
      }

      this._isLoading = true;

      try {
        const result = await chrome.storage.sync.get(null);
        this._settings = { ...this.DEFAULTS, ...result };
        
        // Validate and fix settings
        this._settings = this._validateSettings(this._settings);
        
        window.VSC.utils.debug('Settings loaded:', this._settings);
        return this._settings;
      } catch (error) {
        window.VSC.utils.error('Failed to load settings:', error);
        this._settings = { ...this.DEFAULTS };
        return this._settings;
      } finally {
        this._isLoading = false;
      }
    },

    /**
     * Save settings to storage
     * @param {Object} settings - Settings to save
     * @returns {Promise<void>}
     */
    async saveSettings(settings) {
      try {
        const validatedSettings = this._validateSettings(settings);
        await chrome.storage.sync.set(validatedSettings);
        this._settings = validatedSettings;
        window.VSC.utils.debug('Settings saved:', validatedSettings);
      } catch (error) {
        window.VSC.utils.error('Failed to save settings:', error);
        throw error;
      }
    },

    /**
     * Get current settings (cached)
     * @returns {Object} Current settings
     */
    getSettings() {
      return this._settings || this.DEFAULTS;
    },

    /**
     * Update a specific setting
     * @param {string} key - Setting key
     * @param {*} value - New value
     * @returns {Promise<void>}
     */
    async updateSetting(key, value) {
      const settings = await this.loadSettings();
      settings[key] = value;
      await this.saveSettings(settings);
    },

    /**
     * Reset settings to defaults
     * @returns {Promise<void>}
     */
    async resetSettings() {
      await this.saveSettings({ ...this.DEFAULTS });
    },

    /**
     * Validate and fix settings
     * @param {Object} settings - Settings to validate
     * @returns {Object} Validated settings
     */
    _validateSettings(settings) {
      const validated = { ...this.DEFAULTS, ...settings };

      // Validate step
      if (typeof validated.step !== 'number' || validated.step <= 0 || validated.step > 1) {
        validated.step = this.DEFAULTS.step;
      }

      // Validate seekSec
      if (typeof validated.seekSec !== 'number' || validated.seekSec <= 0 || validated.seekSec > 300) {
        validated.seekSec = this.DEFAULTS.seekSec;
      }

      // Validate rememberSpeed
      if (!['off', 'global', 'site'].includes(validated.rememberSpeed)) {
        validated.rememberSpeed = this.DEFAULTS.rememberSpeed;
      }

      // Validate keymap
      if (!validated.keymap || typeof validated.keymap !== 'object') {
        validated.keymap = { ...this.DEFAULTS.keymap };
      } else {
        // Ensure all required keys exist
        for (const [action, defaultKey] of Object.entries(this.DEFAULTS.keymap)) {
          if (!validated.keymap[action] || typeof validated.keymap[action] !== 'string') {
            validated.keymap[action] = defaultKey;
          }
        }
      }

      // Validate booleans
      validated.includeAudio = Boolean(validated.includeAudio);
      validated.kbWorksWhenHidden = Boolean(validated.kbWorksWhenHidden);
      validated.forceKeysInPageWorld = Boolean(validated.forceKeysInPageWorld);
      validated.antiResetPatch = Boolean(validated.antiResetPatch);
      validated.preservePitch = Boolean(validated.preservePitch);
      validated.draggableOverlay = Boolean(validated.draggableOverlay);

      // Validate disabledDomains
      if (!Array.isArray(validated.disabledDomains)) {
        validated.disabledDomains = [];
      }

      return validated;
    },

    /**
     * Get stored speed for current domain
     * @returns {Promise<number|null>} Stored speed or null
     */
    async getStoredSpeed() {
      const settings = await this.loadSettings();
      
      if (settings.rememberSpeed === 'off') {
        return null;
      }

      try {
        const key = settings.rememberSpeed === 'global' 
          ? 'vsc_global_speed' 
          : `vsc_site_speed_${window.VSC.utils.getDomain()}`;
        
        const result = await chrome.storage.local.get(key);
        return result[key] || null;
      } catch (error) {
        window.VSC.utils.error('Failed to get stored speed:', error);
        return null;
      }
    },

    /**
     * Store speed for current domain
     * @param {number} speed - Speed to store
     * @returns {Promise<void>}
     */
    async storeSpeed(speed) {
      const settings = await this.loadSettings();
      
      if (settings.rememberSpeed === 'off') {
        return;
      }

      try {
        const key = settings.rememberSpeed === 'global' 
          ? 'vsc_global_speed' 
          : `vsc_site_speed_${window.VSC.utils.getDomain()}`;
        
        await chrome.storage.local.set({ [key]: speed });
        window.VSC.utils.debug('Speed stored:', key, speed);
      } catch (error) {
        window.VSC.utils.error('Failed to store speed:', error);
      }
    },

    /**
     * Add domain to disabled list
     * @param {string} domain - Domain to disable
     * @returns {Promise<void>}
     */
    async disableDomain(domain) {
      const settings = await this.loadSettings();
      if (!settings.disabledDomains.includes(domain)) {
        settings.disabledDomains.push(domain);
        await this.saveSettings(settings);
      }
    },

    /**
     * Remove domain from disabled list
     * @param {string} domain - Domain to enable
     * @returns {Promise<void>}
     */
    async enableDomain(domain) {
      const settings = await this.loadSettings();
      settings.disabledDomains = settings.disabledDomains.filter(d => d !== domain);
      await this.saveSettings(settings);
    },

    /**
     * Check if current domain is disabled
     * @returns {Promise<boolean>} True if disabled
     */
    async isCurrentDomainDisabled() {
      const settings = await this.loadSettings();
      return window.VSC.utils.isDomainDisabled(settings.disabledDomains);
    },

    /**
     * Listen for storage changes
     * @param {Function} callback - Callback function
     */
    onStorageChange(callback) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'sync') {
          // Update cached settings
          this._settings = null;
          callback(changes);
        }
      });
    },

    /**
     * Get all stored site speeds
     * @returns {Promise<Object>} Object with domain -> speed mapping
     */
    async getAllSiteSpeeds() {
      try {
        const result = await chrome.storage.local.get(null);
        const siteSpeeds = {};
        
        for (const [key, value] of Object.entries(result)) {
          if (key.startsWith('vsc_site_speed_')) {
            const domain = key.replace('vsc_site_speed_', '');
            siteSpeeds[domain] = value;
          }
        }
        
        return siteSpeeds;
      } catch (error) {
        window.VSC.utils.error('Failed to get site speeds:', error);
        return {};
      }
    },

    /**
     * Clear all stored speeds
     * @returns {Promise<void>}
     */
    async clearAllSpeeds() {
      try {
        const result = await chrome.storage.local.get(null);
        const keysToRemove = Object.keys(result).filter(key => 
          key.startsWith('vsc_site_speed_') || key === 'vsc_global_speed'
        );
        
        if (keysToRemove.length > 0) {
          await chrome.storage.local.remove(keysToRemove);
        }
      } catch (error) {
        window.VSC.utils.error('Failed to clear speeds:', error);
      }
    }
  };

})();
