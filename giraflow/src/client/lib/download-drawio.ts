import type { GiraflowModel } from './types';
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
};

// Layout constants
const TICK_WIDTH = 200;
const LANE_HEIGHT = 160;
const BOX_WIDTH = 160;
const BOX_HEIGHT = 80;
const LANE_LABEL_WIDTH = 120;
const LANES_TOP = 40;
const BOX_PADDING = (TICK_WIDTH - BOX_WIDTH) / 2;

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
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
 * Create an mxCell for a rectangle shape
 */
function createRect(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  fillColor: string,
  strokeColor: string,
  fontColor: string = COLORS.text,
  rounded: boolean = false,
  fontSize: number = 11
): string {
  const style = [
    'rounded=' + (rounded ? '1' : '0'),
    'whiteSpace=wrap',
    'html=1',
    `fillColor=${fillColor}`,
    `strokeColor=${strokeColor}`,
    `fontColor=${fontColor}`,
    `fontSize=${fontSize}`,
    'fontStyle=1', // Bold
  ].join(';');

  return `      <mxCell id="${id}" value="${escapeXml(label)}" style="${style}" vertex="1" parent="1">
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
    'fontSize=10',
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
    'fontSize=10',
  ].join(';');

  return `      <mxCell id="${id}" value="@${tick}" style="${style}" vertex="1" parent="1">
        <mxGeometry x="${x}" y="${y}" width="${TICK_WIDTH}" height="24" as="geometry"/>
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

  // Calculate dimensions
  const actorLaneCount = laneConfig.actorRoles.length;
  const eventLaneCount = laneConfig.eventSystems.length;
  const totalLanes = actorLaneCount + 1 + eventLaneCount; // +1 for center (cmd/state)
  const totalHeight = LANES_TOP + totalLanes * LANE_HEIGHT;
  const totalWidth = LANE_LABEL_WIDTH + tickColumns.length * TICK_WIDTH + 50;

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
  
  cells.push(createLaneLabel(nextId(), 0, centerY, LANE_HEIGHT, 'Cmd / State', COLORS.text));
  
  for (let i = 0; i < eventLaneCount; i++) {
    const y = getLaneY('left', i);
    const label = laneConfig.eventSystems[i] || 'Events';
    cells.push(createLaneLabel(nextId(), 0, y, LANE_HEIGHT, label, COLORS.event));
  }

  // Create tick labels
  for (let i = 0; i < tickColumns.length; i++) {
    const x = LANE_LABEL_WIDTH + i * TICK_WIDTH;
    cells.push(createTickLabel(nextId(), x, 8, tickColumns[i].tick));
  }

  // Create element boxes
  for (let tickIndex = 0; tickIndex < tickColumns.length; tickIndex++) {
    const { items: tickItems } = tickColumns[tickIndex];
    const baseX = LANE_LABEL_WIDTH + tickIndex * TICK_WIDTH + BOX_PADDING;

    for (const { element, position, laneIndex } of tickItems) {
      const laneY = getLaneY(position, laneIndex);
      const boxY = laneY + (LANE_HEIGHT - BOX_HEIGHT) / 2;
      
      const color = COLORS[element.type as keyof typeof COLORS] || COLORS.actor;
      const isActorType = element.type === 'actor';
      
      cells.push(createRect(
        nextId(),
        baseX,
        boxY,
        BOX_WIDTH,
        BOX_HEIGHT,
        element.name,
        color,
        color,
        '#ffffff',
        isActorType, // Rounded for actors
        10
      ));
    }
  }

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
