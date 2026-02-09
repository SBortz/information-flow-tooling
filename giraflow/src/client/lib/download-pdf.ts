import { jsPDF } from 'jspdf';
import type { GiraflowModel } from './types';
import { buildSliceViewModel, type Slice } from './models/slice-model';

// Colors matching Giraflow theme (RGB)
const COLORS = {
  event: [255, 158, 100] as [number, number, number],
  state: [158, 206, 106] as [number, number, number],
  command: [122, 162, 247] as [number, number, number],
  actor: [107, 114, 128] as [number, number, number],
  text: [26, 29, 38] as [number, number, number],
  textLight: [107, 114, 128] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  border: [226, 229, 234] as [number, number, number],
};

const PAGE_WIDTH = 297; // A4 landscape width in mm
const PAGE_HEIGHT = 210; // A4 landscape height in mm
const MARGIN = 15;
const BOX_WIDTH = 55;
const BOX_HEIGHT = 35;
const ARROW_LENGTH = 15;

/**
 * Draw a rounded rectangle
 */
function drawRoundedRect(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillColor: [number, number, number]
) {
  doc.setFillColor(...fillColor);
  doc.roundedRect(x, y, width, height, radius, radius, 'F');
}

/**
 * Draw an arrow
 */
function drawArrow(doc: jsPDF, fromX: number, fromY: number, toX: number, toY: number) {
  doc.setDrawColor(...COLORS.textLight);
  doc.setLineWidth(0.5);
  doc.line(fromX, fromY, toX, toY);
  
  // Arrowhead
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const headLength = 3;
  doc.line(
    toX,
    toY,
    toX - headLength * Math.cos(angle - Math.PI / 6),
    toY - headLength * Math.sin(angle - Math.PI / 6)
  );
  doc.line(
    toX,
    toY,
    toX - headLength * Math.cos(angle + Math.PI / 6),
    toY - headLength * Math.sin(angle + Math.PI / 6)
  );
}

/**
 * Truncate text to fit width
 */
function truncateText(doc: jsPDF, text: string, maxWidth: number): string {
  if (!text) return '';
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && doc.getTextWidth(truncated + '...') > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

/**
 * Format example object for display
 */
function formatExample(example: unknown): string[] {
  if (!example || typeof example !== 'object') return [];
  const lines: string[] = [];
  const entries = Object.entries(example as Record<string, unknown>).slice(0, 4);
  for (const [key, value] of entries) {
    let valueStr: string;
    if (value === null || value === undefined) valueStr = 'null';
    else if (typeof value === 'string') valueStr = value.length > 25 ? value.slice(0, 22) + '...' : value;
    else if (typeof value === 'number' || typeof value === 'boolean') valueStr = String(value);
    else if (Array.isArray(value)) valueStr = `[${value.length}]`;
    else valueStr = '{...}';
    lines.push(`${key}: ${valueStr}`);
  }
  return lines;
}

/**
 * Draw a slice page
 */
function drawSlicePage(
  doc: jsPDF,
  slice: Slice,
  actors: { name: string; role?: string }[],
  pageIndex: number,
  totalPages: number
) {
  const isCommand = slice.type === 'command';
  
  // Title
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.text);
  const typeLabel = isCommand ? 'Command' : 'State';
  doc.text(`${typeLabel}: ${slice.name}`, MARGIN, MARGIN + 5);

  // Subtitle - show related actors
  const relatedActors = actors.filter(a => a.name);
  if (relatedActors.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.textLight);
    const actorNames = relatedActors.map(a => a.role ? `${a.name} (${a.role})` : a.name).join(', ');
    doc.text(`Actors: ${actorNames}`, MARGIN, MARGIN + 12);
  }

  // Calculate positions for the flow
  const flowY = PAGE_HEIGHT / 2 - BOX_HEIGHT / 2;
  const startX = MARGIN + 20;
  const spacing = BOX_WIDTH + ARROW_LENGTH + 10;

  let currentX = startX;

  if (isCommand) {
    // Command flow: Actor → Command → Events → State
    
    // Draw Actor box (if we have actors)
    if (relatedActors.length > 0) {
      drawRoundedRect(doc, currentX, flowY, BOX_WIDTH, BOX_HEIGHT, 15, COLORS.actor);
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.white);
      doc.text('○ Actor', currentX + BOX_WIDTH / 2, flowY + 12, { align: 'center' });
      doc.setFontSize(9);
      const actorName = truncateText(doc, relatedActors[0].name, BOX_WIDTH - 6);
      doc.text(actorName, currentX + BOX_WIDTH / 2, flowY + 22, { align: 'center' });
      
      drawArrow(doc, currentX + BOX_WIDTH + 2, flowY + BOX_HEIGHT / 2, currentX + spacing - 2, flowY + BOX_HEIGHT / 2);
      currentX += spacing;
    }

    // Draw Command box
    drawRoundedRect(doc, currentX, flowY, BOX_WIDTH, BOX_HEIGHT, 3, COLORS.command);
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.white);
    doc.text('▶ Command', currentX + BOX_WIDTH / 2, flowY + 12, { align: 'center' });
    doc.setFontSize(9);
    const cmdName = truncateText(doc, slice.name, BOX_WIDTH - 6);
    doc.text(cmdName, currentX + BOX_WIDTH / 2, flowY + 22, { align: 'center' });

    // Draw produced events
    const producedEvents = slice.produces || [];
    if (producedEvents.length > 0) {
      drawArrow(doc, currentX + BOX_WIDTH + 2, flowY + BOX_HEIGHT / 2, currentX + spacing - 2, flowY + BOX_HEIGHT / 2);
      currentX += spacing;

      producedEvents.slice(0, 3).forEach((eventRef, i) => {
        const eventX = currentX + (i * (BOX_WIDTH * 0.7 + 5));
        drawRoundedRect(doc, eventX, flowY, BOX_WIDTH * 0.7, BOX_HEIGHT, 3, COLORS.event);
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.white);
        doc.text('● Event', eventX + (BOX_WIDTH * 0.7) / 2, flowY + 12, { align: 'center' });
        doc.setFontSize(8);
        const eventName = truncateText(doc, eventRef.name, BOX_WIDTH * 0.7 - 6);
        doc.text(eventName, eventX + (BOX_WIDTH * 0.7) / 2, flowY + 22, { align: 'center' });
      });
    }

  } else {
    // State flow: Events → State
    
    // Draw source events
    const sourceEvents = slice.sourcedFrom || [];
    if (sourceEvents.length > 0) {
      sourceEvents.slice(0, 3).forEach((eventRef, i) => {
        const eventX = currentX + (i * (BOX_WIDTH * 0.7 + 5));
        drawRoundedRect(doc, eventX, flowY, BOX_WIDTH * 0.7, BOX_HEIGHT, 3, COLORS.event);
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.white);
        doc.text('● Event', eventX + (BOX_WIDTH * 0.7) / 2, flowY + 12, { align: 'center' });
        doc.setFontSize(8);
        const eventName = truncateText(doc, eventRef.name, BOX_WIDTH * 0.7 - 6);
        doc.text(eventName, eventX + (BOX_WIDTH * 0.7) / 2, flowY + 22, { align: 'center' });
      });
      currentX += sourceEvents.slice(0, 3).length * (BOX_WIDTH * 0.7 + 5) + ARROW_LENGTH;
      drawArrow(doc, currentX - ARROW_LENGTH - 5, flowY + BOX_HEIGHT / 2, currentX - 2, flowY + BOX_HEIGHT / 2);
    }

    // Draw State box
    drawRoundedRect(doc, currentX, flowY, BOX_WIDTH, BOX_HEIGHT, 3, COLORS.state);
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.white);
    doc.text('◆ State', currentX + BOX_WIDTH / 2, flowY + 12, { align: 'center' });
    doc.setFontSize(9);
    const stateName = truncateText(doc, slice.name, BOX_WIDTH - 6);
    doc.text(stateName, currentX + BOX_WIDTH / 2, flowY + 22, { align: 'center' });

    // Draw reading actors
    if (relatedActors.length > 0) {
      drawArrow(doc, currentX + BOX_WIDTH + 2, flowY + BOX_HEIGHT / 2, currentX + spacing - 2, flowY + BOX_HEIGHT / 2);
      currentX += spacing;

      drawRoundedRect(doc, currentX, flowY, BOX_WIDTH, BOX_HEIGHT, 15, COLORS.actor);
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.white);
      doc.text('○ Actor', currentX + BOX_WIDTH / 2, flowY + 12, { align: 'center' });
      doc.setFontSize(9);
      const actorName = truncateText(doc, relatedActors[0].name, BOX_WIDTH - 6);
      doc.text(actorName, currentX + BOX_WIDTH / 2, flowY + 22, { align: 'center' });
    }
  }

  // Draw example data below the flow
  const exampleY = flowY + BOX_HEIGHT + 25;
  
  if (slice.example) {
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.text);
    doc.text('Example:', MARGIN, exampleY);

    const exampleBoxWidth = 120;
    const exampleBoxHeight = 50;
    const color = isCommand ? COLORS.command : COLORS.state;
    
    doc.setFillColor(...color);
    doc.roundedRect(MARGIN, exampleY + 5, exampleBoxWidth, exampleBoxHeight, 2, 2, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.white);
    const exampleLines = formatExample(slice.example);
    exampleLines.forEach((line, i) => {
      doc.text(truncateText(doc, line, exampleBoxWidth - 10), MARGIN + 5, exampleY + 15 + (i * 6));
    });
  }

  // Page number
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.textLight);
  doc.text(`${pageIndex + 1} / ${totalPages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - MARGIN, { align: 'right' });
  
  // Ticks info
  if (slice.ticks && slice.ticks.length > 0) {
    doc.text(`Ticks: @${slice.ticks.join(', @')}`, MARGIN, PAGE_HEIGHT - MARGIN);
  }
}

/**
 * Export Giraflow model to PDF - one slice per page
 */
export function downloadSlicesPdf(model: GiraflowModel): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const sliceViewModel = buildSliceViewModel(model);
  const slices = sliceViewModel.slices;
  const actors = sliceViewModel.actors;

  if (slices.length === 0) {
    // No slices - create a title page only
    doc.setFontSize(24);
    doc.setTextColor(...COLORS.text);
    doc.text(model.name || 'Giraflow Model', PAGE_WIDTH / 2, PAGE_HEIGHT / 2, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.textLight);
    doc.text('No slices defined', PAGE_WIDTH / 2, PAGE_HEIGHT / 2 + 10, { align: 'center' });
  } else {
    slices.forEach((slice, index) => {
      if (index > 0) {
        doc.addPage();
      }

      // Find actors related to this slice
      const relatedActors = actors.filter(a => {
        if (slice.type === 'command') {
          return a.sendsCommand === slice.name;
        } else {
          return a.readsView === slice.name;
        }
      }).map(a => ({ name: a.name, role: a.role }));

      // Remove duplicates
      const uniqueActors = relatedActors.filter((actor, idx, arr) => 
        arr.findIndex(a => a.name === actor.name) === idx
      );

      drawSlicePage(doc, slice, uniqueActors, index, slices.length);
    });
  }

  // Save
  const safeName = (model.name || 'giraflow').toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
  doc.save(`${safeName}-slices.pdf`);
}
