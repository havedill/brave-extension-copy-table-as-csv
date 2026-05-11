const ARIA_GRID_SELECTOR = '[role="grid"],[role="treegrid"],[role="table"]';

function getClosestElement(node, predicate) {
  let current = node;
  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE && predicate(current)) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}

function getClosestTable(node) {
  return getClosestElement(node, (element) => element.tagName === "TABLE");
}

function getClosestAriaGrid(node) {
  return getClosestElement(node, (element) => element.matches(ARIA_GRID_SELECTOR));
}

function rangeIntersectsNode(range, node) {
  if (typeof range.intersectsNode === "function") {
    return range.intersectsNode(node);
  }

  const nodeRange = document.createRange();
  nodeRange.selectNodeContents(node);
  return !(
    range.compareBoundaryPoints(Range.END_TO_START, nodeRange) <= 0 ||
    range.compareBoundaryPoints(Range.START_TO_END, nodeRange) >= 0
  );
}

function isVisibleCell(cell) {
  if (!cell || cell.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }
  const style = window.getComputedStyle(cell);
  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }
  return true;
}

function normalizeCellText(cell) {
  const raw = cell.innerText || cell.textContent || "";
  return raw
    .replace(/\u00a0/g, " ")
    .replace(/\s*\n\s*/g, " ")
    .replace(/[ \t\r\f\v]+/g, " ")
    .trim();
}

function detectSelectionSource(range) {
  const nodesToCheck = [range.startContainer, range.endContainer];
  for (const node of nodesToCheck) {
    const htmlTable = getClosestTable(node);
    if (htmlTable) {
      return { kind: "html-table", element: htmlTable };
    }
  }

  for (const node of nodesToCheck) {
    const ariaGrid = getClosestAriaGrid(node);
    if (ariaGrid) {
      return { kind: "aria-grid", element: ariaGrid };
    }
  }

  return null;
}

function extractRowsFromHtmlTable(table, ranges) {
  const selectedRows = Array.from(table.rows).filter((row) =>
    ranges.some((range) => rangeIntersectsNode(range, row))
  );

  if (selectedRows.length === 0) {
    return { error: "No table rows were found in the current selection." };
  }

  const rows = selectedRows.map((row) => {
    const allCells = Array.from(row.cells);
    return allCells
      .filter((cell) => isVisibleCell(cell))
      .map((cell) => normalizeCellText(cell));
  });

  return { rows };
}

function extractRowsFromAriaGrid(grid, ranges) {
  const candidateRows = Array.from(grid.querySelectorAll('[role="row"]'));
  const selectedRows = candidateRows.filter((row) =>
    ranges.some((range) => rangeIntersectsNode(range, row))
  );

  if (selectedRows.length === 0) {
    return { error: "No grid rows were found in the current selection." };
  }

  const rows = selectedRows.map((row) => {
    const headerCells = Array.from(
      row.querySelectorAll(':scope > [role="columnheader"], :scope > [role="rowheader"]')
    );
    const dataCells = Array.from(
      row.querySelectorAll(':scope > [role="gridcell"], :scope > [role="cell"], :scope > [role="rowheader"]')
    );
    const cells = (headerCells.length > 0 ? headerCells : dataCells).filter((cell) =>
      isVisibleCell(cell)
    );

    return cells.map((cell) => normalizeCellText(cell));
  });

  return { rows };
}

function findSelectedRows() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return { error: "Select table or grid rows before using Copy as CSV." };
  }

  const ranges = [];
  let source = null;

  for (let i = 0; i < selection.rangeCount; i += 1) {
    const range = selection.getRangeAt(i);
    ranges.push(range);

    if (!source) {
      source = detectSelectionSource(range);
    }
  }

  if (!source) {
    return { error: "Selection is not inside a table or ARIA grid." };
  }

  if (source.kind === "html-table") {
    return extractRowsFromHtmlTable(source.element, ranges);
  }

  return extractRowsFromAriaGrid(source.element, ranges);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "EXTRACT_SELECTED_TABLE_ROWS") {
    return;
  }

  try {
    const result = findSelectedRows();
    if (result.error) {
      sendResponse({ ok: false, error: result.error });
      return;
    }

    sendResponse({
      ok: true,
      rows: result.rows
    });
  } catch (error) {
    sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown extraction error."
    });
  }
});
