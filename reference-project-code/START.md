# 🚀 Dexter - Quick Start Guide

## Run the Application

```bash
cd /Users/dhruv_insights/Documents/Dexter/keeptrack
npm start
```

The app will open at: **http://localhost:5544**

## What is Dexter?

Dexter is a lightweight 3D orbital visualization engine for the Orbital Sentinel platform.

## Theme

- **Background**: Pure Black (#000000)
- **Accent**: Blue (#0066ff)
- **Text**: White (#ffffff)
- **Buttons**: White gradient with blue borders

## Features

- 3D WebGL satellite rendering
- Real-time orbital mechanics
- Camera controls
- Time machine
- Sensor management
- Color-coded visualization

## Troubleshooting

If you see errors:

1. Make sure you're in the `keeptrack` directory
2. Run: `npm install`
3. Then: `npm start`

## Integration

To use Dexter in your React app:

```typescript
import { Dexter } from './keeptrack/src/index';

const dexter = Dexter.getInstance();
dexter.init();
```

---

**Ready to launch!** Just run `npm start` 🚀