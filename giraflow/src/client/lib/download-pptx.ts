/**
 * PowerPoint Export for Giraflow Models
 * 
 * Generates a presentation with:
 * - Title slide
 * - Overview slide (slice sequence)
 * - One slide per slice (command flow)
 * - Summary slide (all events)
 * 
 * Supports horizontal (timeline left→right) and vertical (timeline top→bottom) layouts.
 */

import PptxGenJS from 'pptxgenjs';
import type { GiraflowModel, Actor, Command, Event } from './types';

// Giraflow colors
const COLORS = {
  event: 'ff9e64',
  state: '9ece6a',
  command: '7aa2f7',
  actor: '6b7280',
  actorAdmin: '9333ea',
  text: '1a1a1a',
  textLight: 'ffffff',
  textMuted: '888888',
  line: 'e8e8e8',
};

interface SliceData {
  actor: Actor | undefined;
  command: Command;
  events: Event[];
  stateName: string | undefined;
  stateExample: unknown;
}

export type PptxOrientation = 'horizontal' | 'vertical';

/**
 * Extract command slices from the model
 */
function extractCommandSlices(model: GiraflowModel): SliceData[] {
  const timeline = model.timeline;
  const slices: SliceData[] = [];
  const seenCommands = new Set<string>();

  const commands = timeline.filter((el): el is Command => el.type === 'command');

  for (const cmd of commands) {
    if (seenCommands.has(cmd.name)) continue;
    seenCommands.add(cmd.name);

    // Find actor that triggers this command
    let actor: Actor | undefined;
    for (let i = timeline.indexOf(cmd) - 1; i >= 0; i--) {
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
      (el) => el.type === 'state' && el.tick > eventTick
    );

    slices.push({
      actor,
      command: cmd,
      events,
      stateName: state?.name,
      stateExample: state?.type === 'state' ? (state as any).example : undefined,
    });
  }

  return slices;
}

/**
 * Convert example object to bullet point strings
 */
function exampleToBullets(example: unknown): string[] {
  if (!example) return [];

  if (Array.isArray(example)) {
    if (example.length === 0) return ['(empty list)'];
    const firstItem = example[0];
    if (typeof firstItem === 'object' && firstItem !== null) {
      return Object.entries(firstItem).map(([key, value]) => {
        const type = typeof value === 'boolean' ? 'boolean' : typeof value;
        return `• ${key}: ${type}`;
      });
    }
    return [`• items: ${typeof firstItem}`];
  }

  if (typeof example === 'object' && example !== null) {
    return Object.entries(example).map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        return `• ${key}: object`;
      }
      return `• ${key}: ${typeof value}`;
    });
  }

  return [];
}

/**
 * Add horizontal layout slice (flow left, data right)
 */
function addHorizontalSlice(
  pptx: PptxGenJS,
  slice: SliceData,
  sliceIndex: number,
  totalSlices: number
): void {
  const slide = pptx.addSlide();

  // Slide title
  slide.addText(`${sliceIndex + 1}. ${slice.command.name}`, {
    x: 0.3, y: 0.2, w: 7, h: 0.6,
    fontSize: 24, bold: true, color: COLORS.text,
  });

  // Slice indicator
  slide.addText(`Slice ${sliceIndex + 1} / ${totalSlices}`, {
    x: 7.5, y: 0.3, w: 2, h: 0.4,
    fontSize: 10, color: COLORS.textMuted, align: 'right',
  });

  // === LEFT: Flow Diagram (vertical lanes) ===
  const lanes = [
    { label: 'Actor', y: 1.1 },
    { label: 'Command', y: 2.1 },
    { label: 'Event', y: 3.1 },
    { label: 'Read Model', y: 4.1 },
  ];

  for (const lane of lanes) {
    slide.addText(lane.label, {
      x: 0.2, y: lane.y, w: 1, h: 0.5,
      fontSize: 9, color: COLORS.textMuted, valign: 'middle',
    });
  }

  // Horizontal lane lines
  for (let i = 0; i < 4; i++) {
    slide.addShape('line', {
      x: 0.2, y: 1.65 + i * 1, w: 5.3, h: 0,
      line: { color: COLORS.line, width: 0.5 },
    });
  }

  // Actor box
  const isAdmin = slice.actor?.role === 'Admin';
  slide.addShape('ellipse', {
    x: 1.4, y: 1, w: 1.4, h: 0.55,
    fill: { color: isAdmin ? COLORS.actorAdmin : COLORS.actor },
    line: { color: isAdmin ? '7c3aed' : '4b5563', width: 1 },
  });
  slide.addText(`👤 ${slice.actor?.name || 'User'}`, {
    x: 1.4, y: 1, w: 1.4, h: 0.55,
    fontSize: 10, bold: true, color: COLORS.textLight,
    align: 'center', valign: 'middle',
  });

  // Command box
  slide.addShape('roundRect', {
    x: 3.2, y: 1.95, w: 1.8, h: 0.6,
    fill: { color: COLORS.command },
    line: { color: '5a82d7', width: 1 },
  });
  slide.addText(slice.command.name, {
    x: 3.2, y: 1.95, w: 1.8, h: 0.6,
    fontSize: 10, bold: true, color: COLORS.text,
    align: 'center', valign: 'middle',
  });

  // Arrow: Actor → Command
  slide.addShape('line', {
    x: 2.8, y: 1.28, w: 0.4, h: 0.67,
    line: { color: COLORS.command, width: 2, endArrowType: 'triangle' },
  });

  // Event box
  const mainEvent = slice.events[0];
  if (mainEvent) {
    slide.addShape('roundRect', {
      x: 3.2, y: 2.95, w: 1.8, h: 0.6,
      fill: { color: COLORS.event },
      line: { color: 'df7e44', width: 1 },
    });
    slide.addText(mainEvent.name, {
      x: 3.2, y: 2.95, w: 1.8, h: 0.6,
      fontSize: 10, bold: true, color: COLORS.text,
      align: 'center', valign: 'middle',
    });

    // Arrow: Command → Event
    slide.addShape('line', {
      x: 4.1, y: 2.55, w: 0, h: 0.4,
      line: { color: COLORS.event, width: 2, endArrowType: 'triangle' },
    });
  }

  // State box
  if (slice.stateName) {
    slide.addShape('roundRect', {
      x: 3.2, y: 3.95, w: 1.8, h: 0.6,
      fill: { color: COLORS.state },
      line: { color: '7eb356', width: 1 },
    });
    slide.addText(slice.stateName, {
      x: 3.2, y: 3.95, w: 1.8, h: 0.6,
      fontSize: 10, bold: true, color: COLORS.text,
      align: 'center', valign: 'middle',
    });

    // Arrow: Event → State
    slide.addShape('line', {
      x: 4.1, y: 3.55, w: 0, h: 0.4,
      line: { color: COLORS.state, width: 2, endArrowType: 'triangle' },
    });
  }

  // Dashed read arrow (state back to actor)
  slide.addShape('line', {
    x: 2.1, y: 3.95, w: 0, h: -2.35,
    line: { color: COLORS.actor, width: 1, dashType: 'dash' },
  });

  // === RIGHT: Data Fields ===
  addDataFields(slide, slice, 5.8, 1.0);
}

/**
 * Add vertical layout slice (flow top, data bottom)
 */
function addVerticalSlice(
  pptx: PptxGenJS,
  slice: SliceData,
  sliceIndex: number,
  totalSlices: number
): void {
  const slide = pptx.addSlide();

  // Slide title
  slide.addText(`${sliceIndex + 1}. ${slice.command.name}`, {
    x: 0.3, y: 0.2, w: 7, h: 0.5,
    fontSize: 22, bold: true, color: COLORS.text,
  });

  // Slice indicator
  slide.addText(`Slice ${sliceIndex + 1} / ${totalSlices}`, {
    x: 7.5, y: 0.25, w: 2, h: 0.4,
    fontSize: 10, color: COLORS.textMuted, align: 'right',
  });

  // === TOP: Flow Diagram (horizontal lanes) ===
  const laneY = 0.75;
  const laneHeight = 1.6;
  const boxWidth = 1.6;
  const boxHeight = 0.5;
  
  // Lane positions (left to right)
  const lanePositions = [
    { label: 'Actor', x: 0.5 },
    { label: 'Command', x: 2.6 },
    { label: 'Event', x: 4.7 },
    { label: 'Read Model', x: 6.8 },
  ];

  // Lane labels
  for (const lane of lanePositions) {
    slide.addText(lane.label, {
      x: lane.x, y: laneY, w: boxWidth, h: 0.3,
      fontSize: 9, color: COLORS.textMuted, align: 'center',
    });
  }

  // Vertical lane lines
  for (let i = 1; i < 4; i++) {
    slide.addShape('line', {
      x: 0.5 + i * 2.1, y: laneY + 0.35, w: 0, h: laneHeight - 0.35,
      line: { color: COLORS.line, width: 0.5 },
    });
  }

  // Horizontal baseline
  slide.addShape('line', {
    x: 0.3, y: laneY + laneHeight, w: 9.2, h: 0,
    line: { color: COLORS.line, width: 0.5 },
  });

  // Actor box
  const isAdmin = slice.actor?.role === 'Admin';
  const actorX = 0.5;
  const flowY = laneY + 0.7;
  
  slide.addShape('ellipse', {
    x: actorX, y: flowY, w: boxWidth, h: boxHeight,
    fill: { color: isAdmin ? COLORS.actorAdmin : COLORS.actor },
    line: { color: isAdmin ? '7c3aed' : '4b5563', width: 1 },
  });
  slide.addText(`👤 ${slice.actor?.name || 'User'}`, {
    x: actorX, y: flowY, w: boxWidth, h: boxHeight,
    fontSize: 9, bold: true, color: COLORS.textLight,
    align: 'center', valign: 'middle',
  });

  // Command box
  const cmdX = 2.6;
  slide.addShape('roundRect', {
    x: cmdX, y: flowY, w: boxWidth, h: boxHeight,
    fill: { color: COLORS.command },
    line: { color: '5a82d7', width: 1 },
  });
  slide.addText(slice.command.name, {
    x: cmdX, y: flowY, w: boxWidth, h: boxHeight,
    fontSize: 9, bold: true, color: COLORS.text,
    align: 'center', valign: 'middle',
  });

  // Arrow: Actor → Command
  slide.addShape('line', {
    x: actorX + boxWidth, y: flowY + boxHeight / 2,
    w: cmdX - actorX - boxWidth, h: 0,
    line: { color: COLORS.command, width: 2, endArrowType: 'triangle' },
  });

  // Event box
  const mainEvent = slice.events[0];
  const evtX = 4.7;
  if (mainEvent) {
    slide.addShape('roundRect', {
      x: evtX, y: flowY, w: boxWidth, h: boxHeight,
      fill: { color: COLORS.event },
      line: { color: 'df7e44', width: 1 },
    });
    slide.addText(mainEvent.name, {
      x: evtX, y: flowY, w: boxWidth, h: boxHeight,
      fontSize: 9, bold: true, color: COLORS.text,
      align: 'center', valign: 'middle',
    });

    // Arrow: Command → Event
    slide.addShape('line', {
      x: cmdX + boxWidth, y: flowY + boxHeight / 2,
      w: evtX - cmdX - boxWidth, h: 0,
      line: { color: COLORS.event, width: 2, endArrowType: 'triangle' },
    });
  }

  // State box
  const stateX = 6.8;
  if (slice.stateName) {
    slide.addShape('roundRect', {
      x: stateX, y: flowY, w: boxWidth, h: boxHeight,
      fill: { color: COLORS.state },
      line: { color: '7eb356', width: 1 },
    });
    slide.addText(slice.stateName, {
      x: stateX, y: flowY, w: boxWidth, h: boxHeight,
      fontSize: 9, bold: true, color: COLORS.text,
      align: 'center', valign: 'middle',
    });

    // Arrow: Event → State
    if (mainEvent) {
      slide.addShape('line', {
        x: evtX + boxWidth, y: flowY + boxHeight / 2,
        w: stateX - evtX - boxWidth, h: 0,
        line: { color: COLORS.state, width: 2, endArrowType: 'triangle' },
      });
    }
  }

  // Dashed read arrow (state back to actor, curved path)
  const arrowY = flowY + boxHeight + 0.3;
  // Horizontal part under state
  slide.addShape('line', {
    x: stateX + boxWidth / 2, y: flowY + boxHeight,
    w: 0, h: 0.3,
    line: { color: COLORS.actor, width: 1, dashType: 'dash' },
  });
  // Long horizontal back
  slide.addShape('line', {
    x: actorX + boxWidth / 2, y: arrowY,
    w: stateX - actorX, h: 0,
    line: { color: COLORS.actor, width: 1, dashType: 'dash' },
  });
  // Up to actor
  slide.addShape('line', {
    x: actorX + boxWidth / 2, y: arrowY,
    w: 0, h: -(arrowY - flowY - boxHeight),
    line: { color: COLORS.actor, width: 1, dashType: 'dash', endArrowType: 'triangle' },
  });

  // === BOTTOM: Data Fields (3-column layout) ===
  const dataY = laneY + laneHeight + 0.25;
  const colWidth = 3.0;
  
  // Command fields (left column)
  addDataColumn(slide, slice.command.name, slice.command.example, COLORS.command, '5a82d7', 0.4, dataY, colWidth);

  // Event fields (middle column)
  if (mainEvent) {
    addDataColumn(slide, mainEvent.name, mainEvent.example, COLORS.event, 'df7e44', 3.5, dataY, colWidth);
  }

  // State fields (right column)
  if (slice.stateName && slice.stateExample) {
    addDataColumn(slide, slice.stateName, slice.stateExample, COLORS.state, '7eb356', 6.6, dataY, colWidth);
  }
}

/**
 * Add a data column for vertical layout
 */
function addDataColumn(
  slide: PptxGenJS.Slide,
  title: string,
  example: unknown,
  fillColor: string,
  lineColor: string,
  x: number,
  y: number,
  width: number
): void {
  // Header
  slide.addShape('roundRect', {
    x, y, w: width, h: 0.35,
    fill: { color: fillColor },
    line: { color: lineColor, width: 1 },
  });
  slide.addText(`${title}`, {
    x, y, w: width, h: 0.35,
    fontSize: 9, bold: true, color: COLORS.text,
    align: 'center', valign: 'middle',
  });

  // Fields
  const bullets = exampleToBullets(example);
  let fieldY = y + 0.4;
  
  if (bullets.length === 0) {
    slide.addText('(keine Felder)', {
      x: x + 0.1, y: fieldY, w: width - 0.2, h: 0.25,
      fontSize: 8, color: COLORS.textMuted, valign: 'middle', italic: true,
    });
  } else {
    for (const bullet of bullets.slice(0, 6)) {
      slide.addText(bullet, {
        x: x + 0.1, y: fieldY, w: width - 0.2, h: 0.25,
        fontSize: 8, color: '444444', valign: 'middle',
      });
      fieldY += 0.25;
    }
    if (bullets.length > 6) {
      slide.addText(`... +${bullets.length - 6} mehr`, {
        x: x + 0.1, y: fieldY, w: width - 0.2, h: 0.25,
        fontSize: 8, color: COLORS.textMuted, valign: 'middle', italic: true,
      });
    }
  }
}

/**
 * Add data fields panel for horizontal layout
 */
function addDataFields(
  slide: PptxGenJS.Slide,
  slice: SliceData,
  dataX: number,
  startY: number
): void {
  let dataY = startY;

  // Command fields
  slide.addShape('roundRect', {
    x: dataX, y: dataY, w: 3.8, h: 0.4,
    fill: { color: COLORS.command },
    line: { color: '5a82d7', width: 1 },
  });
  slide.addText(`${slice.command.name} – Felder`, {
    x: dataX, y: dataY, w: 3.8, h: 0.4,
    fontSize: 10, bold: true, color: COLORS.text,
    align: 'center', valign: 'middle',
  });
  dataY += 0.45;

  const cmdBullets = exampleToBullets(slice.command.example);
  if (cmdBullets.length === 0) {
    slide.addText('(keine Felder)', {
      x: dataX + 0.1, y: dataY, w: 3.6, h: 0.28,
      fontSize: 9, color: COLORS.textMuted, valign: 'middle', italic: true,
    });
    dataY += 0.28;
  } else {
    for (const bullet of cmdBullets) {
      slide.addText(bullet, {
        x: dataX + 0.1, y: dataY, w: 3.6, h: 0.28,
        fontSize: 9, color: '444444', valign: 'middle',
      });
      dataY += 0.28;
    }
  }
  dataY += 0.15;

  // Event fields
  const mainEvent = slice.events[0];
  if (mainEvent) {
    slide.addShape('roundRect', {
      x: dataX, y: dataY, w: 3.8, h: 0.4,
      fill: { color: COLORS.event },
      line: { color: 'df7e44', width: 1 },
    });
    slide.addText(`${mainEvent.name} – Felder`, {
      x: dataX, y: dataY, w: 3.8, h: 0.4,
      fontSize: 10, bold: true, color: COLORS.text,
      align: 'center', valign: 'middle',
    });
    dataY += 0.45;

    const evtBullets = exampleToBullets(mainEvent.example);
    if (evtBullets.length === 0) {
      slide.addText('(keine Felder)', {
        x: dataX + 0.1, y: dataY, w: 3.6, h: 0.28,
        fontSize: 9, color: COLORS.textMuted, valign: 'middle', italic: true,
      });
      dataY += 0.28;
    } else {
      for (const bullet of evtBullets) {
        slide.addText(bullet, {
          x: dataX + 0.1, y: dataY, w: 3.6, h: 0.28,
          fontSize: 9, color: '444444', valign: 'middle',
        });
        dataY += 0.28;
      }
    }
    dataY += 0.15;
  }

  // State fields
  if (slice.stateName && slice.stateExample) {
    slide.addShape('roundRect', {
      x: dataX, y: dataY, w: 3.8, h: 0.4,
      fill: { color: COLORS.state },
      line: { color: '7eb356', width: 1 },
    });
    slide.addText(`${slice.stateName} – Felder`, {
      x: dataX, y: dataY, w: 3.8, h: 0.4,
      fontSize: 10, bold: true, color: COLORS.text,
      align: 'center', valign: 'middle',
    });
    dataY += 0.45;

    const stateBullets = exampleToBullets(slice.stateExample);
    for (const bullet of stateBullets) {
      slide.addText(bullet, {
        x: dataX + 0.1, y: dataY, w: 3.6, h: 0.28,
        fontSize: 9, color: '444444', valign: 'middle',
      });
      dataY += 0.28;
    }
  }
}

/**
 * Generate and download PowerPoint presentation
 */
export async function downloadPptx(
  model: GiraflowModel,
  orientation: PptxOrientation = 'horizontal'
): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.title = model.name;
  pptx.author = 'Giraflow';
  pptx.subject = 'Event Model';

  const slices = extractCommandSlices(model);

  // ===== SLIDE 1: Title =====
  const titleSlide = pptx.addSlide();
  titleSlide.addText(model.name, {
    x: 0.5, y: 2, w: 9, h: 1.5,
    fontSize: 44, bold: true, color: COLORS.text,
    align: 'center',
  });
  titleSlide.addText('Event Model', {
    x: 0.5, y: 3.2, w: 9, h: 0.8,
    fontSize: 24, color: '666666',
    align: 'center',
  });
  if (model.version) {
    titleSlide.addText(`Version ${model.version}`, {
      x: 0.5, y: 4.5, w: 9, h: 0.5,
      fontSize: 14, color: '999999',
      align: 'center',
    });
  }
  // Orientation indicator
  titleSlide.addText(`Layout: ${orientation === 'horizontal' ? '→ Horizontal' : '↓ Vertikal'}`, {
    x: 0.5, y: 5, w: 9, h: 0.4,
    fontSize: 11, color: 'aaaaaa',
    align: 'center',
  });

  // ===== SLIDE 2: Overview =====
  const overviewSlide = pptx.addSlide();
  overviewSlide.addText('Übersicht: Slice-Reihenfolge', {
    x: 0.3, y: 0.2, w: 9, h: 0.6,
    fontSize: 24, bold: true, color: COLORS.text,
  });

  const timelineY = 1.2;
  const boxWidth = 1.6;
  const boxHeight = 0.5;
  const gap = 0.3;
  const startX = 0.4;

  // Draw slices as connected boxes (max 5 per row)
  for (let i = 0; i < slices.length; i++) {
    const row = Math.floor(i / 5);
    const col = i % 5;
    const x = startX + col * (boxWidth + gap);
    const y = timelineY + row * 0.9;

    overviewSlide.addText(`${i + 1}`, {
      x, y: y - 0.35, w: boxWidth, h: 0.3,
      fontSize: 10, color: COLORS.textMuted, align: 'center',
    });

    overviewSlide.addShape('roundRect', {
      x, y, w: boxWidth, h: boxHeight,
      fill: { color: COLORS.command },
      line: { color: '5a82d7', width: 1 },
    });
    overviewSlide.addText(slices[i].command.name, {
      x, y, w: boxWidth, h: boxHeight,
      fontSize: 9, bold: true, color: COLORS.text,
      align: 'center', valign: 'middle',
    });

    if (col < 4 && i < slices.length - 1) {
      overviewSlide.addShape('line', {
        x: x + boxWidth, y: y + boxHeight / 2,
        w: gap, h: 0,
        line: { color: '999999', width: 1.5, endArrowType: 'triangle' },
      });
    }
  }

  // Events section
  const allEvents = [...new Set(slices.flatMap(s => s.events.map(e => e.name)))];
  const eventsStartY = timelineY + Math.ceil(slices.length / 5) * 0.9 + 0.4;

  overviewSlide.addText('Events:', {
    x: 0.3, y: eventsStartY, w: 9, h: 0.4,
    fontSize: 14, bold: true, color: COLORS.text,
  });

  const eventBoxWidth = 1.5;
  const eventGap = 0.25;

  for (let i = 0; i < Math.min(allEvents.length, 6); i++) {
    const x = startX + i * (eventBoxWidth + eventGap);

    overviewSlide.addShape('roundRect', {
      x, y: eventsStartY + 0.5, w: eventBoxWidth, h: boxHeight,
      fill: { color: COLORS.event },
      line: { color: 'df7e44', width: 1 },
    });
    overviewSlide.addText(allEvents[i], {
      x, y: eventsStartY + 0.5, w: eventBoxWidth, h: boxHeight,
      fontSize: 8, bold: true, color: COLORS.text,
      align: 'center', valign: 'middle',
    });
  }

  if (allEvents.length > 6) {
    overviewSlide.addText(`... und ${allEvents.length - 6} weitere`, {
      x: startX + 6 * (eventBoxWidth + eventGap), y: eventsStartY + 0.5,
      w: 2, h: boxHeight,
      fontSize: 9, color: COLORS.textMuted, valign: 'middle',
    });
  }

  // Actors section
  const actorsStartY = eventsStartY + 1.3;
  const actors = [...new Set(slices.map(s => s.actor?.name).filter(Boolean))] as string[];

  overviewSlide.addText('Actors:', {
    x: 0.3, y: actorsStartY, w: 9, h: 0.4,
    fontSize: 14, bold: true, color: COLORS.text,
  });

  for (let i = 0; i < actors.length; i++) {
    const isAdmin = slices.find(s => s.actor?.name === actors[i])?.actor?.role === 'Admin';
    overviewSlide.addShape('ellipse', {
      x: 0.4 + i * 2, y: actorsStartY + 0.45, w: 1.6, h: 0.5,
      fill: { color: isAdmin ? COLORS.actorAdmin : COLORS.actor },
      line: { color: isAdmin ? '7c3aed' : '4b5563', width: 1 },
    });
    overviewSlide.addText(`👤 ${actors[i]}`, {
      x: 0.4 + i * 2, y: actorsStartY + 0.45, w: 1.6, h: 0.5,
      fontSize: 10, bold: true, color: COLORS.textLight,
      align: 'center', valign: 'middle',
    });
  }

  // ===== SLIDES 3+: One per Slice =====
  for (let sliceIndex = 0; sliceIndex < slices.length; sliceIndex++) {
    if (orientation === 'vertical') {
      addVerticalSlice(pptx, slices[sliceIndex], sliceIndex, slices.length);
    } else {
      addHorizontalSlice(pptx, slices[sliceIndex], sliceIndex, slices.length);
    }
  }

  // ===== LAST SLIDE: All Events Summary =====
  const summarySlide = pptx.addSlide();
  summarySlide.addText('Alle Events', {
    x: 0.5, y: 0.3, w: 9, h: 0.7,
    fontSize: 24, bold: true, color: COLORS.text,
  });

  for (let i = 0; i < allEvents.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);

    summarySlide.addShape('roundRect', {
      x: 0.5 + col * 3.2, y: 1.2 + row * 1, w: 2.8, h: 0.7,
      fill: { color: COLORS.event },
      line: { color: 'df7e44', width: 1 },
    });
    summarySlide.addText(allEvents[i], {
      x: 0.5 + col * 3.2, y: 1.2 + row * 1, w: 2.8, h: 0.7,
      fontSize: 11, bold: true, color: COLORS.text,
      align: 'center', valign: 'middle',
    });
  }

  // Generate filename with orientation suffix
  const safeName = (model.name || 'giraflow')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

  const orientationSuffix = orientation === 'vertical' ? '-vertical' : '';

  await pptx.writeFile({ fileName: `${safeName}${orientationSuffix}.pptx` });
}
