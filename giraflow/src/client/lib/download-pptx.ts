/**
 * PowerPoint Export for Giraflow Models
 * 
 * Generates a presentation with:
 * - Title slide
 * - Overview slide (slice sequence)
 * - One slide per slice (command flow)
 * - Summary slide (all events)
 */

import PptxGenJS from 'pptxgenjs';
import type { GiraflowModel, Actor, Command, Event } from './types';
import { buildSliceViewModel, type Slice } from './models/slice-model';

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
    // Show first item's structure
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
 * Generate and download PowerPoint presentation
 */
export async function downloadPptx(model: GiraflowModel): Promise<void> {
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

  // ===== SLIDE 2: Overview =====
  const overviewSlide = pptx.addSlide();
  overviewSlide.addText('Übersicht: Slice-Reihenfolge', {
    x: 0.3, y: 0.2, w: 9, h: 0.6,
    fontSize: 24, bold: true, color: COLORS.text,
  });

  // Timeline visualization
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

    // Slice number
    overviewSlide.addText(`${i + 1}`, {
      x, y: y - 0.35, w: boxWidth, h: 0.3,
      fontSize: 10, color: COLORS.textMuted, align: 'center',
    });

    // Command box
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

    // Arrow to next (except last in row or last overall)
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
    const slice = slices[sliceIndex];
    const slide = pptx.addSlide();

    // Slide title
    slide.addText(`${sliceIndex + 1}. ${slice.command.name}`, {
      x: 0.3, y: 0.2, w: 7, h: 0.6,
      fontSize: 24, bold: true, color: COLORS.text,
    });

    // Slice indicator
    slide.addText(`Slice ${sliceIndex + 1} / ${slices.length}`, {
      x: 7.5, y: 0.3, w: 2, h: 0.4,
      fontSize: 10, color: COLORS.textMuted, align: 'right',
    });

    // === LEFT: Flow Diagram ===
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

    // Horizontal lines
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

    // Dashed read arrow
    slide.addShape('line', {
      x: 2.1, y: 3.95, w: 0, h: -2.35,
      line: { color: COLORS.actor, width: 1, dashType: 'dash' },
    });

    // === RIGHT: Data Fields ===
    const dataX = 5.8;
    let dataY = 1.0;

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

  // Generate filename
  const safeName = (model.name || 'giraflow')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

  // Download
  await pptx.writeFile({ fileName: `${safeName}.pptx` });
}
