/**
 * VSC — Video Speed Controller
 * DOM manipulation and overlay management
 */

(function() {
  'use strict';

  window.VSC = window.VSC || {};
  window.VSC.dom = {
    
    /**
     * Create overlay controller for media element
     * @param {HTMLMediaElement} media - Media element
     * @returns {Object} Overlay controller object
     */
    createOverlay(media) {
      const overlay = {
        media,
        shadowRoot: null,
        container: null,
        isVisible: true,
        isDragging: false,
        dragStart: { x: 0, y: 0 },
        position: { x: 10, y: 10 },
        observers: [],
        
        /**
         * Initialize the overlay
         */
        init() {
          this.createShadowDOM();
          this.setupEventListeners();
          this.setupObservers();
          this.updatePosition();
          this.updateSpeedDisplay();
        },

        /**
         * Create shadow DOM structure
         */
        createShadowDOM() {
          // Create container element
          this.container = document.createElement('div');
          this.container.className = 'vsc-overlay-container';
          this.container.style.cssText = `
            position: absolute;
            z-index: 999999;
            pointer-events: auto;
            user-select: none;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 12px;
            line-height: 1;
          `;

          // Create shadow root
          this.shadowRoot = this.container.attachShadow({ mode: 'closed' });
          
          // Create overlay HTML
          this.shadowRoot.innerHTML = `
            <style>
              :host {
                display: block;
                position: relative;
              }
              
              .vsc-overlay {
                background: rgba(0, 0, 0, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 6px;
                padding: 4px 6px;
                display: flex;
                align-items: center;
                gap: 4px;
                backdrop-filter: blur(4px);
                transition: opacity 0.2s ease;
                min-width: 120px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
              }
              
              .vsc-overlay.hidden {
                opacity: 0.3;
              }
              
              .vsc-speed-display {
                color: white;
                font-weight: 500;
                min-width: 40px;
                text-align: center;
                font-variant-numeric: tabular-nums;
              }
              
              .vsc-button {
                background: rgba(255, 255, 255, 0.1);
                border: none;
                border-radius: 3px;
                color: white;
                cursor: pointer;
                padding: 2px 4px;
                font-size: 10px;
                line-height: 1;
                min-width: 16px;
                height: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background-color 0.1s ease;
              }
              
              .vsc-button:hover {
                background: rgba(255, 255, 255, 0.2);
              }
              
              .vsc-button:active {
                background: rgba(255, 255, 255, 0.3);
              }
              
              .vsc-button svg {
                width: 10px;
                height: 10px;
                fill: currentColor;
              }
            </style>
            
            <div class="vsc-overlay">
              <div class="vsc-speed-display">1.00×</div>
              <button class="vsc-button vsc-decrease" title="Decrease speed (S)">
                <svg viewBox="0 0 10 10">
                  <path d="M2 4h6v2H2z"/>
                </svg>
              </button>
              <button class="vsc-button vsc-increase" title="Increase speed (D)">
                <svg viewBox="0 0 10 10">
                  <path d="M4 2v2H2v2h2v2h2V6h2V4H6V2H4z"/>
                </svg>
              </button>
              <button class="vsc-button vsc-reset" title="Reset speed (R)">
                <svg viewBox="0 0 10 10">
                  <path d="M5 1C2.8 1 1 2.8 1 5s1.8 4 4 4c1.1 0 2.1-.4 2.8-1.2l-1.4-1.4-.7.7 2.5 2.5L9.5 7l-.7-.7-1.4 1.4C6.7 6.1 5.9 5.5 5 5.5c-1.4 0-2.5-1.1-2.5-2.5S3.6.5 5 .5c.8 0 1.5.4 2 .9l.7-.7C6.9.2 6 .1 5 .1z"/>
                </svg>
              </button>
              <button class="vsc-button vsc-rewind" title="Rewind 10s (Z)">
                <svg viewBox="0 0 10 10">
                  <path d="M5 2L2 5l3 3V6.5c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2H1c0 2.2 1.8 4 4 4s4-1.8 4-4-1.8-4-4-4V2z"/>
                </svg>
              </button>
              <button class="vsc-button vsc-forward" title="Forward 10s (X)">
                <svg viewBox="0 0 10 10">
                  <path d="M5 2v1.5c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2H1c0 2.2 1.8 4 4 4s4-1.8 4-4-1.8-4-4-4V2L2 5l3 3V8z"/>
                </svg>
              </button>
              <button class="vsc-button vsc-toggle" title="Toggle visibility (V)">
                <svg viewBox="0 0 10 10">
                  <path d="M5 2c2.2 0 4 1.8 4 4s-1.8 4-4 4-4-1.8-4-4 1.8-4 4-4zm0 1.5c-1.4 0-2.5 1.1-2.5 2.5S3.6 8 5 8s2.5-1.1 2.5-2.5S6.4 3.5 5 3.5zm0 1c.8 0 1.5.7 1.5 1.5S5.8 7.5 5 7.5 3.5 6.8 3.5 6 4.2 4.5 5 4.5z"/>
                </svg>
              </button>
            </div>
          `;

          // Append to media element's parent
          const mediaParent = media.parentElement;
          if (mediaParent) {
            mediaParent.appendChild(this.container);
          }
        },

        /**
         * Setup event listeners
         */
        setupEventListeners() {
          const overlay = this.shadowRoot.querySelector('.vsc-overlay');
          const buttons = this.shadowRoot.querySelectorAll('.vsc-button');

          // Button click handlers
          buttons.forEach(button => {
            button.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              this.handleButtonClick(button);
            });
          });

          // Drag functionality
          overlay.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('vsc-button')) return;
            this.startDrag(e);
          });

          overlay.addEventListener('touchstart', (e) => {
            if (e.target.classList.contains('vsc-button')) return;
            this.startDrag(e.touches[0]);
          });

          // Hover effects
          this.container.addEventListener('mouseenter', () => {
            this.show();
          });

          this.container.addEventListener('mouseleave', () => {
            this.hide();
          });
        },

        /**
         * Setup observers for position updates
         */
        setupObservers() {
          // Resize observer
          if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(() => {
              this.updatePosition();
            });
            resizeObserver.observe(this.media);
            this.observers.push(() => resizeObserver.disconnect());
          }

          // Intersection observer for visibility
          if (window.IntersectionObserver) {
            const intersectionObserver = new IntersectionObserver((entries) => {
              const entry = entries[0];
              if (entry.isIntersecting) {
                this.show();
              } else {
                this.hide();
              }
            });
            intersectionObserver.observe(this.media);
            this.observers.push(() => intersectionObserver.disconnect());
          }

          // Scroll listener
          const handleScroll = window.VSC.utils.debounce(() => {
            this.updatePosition();
          }, 16);
          
          window.addEventListener('scroll', handleScroll, true);
          this.observers.push(() => {
            window.removeEventListener('scroll', handleScroll, true);
          });

          // Fullscreen change listener
          const handleFullscreenChange = () => {
            this.updatePosition();
          };
          
          document.addEventListener('fullscreenchange', handleFullscreenChange);
          document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
          this.observers.push(() => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
          });
        },

        /**
         * Handle button clicks
         * @param {Element} button - Clicked button
         */
        handleButtonClick(button) {
          const settings = window.VSC.state.getSettings();
          
          if (button.classList.contains('vsc-decrease')) {
            const currentSpeed = this.media.playbackRate;
            const newSpeed = window.VSC.utils.clamp(currentSpeed - settings.step, 0.25, 4.0);
            window.VSC.media.applySpeed(this.media, newSpeed);
            window.VSC.media.setPreferredSpeed(this.media, newSpeed);
            window.VSC.state.storeSpeed(newSpeed);
          } else if (button.classList.contains('vsc-increase')) {
            const currentSpeed = this.media.playbackRate;
            const newSpeed = window.VSC.utils.clamp(currentSpeed + settings.step, 0.25, 4.0);
            window.VSC.media.applySpeed(this.media, newSpeed);
            window.VSC.media.setPreferredSpeed(this.media, newSpeed);
            window.VSC.state.storeSpeed(newSpeed);
          } else if (button.classList.contains('vsc-reset')) {
            window.VSC.media.resetSpeed(this.media);
            window.VSC.media.setPreferredSpeed(this.media, 1.0);
            window.VSC.state.storeSpeed(1.0);
          } else if (button.classList.contains('vsc-rewind')) {
            window.VSC.media.seekMedia(this.media, -settings.seekSec);
          } else if (button.classList.contains('vsc-forward')) {
            window.VSC.media.seekMedia(this.media, settings.seekSec);
          } else if (button.classList.contains('vsc-toggle')) {
            this.toggleVisibility();
          }

          // Update interaction time
          window.VSC.media.updateInteraction(this.media);
        },

        /**
         * Start drag operation
         * @param {Event} e - Mouse or touch event
         */
        startDrag(e) {
          this.isDragging = true;
          this.dragStart = { x: e.clientX, y: e.clientY };
          
          const handleMove = (moveEvent) => {
            if (!this.isDragging) return;
            
            const deltaX = moveEvent.clientX - this.dragStart.x;
            const deltaY = moveEvent.clientY - this.dragStart.y;
            
            this.position.x += deltaX;
            this.position.y += deltaY;
            
            this.dragStart = { x: moveEvent.clientX, y: moveEvent.clientY };
            this.updatePosition();
          };

          const handleEnd = () => {
            this.isDragging = false;
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleEnd);
          };

          document.addEventListener('mousemove', handleMove);
          document.addEventListener('mouseup', handleEnd);
          document.addEventListener('touchmove', handleMove);
          document.addEventListener('touchend', handleEnd);
        },

        /**
         * Update overlay position
         */
        updatePosition() {
          if (!this.container || !this.media) return;

          const mediaRect = this.media.getBoundingClientRect();
          const containerRect = this.container.getBoundingClientRect();
          
          // Clamp position within media bounds
          const maxX = mediaRect.width - containerRect.width;
          const maxY = mediaRect.height - containerRect.height;
          
          this.position.x = window.VSC.utils.clamp(this.position.x, 0, maxX);
          this.position.y = window.VSC.utils.clamp(this.position.y, 0, maxY);
          
          // Apply position
          this.container.style.left = `${mediaRect.left + this.position.x}px`;
          this.container.style.top = `${mediaRect.top + this.position.y}px`;
        },

        /**
         * Update speed display
         * @param {number} speed - Current speed
         */
        updateSpeedDisplay(speed = null) {
          if (!this.shadowRoot) return;
          
          const display = this.shadowRoot.querySelector('.vsc-speed-display');
          if (display) {
            const currentSpeed = speed || this.media.playbackRate;
            display.textContent = `${window.VSC.utils.formatNumber(currentSpeed)}×`;
          }
        },

        /**
         * Show overlay
         */
        show() {
          if (!this.shadowRoot) return;
          
          const overlay = this.shadowRoot.querySelector('.vsc-overlay');
          if (overlay) {
            overlay.classList.remove('hidden');
          }
          this.isVisible = true;
        },

        /**
         * Hide overlay
         */
        hide() {
          if (!this.shadowRoot) return;
          
          const overlay = this.shadowRoot.querySelector('.vsc-overlay');
          if (overlay) {
            overlay.classList.add('hidden');
          }
          this.isVisible = false;
        },

        /**
         * Toggle overlay visibility
         */
        toggleVisibility() {
          if (this.isVisible) {
            this.hide();
          } else {
            this.show();
          }
        },

        /**
         * Destroy overlay
         */
        destroy() {
          // Clean up observers
          this.observers.forEach(cleanup => cleanup());
          this.observers = [];

          // Remove from DOM
          if (this.container && this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
          }

          // Clear references
          this.container = null;
          this.shadowRoot = null;
          this.media = null;
        }
      };

      // Initialize and return
      overlay.init();
      return overlay;
    }
  };

})();
