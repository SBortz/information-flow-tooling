import ExcelJS from 'exceljs';
import type { GiraflowModel } from './types';
import { buildTimelineViewModel } from './models';

// Colors matching Giraflow theme (as ARGB for Excel)
const COLORS = {
  event: 'FFFF9E64',
  state: 'FF9ECE6A',
  command: 'FF7AA2F7',
  actor: 'FF6B7280',
  header: 'FF374151',
  border: 'FFE2E5EA',
  white: 'FFFFFFFF',
};

/**
 * Export Giraflow model to Excel (vertical timeline layout)
 */
export async function downloadExcel(model: GiraflowModel): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Giraflow';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Timeline', {
    views: [{ state: 'frozen', ySplit: 2 }],
  });

  const viewModel = buildTimelineViewModel(model);
  const items = viewModel.items;
  const laneConfig = viewModel.laneConfig;

  // Calculate column structure
  // Columns: Tick | Actor Lanes... | Cmd/State | Event Lanes...
  const actorLaneCount = Math.max(1, laneConfig.actorRoles.length);
  const eventLaneCount = Math.max(1, laneConfig.eventSystems.length);
  
  const TICK_COL = 1;
  const ACTOR_START_COL = 2;
  const CENTER_COL = ACTOR_START_COL + actorLaneCount;
  const EVENT_START_COL = CENTER_COL + 1;
  const TOTAL_COLS = EVENT_START_COL + eventLaneCount - 1;

  // Set column widths
  sheet.getColumn(TICK_COL).width = 8;
  for (let i = ACTOR_START_COL; i <= TOTAL_COLS; i++) {
    sheet.getColumn(i).width = 25;
  }

  // Row 1: Title
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = model.name || 'Giraflow Timeline';
  titleCell.font = { bold: true, size: 16 };
  sheet.mergeCells(1, 1, 1, TOTAL_COLS);

  // Row 2: Lane Headers
  const headerRow = sheet.getRow(2);
  headerRow.height = 24;

  // Tick header
  const tickHeader = sheet.getCell(2, TICK_COL);
  tickHeader.value = 'Tick';
  tickHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } };
  tickHeader.font = { bold: true, color: { argb: COLORS.white } };
  tickHeader.alignment = { horizontal: 'center', vertical: 'middle' };
  tickHeader.border = { bottom: { style: 'thin', color: { argb: COLORS.border } } };

  // Actor lane headers
  for (let i = 0; i < actorLaneCount; i++) {
    const cell = sheet.getCell(2, ACTOR_START_COL + i);
    cell.value = laneConfig.actorRoles[i] || 'Actors';
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.actor } };
    cell.font = { bold: true, color: { argb: COLORS.white } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: COLORS.border } } };
  }

  // Center lane header
  const centerHeader = sheet.getCell(2, CENTER_COL);
  centerHeader.value = 'Commands / States';
  centerHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } };
  centerHeader.font = { bold: true, color: { argb: COLORS.white } };
  centerHeader.alignment = { horizontal: 'center', vertical: 'middle' };
  centerHeader.border = { bottom: { style: 'thin', color: { argb: COLORS.border } } };

  // Event lane headers
  for (let i = 0; i < eventLaneCount; i++) {
    const cell = sheet.getCell(2, EVENT_START_COL + i);
    cell.value = laneConfig.eventSystems[i] || 'Events';
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.event } };
    cell.font = { bold: true, color: { argb: COLORS.white } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: COLORS.border } } };
  }

  // Group items by tick
  const tickMap = new Map<number, typeof items>();
  for (const item of items) {
    const tick = item.element.tick;
    if (!tickMap.has(tick)) {
      tickMap.set(tick, []);
    }
    tickMap.get(tick)!.push(item);
  }
  const ticks = Array.from(tickMap.keys()).sort((a, b) => a - b);

  // Add data rows
  let rowIndex = 3;
  for (const tick of ticks) {
    const tickItems = tickMap.get(tick)!;
    const row = sheet.getRow(rowIndex);
    row.height = 50;

    // Tick cell
    const tickCell = sheet.getCell(rowIndex, TICK_COL);
    tickCell.value = `@${tick}`;
    tickCell.font = { bold: true, size: 10, color: { argb: 'FF6B7280' } };
    tickCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Place elements in their lanes
    for (const { element, position, laneIndex } of tickItems) {
      let col: number;
      let color: string;

      if (position === 'right') {
        // Actor
        col = ACTOR_START_COL + laneIndex;
        color = COLORS.actor;
      } else if (position === 'center') {
        // Command or State
        col = CENTER_COL;
        color = element.type === 'command' ? COLORS.command : COLORS.state;
      } else {
        // Event
        col = EVENT_START_COL + laneIndex;
        color = COLORS.event;
      }

      const cell = sheet.getCell(rowIndex, col);
      
      // Build cell content
      let content = element.name;
      if (element.type === 'actor' && 'readsView' in element) {
        content += `\n→ ${element.readsView || '?'}`;
      }
      if ('example' in element && element.example) {
        const fields = Object.entries(element.example as Record<string, unknown>).slice(0, 3);
        if (fields.length > 0) {
          const fieldStr = fields.map(([k, v]) => `${k}: ${formatValue(v)}`).join(', ');
          content += `\n${fieldStr}`;
        }
      }

      cell.value = content;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
      cell.font = { bold: true, size: 10, color: { argb: COLORS.white } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: COLORS.border } },
        bottom: { style: 'thin', color: { argb: COLORS.border } },
        left: { style: 'thin', color: { argb: COLORS.border } },
        right: { style: 'thin', color: { argb: COLORS.border } },
      };
    }

    rowIndex++;
  }

  // Add legend at bottom
  rowIndex += 2;
  sheet.getCell(rowIndex, 1).value = 'Legend:';
  sheet.getCell(rowIndex, 1).font = { bold: true };

  const legendItems = [
    { label: '● Event', color: COLORS.event },
    { label: '◆ State', color: COLORS.state },
    { label: '▶ Command', color: COLORS.command },
    { label: '○ Actor', color: COLORS.actor },
  ];

  for (let i = 0; i < legendItems.length; i++) {
    const cell = sheet.getCell(rowIndex, 2 + i);
    cell.value = legendItems[i].label;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: legendItems[i].color } };
    cell.font = { color: { argb: COLORS.white }, size: 10 };
    cell.alignment = { horizontal: 'center' };
  }

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  
  const safeName = (model.name || 'giraflow').toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeName}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return value.length > 20 ? value.slice(0, 17) + '...' : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.length}]`;
  if (typeof value === 'object') return '{...}';
  return String(value);
}
