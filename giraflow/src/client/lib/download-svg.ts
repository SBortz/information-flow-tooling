/**
 * SVG Export for Giraflow Models
 * 
 * Generates a deterministic Event Model diagram as SVG.
 * Respects swimlane structure:
 * - Horizontal (default): Time flows top→bottom, lanes left→right
 * - Vertical: Time flows left→right, lanes top→bottom
 */

import type { GiraflowModel, Actor, Command, Event, StateView, TimelineElement } from './types';
import { isEvent, isActor, isCommand, isState } from './types';

export type SvgOrientation = 'horizontal' | 'vertical';

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
  actorSystem: '#0891b2',
  actorSystemStroke: '#0e7490',
  text: '#1a1a1a',
  textLight: '#ffffff',
  line: '#e0e0e0',
  laneBg: '#f8f9fa',
  laneLabel: '#6b7280',
};

// Layout constants
const LAYOUT = {
  boxWidth: 90,
  boxHeight: 32,
  boxRadius: 6,
  tickGap: 65,  // More space between ticks
  laneWidth: 100,
  laneGap: 10,
  padding: 30,
  headerHeight: 50,
  fontSize: 9,
  fontFamily: 'Inter, system-ui, sans-serif',
};

interface LaneConfig {
  eventSystems: string[];
  actorRoles: string[];
}

interface TickColumn {
  tick: number;
  elements: TimelineElement[];
}

/**
 * Build lane configuration from model
 */
function buildLaneConfig(model: GiraflowModel): LaneConfig {
  const systemsSet = new Set<string>();
  const rolesSet = new Set<string>();
  let hasDefaultSystem = false;
  let hasDefaultRole = false;

  for (const el of model.timeline) {
    if (isEvent(el)) {
      if (el.system) systemsSet.add(el.system);
      else hasDefaultSystem = true;
    }
    if (isActor(el)) {
      if (el.role) rolesSet.add(el.role);
      else hasDefaultRole = true;
    }
  }

  // Systems: sorted reversed, default innermost
  const namedSystems = Array.from(systemsSet).sort().reverse();
  const eventSystems = hasDefaultSystem || namedSystems.length === 0
    ? [...namedSystems, '']
    : namedSystems;

  // Roles: sorted, default innermost
  const namedRoles = Array.from(rolesSet).sort();
  const actorRoles = hasDefaultRole || namedRoles.length === 0
    ? ['', ...namedRoles]
    : namedRoles;

  return { eventSystems, actorRoles };
}

/**
 * Group elements by tick
 */
function groupByTick(model: GiraflowModel): TickColumn[] {
  const tickMap = new Map<number, TimelineElement[]>();
  
  for (const el of model.timeline) {
    const existing = tickMap.get(el.tick) || [];
    existing.push(el);
    tickMap.set(el.tick, existing);
  }

  return Array.from(tickMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([tick, elements]) => ({ tick, elements }));
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Truncate text to fit in box
 */
function truncateText(text: string, maxLength: number = 14): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

/**
 * Get actor color based on role
 */
function getActorColors(role?: string): { fill: string; stroke: string } {
  if (role === 'Admin') return { fill: COLORS.actorAdmin, stroke: COLORS.actorAdminStroke };
  if (role === 'System') return { fill: COLORS.actorSystem, stroke: COLORS.actorSystemStroke };
  return { fill: COLORS.actor, stroke: COLORS.actorStroke };
}

/**
 * Generate the complete SVG
 */
export function generateSvg(model: GiraflowModel, orientation: SvgOrientation = 'horizontal'): string {
  const laneConfig = buildLaneConfig(model);
  const tickColumns = groupByTick(model);

  if (tickColumns.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
      <text x="200" y="100" text-anchor="middle" font-family="${LAYOUT.fontFamily}" fill="${COLORS.text}">No elements in timeline</text>
    </svg>`;
  }

  // Calculate max center elements per tick for lane sizing
  const maxCenterPerTick = Math.max(1, ...tickColumns.map(col => 
    col.elements.filter(e => isCommand(e) || isState(e)).length
  ));

  // Calculate dimensions based on orientation
  const numEventLanes = laneConfig.eventSystems.length;
  const numActorLanes = laneConfig.actorRoles.length;
  // Center lane expands based on max stacked elements
  const centerLaneSize = LAYOUT.laneWidth + (maxCenterPerTick - 1) * (LAYOUT.boxHeight + 4);
  
  const totalLaneSize = 
    numEventLanes * LAYOUT.laneWidth + 
    centerLaneSize + 
    numActorLanes * LAYOUT.laneWidth +
    (numEventLanes + numActorLanes + 1) * LAYOUT.laneGap;

  const tickSpan = tickColumns.length * LAYOUT.tickGap + LAYOUT.boxWidth + 20;
  
  let width: number;
  let height: number;
  
  if (orientation === 'vertical') {
    // Time flows left→right, lanes top→bottom
    width = tickSpan + LAYOUT.headerHeight + LAYOUT.padding * 2;
    height = totalLaneSize + LAYOUT.padding * 2;
  } else {
    // Time flows top→bottom, lanes left→right (default)
    width = totalLaneSize + LAYOUT.padding * 2;
    height = tickSpan + LAYOUT.headerHeight + LAYOUT.padding * 2;
  }

  // Lane positions (in the lane dimension - X for horizontal, Y for vertical)
  // Horizontal: Events left, Center middle, Actors right
  // Vertical: Actors top, Center middle, Events bottom
  const lanePositions: { [key: string]: number } = {};
  let currentLanePos = LAYOUT.padding;

  if (orientation === 'vertical') {
    // Vertical: Actors first (top), then Center, then Events (bottom)
    for (const role of laneConfig.actorRoles) {
      const key = `actor:${role}`;
      lanePositions[key] = currentLanePos + LAYOUT.laneWidth / 2;
      currentLanePos += LAYOUT.laneWidth + LAYOUT.laneGap;
    }

    const centerPos = currentLanePos + centerLaneSize / 2;
    lanePositions['center'] = centerPos;
    currentLanePos += centerLaneSize + LAYOUT.laneGap;

    for (const system of laneConfig.eventSystems) {
      const key = `event:${system}`;
      lanePositions[key] = currentLanePos + LAYOUT.laneWidth / 2;
      currentLanePos += LAYOUT.laneWidth + LAYOUT.laneGap;
    }
  } else {
    // Horizontal: Events first (left), then Center, then Actors (right)
    for (const system of laneConfig.eventSystems) {
      const key = `event:${system}`;
      lanePositions[key] = currentLanePos + LAYOUT.laneWidth / 2;
      currentLanePos += LAYOUT.laneWidth + LAYOUT.laneGap;
    }

    const centerPos = currentLanePos + centerLaneSize / 2;
    lanePositions['center'] = centerPos;
    currentLanePos += centerLaneSize + LAYOUT.laneGap;

    for (const role of laneConfig.actorRoles) {
      const key = `actor:${role}`;
      lanePositions[key] = currentLanePos + LAYOUT.laneWidth / 2;
      currentLanePos += LAYOUT.laneWidth + LAYOUT.laneGap;
    }
  }

  // Helper to get final X,Y based on orientation
  const getPos = (lanePos: number, tickPos: number) => {
    if (orientation === 'vertical') {
      return { x: tickPos, y: lanePos };
    }
    return { x: lanePos, y: tickPos };
  };

  // Start building SVG
  const orientationLabel = orientation === 'vertical' ? '(→ Time)' : '(↓ Time)';
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <marker id="arrowhead" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
      <polygon points="0 0, 6 2.5, 0 5" fill="${COLORS.laneLabel}"/>
    </marker>
  </defs>
  
  <!-- Background -->
  <rect width="100%" height="100%" fill="white"/>
  
  <!-- Title -->
  <text x="${width / 2}" y="${LAYOUT.padding}" fill="${COLORS.text}" font-size="14" font-family="${LAYOUT.fontFamily}" text-anchor="middle" font-weight="600">${escapeXml(model.name)} <tspan fill="${COLORS.laneLabel}" font-size="10">${orientationLabel}</tspan></text>
`;

  // Lane backgrounds and headers - positions depend on orientation
  const headerOffset = LAYOUT.padding + 15;
  const laneStart = LAYOUT.headerHeight + LAYOUT.padding;
  const laneEnd = orientation === 'vertical' ? width - LAYOUT.padding : height - LAYOUT.padding;

  // Render lane backgrounds and headers based on orientation
  let lanePos = LAYOUT.padding;

  if (orientation === 'vertical') {
    // Vertical: Actors (top) → Center → Events (bottom)
    
    // Actor role lanes first
    for (const role of laneConfig.actorRoles) {
      const label = role || 'Actors';
      const colors = getActorColors(role);
      svg += `
  <!-- Actor lane: ${label} -->
  <rect x="${laneStart}" y="${lanePos}" width="${laneEnd - laneStart}" height="${LAYOUT.laneWidth}" fill="${COLORS.laneBg}" rx="4"/>
  <text x="${headerOffset}" y="${lanePos + LAYOUT.laneWidth / 2}" fill="${colors.fill}" font-size="9" font-family="${LAYOUT.fontFamily}" text-anchor="middle" dominant-baseline="middle" font-weight="500">${escapeXml(label)}</text>
`;
      lanePos += LAYOUT.laneWidth + LAYOUT.laneGap;
    }

    // Center lane
    svg += `
  <!-- Center lane: Commands & States -->
  <rect x="${laneStart}" y="${lanePos}" width="${laneEnd - laneStart}" height="${centerLaneSize}" fill="white" rx="4" stroke="${COLORS.line}" stroke-width="1"/>
  <text x="${headerOffset}" y="${lanePos + centerLaneSize / 2}" fill="${COLORS.laneLabel}" font-size="9" font-family="${LAYOUT.fontFamily}" text-anchor="middle" dominant-baseline="middle" font-weight="500">Cmd/State</text>
`;
    lanePos += centerLaneSize + LAYOUT.laneGap;

    // Event lanes last
    for (const system of laneConfig.eventSystems) {
      const label = system || 'Events';
      svg += `
  <!-- Event lane: ${label} -->
  <rect x="${laneStart}" y="${lanePos}" width="${laneEnd - laneStart}" height="${LAYOUT.laneWidth}" fill="${COLORS.laneBg}" rx="4"/>
  <text x="${headerOffset}" y="${lanePos + LAYOUT.laneWidth / 2}" fill="${COLORS.event}" font-size="9" font-family="${LAYOUT.fontFamily}" text-anchor="middle" dominant-baseline="middle" font-weight="500">${escapeXml(label)}</text>
`;
      lanePos += LAYOUT.laneWidth + LAYOUT.laneGap;
    }
  } else {
    // Horizontal: Events (left) → Center → Actors (right)
    
    // Event lanes first
    for (const system of laneConfig.eventSystems) {
      const label = system || 'Events';
      svg += `
  <!-- Event lane: ${label} -->
  <rect x="${lanePos}" y="${laneStart}" width="${LAYOUT.laneWidth}" height="${laneEnd - laneStart}" fill="${COLORS.laneBg}" rx="4"/>
  <text x="${lanePos + LAYOUT.laneWidth / 2}" y="${headerOffset}" fill="${COLORS.event}" font-size="9" font-family="${LAYOUT.fontFamily}" text-anchor="middle" font-weight="500">${escapeXml(label)}</text>
`;
      lanePos += LAYOUT.laneWidth + LAYOUT.laneGap;
    }

    // Center lane
    svg += `
  <!-- Center lane: Commands & States -->
  <rect x="${lanePos}" y="${laneStart}" width="${centerLaneSize}" height="${laneEnd - laneStart}" fill="white" rx="4" stroke="${COLORS.line}" stroke-width="1"/>
  <text x="${lanePos + centerLaneSize / 2}" y="${headerOffset}" fill="${COLORS.laneLabel}" font-size="9" font-family="${LAYOUT.fontFamily}" text-anchor="middle" font-weight="500">Commands / States</text>
`;
    lanePos += centerLaneSize + LAYOUT.laneGap;

    // Actor lanes last
    for (const role of laneConfig.actorRoles) {
      const label = role || 'Actors';
      const colors = getActorColors(role);
      svg += `
  <!-- Actor lane: ${label} -->
  <rect x="${lanePos}" y="${laneStart}" width="${LAYOUT.laneWidth}" height="${laneEnd - laneStart}" fill="${COLORS.laneBg}" rx="4"/>
  <text x="${lanePos + LAYOUT.laneWidth / 2}" y="${headerOffset}" fill="${colors.fill}" font-size="9" font-family="${LAYOUT.fontFamily}" text-anchor="middle" font-weight="500">${escapeXml(label)}</text>
`;
      lanePos += LAYOUT.laneWidth + LAYOUT.laneGap;
    }
  }

  // Render elements by tick
  tickColumns.forEach((column, tickIndex) => {
    // Start with more offset to avoid overlap at beginning
    const tickPos = laneStart + LAYOUT.boxWidth / 2 + 10 + tickIndex * LAYOUT.tickGap;

    // Count center lane elements for offset calculation
    const centerElements = column.elements.filter(e => isCommand(e) || isState(e));
    let centerIndex = 0;

    for (const el of column.elements) {
      let laneP: number;
      let fill: string;
      let stroke: string;
      let textColor = COLORS.text;

      if (isEvent(el)) {
        const system = el.system || '';
        laneP = lanePositions[`event:${system}`];
        fill = COLORS.event;
        stroke = COLORS.eventStroke;
        
        const pos = getPos(laneP, tickPos);
        svg += `
  <!-- Event: ${el.name} @${el.tick} -->
  <rect x="${pos.x - LAYOUT.boxWidth / 2}" y="${pos.y}" width="${LAYOUT.boxWidth}" height="${LAYOUT.boxHeight}" rx="${LAYOUT.boxRadius}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
  <text x="${pos.x}" y="${pos.y + LAYOUT.boxHeight / 2}" fill="${textColor}" font-size="${LAYOUT.fontSize}" font-family="${LAYOUT.fontFamily}" text-anchor="middle" dominant-baseline="middle" font-weight="500">${escapeXml(truncateText(el.name))}</text>
`;
      } else if (isCommand(el)) {
        laneP = lanePositions['center'];
        fill = COLORS.command;
        stroke = COLORS.commandStroke;

        // Offset for multiple center elements at same tick
        const centerOffset = centerElements.length > 1 
          ? (centerIndex - (centerElements.length - 1) / 2) * (LAYOUT.boxHeight + 4)
          : 0;
        centerIndex++;

        const pos = getPos(laneP + centerOffset, tickPos);
        svg += `
  <!-- Command: ${el.name} @${el.tick} -->
  <rect x="${pos.x - LAYOUT.boxWidth / 2}" y="${pos.y}" width="${LAYOUT.boxWidth}" height="${LAYOUT.boxHeight}" rx="${LAYOUT.boxRadius}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
  <text x="${pos.x}" y="${pos.y + LAYOUT.boxHeight / 2}" fill="${textColor}" font-size="${LAYOUT.fontSize}" font-family="${LAYOUT.fontFamily}" text-anchor="middle" dominant-baseline="middle" font-weight="500">${escapeXml(truncateText(el.name))}</text>
`;
      } else if (isState(el)) {
        laneP = lanePositions['center'];
        fill = COLORS.state;
        stroke = COLORS.stateStroke;

        // Offset for multiple center elements at same tick
        const centerOffset = centerElements.length > 1 
          ? (centerIndex - (centerElements.length - 1) / 2) * (LAYOUT.boxHeight + 4)
          : 0;
        centerIndex++;

        const pos = getPos(laneP + centerOffset, tickPos);
        svg += `
  <!-- State: ${el.name} @${el.tick} -->
  <rect x="${pos.x - LAYOUT.boxWidth / 2}" y="${pos.y}" width="${LAYOUT.boxWidth}" height="${LAYOUT.boxHeight}" rx="${LAYOUT.boxRadius}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
  <text x="${pos.x}" y="${pos.y + LAYOUT.boxHeight / 2}" fill="${textColor}" font-size="${LAYOUT.fontSize}" font-family="${LAYOUT.fontFamily}" text-anchor="middle" dominant-baseline="middle" font-weight="500">${escapeXml(truncateText(el.name))}</text>
`;
      } else if (isActor(el)) {
        const role = el.role || '';
        laneP = lanePositions[`actor:${role}`];
        const colors = getActorColors(el.role);
        fill = colors.fill;
        stroke = colors.stroke;
        textColor = COLORS.textLight;

        const pos = getPos(laneP, tickPos);
        svg += `
  <!-- Actor: ${el.name} @${el.tick} -->
  <ellipse cx="${pos.x}" cy="${pos.y + LAYOUT.boxHeight / 2}" rx="${LAYOUT.boxWidth / 2 - 5}" ry="${LAYOUT.boxHeight / 2 - 2}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
  <text x="${pos.x}" y="${pos.y + LAYOUT.boxHeight / 2}" fill="${textColor}" font-size="${LAYOUT.fontSize}" font-family="${LAYOUT.fontFamily}" text-anchor="middle" dominant-baseline="middle" font-weight="500">${escapeXml(truncateText(el.name))}</text>
`;
      }
    }
  });

  // Tick labels
  svg += `\n  <!-- Tick labels -->`;
  tickColumns.forEach((column, tickIndex) => {
    const tickPos = laneStart + LAYOUT.boxWidth / 2 + 10 + tickIndex * LAYOUT.tickGap + LAYOUT.boxHeight / 2;
    if (orientation === 'vertical') {
      // Labels at top
      svg += `
  <text x="${tickPos}" y="${LAYOUT.padding - 5}" fill="${COLORS.laneLabel}" font-size="8" font-family="${LAYOUT.fontFamily}" text-anchor="middle">@${column.tick}</text>
`;
    } else {
      // Labels on left
      svg += `
  <text x="${LAYOUT.padding - 5}" y="${tickPos}" fill="${COLORS.laneLabel}" font-size="8" font-family="${LAYOUT.fontFamily}" text-anchor="end" dominant-baseline="middle">@${column.tick}</text>
`;
    }
  });

  // Legend at bottom
  const legendY = height - 15;
  const legendStartX = LAYOUT.padding;
  svg += `
  <!-- Legend -->
  <g class="legend" transform="translate(${legendStartX}, ${legendY})">
    <rect x="0" y="-8" width="40" height="14" rx="3" fill="${COLORS.event}" stroke="${COLORS.eventStroke}"/>
    <text x="20" y="0" fill="${COLORS.text}" font-size="7" font-family="${LAYOUT.fontFamily}" text-anchor="middle" dominant-baseline="middle">Event</text>
    
    <rect x="50" y="-8" width="50" height="14" rx="3" fill="${COLORS.command}" stroke="${COLORS.commandStroke}"/>
    <text x="75" y="0" fill="${COLORS.text}" font-size="7" font-family="${LAYOUT.fontFamily}" text-anchor="middle" dominant-baseline="middle">Command</text>
    
    <rect x="110" y="-8" width="40" height="14" rx="3" fill="${COLORS.state}" stroke="${COLORS.stateStroke}"/>
    <text x="130" y="0" fill="${COLORS.text}" font-size="7" font-family="${LAYOUT.fontFamily}" text-anchor="middle" dominant-baseline="middle">State</text>
    
    <ellipse cx="180" cy="0" rx="20" ry="7" fill="${COLORS.actor}" stroke="${COLORS.actorStroke}"/>
    <text x="180" y="0" fill="${COLORS.textLight}" font-size="7" font-family="${LAYOUT.fontFamily}" text-anchor="middle" dominant-baseline="middle">Actor</text>
  </g>
`;

  svg += `\n</svg>`;
  
  return svg;
}

/**
 * Download SVG file
 */
export function downloadSvg(model: GiraflowModel, orientation: SvgOrientation = 'horizontal'): void {
  const svg = generateSvg(model, orientation);
  
  const safeName = (model.name || 'giraflow')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

  const orientationSuffix = orientation === 'vertical' ? '-vertical' : '';
  
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeName}-event-model${orientationSuffix}.svg`;
  link.click();
  URL.revokeObjectURL(url);
}
