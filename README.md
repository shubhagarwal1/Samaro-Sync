# Samaro Sync

Samaro Sync is an Electron-based desktop application designed to securely download and synchronize files using OTP authentication. The application provides a user-friendly interface for managing file downloads with pause, resume, and progress tracking capabilities.

## Features

- Secure OTP-based authentication
- Multi-file download support
- Download progress tracking
- Pause and resume functionality
- Cross-platform support (macOS, Windows, Linux)
- Modern and intuitive user interface

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or higher)
- npm (Node Package Manager)

## Installation

1. Navigate to the download app dir :
```bash
cd ./samaro-sync
```

2. Install dependencies:
```bash
npm install
```

## Development

To run the application in development mode:

```bash
npm start
```

This command will start the Electron application with logging enabled.

## Building the Application

The application can be built for different platforms using the following commands:

### For Windows:
```bash
# DEV build
npm run build:win:dev

# UAT build
npm run build:win:uat

# Production build
npm run build:win:prod
```
This will create a `.dmg` installer in the `dist` directory.

### For macOS:
```bash
npm run build:mac:dev

# UAT build
npm run build:mac:uat

# Production build
npm run build:mac:prod
```
This will create an NSIS installer in the `dist` directory.

### For all platforms:
```bash
npm run build
```

## Application Structure

- `main.js` - Main Electron process file
- `renderer.js` - Main renderer process file
- `index.html` - Main application window
- `js/` - Contains modular JavaScript files
  - `modules/` - Application modules (state, UI, download, payload)
- `assets/` - Application assets and resources
- `build/` - Build configuration and resources
- `dist/` - Generated distributables

## Dependencies

Main dependencies:
- `electron` - Desktop application framework
- `electron-builder` - Application packaging and distribution
- `axios` - HTTP client for API requests
- `directory-tree` - File system utilities
- `electron-log` - Logging utility

## Build Configuration

The build configuration in `package.json` includes:
- Application ID: `com.samaro.sync`
- Product Name: "Samaro Sync"
- Build targets:
  - macOS: DMG installer
  - Windows: NSIS installer
  - Linux: AppImage

## Usage

1. Launch the application
2. Enter the provided OTP for authentication
3. Select download directory when prompted
4. Monitor download progress
5. Use pause/resume controls as needed
6. Start new download session using the "New Download" option

## Development Scripts

- `npm start` - Start the application in development mode
- `npm run build` - Build for all platforms
- `npm run build:mac` - Build for macOS
- `npm run build:win` - Build for Windows

## License

ISC License


building steps 
- mkdir -p build
- npm install --save-dev electron-icon-builder

# After creating a PNG version of your logo:
mkdir MyIcon.iconset
sips -z 16 16     logo.png --out MyIcon.iconset/icon_16x16.png
sips -z 32 32     logo.png --out MyIcon.iconset/icon_16x16@2x.png
sips -z 32 32     logo.png --out MyIcon.iconset/icon_32x32.png
sips -z 64 64     logo.png --out MyIcon.iconset/icon_32x32@2x.png
sips -z 128 128   logo.png --out MyIcon.iconset/icon_128x128.png
sips -z 256 256   logo.png --out MyIcon.iconset/icon_128x128@2x.png
sips -z 256 256   logo.png --out MyIcon.iconset/icon_256x256.png
sips -z 512 512   logo.png --out MyIcon.iconset/icon_256x256@2x.png
sips -z 512 512   logo.png --out MyIcon.iconset/icon_512x512.png
sips -z 1024 1024 logo.png --out MyIcon.iconset/icon_512x512@2x.png
iconutil -c icns MyIcon.iconset -o build/icon.icns


