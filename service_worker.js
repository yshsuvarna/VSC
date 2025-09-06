/**
 * VSC — Video Speed Controller
 * Service Worker for Manifest V3
 */

// Default settings
const DEFAULTS = {
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
  disabledDomains: []
};

/**
 * Initialize default settings on install
 */
async function initializeDefaults() {
  try {
    // Check if settings already exist
    const existingSettings = await chrome.storage.sync.get(null);
    
    // Only set defaults if no settings exist
    if (Object.keys(existingSettings).length === 0) {
      await chrome.storage.sync.set(DEFAULTS);
      console.log('[VSC] Default settings initialized');
    }
  } catch (error) {
    console.error('[VSC] Failed to initialize default settings:', error);
  }
}

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[VSC] Extension installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // First time installation
    await initializeDefaults();
    
    // Open options page
    try {
      await chrome.runtime.openOptionsPage();
    } catch (error) {
      // Options page might not be available in some contexts
      console.log('[VSC] Could not open options page:', error);
    }
  } else if (details.reason === 'update') {
    // Extension updated
    await migrateSettings(details.previousVersion);
  }
});

/**
 * Migrate settings from previous version
 * @param {string} previousVersion - Previous version number
 */
async function migrateSettings(previousVersion) {
  try {
    console.log('[VSC] Migrating settings from version:', previousVersion);
    
    const currentSettings = await chrome.storage.sync.get(null);
    
    // Add any new default settings that might be missing
    let needsUpdate = false;
    const updatedSettings = { ...currentSettings };
    
    for (const [key, defaultValue] of Object.entries(DEFAULTS)) {
      if (!(key in updatedSettings)) {
        updatedSettings[key] = defaultValue;
        needsUpdate = true;
      }
    }
    
    // Update settings if needed
    if (needsUpdate) {
      await chrome.storage.sync.set(updatedSettings);
      console.log('[VSC] Settings migrated successfully');
    }
  } catch (error) {
    console.error('[VSC] Failed to migrate settings:', error);
  }
}

/**
 * Handle messages from content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'VSC_GET_SETTINGS':
      handleGetSettings(sendResponse);
      return true; // Keep message channel open for async response
      
    case 'VSC_SAVE_SETTINGS':
      handleSaveSettings(message.settings, sendResponse);
      return true;
      
    case 'VSC_GET_STORED_SPEED':
      handleGetStoredSpeed(message.domain, message.mode, sendResponse);
      return true;
      
    case 'VSC_STORE_SPEED':
      handleStoreSpeed(message.domain, message.speed, message.mode, sendResponse);
      return true;
      
    case 'VSC_GET_DISABLED_DOMAINS':
      handleGetDisabledDomains(sendResponse);
      return true;
      
    case 'VSC_TOGGLE_DOMAIN':
      handleToggleDomain(message.domain, message.disabled, sendResponse);
      return true;
      
    default:
      console.log('[VSC] Unknown message type:', message.type);
      sendResponse({ error: 'Unknown message type' });
  }
});

/**
 * Handle get settings request
 * @param {Function} sendResponse - Response function
 */
async function handleGetSettings(sendResponse) {
  try {
    const settings = await chrome.storage.sync.get(null);
    const mergedSettings = { ...DEFAULTS, ...settings };
    sendResponse({ success: true, settings: mergedSettings });
  } catch (error) {
    console.error('[VSC] Failed to get settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle save settings request
 * @param {Object} settings - Settings to save
 * @param {Function} sendResponse - Response function
 */
async function handleSaveSettings(settings, sendResponse) {
  try {
    await chrome.storage.sync.set(settings);
    sendResponse({ success: true });
  } catch (error) {
    console.error('[VSC] Failed to save settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle get stored speed request
 * @param {string} domain - Domain to get speed for
 * @param {string} mode - Memory mode ('global' or 'site')
 * @param {Function} sendResponse - Response function
 */
async function handleGetStoredSpeed(domain, mode, sendResponse) {
  try {
    const key = mode === 'global' ? 'vsc_global_speed' : `vsc_site_speed_${domain}`;
    const result = await chrome.storage.local.get(key);
    const speed = result[key] || null;
    sendResponse({ success: true, speed });
  } catch (error) {
    console.error('[VSC] Failed to get stored speed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle store speed request
 * @param {string} domain - Domain to store speed for
 * @param {number} speed - Speed to store
 * @param {string} mode - Memory mode ('global' or 'site')
 * @param {Function} sendResponse - Response function
 */
async function handleStoreSpeed(domain, speed, mode, sendResponse) {
  try {
    const key = mode === 'global' ? 'vsc_global_speed' : `vsc_site_speed_${domain}`;
    await chrome.storage.local.set({ [key]: speed });
    sendResponse({ success: true });
  } catch (error) {
    console.error('[VSC] Failed to store speed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle get disabled domains request
 * @param {Function} sendResponse - Response function
 */
async function handleGetDisabledDomains(sendResponse) {
  try {
    const result = await chrome.storage.sync.get('disabledDomains');
    const domains = result.disabledDomains || [];
    sendResponse({ success: true, domains });
  } catch (error) {
    console.error('[VSC] Failed to get disabled domains:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle toggle domain request
 * @param {string} domain - Domain to toggle
 * @param {boolean} disabled - Whether to disable the domain
 * @param {Function} sendResponse - Response function
 */
async function handleToggleDomain(domain, disabled, sendResponse) {
  try {
    const result = await chrome.storage.sync.get('disabledDomains');
    let domains = result.disabledDomains || [];
    
    if (disabled) {
      if (!domains.includes(domain)) {
        domains.push(domain);
      }
    } else {
      domains = domains.filter(d => d !== domain);
    }
    
    await chrome.storage.sync.set({ disabledDomains: domains });
    sendResponse({ success: true, domains });
  } catch (error) {
    console.error('[VSC] Failed to toggle domain:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle storage changes
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync') {
    console.log('[VSC] Settings changed:', Object.keys(changes));
    
    // Notify all content scripts of settings changes
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'VSC_SETTINGS_CHANGED',
          changes
        }).catch(() => {
          // Ignore errors for tabs that don't have content scripts
        });
      });
    });
  }
});

/**
 * Handle extension startup
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('[VSC] Extension startup');
});

/**
 * Handle extension suspend
 */
chrome.runtime.onSuspend.addListener(() => {
  console.log('[VSC] Extension suspended');
});

/**
 * Handle context menu (if needed in future)
 */
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu items if needed
  // This is a placeholder for future context menu functionality
});

/**
 * Handle action button click
 */
chrome.action.onClicked.addListener((tab) => {
  // Open options page when extension icon is clicked
  chrome.runtime.openOptionsPage();
});

/**
 * Handle tab updates (for debugging)
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Log tab updates for debugging (can be removed in production)
    console.log('[VSC] Tab updated:', tab.url);
  }
});

/**
 * Cleanup function for extension uninstall
 */
chrome.runtime.onSuspend.addListener(() => {
  // Perform any necessary cleanup
  console.log('[VSC] Performing cleanup before suspend');
});

// Log service worker startup
console.log('[VSC] Service worker started');
