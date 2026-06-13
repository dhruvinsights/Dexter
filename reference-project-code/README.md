# Dexter - Orbital Visualization Engine

> Lightweight 3D orbital mechanics visualization for Orbital Sentinel

**Dexter** is a streamlined WebGL-based satellite tracking and orbital visualization engine, optimized for the Orbital Sentinel platform.

## Features

- 🚀 Track 50,000+ satellites in real-time
- ⚡ 5 MB core app, loads in under 2 seconds
- 🎮 Simulate 2.5M debris objects at 60fps
- 📱 Works on mobile, tablet, and desktop
- 🆓 Free and open source

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start
```

Then open `http://localhost:5544` in your browser.

## Technology Stack

- **TypeScript** - Type-safe development
- **WebGL 2.0** - Hardware-accelerated 3D rendering
- **OOTK** - Orbital mechanics library
- **Web Workers** - Background orbit calculations

## Project Structure

```
src/
├── engine/          # Core rendering engine
│   ├── rendering/   # WebGL pipeline, shaders
│   ├── math/        # Orbital mechanics
│   └── camera/      # Camera controls
├── app/             # Application layer
│   └── data/        # Catalog management
└── plugins/         # Essential plugins only
```

## License

MIT License - Based on KeepTrack.space (AGPL-3.0)

Original work by Theodore Kruczek and contributors.
Modified for Orbital Sentinel project.
