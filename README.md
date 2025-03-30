# Wavel - Tab Audio Controller

Wavel is a browser extension that gives you precise control over the audio from individual browser tabs with a sleek, minimalist interface. It allows you to manage volume levels across multiple tabs playing audio simultaneously, making it perfect for multitasking.

## Features

- **Individual Tab Control**: Control the volume of each tab independently
- **Clean Interface**: Shows only tabs currently playing audio
- **Easy Muting**: Quickly mute specific tabs with a single click
- **Light & Dark Modes**: Choose your preferred theme
- **Real-time Updates**: Automatically detects new audio sources
- **Keyboard Navigation**: Use arrow keys to navigate between tabs and adjust volume
- **Persistent Settings**: Volume settings are remembered for each tab
- **Cross-Platform Support**: Works on Chrome, Edge, and other Chromium-based browsers
- **Special Site Support**: Enhanced compatibility with YouTube, Spotify, Netflix, and SoundCloud

## Installation

### Development Mode

1. Clone or download this repository
2. Open Chrome/Edge and navigate to `chrome://extensions/` or `edge://extensions/`
3. Enable "Developer mode" (toggle in the top-right corner)
4. Click "Load unpacked" and select the Wavel directory
5. The extension should now appear in your browser toolbar

## Usage

1. Click on the Wavel icon in your browser toolbar
2. Adjust the volume slider for any tab playing audio
3. Use the mute button to quickly silence specific tabs
4. Toggle between light and dark themes with the icon in the top-right corner
5. Use keyboard shortcuts for faster control:
   - Left/Right arrows: Adjust volume by 1%
   - Up/Down arrows: Navigate between audio tabs
   - M key: Mute/unmute the selected tab

## How It Works

Wavel injects a content script into each tab that detects and controls audio elements. The extension maintains a persistent connection with these tabs to provide real-time control over audio playback. Special handling is implemented for popular streaming sites to ensure compatibility.

The extension uses a combination of:
- HTML5 audio/video API for standard media control
- Site-specific methods for platforms like YouTube and Spotify
- MutationObserver to detect dynamically added audio elements
- Chrome Storage API to maintain tab order and settings

## Troubleshooting

- **Volume not changing**: Try refreshing the page to reinitialize the content script
- **Tab not appearing**: Only tabs currently playing audio will appear in the popup
- **Spotify issues**: Some Spotify controls may require additional permissions or page refresh

## File Structure

```
wavel/
│
├── manifest.json           
│
├── popup.html              
├── popup.js                
├── styles.css              
│
├── content.js              
│
├── icons/                  
│   ├── icon16.png          
│   ├── icon48.png          
│   ├── icon128.png         
│   └── default_favicon.png 
│
└── README.md               
```

## License

© 2025 Wavel. All rights reserved.