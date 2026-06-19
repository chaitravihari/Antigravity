# 🚀 BigQuery Release Pulse

A premium, modern web dashboard built with Python Flask and plain vanilla HTML5, CSS3, and JavaScript that fetches Google Cloud BigQuery release notes and makes them easy to search, filter, and share to X (formerly Twitter).

---

## ✨ Features

- **Dynamic Feed Aggregator**: Fetches and parses the official BigQuery Release Notes Atom Feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`) in real-time.
- **Smart Parsing**: Automatically breaks down single-day release entries containing multiple sub-updates into individual interactive cards categorized by type (**Features**, **Announcements**, **Issues**, **Deprecations**).
- **Dual Visual Themes**: Seamless switching between a sleek developer-oriented Dark Theme (default) and a clean, high-contrast Light Theme.
- **Dynamic Search & Filtering**: Client-side filtering allowing you to find specific updates instantly as you type.
- **Interactive Multi-Select**: Select one or multiple release updates to compile a combined post.
- **X (Twitter) Composer Drawer**:
  - **Live Character Counter**: Circular SVG progress ring that changes color (Blue ➔ Orange ➔ Red) as you approach the 280-character limit.
  - **Intelligent Shortening**: A smart algorithm that trims down long descriptions to fit within the character limit while preserving the headers and reference links.
  - **Decorators**: Quickly add emojis and tags (like `#BigQuery`) at the click of a button.
  - **Instant Clipboard & X Share**: Copy the compiled tweet to your clipboard or open X Web Intent in a new tab to share instantly.
- **Performance Optimized**: Implements an in-memory caching system (10-minute expiry) to prevent redundant network requests, with a force-refresh spinner when needed.

---

## 🛠️ Technology Stack

- **Backend**: Python 3 (Flask, requests, beautifulsoup4)
- **Frontend**: Vanilla HTML5, Vanilla CSS3 (Custom Variables, Flexbox, CSS Grid, Glassmorphism, animations), Vanilla JavaScript (ES6)
- **Icons**: Inline SVGs for fast loading and crisp rendering.

---

## 📂 Project Directory Structure

```text
├── app.py                  # Flask Application server & feed parser
├── requirements.txt        # Python dependency list
├── .gitignore              # Files to ignore in Git
├── templates/
│   └── index.html          # Main HTML structure & layouts
└── static/
    ├── css/
    │   └── style.css       # Main stylesheet (Variables, Themes, Keyframes)
    └── js/
        └── app.js          # Main frontend controller (Dynamic renders, filter systems, composer math)
```

---

## 🚀 Quick Start & Installation

### Prerequisite
Ensure you have **Python 3** and **Git** installed on your system.

### 1. Clone the Repository
```bash
git clone https://github.com/chaitravihari/Antigravity.git
cd Antigravity
```

### 2. Set Up a Virtual Environment & Install Dependencies
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Windows (CMD):
.\venv\Scripts\activate.bat
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Run the Application
```bash
python app.py
```
Open your browser and navigate to **`http://127.0.0.1:5000`** to view the app!

---

## 📝 Commit, Pull, and Push Instructions

If you make local modifications and wish to push them to GitHub, make sure you stage, commit, and push using:

```bash
git add .
git commit -m "Your commit message"
git push origin main
```