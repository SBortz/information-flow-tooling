import ExcelJS from 'exceljs';
import type { GiraflowModel, TimelineElement, Event, Actor, Command, StateView } from './types';
import { isEvent, isActor, isCommand, isState } from './types';
import { buildLaneConfig, type LaneConfig } from './models/timeline-model';

/**
 * Colors for element types (as hex)
 */
const COLORS = {
  event: 'FFF59E0B',    // Orange
  state: 'FF10B981',    // Green
  command: 'FF3B82F6',  // Blue
  actor: 'FF6B7280',    // Gray
  header: 'FF1F2937',   // Dark gray for header
};

/**
 * Text colors (lighter for readability on dark backgrounds)
 */
const TEXT_COLORS = {
  event: 'FF000000',    // Black on orange
  state: 'FFFFFFFF',    // White on green
  command: 'FFFFFFFF',  // White on blue
  actor: 'FFFFFFFF',    // White on gray
  header: 'FFFFFFFF',   // White on dark
};

/**
 * Format element details for the cell
 */
function formatElementDetails(element: TimelineElement): string {
  const lines: string[] = [element.name];
  
  if (isEvent(element)) {
    const event = element as Event;
    if (event.producedBy) {
      lines.push(`↳ by ${event.producedBy}`);
    }
    if (event.system) {
      lines.push(`[${event.system}]`);
    }
  } else if (isActor(element)) {
    const actor = element as Actor;
    if (actor.readsView) {
      lines.push(`reads: ${actor.readsView}`);
    }
    if (actor.sendsCommand) {
      lines.push(`sends: ${actor.sendsCommand}`);
    }
    if (actor.role) {
      lines.push(`[${actor.role}]`);
    }
  } else if (isCommand(element)) {
    // Commands don't have extra info typically
  } else if (isState(element)) {
    const state = element as StateView;
    if (state.sourcedFrom && state.sourcedFrom.length > 0) {
      lines.push(`← ${state.sourcedFrom.join(', ')}`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Build column structure for the sheet
 * Layout: [Tick] [Event Lanes...] [Commands/States] [Actor Lanes...]
 */
interface ColumnInfo {
  key: string;
  header: string;
  width: number;
  type: 'tick' | 'event' | 'center' | 'actor';
  laneKey?: string;  // System name for events, role name for actors
}

function buildColumns(laneConfig: LaneConfig): ColumnInfo[] {
  const columns: ColumnInfo[] = [];
  
  // Tick column
  columns.push({
    key: 'tick',
    header: 'Tick',
    width: 8,
    type: 'tick'
  });
  
  // Event lanes (systems)
  for (const system of laneConfig.eventSystems) {
    const label = system || 'Events';
    columns.push({
      key: `event_${system || 'default'}`,
      header: label,
      width: 25,
      type: 'event',
      laneKey: system
    });
  }
  
  // Center lane (Commands & States)
  columns.push({
    key: 'center',
    header: 'Commands / States',
    width: 30,
    type: 'center'
  });
  
  // Actor lanes (roles)
  for (const role of laneConfig.actorRoles) {
    const label = role || 'Actors';
    columns.push({
      key: `actor_${role || 'default'}`,
      header: label,
      width: 25,
      type: 'actor',
      laneKey: role
    });
  }
  
  return columns;
}

/**
 * Group elements by tick
 */
function groupByTick(elements: TimelineElement[]): Map<number, TimelineElement[]> {
  const grouped = new Map<number, TimelineElement[]>();
  
  for (const el of elements) {
    const existing = grouped.get(el.tick) || [];
    existing.push(el);
    grouped.set(el.tick, existing);
  }
  
  return grouped;
}

/**
 * Get column key for an element
 */
function getColumnKey(element: TimelineElement): string {
  if (isEvent(element)) {
    const event = element as Event;
    return `event_${event.system || 'default'}`;
  } else if (isActor(element)) {
    const actor = element as Actor;
    return `actor_${actor.role || 'default'}`;
  } else {
    // Commands and States go to center
    return 'center';
  }
}

/**
 * Apply cell styling based on element type
 */
function styleCellForElement(cell: ExcelJS.Cell, element: TimelineElement): void {
  const type = element.type as keyof typeof COLORS;
  const bgColor = COLORS[type] || 'FFFFFFFF';
  const textColor = TEXT_COLORS[type] || 'FF000000';
  
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: bgColor }
  };
  
  cell.font = {
    color: { argb: textColor },
    bold: true,
    size: 10
  };
  
  cell.alignment = {
    vertical: 'middle',
    horizontal: 'center',
    wrapText: true
  };
  
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
  };
}

/**
 * Style header row
 */
function styleHeaderCell(cell: ExcelJS.Cell): void {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.header }
  };
  
  cell.font = {
    color: { argb: TEXT_COLORS.header },
    bold: true,
    size: 11
  };
  
  cell.alignment = {
    vertical: 'middle',
    horizontal: 'center',
    wrapText: true
  };
  
  cell.border = {
    top: { style: 'medium', color: { argb: 'FF000000' } },
    bottom: { style: 'medium', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF4B5563' } },
    right: { style: 'thin', color: { argb: 'FF4B5563' } }
  };
}

/**
 * Download Giraflow model as Excel file
 */
export async function downloadExcel(model: GiraflowModel): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Giraflow';
  workbook.created = new Date();
  
  const sheet = workbook.addWorksheet('Timeline', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });
  
  // Build lane configuration
  const laneConfig = buildLaneConfig(model);
  
  // Build column structure
  const columns = buildColumns(laneConfig);
  
  // Set columns
  sheet.columns = columns.map(col => ({
    key: col.key,
    header: col.header,
    width: col.width
  }));
  
  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.height = 25;
  headerRow.eachCell(cell => {
    styleHeaderCell(cell);
  });
  
  // Group elements by tick
  const sortedElements = [...model.timeline].sort((a, b) => a.tick - b.tick);
  const elementsByTick = groupByTick(sortedElements);
  
  // Get all unique ticks sorted
  const ticks = Array.from(elementsByTick.keys()).sort((a, b) => a - b);
  
  // Add data rows
  let rowIndex = 2;
  for (const tick of ticks) {
    const elements = elementsByTick.get(tick) || [];
    
    // Group elements by column
    const elementsByColumn = new Map<string, TimelineElement[]>();
    for (const el of elements) {
      const colKey = getColumnKey(el);
      const existing = elementsByColumn.get(colKey) || [];
      existing.push(el);
      elementsByColumn.set(colKey, existing);
    }
    
    // Determine max elements in any single column for this tick
    let maxInColumn = 1;
    for (const colElements of elementsByColumn.values()) {
      maxInColumn = Math.max(maxInColumn, colElements.length);
    }
    
    // Add rows for this tick
    for (let i = 0; i < maxInColumn; i++) {
      const row = sheet.getRow(rowIndex);
      
      // Set tick value only for first row of the tick
      if (i === 0) {
        row.getCell('tick').value = `@${tick}`;
        row.getCell('tick').font = { bold: true, size: 10 };
        row.getCell('tick').alignment = { vertical: 'middle', horizontal: 'center' };
      }
      
      // Fill in elements for each column
      for (const col of columns) {
        if (col.type === 'tick') continue;
        
        const colElements = elementsByColumn.get(col.key) || [];
        if (i < colElements.length) {
          const element = colElements[i];
          const cell = row.getCell(col.key);
          cell.value = formatElementDetails(element);
          styleCellForElement(cell, element);
        }
      }
      
      // Set row height for wrapped content
      row.height = 40;
      rowIndex++;
    }
    
    // Merge tick cells if multiple rows
    if (maxInColumn > 1) {
      const tickColIndex = 1; // Tick is first column
      sheet.mergeCells(rowIndex - maxInColumn, tickColIndex, rowIndex - 1, tickColIndex);
    }
  }
  
  // Add alternating row colors for better readability
  for (let r = 2; r < rowIndex; r++) {
    const row = sheet.getRow(r);
    for (const col of columns) {
      const cell = row.getCell(col.key);
      // Only style empty cells
      if (!cell.value) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: r % 2 === 0 ? 'FFF9FAFB' : 'FFFFFFFF' }
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };
      }
    }
  }
  
  // Add model info at the top
  sheet.insertRow(1, []);
  sheet.getCell('A1').value = model.name;
  sheet.getCell('A1').font = { bold: true, size: 14 };
  if (model.description) {
    sheet.getCell('B1').value = model.description;
    sheet.getCell('B1').font = { italic: true, size: 10 };
    sheet.mergeCells(1, 2, 1, columns.length);
  }
  
  // Style the info row
  const infoRow = sheet.getRow(1);
  infoRow.height = 30;
  
  // Generate file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  // Download
  const safeName = (model.name || 'giraflow').toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeName}-timeline.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
