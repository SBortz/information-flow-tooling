import { jsPDF } from 'jspdf';
import type { GiraflowModel } from './types';
import { buildSliceViewModel } from './models/slice-model';

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
  fillColor: [number, number, number],
  strokeColor?: [number, number, number]
) {
  doc.setFillColor(...fillColor);
  if (strokeColor) {
    doc.setDrawColor(...strokeColor);
    doc.roundedRect(x, y, width, height, radius, radius, 'FD');
  } else {
    doc.roundedRect(x, y, width, height, radius, radius, 'F');
  }
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

      // Title
      doc.setFontSize(18);
      doc.setTextColor(...COLORS.text);
      doc.text(`Slice: ${slice.command}`, MARGIN, MARGIN + 5);

      // Subtitle with trigger info
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.textLight);
      const triggerInfo = slice.trigger 
        ? `Triggered by: ${slice.trigger.name} (${slice.trigger.role || 'User'})`
        : '';
      if (triggerInfo) {
        doc.text(triggerInfo, MARGIN, MARGIN + 12);
      }

      // Calculate positions for the flow
      const flowY = PAGE_HEIGHT / 2 - BOX_HEIGHT / 2;
      const startX = MARGIN + 20;
      const spacing = BOX_WIDTH + ARROW_LENGTH + 10;

      let currentX = startX;

      // Draw Actor (if exists)
      if (slice.trigger) {
        drawRoundedRect(doc, currentX, flowY, BOX_WIDTH, BOX_HEIGHT, 15, COLORS.actor);
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.white);
        doc.text('○ Actor', currentX + BOX_WIDTH / 2, flowY + 10, { align: 'center' });
        doc.setFontSize(9);
        const actorName = truncateText(doc, slice.trigger.name, BOX_WIDTH - 6);
        doc.text(actorName, currentX + BOX_WIDTH / 2, flowY + 18, { align: 'center' });
        if (slice.trigger.role) {
          doc.setFontSize(8);
          doc.text(`(${slice.trigger.role})`, currentX + BOX_WIDTH / 2, flowY + 25, { align: 'center' });
        }

        // Arrow
        drawArrow(doc, currentX + BOX_WIDTH + 2, flowY + BOX_HEIGHT / 2, currentX + spacing - 2, flowY + BOX_HEIGHT / 2);
        currentX += spacing;
      }

      // Draw Command
      if (slice.commandElement) {
        drawRoundedRect(doc, currentX, flowY, BOX_WIDTH, BOX_HEIGHT, 3, COLORS.command);
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.white);
        doc.text('▶ Command', currentX + BOX_WIDTH / 2, flowY + 10, { align: 'center' });
        doc.setFontSize(9);
        const cmdName = truncateText(doc, slice.command, BOX_WIDTH - 6);
        doc.text(cmdName, currentX + BOX_WIDTH / 2, flowY + 18, { align: 'center' });

        // Arrow
        drawArrow(doc, currentX + BOX_WIDTH + 2, flowY + BOX_HEIGHT / 2, currentX + spacing - 2, flowY + BOX_HEIGHT / 2);
        currentX += spacing;
      }

      // Draw Events
      const events = slice.events || [];
      if (events.length > 0) {
        const eventBoxWidth = events.length > 1 ? BOX_WIDTH * 0.8 : BOX_WIDTH;
        events.forEach((event, i) => {
          const eventX = currentX + (i * (eventBoxWidth + 5));
          drawRoundedRect(doc, eventX, flowY, eventBoxWidth, BOX_HEIGHT, 3, COLORS.event);
          doc.setFontSize(10);
          doc.setTextColor(...COLORS.white);
          doc.text('● Event', eventX + eventBoxWidth / 2, flowY + 10, { align: 'center' });
          doc.setFontSize(9);
          const eventName = truncateText(doc, event.name, eventBoxWidth - 6);
          doc.text(eventName, eventX + eventBoxWidth / 2, flowY + 18, { align: 'center' });
        });

        currentX += (events.length * (BOX_WIDTH * 0.8 + 5)) + ARROW_LENGTH;
        // Arrow to state
        drawArrow(doc, currentX - ARROW_LENGTH - 5, flowY + BOX_HEIGHT / 2, currentX - 2, flowY + BOX_HEIGHT / 2);
      }

      // Draw State (read model)
      if (slice.stateElement) {
        drawRoundedRect(doc, currentX, flowY, BOX_WIDTH, BOX_HEIGHT, 3, COLORS.state);
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.white);
        doc.text('◆ State', currentX + BOX_WIDTH / 2, flowY + 10, { align: 'center' });
        doc.setFontSize(9);
        const stateName = truncateText(doc, slice.stateElement.name, BOX_WIDTH - 6);
        doc.text(stateName, currentX + BOX_WIDTH / 2, flowY + 18, { align: 'center' });
      }

      // Draw example data below the flow
      const exampleY = flowY + BOX_HEIGHT + 20;
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.text);
      doc.text('Example Data:', MARGIN, exampleY);

      let exampleX = MARGIN;
      const exampleBoxWidth = 65;
      const exampleBoxHeight = 40;

      // Command example
      if (slice.commandElement?.example) {
        doc.setFillColor(...COLORS.command);
        doc.setDrawColor(...COLORS.border);
        doc.roundedRect(exampleX, exampleY + 5, exampleBoxWidth, exampleBoxHeight, 2, 2, 'FD');
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.white);
        doc.text('Command:', exampleX + 3, exampleY + 12);
        const cmdLines = formatExample(slice.commandElement.example);
        cmdLines.forEach((line, i) => {
          doc.text(truncateText(doc, line, exampleBoxWidth - 6), exampleX + 3, exampleY + 19 + (i * 5));
        });
        exampleX += exampleBoxWidth + 5;
      }

      // Event examples
      events.forEach((event) => {
        if (event.example) {
          doc.setFillColor(...COLORS.event);
          doc.setDrawColor(...COLORS.border);
          doc.roundedRect(exampleX, exampleY + 5, exampleBoxWidth, exampleBoxHeight, 2, 2, 'FD');
          doc.setFontSize(8);
          doc.setTextColor(...COLORS.white);
          doc.text(truncateText(doc, event.name + ':', exampleBoxWidth - 6), exampleX + 3, exampleY + 12);
          const eventLines = formatExample(event.example);
          eventLines.forEach((line, i) => {
            doc.text(truncateText(doc, line, exampleBoxWidth - 6), exampleX + 3, exampleY + 19 + (i * 5));
          });
          exampleX += exampleBoxWidth + 5;
        }
      });

      // Page number
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.textLight);
      doc.text(`${index + 1} / ${slices.length}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - MARGIN, { align: 'right' });
    });
  }

  // Save
  const safeName = (model.name || 'giraflow').toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
  doc.save(`${safeName}-slices.pdf`);
}
