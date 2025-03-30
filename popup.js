// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const audioTabsContainer = document.getElementById('audio-tabs-container');
  const noAudioTabs = document.getElementById('no-audio-tabs');
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = themeToggle.querySelector('i');
  
  // Load saved theme preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
    themeIcon.classList.replace('fa-moon', 'fa-sun');
  }
  
  // Theme toggle functionality
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    
    if (document.body.classList.contains('dark-theme')) {
      localStorage.setItem('theme', 'dark');
      themeIcon.classList.replace('fa-moon', 'fa-sun');
    } else {
      localStorage.setItem('theme', 'light');
      themeIcon.classList.replace('fa-sun', 'fa-moon');
    }
  });
  
  // Function to fetch all tabs with audio
  // Add this at the top of the file, after any existing variable declarations
  let detectedTabsOrder = [];
  let isRefreshing = false; // Flag to prevent multiple refreshes at once
  let refreshInterval = null; // Store the interval reference
  
  function getAudioTabs() {
    // Prevent multiple simultaneous refreshes
    if (isRefreshing) return;
    isRefreshing = true;
    
    chrome.tabs.query({ audible: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error('Error querying tabs:', chrome.runtime.lastError);
        isRefreshing = false;
        return;
      }
      
      if (tabs.length === 0) {
        audioTabsContainer.style.display = 'none';
        noAudioTabs.style.display = 'block';
        
        // Don't clear the order when no audio tabs are present
        // This helps maintain order when tabs temporarily stop playing audio
        isRefreshing = false;
        return;
      }
      
      audioTabsContainer.style.display = 'flex';
      noAudioTabs.style.display = 'none';
      
      // Update our tracking of tab order
      const currentTabIds = tabs.map(tab => tab.id);
      
      // Add new tabs that weren't in our order before
      currentTabIds.forEach(id => {
        if (!detectedTabsOrder.includes(id)) {
          detectedTabsOrder.push(id);
        }
      });
      
      // Create a map of tabs by ID for easy lookup
      const tabsById = {};
      tabs.forEach(tab => {
        tabsById[tab.id] = tab;
      });
      
      // Create a map of existing tab elements
      const existingTabElements = {};
      Array.from(audioTabsContainer.children).forEach(element => {
        const tabId = parseInt(element.dataset.tabId);
        if (tabId && currentTabIds.includes(tabId)) {
          existingTabElements[tabId] = element;
        }
      });
      
      // Clear container only if necessary
      if (Object.keys(existingTabElements).length === 0) {
        audioTabsContainer.innerHTML = '';
      }
      
      // Add tabs in our tracked order
      detectedTabsOrder.forEach(tabId => {
        if (tabsById[tabId]) {
          if (existingTabElements[tabId]) {
            // Tab element already exists, update it if needed
            updateTabElement(existingTabElements[tabId], tabsById[tabId]);
          } else {
            // Create new tab element
            chrome.scripting.executeScript({
              target: { tabId: tabId },
              files: ['content.js']
            }).then(() => {
              const tabElement = createTabElement(tabsById[tabId]);
              audioTabsContainer.appendChild(tabElement);
            }).catch(err => {
              console.error('Error injecting script:', err);
              const tabElement = createErrorTabElement(tabsById[tabId]);
              audioTabsContainer.appendChild(tabElement);
            });
          }
        }
      });
      
      // Remove tabs that are no longer audible
      Array.from(audioTabsContainer.children).forEach(element => {
        const tabId = parseInt(element.dataset.tabId);
        if (!currentTabIds.includes(tabId)) {
          element.classList.add('fade-out');
          setTimeout(() => {
            if (element.parentNode) {
              element.remove();
            }
          }, 300); // Match this with the CSS transition time
        }
      });
      
      isRefreshing = false;
    });
  }
  
  // Function to create error tab element
  function createErrorTabElement(tab) {
    const tabDiv = document.createElement('div');
    tabDiv.className = 'audio-tab';
    tabDiv.dataset.tabId = tab.id;
    
    // Create favicon image
    const favicon = document.createElement('img');
    favicon.className = 'tab-favicon';
    favicon.src = tab.favIconUrl || 'icons/default_favicon.png';
    favicon.alt = tab.title;
    favicon.title = tab.title; // Keep the title as a tooltip
    
    // Create error message
    const errorMsg = document.createElement('div');
    errorMsg.className = 'error-message';
    errorMsg.textContent = 'Cannot access this tab. Try refreshing the page.';
    
    // Create a container for the favicon
    const leftSection = document.createElement('div');
    leftSection.className = 'tab-left-section';
    leftSection.appendChild(favicon);
    
    tabDiv.appendChild(leftSection);
    tabDiv.appendChild(errorMsg);
    
    return tabDiv;
  }
  
  // Function to create tab element for UI
  function createTabElement(tab) {
    const tabDiv = document.createElement('div');
    tabDiv.className = 'audio-tab';
    tabDiv.dataset.tabId = tab.id;
    
    // Add a data attribute for the tab's position in our order
    const tabIndex = detectedTabsOrder.indexOf(tab.id);
    tabDiv.dataset.tabIndex = tabIndex;
    
    // Create favicon image
    const favicon = document.createElement('img');
    favicon.className = 'tab-favicon';
    favicon.src = tab.favIconUrl || 'icons/default_favicon.png';
    favicon.alt = tab.title;
    favicon.title = tab.title; // Keep the title as a tooltip
    
    // Create controls container
    const controls = document.createElement('div');
    controls.className = 'tab-controls';
    
    // Create volume slider
    const volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.className = 'volume-slider';
    volumeSlider.min = '0';
    volumeSlider.max = '100';
    volumeSlider.value = '100'; // Default value, will be updated
    
    // Create volume percentage display
    const volumePercentage = document.createElement('div');
    volumePercentage.className = 'volume-percentage';
    volumePercentage.textContent = '100%';
    
    // Create mute button
    const muteButton = document.createElement('button');
    muteButton.className = 'mute-button';
    muteButton.innerHTML = '<i class="fas fa-volume-up"></i>';
    muteButton.title = 'Mute';
    
    // Load saved volume settings from localStorage
    const savedSettings = loadTabSettings(tab.id);
    let initialVolume = savedSettings.volume !== undefined ? savedSettings.volume : 1.0;
    let initialMuted = savedSettings.muted !== undefined ? savedSettings.muted : false;
    
    // Get current state from the content script with retry mechanism
    function getTabState(attempts = 0) {
      chrome.tabs.sendMessage(tab.id, { action: 'getState' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error getting state:', chrome.runtime.lastError.message);
          
          // Retry up to 3 times with increasing delay
          if (attempts < 3) {
            console.log(`Retrying getState (attempt ${attempts + 1})...`);
            setTimeout(() => getTabState(attempts + 1), 500 * (attempts + 1));
            return;
          }
          
          // Show error message after all retries fail
          const errorMsg = document.createElement('div');
          errorMsg.className = 'error-message';
          errorMsg.textContent = 'Cannot access this tab. Try refreshing the page.';
          controls.appendChild(errorMsg);
          
          // Use saved settings if available
          if (savedSettings.volume !== undefined) {
            updateVolumeUI(savedSettings.volume * 100);
            if (savedSettings.muted) {
              muteButton.innerHTML = '<i class="fas fa-volume-mute"></i>';
              muteButton.classList.add('muted');
            }
          }
          return;
        }
        
        if (response) {
          console.log('Received state from tab:', response);
          
          // Update UI with current state from content script
          if (typeof response.volume === 'number' && !isNaN(response.volume)) {
            // Use the actual volume from the content script
            initialVolume = response.volume;
            updateVolumeUI(response.volume * 100);
            
            // Save this volume to localStorage
            saveTabSetting(tab.id, 'volume', response.volume);
            console.log('Saved volume to localStorage:', response.volume);
          } else {
            // Use saved volume if available
            updateVolumeUI(initialVolume * 100);
          }
          
          if (response.muted) {
            muteButton.innerHTML = '<i class="fas fa-volume-mute"></i>';
            muteButton.classList.add('muted');
            initialMuted = true;
            saveTabSetting(tab.id, 'muted', true);
          } else if (savedSettings.muted) {
            // Apply saved mute state if it was muted
            chrome.tabs.sendMessage(tab.id, { 
              action: 'toggleMute', 
              muted: true 
            });
            muteButton.innerHTML = '<i class="fas fa-volume-mute"></i>';
            muteButton.classList.add('muted');
          }
        }
      });
    }
    
    // Helper function to update volume UI elements
    function updateVolumeUI(percentValue) {
      // Round to nearest integer for display
      const roundedValue = Math.round(percentValue);
      volumeSlider.value = roundedValue;
      volumePercentage.textContent = `${roundedValue}%`;
      console.log('Updated UI with volume:', roundedValue);
    }
    
    // Start the state retrieval process
    getTabState();
    
    // Function to update volume
    function updateVolume(newValue) {
      // Ensure value is between 0 and 100
      newValue = Math.max(0, Math.min(100, newValue));
      
      // Update slider and percentage display
      updateVolumeUI(newValue);
      
      // Calculate relative volume (0-1)
      const volume = newValue / 100;
      console.log('Slider changed to:', volume);
      
      // Save to localStorage before sending to content script
      saveTabSetting(tab.id, 'volume', volume);
      
      chrome.tabs.sendMessage(tab.id, { 
        action: 'setVolume', 
        volume: volume 
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Volume control error:', chrome.runtime.lastError.message);
          
          // Show error message
          const errorMsg = document.createElement('div');
          errorMsg.className = 'error-message';
          errorMsg.textContent = 'Cannot control volume. Try refreshing the page.';
          
          // Remove existing error messages
          const existingErrors = controls.querySelectorAll('.error-message');
          existingErrors.forEach(err => err.remove());
          
          controls.appendChild(errorMsg);
          
          // Auto-hide error after 3 seconds
          setTimeout(() => {
            if (errorMsg.parentNode) {
              errorMsg.remove();
            }
          }, 3000);
        } else if (response && response.success) {
          // Update UI with confirmed volume from content script
          if (response.newVolume !== undefined) {
            updateVolumeUI(response.newVolume * 100);
          }
        }
      });
    }
    
    // Add event listeners for controls
    volumeSlider.addEventListener('input', (event) => {
      updateVolume(parseInt(event.target.value));
    });
    
    muteButton.addEventListener('click', () => {
      // Toggle mute state
      const isMuted = muteButton.classList.contains('muted');
      const newMutedState = !isMuted;
      
      // Save to localStorage
      saveTabSetting(tab.id, 'muted', newMutedState);
      
      chrome.tabs.sendMessage(tab.id, { 
        action: 'toggleMute', 
        muted: newMutedState 
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Mute control error:', chrome.runtime.lastError.message);
          return;
        }
        
        if (response && response.success) {
          if (newMutedState) {
            muteButton.innerHTML = '<i class="fas fa-volume-mute"></i>';
            muteButton.classList.add('muted');
          } else {
            muteButton.innerHTML = '<i class="fas fa-volume-up"></i>';
            muteButton.classList.remove('muted');
          }
        }
      });
    });
    
    // Make the tab element focusable for keyboard controls
    tabDiv.tabIndex = 0;
    
    // Add keyboard event listener for volume control
    // Add this function after the existing updateTabElement function
    // Add this function if it doesn't exist or replace it if it's not working
    function focusTab(direction) {
      const tabs = Array.from(audioTabsContainer.querySelectorAll('.audio-tab'));
      if (tabs.length <= 1) return; // No need for navigation with 0 or 1 tab
      
      // Find the currently focused tab
      const currentFocusedTab = document.activeElement;
      const isFocusedTabInContainer = currentFocusedTab && currentFocusedTab.classList.contains('audio-tab');
      
      let nextTabIndex = 0;
      
      if (isFocusedTabInContainer) {
        // Get the index of the currently focused tab
        const currentIndex = tabs.indexOf(currentFocusedTab);
        
        // Calculate the next tab index based on direction
        if (direction === 'up') {
          nextTabIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        } else {
          nextTabIndex = (currentIndex + 1) % tabs.length;
        }
      }
      
      // Focus the next tab
      tabs[nextTabIndex].focus();
      console.log(`Focused tab ${nextTabIndex} (direction: ${direction})`);
    }
    
    // Add this to the createTabElement function where the keyboard event listener is defined
    tabDiv.addEventListener('keydown', (event) => {
      const currentValue = parseInt(volumeSlider.value);
      
      switch(event.key) {
        case 'ArrowRight':
          // Increase volume by 1%
          updateVolume(currentValue + 1);
          event.preventDefault();
          break;
        case 'ArrowLeft':
          // Decrease volume by 1%
          updateVolume(currentValue - 1);
          event.preventDefault();
          break;
        case 'ArrowUp':
          // Navigate to the tab above
          focusTab('up');
          event.preventDefault();
          break;
        case 'ArrowDown':
          // Navigate to the tab below
          focusTab('down');
          event.preventDefault();
          break;
        case 'm':
        case 'M':
          // Toggle mute
          muteButton.click();
          event.preventDefault();
          break;
      }
    });
    
    // Modify the assembly part to remove the title
    controls.appendChild(volumeSlider);
    controls.appendChild(volumePercentage);
    controls.appendChild(muteButton);
    
    // Create a simplified left section with just the favicon
    const leftSection = document.createElement('div');
    leftSection.className = 'tab-left-section';
    leftSection.appendChild(favicon);
    
    tabDiv.appendChild(leftSection);
    tabDiv.appendChild(controls);
    
    // Auto-focus the first tab for keyboard controls
    setTimeout(() => {
      if (tabDiv.parentNode && tabDiv.parentNode.firstChild === tabDiv) {
        tabDiv.focus();
      }
    }, 100);
    
    return tabDiv;
}

// Helper functions for localStorage
function getStorageKey(tabId) {
  return `wavel_tab_${tabId}`;
}

function saveTabSetting(tabId, setting, value) {
  try {
    const storageKey = getStorageKey(tabId);
    const currentSettings = JSON.parse(localStorage.getItem(storageKey) || '{}');
    currentSettings[setting] = value;
    localStorage.setItem(storageKey, JSON.stringify(currentSettings));
    console.log(`Saved ${setting}=${value} for tab ${tabId}`);
  } catch (e) {
    console.error('Error saving to localStorage:', e);
  }
}

function loadTabSettings(tabId) {
  try {
    const storageKey = getStorageKey(tabId);
    const settings = JSON.parse(localStorage.getItem(storageKey) || '{}');
    console.log(`Loaded settings for tab ${tabId}:`, settings);
    return settings;
  } catch (e) {
    console.error('Error loading from localStorage:', e);
    return {};
  }
}

// Add a function to clean up old tab data (optional, can be called periodically)
function cleanupOldTabData() {
  try {
    chrome.tabs.query({}, (tabs) => {
      const activeTabIds = new Set(tabs.map(tab => tab.id));
      const keysToKeep = new Set();
      
      // Find all Wavel keys in localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('wavel_tab_')) {
          const tabId = parseInt(key.replace('wavel_tab_', ''));
          if (activeTabIds.has(tabId)) {
            keysToKeep.add(key);
          }
        }
      }
      
      // Remove keys for closed tabs
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('wavel_tab_') && !keysToKeep.has(key)) {
          localStorage.removeItem(key);
          console.log('Removed settings for closed tab:', key);
          i--; // Adjust index since we removed an item
        }
      }
    });
  } catch (e) {
    console.error('Error cleaning up tab data:', e);
  }
}

// Call cleanup when popup opens
// Add this to the DOMContentLoaded event handler

document.addEventListener('DOMContentLoaded', () => {
  // Clean up old tab data
  cleanupOldTabData();
});

// Initial load of audio tabs
getAudioTabs();

// Refresh audio tabs every 3 seconds
setInterval(getAudioTabs, 3000);
});

// Add this to your document.addEventListener('DOMContentLoaded', ...) section
document.addEventListener('keydown', (event) => {
  // Only handle global navigation if no specific element has focus
  // or if the focused element is not an input
  if (document.activeElement === document.body || 
      (document.activeElement && document.activeElement.tagName !== 'INPUT')) {
    if (event.key === 'ArrowUp') {
      focusTab('up');
      event.preventDefault();
    } else if (event.key === 'ArrowDown') {
      focusTab('down');
      event.preventDefault();
    }
  }
});