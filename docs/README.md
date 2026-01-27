# Distil GitHub Pages Site

This folder contains the static website for Distil, hosted on GitHub Pages.

## Setup

Enable GitHub Pages for this repository:

1. Go to repository Settings
2. Navigate to Pages section
3. Set Source to: **Deploy from a branch**
4. Select branch: **main**
5. Set folder: **/site**
6. Click Save

The site will be available at: `https://[username].github.io/distil/`

## Auto-Update Workflow

The site automatically updates when a new release is published:

- Workflow file: `.github/workflows/update-gh-pages.yml`
- Triggers on: release published events
- Updates: version number, download links, release notes

## Adding a Screenshot

To add a screenshot to the site:

1. Place your screenshot file as `screenshot.png` in this `/site` folder
2. The image will automatically appear on the homepage
3. Recommended size: 1200x800px or similar aspect ratio

## File Structure

```
site/
├── README.md          # This file
├── index.html         # Main page
├── screenshot.png     # Optional screenshot (add this)
└── .gitkeep          # Ensures folder is tracked
```
