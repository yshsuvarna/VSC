/**
 * VSC — Video Speed Controller
 * Options page JavaScript
 */

(function() {
  'use strict';

  // Default settings
  const DEFAULTS = {
    step: 0.1,
    seekSec: 10,
    rememberSpeed: 'global',
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
  };

  // Key display mapping
  const KEY_DISPLAY_MAP = {
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

  // Reserved keys that cannot be used
  const RESERVED_KEYS = [
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
    'Escape', 'Tab', 'CapsLock', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
    'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'Space', 'Enter', 'Backspace',
    'Delete', 'Insert', 'Home', 'End', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown',
    'ArrowLeft', 'ArrowRight'
  ];

  // Current settings
  let currentSettings = { ...DEFAULTS };
  let isListeningForKey = false;
  let currentKeyInput = null;

  /**
   * Initialize the options page
   */
  async function init() {
    try {
      // Load current settings
      await loadSettings();
      
      // Setup event listeners
      setupEventListeners();
      
      // Populate UI
      populateUI();
      
      // Load site speeds
      await loadSiteSpeeds();
      
      console.log('Options page initialized');
    } catch (error) {
      console.error('Failed to initialize options page:', error);
      showError('Failed to load settings. Please try refreshing the page.');
    }
  }

  /**
   * Load settings from storage
   */
  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get(null);
      currentSettings = { ...DEFAULTS, ...result };
    } catch (error) {
      console.error('Failed to load settings:', error);
      currentSettings = { ...DEFAULTS };
    }
  }

  /**
   * Save settings to storage
   */
  async function saveSettings() {
    try {
      await chrome.storage.sync.set(currentSettings);
      showSuccess('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showError('Failed to save settings. Please try again.');
    }
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    // Save button
    document.getElementById('save-settings').addEventListener('click', saveSettings);
    
    // Reset defaults button
    document.getElementById('reset-defaults').addEventListener('click', resetToDefaults);
    
    // Speed step input
    document.getElementById('speed-step').addEventListener('input', (e) => {
      currentSettings.step = parseFloat(e.target.value) || 0.1;
    });
    
    // Seek seconds input
    document.getElementById('seek-seconds').addEventListener('input', (e) => {
      currentSettings.seekSec = parseInt(e.target.value) || 10;
    });
    
    // Remember speed radio buttons
    document.querySelectorAll('input[name="remember-speed"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        currentSettings.rememberSpeed = e.target.value;
      });
    });
    
    // Checkboxes
    document.getElementById('include-audio').addEventListener('change', (e) => {
      currentSettings.includeAudio = e.target.checked;
    });
    
    document.getElementById('kb-works-hidden').addEventListener('change', (e) => {
      currentSettings.kbWorksWhenHidden = e.target.checked;
    });
    
    document.getElementById('anti-reset-patch').addEventListener('change', (e) => {
      currentSettings.antiResetPatch = e.target.checked;
    });
    
    document.getElementById('force-keys').addEventListener('change', (e) => {
      currentSettings.forceKeysInPageWorld = e.target.checked;
      updateForceKeysWarning();
    
    document.getElementById('preserve-pitch').addEventListener('change', (e) => {
      currentSettings.preservePitch = e.target.checked;
    });
    
    document.getElementById('draggable-overlay').addEventListener('change', (e) => {
      currentSettings.draggableOverlay = e.target.checked;
    });
    });
    
    // Key inputs
    document.querySelectorAll('.key-input').forEach(input => {
      input.addEventListener('click', startKeyListening);
    });
    
    // Domain management
    document.getElementById('add-domain').addEventListener('click', addDomain);
    document.getElementById('domain-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addDomain();
      }
    });
    
    // Clear speeds button
    document.getElementById('clear-speeds').addEventListener('click', clearAllSpeeds);
    
    // Global key listener for key capture
    document.addEventListener('keydown', handleGlobalKeyDown);
    document.addEventListener('keyup', handleGlobalKeyUp);
  }

  /**
   * Populate UI with current settings
   */
  function populateUI() {
    // Speed settings
    document.getElementById('speed-step').value = currentSettings.step;
    document.getElementById('seek-seconds').value = currentSettings.seekSec;
    
    // Remember speed
    document.querySelector(`input[name="remember-speed"][value="${currentSettings.rememberSpeed}"]`).checked = true;
    
    // Checkboxes
    document.getElementById('include-audio').checked = currentSettings.includeAudio;
    document.getElementById('kb-works-hidden').checked = currentSettings.kbWorksWhenHidden;
    document.getElementById('anti-reset-patch').checked = currentSettings.antiResetPatch;
    document.getElementById('force-keys').checked = currentSettings.forceKeysInPageWorld;
    document.getElementById('preserve-pitch').checked = currentSettings.preservePitch;
    document.getElementById('draggable-overlay').checked = currentSettings.draggableOverlay;
    
    // Key mappings
    Object.entries(currentSettings.keymap).forEach(([action, key]) => {
      const input = document.getElementById(`key-${action}`);
      if (input) {
        input.value = getKeyDisplayName(key);
      }
    });
    
    // Domain list
    updateDomainList();
    
    // Update warnings
    updateForceKeysWarning();
    checkKeyConflicts();
  }

  /**
   * Start listening for key input
   * @param {Event} e - Click event
   */
  function startKeyListening(e) {
    if (isListeningForKey) return;
    
    isListeningForKey = true;
    currentKeyInput = e.target;
    
    // Update UI
    currentKeyInput.value = 'Press any key...';
    currentKeyInput.style.backgroundColor = '#fff3cd';
    currentKeyInput.style.borderColor = '#ffc107';
    
    // Add visual feedback
    document.body.style.cursor = 'wait';
  }

  /**
   * Handle global key down events
   * @param {KeyboardEvent} e - Key event
   */
  function handleGlobalKeyDown(e) {
    if (!isListeningForKey || !currentKeyInput) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Check if key is reserved
    if (RESERVED_KEYS.includes(e.code)) {
      currentKeyInput.value = 'Reserved key';
      currentKeyInput.style.backgroundColor = '#f8d7da';
      currentKeyInput.style.borderColor = '#dc3545';
      return;
    }
    
    // Get action from input ID
    const action = currentKeyInput.id.replace('key-', '');
    
    // Check for conflicts
    const conflicts = checkKeyConflictsForAction(action, e.code);
    if (conflicts.length > 0) {
      currentKeyInput.value = 'Conflict detected';
      currentKeyInput.style.backgroundColor = '#f8d7da';
      currentKeyInput.style.borderColor = '#dc3545';
      return;
    }
    
    // Update settings
    currentSettings.keymap[action] = e.code;
    
    // Update UI
    currentKeyInput.value = getKeyDisplayName(e.code);
    currentKeyInput.style.backgroundColor = '#d4edda';
    currentKeyInput.style.borderColor = '#28a745';
    
    // Stop listening
    stopKeyListening();
    
    // Check for new conflicts
    checkKeyConflicts();
  }

  /**
   * Handle global key up events
   * @param {KeyboardEvent} e - Key event
   */
  function handleGlobalKeyUp(e) {
    if (!isListeningForKey) return;
    
    // Small delay to allow keydown to process first
    setTimeout(() => {
      if (isListeningForKey && currentKeyInput) {
        stopKeyListening();
      }
    }, 100);
  }

  /**
   * Stop listening for key input
   */
  function stopKeyListening() {
    isListeningForKey = false;
    
    if (currentKeyInput) {
      // Reset styles
      currentKeyInput.style.backgroundColor = '';
      currentKeyInput.style.borderColor = '';
      currentKeyInput = null;
    }
    
    document.body.style.cursor = '';
  }

  /**
   * Get display name for key code
   * @param {string} keyCode - Key code
   * @returns {string} Display name
   */
  function getKeyDisplayName(keyCode) {
    return KEY_DISPLAY_MAP[keyCode] || keyCode;
  }

  /**
   * Check for key conflicts
   */
  function checkKeyConflicts() {
    const conflicts = [];
    const usedKeys = new Set();
    
    // Check for duplicates
    Object.entries(currentSettings.keymap).forEach(([action, key]) => {
      if (usedKeys.has(key)) {
        const duplicateActions = Object.entries(currentSettings.keymap)
          .filter(([_, k]) => k === key)
          .map(([a, _]) => a);
        
        conflicts.push({
          type: 'duplicate',
          key,
          actions: duplicateActions
        });
      }
      usedKeys.add(key);
    });
    
    // Check for reserved keys
    Object.entries(currentSettings.keymap).forEach(([action, key]) => {
      if (RESERVED_KEYS.includes(key)) {
        conflicts.push({
          type: 'reserved',
          key,
          action
        });
      }
    });
    
    // Update UI
    updateConflictsWarning(conflicts);
  }

  /**
   * Check conflicts for a specific action
   * @param {string} action - Action to check
   * @param {string} keyCode - Key code to check
   * @returns {Array} Array of conflicts
   */
  function checkKeyConflictsForAction(action, keyCode) {
    const conflicts = [];
    
    // Check for duplicates
    Object.entries(currentSettings.keymap).forEach(([otherAction, otherKey]) => {
      if (otherAction !== action && otherKey === keyCode) {
        conflicts.push({
          type: 'duplicate',
          key: keyCode,
          actions: [action, otherAction]
        });
      }
    });
    
    // Check for reserved keys
    if (RESERVED_KEYS.includes(keyCode)) {
      conflicts.push({
        type: 'reserved',
        key: keyCode,
        action
      });
    }
    
    return conflicts;
  }

  /**
   * Update conflicts warning UI
   * @param {Array} conflicts - Array of conflicts
   */
  function updateConflictsWarning(conflicts) {
    const warning = document.getElementById('conflicts-warning');
    const list = document.getElementById('conflicts-list');
    
    if (conflicts.length === 0) {
      warning.style.display = 'none';
      return;
    }
    
    list.innerHTML = '';
    conflicts.forEach(conflict => {
      const li = document.createElement('li');
      
      if (conflict.type === 'duplicate') {
        li.textContent = `Key "${getKeyDisplayName(conflict.key)}" is used for multiple actions: ${conflict.actions.join(', ')}`;
      } else if (conflict.type === 'reserved') {
        li.textContent = `Key "${getKeyDisplayName(conflict.key)}" is reserved and cannot be used for "${conflict.action}"`;
      }
      
      list.appendChild(li);
    });
    
    warning.style.display = 'block';
  }

  /**
   * Update force keys warning
   */
  function updateForceKeysWarning() {
    const warning = document.getElementById('force-keys-warning');
    const checkbox = document.getElementById('force-keys');
    
    if (checkbox.checked) {
      warning.style.display = 'block';
    } else {
      warning.style.display = 'none';
    }
  }

  /**
   * Add domain to disabled list
   */
  function addDomain() {
    const input = document.getElementById('domain-input');
    const domain = input.value.trim();
    
    if (!domain) return;
    
    // Validate domain format
    if (!isValidDomain(domain)) {
      showError('Please enter a valid domain (e.g., example.com)');
      return;
    }
    
    // Check if already exists
    if (currentSettings.disabledDomains.includes(domain)) {
      showError('Domain is already in the disabled list');
      return;
    }
    
    // Add to list
    currentSettings.disabledDomains.push(domain);
    input.value = '';
    
    // Update UI
    updateDomainList();
  }

  /**
   * Remove domain from disabled list
   * @param {string} domain - Domain to remove
   */
  function removeDomain(domain) {
    currentSettings.disabledDomains = currentSettings.disabledDomains.filter(d => d !== domain);
    updateDomainList();
  }

  /**
   * Update domain list UI
   */
  function updateDomainList() {
    const list = document.getElementById('domain-list');
    
    if (currentSettings.disabledDomains.length === 0) {
      list.innerHTML = '<p class="empty-state">No domains disabled</p>';
      return;
    }
    
    list.innerHTML = '';
    currentSettings.disabledDomains.forEach(domain => {
      const item = document.createElement('div');
      item.className = 'domain-item';
      item.innerHTML = `
        <span class="domain-name">${domain}</span>
        <button type="button" class="btn-remove" onclick="removeDomain('${domain}')">Remove</button>
      `;
      list.appendChild(item);
    });
  }

  /**
   * Load site speeds from storage
   */
  async function loadSiteSpeeds() {
    try {
      const result = await chrome.storage.local.get(null);
      const siteSpeeds = {};
      
      for (const [key, value] of Object.entries(result)) {
        if (key.startsWith('vsc_site_speed_')) {
          const domain = key.replace('vsc_site_speed_', '');
          siteSpeeds[domain] = value;
        }
      }
      
      updateSiteSpeedsList(siteSpeeds);
    } catch (error) {
      console.error('Failed to load site speeds:', error);
    }
  }

  /**
   * Update site speeds list UI
   * @param {Object} siteSpeeds - Object with domain -> speed mapping
   */
  function updateSiteSpeedsList(siteSpeeds) {
    const container = document.getElementById('site-speeds');
    
    if (Object.keys(siteSpeeds).length === 0) {
      container.innerHTML = '<p class="empty-state">No site speeds stored</p>';
      return;
    }
    
    container.innerHTML = '';
    Object.entries(siteSpeeds).forEach(([domain, speed]) => {
      const item = document.createElement('div');
      item.className = 'site-speed-item';
      item.innerHTML = `
        <span class="site-speed-name">${domain}</span>
        <span class="site-speed-value">${speed.toFixed(2)}×</span>
      `;
      container.appendChild(item);
    });
  }

  /**
   * Clear all stored speeds
   */
  async function clearAllSpeeds() {
    if (!confirm('Are you sure you want to clear all stored site speeds? This action cannot be undone.')) {
      return;
    }
    
    try {
      const result = await chrome.storage.local.get(null);
      const keysToRemove = Object.keys(result).filter(key => 
        key.startsWith('vsc_site_speed_') || key === 'vsc_global_speed'
      );
      
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
      }
      
      updateSiteSpeedsList({});
      showSuccess('All stored speeds cleared successfully!');
    } catch (error) {
      console.error('Failed to clear speeds:', error);
      showError('Failed to clear stored speeds. Please try again.');
    }
  }

  /**
   * Reset settings to defaults
   */
  async function resetToDefaults() {
    if (!confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      return;
    }
    
    currentSettings = { ...DEFAULTS };
    populateUI();
    showSuccess('Settings reset to defaults!');
  }

  /**
   * Validate domain format
   * @param {string} domain - Domain to validate
   * @returns {boolean} True if valid
   */
  function isValidDomain(domain) {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/;
    return domainRegex.test(domain);
  }

  /**
   * Show success message
   * @param {string} message - Message to show
   */
  function showSuccess(message) {
    showMessage(message, 'success');
  }

  /**
   * Show error message
   * @param {string} message - Message to show
   */
  function showError(message) {
    showMessage(message, 'error');
  }

  /**
   * Show message to user
   * @param {string} message - Message to show
   * @param {string} type - Message type (success, error)
   */
  function showMessage(message, type) {
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    
    if (type === 'success') {
      messageEl.style.backgroundColor = '#28a745';
    } else if (type === 'error') {
      messageEl.style.backgroundColor = '#dc3545';
    }
    
    document.body.appendChild(messageEl);
    
    // Animate in
    setTimeout(() => {
      messageEl.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
      messageEl.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (messageEl.parentElement) {
          messageEl.parentElement.removeChild(messageEl);
        }
      }, 300);
    }, 3000);
  }

  // Make removeDomain available globally for onclick handlers
  window.removeDomain = removeDomain;

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
