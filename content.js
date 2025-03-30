// content.js
// This script is injected into each page to control audio
(function() {
  console.log('Wavel content script loaded');
  
  // Create a global audio controller object if it doesn't exist
  if (!window.hasOwnProperty('wavelAudioController')) {
    window.wavelAudioController = {
      volume: 1.0,
      muted: false,
      
      // Function to apply current settings to all media elements
      applyToAll: function() {
        console.log('Applying volume:', this.volume, 'muted:', this.muted);
        
        // Handle standard HTML5 audio/video elements - this works for most sites
        const mediaElements = document.querySelectorAll('audio, video');
        mediaElements.forEach(media => {
          try {
            // Store original volume for reference
            if (!media.hasAttribute('data-wavel-original-volume') && media.volume) {
              media.setAttribute('data-wavel-original-volume', media.volume);
            }
            
            // Apply our volume settings
            media.volume = this.volume;
            media.muted = this.muted;
            console.log('Set volume for media element:', media, 'to', this.volume);
          } catch (e) {
            console.error('Error setting media properties:', e);
          }
        });
        
        // Special handling for specific sites
        const hostname = window.location.hostname;
        
        // YouTube
        if (hostname.includes('youtube.com') || hostname.includes('music.youtube.com')) {
          this.handleYouTube();
        }
        // Spotify
        else if (hostname.includes('spotify.com') || hostname.includes('open.spotify.com')) {
          this.handleSpotify();
        }
        // SoundCloud
        else if (hostname.includes('soundcloud.com')) {
          this.handleSoundCloud();
        }
        // Netflix
        else if (hostname.includes('netflix.com')) {
          this.handleNetflix();
        }
        // Generic iframe audio handling for other sites
        else {
          this.handleGenericSites();
        }
      },
      
      // Handle YouTube specifically
      handleYouTube: function() {
        try {
          // Method 1: Try to access the video element directly (most reliable)
          const video = document.querySelector('video');
          if (video) {
            // Store original volume if not already stored
            if (!video.hasAttribute('data-wavel-original-volume') && video.volume) {
              video.setAttribute('data-wavel-original-volume', video.volume);
            }
            
            video.volume = this.volume;
            video.muted = this.muted;
            console.log('YouTube video element volume set to:', this.volume);
            return;
          }
          
          // Method 2: Try to use the movie_player object
          const moviePlayer = document.getElementById('movie_player');
          if (moviePlayer && typeof moviePlayer.setVolume === 'function') {
            if (this.muted) {
              moviePlayer.mute();
            } else {
              moviePlayer.unMute();
              moviePlayer.setVolume(this.volume * 100);
            }
            console.log('YouTube movie_player volume set to:', this.volume * 100);
            return;
          }
        } catch (e) {
          console.error('Error adjusting YouTube volume:', e);
        }
      },
      
      // Handle Spotify specifically
      handleSpotify: function() {
        try {
          console.log('Handling Spotify player with improved method...');
          
          // Method 1: Direct media elements with improved selectors
          const spotifyPlayers = document.querySelectorAll('audio, video');
          let volumeSet = false;
          
          if (spotifyPlayers.length > 0) {
            spotifyPlayers.forEach(player => {
              // Store original volume if not already stored
              if (!player.hasAttribute('data-wavel-original-volume') && typeof player.volume !== 'undefined') {
                player.setAttribute('data-wavel-original-volume', player.volume);
                console.log('Stored original Spotify volume:', player.volume);
              }
              
              // Apply our volume settings
              try {
                // First try the standard way
                player.volume = this.volume;
                player.muted = this.muted;
                
                // Then try to dispatch volume change events to ensure Spotify detects the change
                const volumeEvent = new Event('volumechange', { bubbles: true });
                player.dispatchEvent(volumeEvent);
                
                console.log('Spotify player volume set to:', this.volume);
                volumeSet = true;
              } catch (err) {
                console.error('Error setting Spotify player volume directly:', err);
              }
            });
          }
          
          // Method 2: Try to find and manipulate Spotify's volume slider
          if (!volumeSet) {
            // Look for Spotify's volume slider
            const volumeSliders = document.querySelectorAll(
              '[data-testid="volume-bar"]',
              '.volume-bar',
              'div[role="slider"][aria-label*="Volume"]',
              'input[type="range"][aria-label*="Volume"]'
            );
            
            if (volumeSliders.length > 0) {
              console.log('Found Spotify volume controls:', volumeSliders.length);
              
              volumeSliders.forEach(slider => {
                try {
                  // If it's an input element, we can set its value directly
                  if (slider.tagName === 'INPUT' && slider.type === 'range') {
                    slider.value = this.volume * 100;
                    
                    // Dispatch events to ensure Spotify detects the change
                    const inputEvent = new Event('input', { bubbles: true });
                    const changeEvent = new Event('change', { bubbles: true });
                    slider.dispatchEvent(inputEvent);
                    slider.dispatchEvent(changeEvent);
                    
                    console.log('Set Spotify input slider to:', this.volume * 100);
                    volumeSet = true;
                  } 
                  // If it's a div with role="slider", we need to use aria attributes
                  else if (slider.getAttribute('role') === 'slider') {
                    // Update aria values
                    slider.setAttribute('aria-valuenow', this.volume * 100);
                    
                    // Try to find and update the inner progress bar if it exists
                    const progressBar = slider.querySelector('.progress-bar, [class*="progress"]');
                    if (progressBar) {
                      progressBar.style.width = `${this.volume * 100}%`;
                    }
                    
                    console.log('Set Spotify aria slider to:', this.volume * 100);
                    volumeSet = true;
                  }
                } catch (err) {
                  console.error('Error manipulating Spotify volume slider:', err);
                }
              });
            }
          }
          
          // Method 3: Try to use Spotify's Web Playback SDK if available
          if (!volumeSet && window.Spotify && window.Spotify.Player) {
            try {
              console.log('Attempting to use Spotify Web Playback SDK');
              // This would require the page to be using the SDK
              // and us having access to the player instance
            } catch (err) {
              console.error('Error using Spotify Web Playback SDK:', err);
            }
          }
          
          // Method 4: Last resort - try to find the volume button and simulate clicks
          if (!volumeSet && this.muted) {
            const muteButtons = document.querySelectorAll(
              '[data-testid="volume-bar-toggle-mute-button"]',
              'button[aria-label*="Mute"]',
              'button[title*="Mute"]'
            );
            
            if (muteButtons.length > 0) {
              console.log('Found Spotify mute button, attempting to click');
              try {
                // Check if we need to click it (if it's not already in the desired state)
                const shouldBeMuted = this.muted;
                const isMuted = muteButtons[0].getAttribute('aria-checked') === 'true' || 
                                muteButtons[0].classList.contains('muted');
                
                if (shouldBeMuted !== isMuted) {
                  muteButtons[0].click();
                  console.log('Clicked Spotify mute button');
                }
              } catch (err) {
                console.error('Error clicking Spotify mute button:', err);
              }
            }
          }
        } catch (e) {
          console.error('Error with Spotify player:', e);
        }
      },
      
      // Handle SoundCloud specifically
      handleSoundCloud: function() {
        try {
          // Find SoundCloud's player
          const scPlayer = document.querySelector('.playControls__soundBadge, audio');
          if (scPlayer) {
            // Find the actual audio element
            const audio = document.querySelector('audio');
            if (audio) {
              audio.volume = this.volume;
              audio.muted = this.muted;
              console.log('SoundCloud player volume set to:', this.volume);
            }
          }
        } catch (e) {
          console.error('Error with SoundCloud player:', e);
        }
      },
      
      // Handle Netflix specifically
      handleNetflix: function() {
        try {
          const netflixPlayer = document.querySelector('video');
          if (netflixPlayer) {
            netflixPlayer.volume = this.volume;
            netflixPlayer.muted = this.muted;
            console.log('Netflix player volume set to:', this.volume);
          }
        } catch (e) {
          console.error('Error with Netflix player:', e);
        }
      },
      
      // Handle generic sites by looking for common patterns
      handleGenericSites: function() {
        try {
          // Look for common audio player classes/IDs
          const commonSelectors = [
            'audio',
            'video',
            '.audio-player',
            '.video-player',
            '.player',
            '.jp-jplayer',
            '.mejs__container',
            '[data-testid="audio-player"]',
            '[data-testid="video-player"]'
          ];
          
          commonSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              // If it's a direct audio/video element
              if (el.tagName === 'AUDIO' || el.tagName === 'VIDEO') {
                el.volume = this.volume;
                el.muted = this.muted;
                console.log(`Set volume for ${el.tagName} element to ${this.volume}`);
              } 
              // Otherwise look for audio/video elements inside
              else {
                const mediaInside = el.querySelectorAll('audio, video');
                mediaInside.forEach(media => {
                  media.volume = this.volume;
                  media.muted = this.muted;
                  console.log(`Set volume for nested media element to ${this.volume}`);
                });
              }
            });
          });
          
          // Try to handle iframes that might contain audio
          const iframes = document.querySelectorAll('iframe');
          iframes.forEach(iframe => {
            try {
              // We can't directly access iframe content from different origins
              // But we can try for same-origin iframes
              if (iframe.contentDocument) {
                const iframeMedia = iframe.contentDocument.querySelectorAll('audio, video');
                iframeMedia.forEach(media => {
                  media.volume = this.volume;
                  media.muted = this.muted;
                });
              }
            } catch (e) {
              // Cross-origin iframe access will fail - this is expected
              // console.error('Cannot access iframe content:', e);
            }
          });
        } catch (e) {
          console.error('Error handling generic site:', e);
        }
      },
      
      // Get the current system volume if possible
      getSystemVolume: function() {
        console.log('Getting system volume...');
        
        // We'll try to detect the current volume from existing media elements
        const mediaElements = document.querySelectorAll('audio, video');
        console.log('Found media elements:', mediaElements.length);
        
        if (mediaElements.length > 0) {
          // Check for our stored original volume first
          for (const media of mediaElements) {
            try {
              // First priority: check if we stored the original volume
              const originalVolume = media.getAttribute('data-wavel-original-volume');
              if (originalVolume && !isNaN(parseFloat(originalVolume))) {
                console.log('Using stored original volume:', originalVolume);
                return parseFloat(originalVolume);
              }
              
              // Second priority: use current volume if available
              if (typeof media.volume !== 'undefined' && !isNaN(media.volume)) {
                console.log('Using current media volume:', media.volume);
                return media.volume;
              }
            } catch (e) {
              console.error('Error accessing media volume:', e);
            }
          }
        }
        
        // For YouTube, try to get volume from the movie_player
        if (window.location.hostname.includes('youtube.com')) {
          try {
            const moviePlayer = document.getElementById('movie_player');
            if (moviePlayer && typeof moviePlayer.getVolume === 'function') {
              const ytVolume = moviePlayer.getVolume() / 100;
              console.log('Using YouTube movie_player volume:', ytVolume);
              return ytVolume;
            }
          } catch (e) {
            console.error('Error getting YouTube volume:', e);
          }
        }
        
        // For Spotify, try to find volume indicators
        if (window.location.hostname.includes('spotify.com')) {
          try {
            // Look for volume bar aria-valuenow attribute
            const volumeBar = document.querySelector('[data-testid="volume-bar"]');
            if (volumeBar && volumeBar.getAttribute('aria-valuenow')) {
              const spotifyVolume = parseFloat(volumeBar.getAttribute('aria-valuenow')) / 100;
              console.log('Using Spotify volume bar value:', spotifyVolume);
              return spotifyVolume;
            }
          } catch (e) {
            console.error('Error getting Spotify volume:', e);
          }
        }
        
        // Default to our current setting if we couldn't detect
        console.log('Using default volume:', this.volume);
        return this.volume;
      },
      
      // Watch for new media elements
      observe: function() {
        const self = this;
        const observer = new MutationObserver((mutations) => {
          let shouldApply = false;
          
          mutations.forEach(mutation => {
            if (mutation.addedNodes.length) {
              mutation.addedNodes.forEach(node => {
                if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') {
                  shouldApply = true;
                }
                
                // Check for audio/video elements in added subtrees
                if (node.querySelectorAll) {
                  const mediaInSubtree = node.querySelectorAll('audio, video');
                  if (mediaInSubtree.length > 0) shouldApply = true;
                }
              });
            }
          });
          
          if (shouldApply) {
            self.applyToAll();
          }
        });
        
        // Make sure body exists before observing
        if (document.body) {
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        } else {
          // Wait for body to be available
          document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.body, {
              childList: true,
              subtree: true
            });
          });
        }
      }
    };
    
    // Apply settings to existing media elements
    window.wavelAudioController.applyToAll();
    
    // Start observing for new media elements
    window.wavelAudioController.observe();
  }
  
  // Listen for messages from the extension popup
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Content script received message:', request);
    
    try {
      if (request.action === 'getState') {
        // Return the actual current volume instead of always 1.0
        // This ensures the slider reflects the real volume
        const actualVolume = window.wavelAudioController.volume;
        console.log('Sending actual volume to popup:', actualVolume);
        
        sendResponse({
          volume: actualVolume,
          muted: window.wavelAudioController.muted
        });
      } else if (request.action === 'setVolume') {
        console.log('Setting volume to:', request.volume);
        window.wavelAudioController.volume = request.volume;
        window.wavelAudioController.applyToAll();
        
        // Store the volume setting in a persistent way
        try {
          // Use a custom event to communicate with the extension
          document.dispatchEvent(new CustomEvent('wavel_volume_changed', { 
            detail: { volume: request.volume, tabId: sender.tab?.id || 'unknown' }
          }));
        } catch (e) {
          console.error('Error dispatching volume event:', e);
        }
        
        sendResponse({ success: true, newVolume: request.volume });
      } else if (request.action === 'toggleMute') {
        console.log('Setting mute state to:', request.muted);
        window.wavelAudioController.muted = request.muted;
        window.wavelAudioController.applyToAll();
        
        // Store the mute setting
        try {
          document.dispatchEvent(new CustomEvent('wavel_mute_changed', { 
            detail: { muted: request.muted, tabId: sender.tab?.id || 'unknown' }
          }));
        } catch (e) {
          console.error('Error dispatching mute event:', e);
        }
        
        sendResponse({ success: true });
      }
    } catch (e) {
      console.error('Error handling message:', e);
      sendResponse({ error: e.message });
    }
    
    return true; // Keep the message channel open for async response
  });
  
  // Send a ready message to the popup
  chrome.runtime.sendMessage({ action: 'contentScriptReady' });
})();