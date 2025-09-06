# VSC — Video Speed Controller

A universal video/audio speed controller Chrome extension that works on any website with HTML5 media elements. Built with privacy-first design, no telemetry, and maximum compatibility with streaming sites.

## Features

### 🎮 Universal Control
- **Works everywhere**: YouTube, Netflix, Prime Video, Vimeo, Twitter/X, Coursera, and any HTML5 video/audio
- **Shadow DOM support**: Finds media elements even when hidden inside Web Components
- **Cross-frame compatibility**: Works in iframes and embedded players
- **Dynamic content**: Automatically detects new media elements as they load

### ⌨️ Keyboard Shortcuts
- **S** - Decrease speed (-0.1×)
- **D** - Increase speed (+0.1×)  
- **R** - Reset to 1.0×
- **Z** - Rewind 10 seconds
- **X** - Forward 10 seconds
- **V** - Toggle overlay visibility

### 🎛️ Visual Controller
- **Draggable overlay**: Compact controller positioned on each media element
- **Real-time display**: Shows current speed (e.g., "1.25×")
- **Hover effects**: Fades in/out for clean interface
- **Fullscreen support**: Works in fullscreen and Picture-in-Picture mode

### ⚙️ Smart Settings
- **Customizable shortcuts**: Remap all keyboard shortcuts
- **Speed memory**: Remember speeds globally, per-site, or not at all
- **Configurable steps**: Adjust speed increment and seek amounts
- **Audio support**: Control `<audio>` elements (optional)
- **Domain management**: Disable on specific websites

### 🛡️ Streaming Site Compatibility
- **Anti-reset protection**: Prevents sites from overriding your speed choice
- **Page-world injection**: Advanced mode for sites with aggressive key capture
- **DRM-friendly**: Works within browser security limits (no DRM bypass)
- **Pitch correction**: Natural-sounding audio at high speeds

## Installation

### From Source (Developer Mode)

1. **Download the extension**:
   ```bash
   git clone <repository-url>
   cd VSC
   ```

2. **Open Chrome Extensions**:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)

3. **Load the extension**:
   - Click "Load unpacked"
   - Select the VSC folder
   - The extension will appear in your extensions list

4. **Pin the extension** (optional):
   - Click the puzzle piece icon in Chrome toolbar
   - Pin VSC for easy access

### Permissions Explained

- **Storage**: Save your settings and speed preferences
- **All URLs**: Inject content scripts to work on all websites
- **All frames**: Access media elements in iframes and embedded players

## Usage

### Basic Controls

1. **Navigate to any video** (YouTube, Netflix, etc.)
2. **Use keyboard shortcuts** or click the overlay buttons
3. **Drag the overlay** to reposition it
4. **Hover to show/hide** the controller

### Advanced Features

#### Speed Memory
- **Off**: Don't remember speeds between sessions
- **Global**: Remember one speed for all videos
- **Per-site**: Remember different speeds for each website

#### Anti-Reset Protection
Some streaming sites continuously reset playback speed. Enable "Anti-Reset Patch" in settings to prevent this.

#### Force Keys Mode
If keyboard shortcuts don't work on certain sites, enable "Force Keys" to intercept keys at the page level.

## Settings

Access settings by:
- Clicking the VSC extension icon
- Right-clicking the extension → Options
- Going to `chrome://extensions/` → VSC → Details → Extension options

### Keyboard Shortcuts
- Remap any of the 6 default shortcuts
- Conflict detection prevents duplicate assignments
- Reserved keys (F1-F12, Ctrl, Alt, etc.) are blocked

### Speed Settings
- **Speed Step**: Amount to increase/decrease speed (default: 0.1)
- **Seek Seconds**: Number of seconds to seek forward/backward (default: 10)

### Behavior Settings
- **Apply to Audio**: Control `<audio>` elements in addition to videos
- **Keyboard Works When Hidden**: Allow shortcuts even when overlay is hidden

### Advanced Settings
- **Anti-Reset Patch**: Prevent sites from resetting your chosen speed
- **Force Keys**: Intercept keys at page level for better compatibility

### Domain Management
- Add domains to disable VSC on specific websites
- View and manage stored speeds for different sites
- Clear all stored speeds if needed

## Streaming Site Compatibility

### Supported Sites
- ✅ **YouTube** - Full support including live streams
- ✅ **Netflix** - Works with web player
- ✅ **Prime Video** - Compatible with Amazon's player
- ✅ **Vimeo** - Full video control
- ✅ **Twitter/X** - Video and audio posts
- ✅ **Coursera** - Educational videos
- ✅ **Generic HTML5** - Any site using standard video/audio tags

### Limitations
- **Cross-origin iframes**: Some embedded players may be inaccessible due to browser security
- **Proprietary players**: Sites using non-HTML5 players (Flash, Silverlight) are not supported
- **DRM content**: Cannot bypass DRM restrictions (by design)
- **Hard-blocked sites**: Some sites may actively prevent speed changes

### Troubleshooting Streaming Sites

1. **Enable Anti-Reset Patch**: Prevents sites from overriding your speed
2. **Try Force Keys Mode**: For sites with aggressive key capture
3. **Check if domain is disabled**: Verify the site isn't in your disabled list
4. **Refresh the page**: Sometimes needed after changing settings

## Privacy & Security

### Privacy-First Design
- **No telemetry**: Extension doesn't collect or send any data
- **No external requests**: All functionality is local
- **No tracking**: No analytics or user behavior monitoring
- **Local storage only**: Settings stored locally in your browser

### Security Features
- **Minimal permissions**: Only requests necessary permissions
- **Sandboxed execution**: Content scripts run in isolated environment
- **No code injection**: Page-world scripts are optional and user-controlled
- **Open source**: All code is visible and auditable

## Technical Details

### Architecture
- **Manifest V3**: Uses latest Chrome extension standard
- **Content Scripts**: Inject into all pages for universal compatibility
- **Shadow DOM**: Overlays use shadow DOM to avoid CSS conflicts
- **MutationObserver**: Efficiently detects new media elements
- **Service Worker**: Handles extension lifecycle and storage

### Browser Support
- **Chrome**: Full support (primary target)
- **Chromium-based**: Should work on Edge, Brave, etc.
- **Firefox**: Not currently supported (different extension format)

### Performance
- **No polling**: Uses event-driven observers
- **Efficient discovery**: Only processes new media elements
- **Minimal memory**: Lightweight implementation
- **Fast response**: Immediate speed changes

## Development

### Project Structure
```
VSC/
├── manifest.json              # Extension manifest
├── service_worker.js          # Background service worker
├── content/                   # Content script files
│   ├── content.js            # Main content script
│   ├── dom.js                # DOM manipulation and overlays
│   ├── media.js              # Media discovery and management
│   ├── keys.js               # Keyboard shortcut handling
│   ├── state.js              # Settings and storage
│   ├── utils.js              # Utility functions
│   ├── page-bridge.js        # Page-world injection script
│   └── controller.css        # Base styles
├── options/                   # Options page
│   ├── options.html          # Settings UI
│   ├── options.css           # Options page styles
│   └── options.js            # Options page logic
└── assets/                    # Extension assets
    ├── icon16.png            # 16x16 icon
    ├── icon48.png            # 48x48 icon
    └── icon128.png           # 128x128 icon
```

### Building from Source
1. Clone the repository
2. No build process required - pure JavaScript/CSS
3. Load as unpacked extension in Chrome

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on multiple sites
5. Submit a pull request

## Troubleshooting

### Common Issues

**Keyboard shortcuts not working:**
- Check if you're typing in an input field
- Verify the site isn't in your disabled domains list
- Try enabling "Force Keys" mode for problematic sites

**Overlay not appearing:**
- Refresh the page
- Check if the site uses HTML5 video/audio
- Verify VSC isn't disabled for the domain

**Speed keeps resetting:**
- Enable "Anti-Reset Patch" in settings
- Some sites may still override speeds (limitation)

**Settings not saving:**
- Check Chrome storage permissions
- Try refreshing the options page
- Clear extension data and reconfigure

### Getting Help
- Check the [Issues](https://github.com/your-repo/issues) page
- Create a new issue with:
  - Chrome version
  - Site where problem occurs
  - Steps to reproduce
  - Console errors (if any)

## License

MIT License - see LICENSE file for details.

## Changelog

### v1.0.0
- Initial release
- Universal video/audio speed control
- Keyboard shortcuts and visual overlay
- Streaming site compatibility
- Privacy-first design
- Comprehensive settings page

---

**VSC — Video Speed Controller**  
*Universal speed control for the modern web*

