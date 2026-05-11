# Table Copying - Copy as CSV (Brave Extension)

Copy selected HTML table rows into CSV with a right-click action.

## Install (Developer Mode)

1. Open Brave and go to `brave://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder (the directory containing `manifest.json`).

## Usage

1. On any webpage, highlight the table rows and/or header rows you want.
2. Right click the selected text.
3. Click **Copy as CSV**.
4. Paste into your editor, spreadsheet, or AI prompt.

## Current Behavior

- Uses current text selection only.
- Supports native HTML tables and ARIA grids (for example MUI DataGrid).
- Requires selection to be inside one table/grid root.
- Copies only rows intersecting your selection.
- Keeps all selected rows exactly as selected (including section labels or totals).
- Escapes commas, quotes, and newlines for valid CSV.

## Known Limitations

- Multi-table selections are not merged; extraction uses the first selected table.
- If no selected row intersects a table/grid row, copy fails.
- Virtualized grids only include rows currently mounted in the DOM, so offscreen rows are not exported unless they are rendered.
- Some restricted pages (like internal browser pages) cannot run content scripts.

## Manual Verification Checklist

Use any webpage table or ARIA grid with a few rows:

1. Select a header row + at least two data rows.
2. Run **Copy as CSV** and paste somewhere.
3. Confirm output includes only selected rows in the same order.
4. Confirm comma-containing values are quoted.
5. Confirm quotes/newlines in cell content are escaped correctly.
