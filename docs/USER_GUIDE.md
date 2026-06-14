# 🛰️ Orbital Sentinel / Dexter - Complete User Guide

**Last Updated**: June 14, 2026  
**Version**: 1.0

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Interface Overview](#interface-overview)
3. [Basic Features](#basic-features)
4. [Advanced Features](#advanced-features)
5. [AI Features](#ai-features)
6. [Troubleshooting](#troubleshooting)
7. [Keyboard Shortcuts](#keyboard-shortcuts)

---

## 🚀 Getting Started

### Step 1: Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
source .venv/bin/activate
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### Step 2: Open the Application

1. Open your web browser (Chrome, Firefox, or Safari)
2. Navigate to: **http://localhost:5173**
3. Wait 10-15 seconds for the boot sequence to complete

### Step 3: Initial Load

You'll see:
- 🌍 A 3D Earth in the center
- ⭐ Thousands of small dots (satellites) orbiting
- 🎮 Control panels on the left and right sides
- ⏰ Time controls at the bottom

---

## 🖥️ Interface Overview

### Main Screen Layout

```
┌─────────────────────────────────────────────────────────┐
│  [☰ Menu]                            [Settings] [Help]  │
├──────────┬──────────────────────────────────┬───────────┤
│          │                                  │           │
│  Left    │         3D Earth View            │  Right    │
│  Panel   │      (Main Visualization)        │  Panel    │
│          │                                  │           │
│  - Live  │    🌍 Earth with satellites      │  - Info   │
│  - Time  │    🛰️ Orbital paths             │  - Stats  │
│  - Create│    ⭐ Starfield background       │  - AI     │
│          │                                  │           │
├──────────┴──────────────────────────────────┴───────────┤
│              [◀◀] [▶] [⏸] [▶▶] [Timeline]               │
│                    Time Controls                         │
└─────────────────────────────────────────────────────────┘
```

### Key UI Elements

1. **Top Bar**
   - Menu button (☰) - Opens sidebar
   - Settings icon (⚙️) - Configuration
   - Help icon (?) - Documentation

2. **Left Sidebar**
   - 🌐 Live Sky - Real-time satellite view
   - ⏰ Time Machine - Historical view
   - ➕ Create - Add custom satellites
   - 🎨 Customize - Visual settings

3. **Right Panel**
   - 📊 Metrics - Statistics
   - 🤖 AI Analysis - AI insights
   - 📋 Policies - Policy recommendations
   - ℹ️ Info - Selected object details

4. **Bottom Bar**
   - Time controls
   - Speed slider
   - Date/time picker

---

## 🎯 Basic Features

### Feature 1: Viewing Satellites

#### Step-by-Step:

1. **Open the application** at http://localhost:5173

2. **Wait for satellites to load**
   - You'll see a loading screen
   - Progress bar shows: "Loading satellites..."
   - Takes 5-10 seconds

3. **Explore the view**
   - **Mouse Controls:**
     - **Left Click + Drag** = Rotate Earth
     - **Right Click + Drag** = Pan camera
     - **Scroll Wheel** = Zoom in/out
     - **Double Click** = Reset view

4. **What you see:**
   - 🔴 Red dots = Active satellites
   - 🟡 Yellow dots = Derelict satellites
   - ⚪ White dots = Debris
   - 🌍 Blue/green sphere = Earth
   - ⭐ Background = Stars

---

### Feature 2: Selecting a Satellite

#### Step-by-Step:

1. **Click on any satellite dot**
   - The dot will highlight
   - Camera will smoothly fly to the satellite
   - Takes 2-3 seconds

2. **View satellite information**
   - Right panel opens automatically
   - Shows:
     ```
     Name: ISS (ZARYA)
     NORAD ID: 25544
     Country: USA
     Type: Space Station
     Altitude: 408 km
     Inclination: 51.6°
     Period: 92.9 minutes
     ```

3. **See the orbital path**
   - A colored line appears showing the orbit
   - Line color matches satellite color scheme
   - Shows one complete orbit

4. **Deselect**
   - Click on empty space
   - Or press `ESC` key
   - Camera returns to default view

---

### Feature 3: Time Controls

#### Step-by-Step:

1. **Locate time controls** at the bottom of screen

2. **Play/Pause**
   - Click **▶ Play** button
   - Satellites start moving
   - Click **⏸ Pause** to stop

3. **Speed Control**
   - Find the speed slider (1x to 100x)
   - **Drag slider right** = Faster time
   - **Drag slider left** = Slower time
   - Current speed shows as "10x" or "50x"

4. **Fast Forward/Rewind**
   - Click **▶▶** = Jump forward 1 hour
   - Click **◀◀** = Jump backward 1 hour
   - Hold button = Continuous jump

5. **Set Specific Time**
   - Click on **date/time display**
   - Calendar popup appears
   - Select date and time
   - Click "Apply"
   - Satellites jump to that moment

---

### Feature 4: Color Schemes

#### Step-by-Step:

1. **Open color scheme selector**
   - Look for **🎨 Color** button in left sidebar
   - Or click **Settings** → **Color Scheme**

2. **Available schemes:**

   **A. By Country**
   - Click "Country" option
   - Colors represent nations:
     - 🔴 Red = Russia
     - 🔵 Blue = USA
     - 🟢 Green = China
     - 🟡 Yellow = Europe
     - ⚪ White = Other

   **B. By Object Type**
   - Click "Object Type" option
   - Colors represent categories:
     - 🔴 Red = Active satellites
     - 🟡 Yellow = Derelict satellites
     - ⚪ White = Debris
     - 🟣 Purple = Rocket bodies

   **C. By Sunlight**
   - Click "Sunlight" option
   - Shows day/night:
     - 🟡 Yellow = In sunlight
     - 🔵 Blue = In Earth's shadow
     - Real-time shadow calculation

3. **Apply changes**
   - Changes apply immediately
   - No need to reload

---

### Feature 5: Time Machine

#### Step-by-Step:

1. **Open Time Machine**
   - Click **⏰ Time Machine** in left sidebar
   - New panel opens

2. **Select historical period**
   - Options available:
     - 1957 - Sputnik Era
     - 1960s - Space Race
     - 1980s - Shuttle Era
     - 2000s - ISS Era
     - 2020s - Starlink Era

3. **Watch satellite deployment**
   - Click "Play History"
   - Satellites appear as they were launched
   - Timeline shows year
   - Speed adjustable (1x to 100x)

4. **Pause at any moment**
   - Click pause
   - Inspect satellites from that era
   - See how many existed then

5. **Return to present**
   - Click "Return to Now"
   - Jumps back to current time

---

## 🚀 Advanced Features

### Feature 6: Creating Custom Satellites

#### Step-by-Step:

1. **Open Create Panel**
   - Click **➕ Create** in left sidebar
   - "Create Satellite" panel opens

2. **Choose creation mode:**

   **Mode A: Basic (Recommended for beginners)**
   
   a. Enter satellite details:
   ```
   Name: My Satellite
   Inclination: 51.6° (ISS-like)
   Apogee: 420 km (highest point)
   Perigee: 400 km (lowest point)
   ```
   
   b. Click **"Generate TLE"**
   - System creates orbital elements
   - Shows preview of orbit
   
   c. Click **"Add Satellite"**
   - Your satellite appears!
   - Orbits according to parameters

   **Mode B: Advanced (For experts)**
   
   a. Click **"Advanced Mode"**
   
   b. Enter full orbital elements:
   ```
   Semi-major axis: 6778 km
   Eccentricity: 0.001
   Inclination: 51.6°
   RAAN: 45.0°
   Argument of Perigee: 90.0°
   True Anomaly: 0.0°
   ```
   
   c. Click **"Calculate"**
   - Preview shows orbit
   
   d. Click **"Add Satellite"**

   **Mode C: TLE Import (For real data)**
   
   a. Click **"Import TLE"**
   
   b. Paste two-line element set:
   ```
   ISS (ZARYA)
   1 25544U 98067A   21001.00000000  .00002182  00000-0  41420-4 0  9990
   2 25544  51.6461 339.8014 0002571  34.5857 120.4689 15.48919393123456
   ```
   
   c. Click **"Parse TLE"**
   - System validates format
   - Shows satellite info
   
   d. Click **"Add Satellite"**

3. **Track your satellite**
   - Automatically selected after creation
   - Camera follows it
   - Orbital path displayed

4. **Edit or delete**
   - Right-click on your satellite
   - Choose "Edit" or "Delete"

---

### Feature 7: Region Filtering

#### Step-by-Step:

1. **Open Region Filter**
   - Click **🌍 Regions** in left sidebar
   - Map appears

2. **Select region**
   - Click on map area:
     - North America
     - Europe
     - Asia
     - South America
     - Africa
     - Oceania

3. **Filter satellites**
   - Only satellites over selected region show
   - Others fade out or hide
   - Updates in real-time as satellites move

4. **Altitude filter**
   - Use slider: 200 km to 2000 km
   - Shows only satellites in range
   - Combine with region filter

5. **Clear filters**
   - Click "Show All"
   - All satellites reappear

---

### Feature 8: Metrics Dashboard

#### Step-by-Step:

1. **Open Metrics**
   - Click **📊 Metrics** in right panel
   - Dashboard appears

2. **View statistics:**

   **Real-time Metrics:**
   ```
   Total Objects: 16,234
   Active Satellites: 8,456
   Derelict Satellites: 2,341
   Debris Pieces: 5,437
   
   By Altitude:
   LEO (200-2000 km): 14,567
   MEO (2000-35786 km): 1,234
   GEO (35786 km): 433
   ```

3. **Collision Risk**
   - Shows high-risk conjunctions
   - Updates every 5 minutes
   - Color-coded:
     - 🔴 Red = High risk
     - 🟡 Yellow = Medium risk
     - 🟢 Green = Low risk

4. **Export data**
   - Click "Export CSV"
   - Downloads current statistics
   - Includes timestamp

---

## 🤖 AI Features

### Feature 9: AI Risk Assessment

#### Step-by-Step:

1. **Open AI Panel**
   - Click **🤖 AI** in right sidebar
   - AI Analysis panel opens

2. **Select analysis type**
   - Click dropdown menu
   - Choose "Risk Assessment"

3. **Configure parameters:**
   ```
   Time Horizon: 25 years
   Collision Threshold: 0.001
   Debris Growth Rate: 5% per year
   ```

4. **Run analysis**
   - Click **"Analyze"** button
   - Progress bar appears
   - Takes 10-30 seconds

5. **View results:**
   ```
   Risk Level: MEDIUM
   
   Key Findings:
   • Collision probability: 12% over 25 years
   • High-risk zones: 800-900 km altitude
   • Debris growth: 45% increase expected
   
   Recommendations:
   1. Implement active debris removal
   2. Improve collision avoidance
   3. Enforce post-mission disposal
   ```

6. **Export report**
   - Click "Download PDF"
   - Full report with charts
   - Shareable format

---

### Feature 10: Policy Comparison

#### Step-by-Step:

1. **Open Policy Panel**
   - Click **📋 Policies** in right sidebar
   - Policy comparison tool opens

2. **Select baseline scenario**
   - Dropdown: "Current Trends"
   - Shows business-as-usual projection

3. **Add policy scenarios:**

   **Scenario A: Launch Cap**
   - Click "+ Add Scenario"
   - Select "Launch Cap"
   - Set parameters:
     ```
     Max launches per year: 100
     Start year: 2025
     Enforcement: Strict
     ```

   **Scenario B: Improved PMD**
   - Click "+ Add Scenario"
   - Select "Post-Mission Disposal"
   - Set parameters:
     ```
     PMD success rate: 95%
     Start year: 2028
     Compliance: 90%
     ```

   **Scenario C: Hybrid**
   - Combines both policies
   - Automatic configuration

4. **Run comparison**
   - Click "Compare Scenarios"
   - AI analyzes all scenarios
   - Takes 30-60 seconds

5. **View comparison:**
   ```
   Scenario          | Collisions | Debris | Cost
   ------------------|------------|--------|-------
   Baseline          | 92         | 23,600 | $0
   Launch Cap        | 68 (-26%)  | 19,500 | $2B
   Improved PMD      | 47 (-49%)  | 16,200 | $5B
   Hybrid            | 31 (-66%)  | 14,100 | $6B
   
   Recommendation: Hybrid approach
   Best cost-benefit ratio
   ```

6. **Visualize results**
   - Click "Show Charts"
   - Interactive graphs appear
   - Compare metrics over time

---

### Feature 11: AI Chat Assistant

#### Step-by-Step:

1. **Open AI Chat**
   - Click **💬 Chat** button
   - Chat window opens at bottom

2. **Ask questions:**

   **Example queries:**
   ```
   "What is the ISS orbit?"
   "How many Starlink satellites are there?"
   "What causes Kessler Syndrome?"
   "Explain orbital decay"
   "Compare LEO and GEO orbits"
   ```

3. **Get answers**
   - AI responds in 2-5 seconds
   - Uses Gemini AI
   - Provides detailed explanations

4. **Follow-up questions**
   - Chat maintains context
   - Ask clarifying questions
   - Get deeper insights

5. **Export conversation**
   - Click "Export Chat"
   - Saves as text file

---

## 🔧 Advanced Settings

### Feature 12: Visual Customization

#### Step-by-Step:

1. **Open Settings**
   - Click **⚙️ Settings** icon
   - Settings panel opens

2. **Graphics Quality:**
   ```
   Quality: [Low] [Medium] [High] [Ultra]
   
   Low: 30 FPS, 5000 objects
   Medium: 45 FPS, 10000 objects
   High: 60 FPS, 16000 objects (default)
   Ultra: 60 FPS, 20000+ objects
   ```

3. **Visual Effects:**
   - ☑️ Orbital paths
   - ☑️ Starfield
   - ☑️ Earth atmosphere
   - ☑️ Day/night cycle
   - ☑️ Satellite labels
   - ☑️ Grid lines

4. **Camera Settings:**
   ```
   Field of View: 45° to 90°
   Rotation Speed: Slow / Medium / Fast
   Zoom Speed: Slow / Medium / Fast
   Auto-rotate: On / Off
   ```

5. **Apply changes**
   - Click "Apply"
   - Changes take effect immediately

---

### Feature 13: Data Export

#### Step-by-Step:

1. **Open Export Tool**
   - Click **📥 Export** in menu
   - Export options appear

2. **Choose export type:**

   **A. Satellite Data**
   - Format: CSV, JSON, or XML
   - Includes:
     - Name, NORAD ID
     - Orbital elements
     - Country, type
     - Current position

   **B. Orbital Predictions**
   - Time range: 1 hour to 30 days
   - Interval: 1 min to 1 hour
   - Format: CSV or JSON

   **C. Screenshots**
   - Resolution: 1080p, 4K, or 8K
   - Format: PNG or JPG
   - Includes timestamp

   **D. Video Recording**
   - Duration: 10 sec to 5 min
   - Quality: 720p, 1080p, or 4K
   - Format: MP4

3. **Configure export**
   - Select options
   - Choose save location

4. **Export**
   - Click "Export"
   - Progress bar shows status
   - File downloads when complete

---

## 🎮 Keyboard Shortcuts

### Navigation
- **Arrow Keys** - Rotate Earth
- **W/S** - Zoom in/out
- **A/D** - Pan left/right
- **Q/E** - Roll camera
- **Space** - Play/Pause time
- **R** - Reset view
- **F** - Focus on selected satellite
- **ESC** - Deselect / Close panels

### Time Controls
- **+/-** - Increase/decrease speed
- **[/]** - Jump backward/forward 1 hour
- **Home** - Go to current time
- **End** - Go to end of data

### Selection
- **Tab** - Cycle through satellites
- **Shift+Tab** - Cycle backward
- **1-9** - Select preset satellites
- **0** - Deselect all

### Panels
- **Ctrl+L** - Toggle left sidebar
- **Ctrl+R** - Toggle right panel
- **Ctrl+T** - Toggle time controls
- **Ctrl+M** - Toggle metrics
- **Ctrl+A** - Toggle AI panel

### Other
- **Ctrl+S** - Take screenshot
- **Ctrl+E** - Export data
- **Ctrl+F** - Search satellites
- **Ctrl+H** - Show help
- **F11** - Fullscreen

---

## 🐛 Troubleshooting

### Problem 1: Satellites Not Loading

**Symptoms:**
- Blank Earth
- No satellites visible
- Loading stuck at 0%

**Solutions:**

1. **Check TLE data:**
   ```bash
   ls -lh public/tle/TLE.txt
   # Should be ~2.6 MB
   ```

2. **Reload data:**
   ```bash
   npm run fetch-tle
   ```

3. **Clear browser cache:**
   - Press `Ctrl+Shift+Delete`
   - Clear cached images and files
   - Reload page

4. **Check console:**
   - Press `F12`
   - Look for errors in Console tab
   - Report errors if found

---

### Problem 2: Slow Performance

**Symptoms:**
- Low FPS (< 30)
- Laggy controls
- Stuttering animation

**Solutions:**

1. **Reduce object count:**
   - Settings → Graphics → Quality: Low
   - Reduces to 5000 objects

2. **Disable effects:**
   - Turn off orbital paths
   - Turn off starfield
   - Turn off labels

3. **Close other tabs:**
   - Browser uses less memory
   - More resources for app

4. **Update graphics drivers:**
   - Check manufacturer website
   - Install latest drivers

---

### Problem 3: AI Not Responding

**Symptoms:**
- "AI unavailable" message
- Analysis fails
- Timeout errors

**Solutions:**

1. **Check backend:**
   ```bash
   curl http://localhost:8000/api/ai/health
   ```

2. **Verify API key:**
   - Check `backend/.env`
   - Ensure GEMINI_API_KEY is set

3. **Restart backend:**
   ```bash
   cd backend
   pkill -f uvicorn
   python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
   ```

4. **Check API quota:**
   - Visit Google AI Studio
   - Check remaining quota

---

### Problem 4: Time Controls Not Working

**Symptoms:**
- Play button doesn't work
- Time doesn't advance
- Satellites frozen

**Solutions:**

1. **Check propagation:**
   - Open browser console (F12)
   - Look for "SGP4 error" messages

2. **Reload page:**
   - Hard refresh: `Ctrl+Shift+R`
   - Clears worker cache

3. **Check date range:**
   - TLE data valid for ~30 days
   - Update TLE if old:
     ```bash
     npm run fetch-tle
     ```

---

## 📞 Getting Help

### In-App Help
- Click **?** icon in top right
- Access documentation
- View tutorials
- Report issues

### Documentation
- **README.md** - Quick start
- **FINAL_STATUS.md** - Project status
- **DEPLOYMENT_GUIDE.md** - Deployment
- **PROJECT_UNDERSTANDING.md** - Architecture

### Support
- Check GitHub issues
- Contact team members
- Email: support@orbitalsentinel.com

---

## 🎓 Tips & Tricks

### Tip 1: Finding Specific Satellites
1. Press `Ctrl+F`
2. Type satellite name (e.g., "ISS")
3. Press Enter
4. Camera flies to satellite

### Tip 2: Creating Realistic Orbits
- Use real TLE data from CelesTrak
- Copy TLE for any satellite
- Paste into TLE Import mode
- Modify parameters as needed

### Tip 3: Best Viewing Angles
- **ISS**: Inclination 51.6°, zoom to 500 km
- **Starlink**: Inclination 53°, zoom to 550 km
- **GEO satellites**: Equatorial view, zoom to 36000 km

### Tip 4: Performance Optimization
- Disable orbital paths when viewing many satellites
- Use "Object Type" color scheme (faster rendering)
- Close AI panel when not in use
- Reduce time speed for smoother animation

### Tip 5: Creating Presentations
1. Set up desired view
2. Press `Ctrl+S` for screenshot
3. Use Time Machine for historical context
4. Export metrics as CSV for charts
5. Record video with `Ctrl+R`

---

## 🎬 Demo Script

### 5-Minute Demo Flow

**Minute 1: Introduction**
1. Open app
2. Show Earth with satellites
3. Explain color scheme
4. Demonstrate mouse controls

**Minute 2: Selection & Info**
1. Click on ISS
2. Show orbital path
3. Display satellite info
4. Explain orbital parameters

**Minute 3: Time Controls**
1. Play time at 10x speed
2. Show satellites moving
3. Fast forward 1 hour
4. Demonstrate Time Machine

**Minute 4: Custom Satellite**
1. Open Create panel
2. Enter parameters
3. Generate satellite
4. Show it orbiting

**Minute 5: AI Analysis**
1. Open AI panel
2. Run risk assessment
3. Show results
4. Explain recommendations

---

**End of User Guide**

For more information, see:
- FINAL_STATUS.md
- PROJECT_UNDERSTANDING.md
- DEPLOYMENT_GUIDE.md

**Version**: 1.0  
**Last Updated**: June 14, 2026  
**Created by**: Bob (AI Assistant)