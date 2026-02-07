/**
 * SVG Export for Giraflow Models
 * 
 * Generates a deterministic Event Model diagram as SVG.
 * No external APIs required.
 */

import type { GiraflowModel, Actor, Command, Event, StateView } from './types';

// Giraflow colors
const COLORS = {
  event: '#ff9e64',
  eventStroke: '#df7e44',
  state: '#9ece6a',
  stateStroke: '#7eb356',
  command: '#7aa2f7',
  commandStroke: '#5a82d7',
  actor: '#6b7280',
  actorStroke: '#4b5563',
  actorAdmin: '#9333ea',
  actorAdminStroke: '#7c3aed',
  text: '#1a1a1a',
  textLight: '#ffffff',
  line: '#e0e0e0',
  arrow: '#888888',
  background: '#ffffff',
};

// Layout constants
const LAYOUT = {
  boxWidth: 120,
  boxHeight: 40,
  boxRadius: 6,
  horizontalGap: 40,
  verticalGap: 80,
  padding: 40,
  fontSize: 11,
  fontFamily: 'Inter, system-ui, sans-serif',
  laneHeight: 60,
};

interface SliceData {
  actor: Actor | undefined;
  command: Command;
  events: Event[];
  state: StateView | undefined;
  tick: number;
}

/**
 * Extract unique command slices from the model
 */
function extractSlices(model: GiraflowModel): SliceData[] {
  const timeline = model.timeline;
  const slices: SliceData[] = [];
  const seenCommands = new Set<string>();

  const commands = timeline.filter((el): el is Command => el.type === 'command');

  for (const cmd of commands) {
    if (seenCommands.has(cmd.name)) continue;
    seenCommands.add(cmd.name);

    // Find actor that triggers this command
    let actor: Actor | undefined;
    const cmdIndex = timeline.indexOf(cmd);
    for (let i = cmdIndex - 1; i >= 0; i--) {
      const el = timeline[i];
      if (el.type === 'actor' && (el as Actor).sendsCommand === cmd.name) {
        actor = el as Actor;
        break;
      }
    }

    // Find events produced by this command
    const events = timeline.filter(
      (el): el is Event =>
        el.type === 'event' && el.producedBy === `${cmd.name}-${cmd.tick}`
    );

    // Find next state after the events
    const eventTick = events[0]?.tick || cmd.tick;
    const state = timeline.find(
      (el): el is StateView => el.type === 'state' && el.tick > eventTick
    );

    slices.push({
      actor,
      command: cmd,
      events,
      state,
      tick: cmd.tick,
    });
  }

  return slices;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Truncate text to fit in box
 */
function truncateText(text: string, maxLength: number = 16): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

/**
 * Generate SVG rectangle with rounded corners
 */
function svgRect(
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  stroke: string,
  rx: number = LAYOUT.boxRadius
): string {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
}

/**
 * Generate SVG ellipse (for actors)
 */
function svgEllipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: string,
  stroke: string
): string {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
}

/**
 * Generate SVG text
 */
function svgText(
  x: number,
  y: number,
  text: string,
  color: string = COLORS.text,
  fontSize: number = LAYOUT.fontSize,
  anchor: string = 'middle',
  bold: boolean = false
): string {
  const weight = bold ? 'font-weight="600"' : '';
  return `<text x="${x}" y="${y}" fill="${color}" font-size="${fontSize}" font-family="${LAYOUT.fontFamily}" text-anchor="${anchor}" dominant-baseline="middle" ${weight}>${escapeXml(text)}</text>`;
}

/**
 * Generate SVG arrow line
 */
function svgArrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string = COLORS.arrow,
  dashed: boolean = false
): string {
  const dashArray = dashed ? 'stroke-dasharray="4,3"' : '';
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1.5" ${dashArray} marker-end="url(#arrowhead)"/>`;
}

/**
 * Generate the complete SVG
 */
export function generateSvg(model: GiraflowModel): string {
  const slices = extractSlices(model);
  
  if (slices.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
      <text x="200" y="100" text-anchor="middle" font-family="${LAYOUT.fontFamily}" fill="${COLORS.text}">No commands found in model</text>
    </svg>`;
  }

  // Calculate dimensions
  const sliceWidth = LAYOUT.boxWidth + LAYOUT.horizontalGap;
  const contentWidth = slices.length * sliceWidth;
  const width = contentWidth + LAYOUT.padding * 2 + 80; // Extra for lane labels
  const height = 4 * LAYOUT.laneHeight + LAYOUT.padding * 2 + 60; // 4 lanes + title

  const labelX = LAYOUT.padding;
  const startX = LAYOUT.padding + 80;
  const laneY = {
    actor: LAYOUT.padding + 50,
    command: LAYOUT.padding + 50 + LAYOUT.laneHeight,
    event: LAYOUT.padding + 50 + LAYOUT.laneHeight * 2,
    state: LAYOUT.padding + 50 + LAYOUT.laneHeight * 3,
  };

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="${COLORS.arrow}"/>
    </marker>
    <marker id="arrowhead-read" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
      <polygon points="0 0, 6 2.5, 0 5" fill="${COLORS.actor}"/>
    </marker>
  </defs>
  
  <!-- Background -->
  <rect width="100%" height="100%" fill="${COLORS.background}"/>
  
  <!-- Title -->
  ${svgText(width / 2, LAYOUT.padding, model.name, COLORS.text, 16, 'middle', true)}
  
  <!-- Swimlane labels -->
  ${svgText(labelX, laneY.actor + LAYOUT.boxHeight / 2, 'Actors', COLORS.actor, 10, 'start')}
  ${svgText(labelX, laneY.command + LAYOUT.boxHeight / 2, 'Commands', COLORS.command, 10, 'start')}
  ${svgText(labelX, laneY.event + LAYOUT.boxHeight / 2, 'Events', COLORS.event, 10, 'start')}
  ${svgText(labelX, laneY.state + LAYOUT.boxHeight / 2, 'Read Models', COLORS.state, 10, 'start')}
  
  <!-- Swimlane lines -->
  <line x1="${startX - 10}" y1="${laneY.actor + LAYOUT.laneHeight - 10}" x2="${width - LAYOUT.padding}" y2="${laneY.actor + LAYOUT.laneHeight - 10}" stroke="${COLORS.line}" stroke-width="1"/>
  <line x1="${startX - 10}" y1="${laneY.command + LAYOUT.laneHeight - 10}" x2="${width - LAYOUT.padding}" y2="${laneY.command + LAYOUT.laneHeight - 10}" stroke="${COLORS.line}" stroke-width="1"/>
  <line x1="${startX - 10}" y1="${laneY.event + LAYOUT.laneHeight - 10}" x2="${width - LAYOUT.padding}" y2="${laneY.event + LAYOUT.laneHeight - 10}" stroke="${COLORS.line}" stroke-width="1"/>
`;

  // Render each slice
  slices.forEach((slice, index) => {
    const x = startX + index * sliceWidth;
    const centerX = x + LAYOUT.boxWidth / 2;

    // Actor (ellipse)
    const isAdmin = slice.actor?.role === 'Admin';
    const actorFill = isAdmin ? COLORS.actorAdmin : COLORS.actor;
    const actorStroke = isAdmin ? COLORS.actorAdminStroke : COLORS.actorStroke;
    const actorName = slice.actor?.name || 'User';
    
    svg += `
  <!-- Slice ${index + 1}: ${slice.command.name} -->
  <g class="slice-${index}">
    <!-- Actor -->
    ${svgEllipse(centerX, laneY.actor + LAYOUT.boxHeight / 2, LAYOUT.boxWidth / 2 - 10, LAYOUT.boxHeight / 2 - 2, actorFill, actorStroke)}
    ${svgText(centerX, laneY.actor + LAYOUT.boxHeight / 2, truncateText(actorName), COLORS.textLight, LAYOUT.fontSize, 'middle', true)}
    
    <!-- Command -->
    ${svgRect(x, laneY.command, LAYOUT.boxWidth, LAYOUT.boxHeight, COLORS.command, COLORS.commandStroke)}
    ${svgText(centerX, laneY.command + LAYOUT.boxHeight / 2, truncateText(slice.command.name), COLORS.text, LAYOUT.fontSize, 'middle', true)}
    
    <!-- Arrow: Actor → Command -->
    ${svgArrow(centerX, laneY.actor + LAYOUT.boxHeight, centerX, laneY.command - 2, COLORS.command)}
`;

    // Event(s)
    const mainEvent = slice.events[0];
    if (mainEvent) {
      svg += `
    <!-- Event -->
    ${svgRect(x, laneY.event, LAYOUT.boxWidth, LAYOUT.boxHeight, COLORS.event, COLORS.eventStroke)}
    ${svgText(centerX, laneY.event + LAYOUT.boxHeight / 2, truncateText(mainEvent.name), COLORS.text, LAYOUT.fontSize, 'middle', true)}
    
    <!-- Arrow: Command → Event -->
    ${svgArrow(centerX, laneY.command + LAYOUT.boxHeight, centerX, laneY.event - 2, COLORS.event)}
`;
    }

    // State
    if (slice.state) {
      svg += `
    <!-- State -->
    ${svgRect(x, laneY.state, LAYOUT.boxWidth, LAYOUT.boxHeight, COLORS.state, COLORS.stateStroke)}
    ${svgText(centerX, laneY.state + LAYOUT.boxHeight / 2, truncateText(slice.state.name), COLORS.text, LAYOUT.fontSize, 'middle', true)}
    
    <!-- Arrow: Event → State -->
    ${svgArrow(centerX, laneY.event + LAYOUT.boxHeight, centerX, laneY.state - 2, COLORS.state)}
    
    <!-- Dashed read arrow back to Actor -->
    <line x1="${x + 15}" y1="${laneY.state}" x2="${x + 15}" y2="${laneY.actor + LAYOUT.boxHeight + 5}" stroke="${COLORS.actor}" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#arrowhead-read)"/>
`;
    }

    svg += `  </g>
`;
  });

  // Legend
  const legendY = height - 30;
  const legendX = startX;
  svg += `
  <!-- Legend -->
  <g class="legend">
    ${svgRect(legendX, legendY, 50, 16, COLORS.actor, COLORS.actorStroke, 3)}
    ${svgText(legendX + 25, legendY + 8, 'Actor', COLORS.textLight, 8)}
    
    ${svgRect(legendX + 65, legendY, 55, 16, COLORS.command, COLORS.commandStroke, 3)}
    ${svgText(legendX + 92, legendY + 8, 'Command', COLORS.text, 8)}
    
    ${svgRect(legendX + 135, legendY, 45, 16, COLORS.event, COLORS.eventStroke, 3)}
    ${svgText(legendX + 157, legendY + 8, 'Event', COLORS.text, 8)}
    
    ${svgRect(legendX + 195, legendY, 65, 16, COLORS.state, COLORS.stateStroke, 3)}
    ${svgText(legendX + 227, legendY + 8, 'Read Model', COLORS.text, 8)}
  </g>
`;

  svg += `</svg>`;
  
  return svg;
}

/**
 * Download SVG file
 */
export function downloadSvg(model: GiraflowModel): void {
  const svg = generateSvg(model);
  
  const safeName = (model.name || 'giraflow')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeName}-event-model.svg`;
  link.click();
  URL.revokeObjectURL(url);
}
