import type { GiraflowModel, TimelineElement, Event, StateView, Actor, Command } from './types';
import { isEvent, isState, isActor, isCommand } from './types';
import { buildTimelineViewModel } from './models';

// Draw.io colors matching Giraflow theme
const COLORS = {
  event: '#ff9e64',
  state: '#9ece6a',
  command: '#7aa2f7',
  actor: '#6b7280',
  laneBg: '#f8f9fb',
  laneBorder: '#e2e5ea',
  text: '#1a1d26',
  headerBg: 'rgba(0,0,0,0.15)',
};

// Symbols for element types
const SYMBOLS = {
  event: '⚡',
  state: '📋',
  command: '📤',
  actor: '👤',
};

// Layout constants - enlarged for detailed content
const TICK_WIDTH = 280;
const LANE_HEIGHT = 200;
const BOX_WIDTH = 240;
const BOX_MIN_HEIGHT = 100;
const BOX_HEADER_HEIGHT = 28;
const BOX_LINE_HEIGHT = 16;
const BOX_PADDING_V = 8;
const LANE_LABEL_WIDTH = 140;
const LANES_TOP = 50;
const BOX_PADDING = (TICK_WIDTH - BOX_WIDTH) / 2;
const MAX_FIELD_VALUE_LENGTH = 40;
const MAX_FIELDS_TO_SHOW = 8;

/**
 * Escape XML special characters
 */
function escapeXml(str: string | undefined | null): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate a unique ID for mxCell elements
 */
let cellIdCounter = 2; // Start at 2 since 0 and 1 are reserved
function nextId(): string {
  return String(cellIdCounter++);
}

/**
 * Truncate a string if too long
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

/**
 * Format a value for display (handle objects, arrays, etc.)
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return truncate(value, MAX_FIELD_VALUE_LENGTH);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const preview = value.slice(0, 2).map(v => 
      typeof v === 'object' ? '{...}' : String(v)
    ).join(', ');
    return truncate(`[${preview}${value.length > 2 ? ', ...' : ''}]`, MAX_FIELD_VALUE_LENGTH);
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as object);
    if (keys.length === 0) return '{}';
    return truncate(`{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}}`, MAX_FIELD_VALUE_LENGTH);
  }
  return truncate(String(value), MAX_FIELD_VALUE_LENGTH);
}

/**
 * Extract fields from example object
 */
function extractExampleFields(example: unknown): Array<{ key: string; value: string }> {
  if (!example || typeof example !== 'object' || Array.isArray(example)) {
    return [];
  }
  const obj = example as Record<string, unknown>;
  const entries = Object.entries(obj).slice(0, MAX_FIELDS_TO_SHOW);
  return entries.map(([key, value]) => ({
    key: truncate(key, 20),
    value: formatValue(value),
  }));
}

/**
 * Calculate required box height based on content
 */
function calculateBoxHeight(element: TimelineElement): number {
  let contentLines = 0;
  
  if (isActor(element)) {
    const actor = element as Actor;
    contentLines = 2; // reads + triggers
    if (actor.wireframes && actor.wireframes.length > 0) {
      contentLines += 1; // wireframe indicator
    }
  } else if (isEvent(element) || isState(element) || isCommand(element)) {
    const withExample = element as Event | StateView | Command;
    if (withExample.example) {
      const fields = extractExampleFields(withExample.example);
      contentLines = fields.length;
    }
    if (isEvent(element) && (element as Event).system) {
      contentLines += 1; // system label
    }
    if (isEvent(element) && (element as Event).producedBy) {
      contentLines += 1; // producedBy label
    }
  }
  
  const contentHeight = contentLines * BOX_LINE_HEIGHT + BOX_PADDING_V * 2;
  return Math.max(BOX_MIN_HEIGHT, BOX_HEADER_HEIGHT + contentHeight);
}

/**
 * Build HTML content for a detail box
 */
function buildBoxContent(element: TimelineElement): string {
  const symbol = SYMBOLS[element.type as keyof typeof SYMBOLS] || '📦';
  const lines: string[] = [];
  
  // Header line
  lines.push(`<b>${symbol} ${escapeXml(element.name)}</b>`);
  
  if (isActor(element)) {
    const actor = element as Actor;
    lines.push('');
    lines.push(`<font color="#666666" style="font-size:9px">📖 reads:</font> <font style="font-size:9px">${escapeXml(actor.readsView)}</font>`);
    lines.push(`<font color="#666666" style="font-size:9px">📤 triggers:</font> <font style="font-size:9px">${escapeXml(actor.sendsCommand)}</font>`);
    if (actor.wireframes && actor.wireframes.length > 0) {
      lines.push(`<font color="#888888" style="font-size:8px">🖼️ ${actor.wireframes.length} wireframe(s)</font>`);
    }
    if (actor.role) {
      lines.push(`<font color="#888888" style="font-size:8px">role: ${escapeXml(actor.role)}</font>`);
    }
  } else if (isEvent(element)) {
    const event = element as Event;
    lines.push('');
    if (event.system) {
      lines.push(`<font color="#666666" style="font-size:8px">system: ${escapeXml(event.system)}</font>`);
    }
    if (event.producedBy) {
      lines.push(`<font color="#666666" style="font-size:8px">from: ${escapeXml(event.producedBy)}</font>`);
    }
    if (event.example) {
      const fields = extractExampleFields(event.example);
      for (const { key, value } of fields) {
        lines.push(`<font color="#555555" style="font-size:9px">${escapeXml(key)}:</font> <font style="font-size:9px">${escapeXml(value)}</font>`);
      }
    }
  } else if (isState(element)) {
    const state = element as StateView;
    lines.push('');
    if (state.sourcedFrom && state.sourcedFrom.length > 0) {
      lines.push(`<font color="#666666" style="font-size:8px">from: ${escapeXml(state.sourcedFrom.join(', '))}</font>`);
    }
    if (state.example) {
      const fields = extractExampleFields(state.example);
      for (const { key, value } of fields) {
        lines.push(`<font color="#555555" style="font-size:9px">${escapeXml(key)}:</font> <font style="font-size:9px">${escapeXml(value)}</font>`);
      }
    }
  } else if (isCommand(element)) {
    const command = element as Command;
    lines.push('');
    if (command.example) {
      const fields = extractExampleFields(command.example);
      for (const { key, value } of fields) {
        lines.push(`<font color="#555555" style="font-size:9px">${escapeXml(key)}:</font> <font style="font-size:9px">${escapeXml(value)}</font>`);
      }
    }
  }
  
  return lines.join('<br/>');
}

/**
 * Create an mxCell for a detailed element box
 */
function createDetailedBox(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  content: string,
  fillColor: string,
  strokeColor: string,
  fontColor: string = '#ffffff',
  rounded: boolean = false
): string {
  const style = [
    'rounded=' + (rounded ? '1' : '0'),
    'whiteSpace=wrap',
    'html=1',
    `fillColor=${fillColor}`,
    `strokeColor=${strokeColor}`,
    `fontColor=${fontColor}`,
    'fontSize=10',
    'align=left',
    'verticalAlign=top',
    'spacingLeft=8',
    'spacingTop=6',
    'spacingRight=8',
    'spacingBottom=6',
  ].join(';');

  // Content contains HTML tags which must be XML-escaped for the attribute
  const escapedContent = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return `      <mxCell id="${id}" value="${escapedContent}" style="${style}" vertex="1" parent="1">
        <mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry"/>
      </mxCell>`;
}

/**
 * Create an mxCell for a lane label (rotated text)
 */
function createLaneLabel(
  id: string,
  x: number,
  y: number,
  height: number,
  label: string,
  color: string
): string {
  const style = [
    'text',
    'html=1',
    'strokeColor=none',
    'fillColor=none',
    'align=center',
    'verticalAlign=middle',
    'whiteSpace=wrap',
    'rounded=0',
    `fontColor=${color}`,
    'fontStyle=1',
    'fontSize=11',
  ].join(';');

  return `      <mxCell id="${id}" value="${escapeXml(label)}" style="${style}" vertex="1" parent="1">
        <mxGeometry x="${x}" y="${y}" width="${LANE_LABEL_WIDTH}" height="${height}" as="geometry"/>
      </mxCell>`;
}

/**
 * Create an mxCell for a lane background
 */
function createLaneBg(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor: string
): string {
  const style = [
    'rounded=0',
    'whiteSpace=wrap',
    'html=1',
    `fillColor=${fillColor}`,
    `strokeColor=${COLORS.laneBorder}`,
    'opacity=50',
  ].join(';');

  return `      <mxCell id="${id}" value="" style="${style}" vertex="1" parent="1">
        <mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry"/>
      </mxCell>`;
}

/**
 * Create an mxCell for a tick label
 */
function createTickLabel(
  id: string,
  x: number,
  y: number,
  tick: number
): string {
  const style = [
    'text',
    'html=1',
    'strokeColor=none',
    'fillColor=none',
    'align=center',
    'verticalAlign=middle',
    'whiteSpace=wrap',
    'rounded=0',
    'fontColor=#6b7280',
    'fontSize=12',
    'fontStyle=1',
  ].join(';');

  return `      <mxCell id="${id}" value="@${tick}" style="${style}" vertex="1" parent="1">
        <mxGeometry x="${x}" y="${y}" width="${TICK_WIDTH}" height="30" as="geometry"/>
      </mxCell>`;
}

/**
 * Create a legend box
 */
function createLegendBox(
  id: string,
  x: number,
  y: number,
  label: string,
  symbol: string,
  color: string
): string {
  const style = [
    'rounded=1',
    'whiteSpace=wrap',
    'html=1',
    `fillColor=${color}`,
    `strokeColor=${color}`,
    'fontColor=#ffffff',
    'fontSize=10',
    'fontStyle=1',
  ].join(';');

  return `      <mxCell id="${id}" value="${symbol} ${escapeXml(label)}" style="${style}" vertex="1" parent="1">
        <mxGeometry x="${x}" y="${y}" width="90" height="30" as="geometry"/>
      </mxCell>`;
}

/**
 * Export Giraflow model to Draw.io XML format (horizontal timeline layout)
 */
export function generateDrawioXml(model: GiraflowModel): string {
  cellIdCounter = 2; // Reset counter
  
  const viewModel = buildTimelineViewModel(model);
  const items = viewModel.items;
  const laneConfig = viewModel.laneConfig;

  // Group items by tick
  const tickMap = new Map<number, typeof items>();
  for (const item of items) {
    const tick = item.element.tick;
    if (!tickMap.has(tick)) {
      tickMap.set(tick, []);
    }
    tickMap.get(tick)!.push(item);
  }
  const tickColumns = Array.from(tickMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([tick, tickItems]) => ({ tick, items: tickItems }));

  // Calculate maximum box height per lane per tick to align vertically
  const tickBoxHeights = new Map<string, number>();
  for (const { tick, items: tickItems } of tickColumns) {
    for (const { element, position, laneIndex } of tickItems) {
      const key = `${tick}-${position}-${laneIndex}`;
      const height = calculateBoxHeight(element);
      tickBoxHeights.set(key, Math.max(tickBoxHeights.get(key) || BOX_MIN_HEIGHT, height));
    }
  }

  // Calculate dimensions
  const actorLaneCount = laneConfig.actorRoles.length;
  const eventLaneCount = laneConfig.eventSystems.length;
  const totalLanes = actorLaneCount + 1 + eventLaneCount; // +1 for center (cmd/state)
  const legendHeight = 50;
  const totalHeight = LANES_TOP + totalLanes * LANE_HEIGHT + legendHeight;
  const totalWidth = LANE_LABEL_WIDTH + tickColumns.length * TICK_WIDTH + 80;

  // Calculate lane Y positions (Actors top, Commands/States middle, Events bottom)
  function getLaneY(position: string, laneIndex: number): number {
    if (position === 'right') { // Actors at top
      return LANES_TOP + laneIndex * LANE_HEIGHT;
    } else if (position === 'center') { // Commands/States in middle
      return LANES_TOP + actorLaneCount * LANE_HEIGHT;
    } else { // Events at bottom
      return LANES_TOP + (actorLaneCount + 1 + laneIndex) * LANE_HEIGHT;
    }
  }

  const cells: string[] = [];

  // Create legend at top
  const legendY = 8;
  cells.push(createLegendBox(nextId(), LANE_LABEL_WIDTH + 10, legendY, 'Event', SYMBOLS.event, COLORS.event));
  cells.push(createLegendBox(nextId(), LANE_LABEL_WIDTH + 110, legendY, 'State', SYMBOLS.state, COLORS.state));
  cells.push(createLegendBox(nextId(), LANE_LABEL_WIDTH + 210, legendY, 'Command', SYMBOLS.command, COLORS.command));
  cells.push(createLegendBox(nextId(), LANE_LABEL_WIDTH + 310, legendY, 'Actor', SYMBOLS.actor, COLORS.actor));

  // Create lane backgrounds
  const laneWidth = tickColumns.length * TICK_WIDTH + 50;
  
  // Actor lanes
  for (let i = 0; i < actorLaneCount; i++) {
    const y = getLaneY('right', i);
    cells.push(createLaneBg(nextId(), LANE_LABEL_WIDTH, y, laneWidth, LANE_HEIGHT, '#f0f2f5'));
  }
  
  // Center lane (hatched appearance via lighter color)
  const centerY = getLaneY('center', 0);
  cells.push(createLaneBg(nextId(), LANE_LABEL_WIDTH, centerY, laneWidth, LANE_HEIGHT, '#e8eaed'));
  
  // Event lanes
  for (let i = 0; i < eventLaneCount; i++) {
    const y = getLaneY('left', i);
    cells.push(createLaneBg(nextId(), LANE_LABEL_WIDTH, y, laneWidth, LANE_HEIGHT, '#fff8f0'));
  }

  // Create lane labels
  for (let i = 0; i < actorLaneCount; i++) {
    const y = getLaneY('right', i);
    const label = laneConfig.actorRoles[i] || 'Actors';
    cells.push(createLaneLabel(nextId(), 0, y, LANE_HEIGHT, label, COLORS.actor));
  }
  
  cells.push(createLaneLabel(nextId(), 0, centerY, LANE_HEIGHT, 'Commands / States', COLORS.text));
  
  for (let i = 0; i < eventLaneCount; i++) {
    const y = getLaneY('left', i);
    const label = laneConfig.eventSystems[i] || 'Events';
    cells.push(createLaneLabel(nextId(), 0, y, LANE_HEIGHT, label, COLORS.event));
  }

  // Create tick labels
  for (let i = 0; i < tickColumns.length; i++) {
    const x = LANE_LABEL_WIDTH + i * TICK_WIDTH;
    cells.push(createTickLabel(nextId(), x, LANES_TOP - 35, tickColumns[i].tick));
  }

  // Create element boxes with full details
  for (let tickIndex = 0; tickIndex < tickColumns.length; tickIndex++) {
    const { items: tickItems } = tickColumns[tickIndex];
    const baseX = LANE_LABEL_WIDTH + tickIndex * TICK_WIDTH + BOX_PADDING;

    for (const { element, position, laneIndex } of tickItems) {
      const laneY = getLaneY(position, laneIndex);
      const boxHeight = calculateBoxHeight(element);
      const boxY = laneY + (LANE_HEIGHT - boxHeight) / 2;
      
      const color = COLORS[element.type as keyof typeof COLORS] || COLORS.actor;
      const isActorType = element.type === 'actor';
      
      const content = buildBoxContent(element);
      
      cells.push(createDetailedBox(
        nextId(),
        baseX,
        boxY,
        BOX_WIDTH,
        boxHeight,
        content,
        color,
        color,
        '#ffffff',
        isActorType // Rounded for actors
      ));
    }
  }

  // Add title
  const titleStyle = [
    'text',
    'html=1',
    'strokeColor=none',
    'fillColor=none',
    'align=right',
    'verticalAlign=middle',
    'whiteSpace=wrap',
    'rounded=0',
    'fontColor=#333333',
    'fontSize=14',
    'fontStyle=1',
  ].join(';');
  
  cells.push(`      <mxCell id="${nextId()}" value="${escapeXml(model.name || 'Giraflow Timeline')}" style="${titleStyle}" vertex="1" parent="1">
        <mxGeometry x="${totalWidth - 300}" y="${legendY}" width="280" height="30" as="geometry"/>
      </mxCell>`);

  // Build the complete XML
  const xml = `<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="Giraflow" version="21.0.0" type="device">
  <diagram name="${escapeXml(model.name || 'Timeline')}" id="giraflow-timeline">
    <mxGraphModel dx="0" dy="0" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${totalWidth}" pageHeight="${totalHeight}" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
${cells.join('\n')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

  return xml;
}

/**
 * Download Giraflow model as Draw.io file
 */
export function downloadDrawio(model: GiraflowModel): void {
  const xml = generateDrawioXml(model);
  
  // Sanitize name for filename
  const safeName = (model.name || 'giraflow').toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeName}.drawio`;
  link.click();
  URL.revokeObjectURL(url);
}
