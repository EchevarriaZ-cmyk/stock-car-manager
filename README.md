# Stock Car Manager

A retro pixel-art NASCAR-style team management game. You are the team owner/manager. You never drive.

## Play
Open `index.html` in a browser, or host the folder as-is on GitHub Pages (Settings → Pages → deploy from branch, root folder). There is no build step and no external downloads. Best on a phone held in landscape.

## Files
- `index.html` – page shell
- `css/style.css` – all styling (yellow pattern hub, tiles, race HUD, rotate-your-phone screen)
- `js/util.js` – helpers
- `js/pixelfont.js` – built-in 5x7 bitmap pixel font
- `js/data.js` – series, tracks, calendars, names, sponsors, points
- `js/geometry.js` – track shapes (ovals, tri-ovals, road courses)
- `js/racesim.js` – race simulation (drafting, passing, tires, fuel, cautions, pit stops, stages)
- `js/sprites.js` – pixel cars and hub tile art drawn in code
- `js/renderer.js` – race view renderer (track pre-render + cars)
- `js/career.js` – career, market, sponsors, facilities, finances, playoffs, save/export/import
- `js/ui.js` – hub and every screen, race day controls
- `js/main.js` – boot

Saves go to localStorage automatically. Profile → Export/Import save code moves a career between devices.

*Developer note* THIS IS A FUN PROJECT PLEASE ENJOY WHILE UPDATE CONTINUE