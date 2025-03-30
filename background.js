// background.js
let globalTabOrder = [];

chrome.runtime.onInstalled.addListener(() => {
  console.log('Wavel extension installed');
  
  // Initialize tab order from storage if available
  chrome.storage.local.get(['tabOrder'], (result) => {
    if (result.tabOrder && Array.isArray(result.tabOrder)) {
      globalTabOrder = result.tabOrder;
      console.log('Loaded tab order from storage:', globalTabOrder);
    }
  });
});

// Listen for tab updates to inject our content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Inject into all tabs, not just audible ones
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).catch(err => {
      console.error('Error injecting script:', err);
    });
  }
  
  // If the tab becomes audible, make sure our script is injected
  // and track the tab order
  if (changeInfo.audible === true) {
    // Add to global order if not already there
    if (!globalTabOrder.includes(tabId)) {
      globalTabOrder.push(tabId);
      
      // Save the updated order to storage
      chrome.storage.local.set({ tabOrder: globalTabOrder });
      console.log('Updated tab order:', globalTabOrder);
    }
    
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).catch(err => {
      console.error('Error injecting script into audible tab:', err);
    });
  }
});

// Listen for tab removals to clean up localStorage and our order
chrome.tabs.onRemoved.addListener((tabId) => {
  // Remove from global order
  const index = globalTabOrder.indexOf(tabId);
  if (index > -1) {
    globalTabOrder.splice(index, 1);
    
    // Save the updated order to storage
    chrome.storage.local.set({ tabOrder: globalTabOrder });
    console.log('Updated tab order after removal:', globalTabOrder);
  }
  
  // Send a message to the popup to clean up localStorage for this tab
  chrome.runtime.sendMessage({ 
    action: 'tabClosed', 
    tabId: tabId 
  }).catch(() => {
    // Popup might not be open, which is fine
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'contentScriptReady') {
    console.log('Content script is ready in tab:', sender.tab?.id);
  }
  
  // Handle requests for the global tab order
  if (message.action === 'getTabOrder') {
    sendResponse({ tabOrder: globalTabOrder });
  }
  
  // Always return true for async response
  return true;
});

// Also inject when the extension is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  }).catch(err => {
    console.error('Error injecting script on click:', err);
  });
});