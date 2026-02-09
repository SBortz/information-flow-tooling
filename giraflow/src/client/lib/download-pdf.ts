import { jsPDF } from 'jspdf';
import type { GiraflowModel, Actor, Event } from './types';
import { buildSliceViewModel, type Slice } from './models/slice-model';

// ============================================================================
// Color Palette (matching Giraflow's design)
// ============================================================================

const COLORS = {
  actor: { bg: '#9ca3af', text: '#ffffff' },      // Gray
  command: { bg: '#7aa2f7', text: '#ffffff' },    // Blue
  event: { bg: '#ff9e64', text: '#ffffff' },      // Orange
  state: { bg: '#9ece6a', text: '#ffffff' },      // Green
  arrow: '#6b7280',
  title: '#1f2937',
  subtitle: '#6b7280',
  border: '#e5e7eb',
  background: '#f9fafb',
};

// ============================================================================
// Types
// ============================================================================

interface SliceWithActors {
  slice: Slice;
  actors: Actor[];
  events: Event[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Draw a rounded rectangle
 */
function drawRoundedRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  style: 'S' | 'F' | 'FD' = 'FD'
) {
  doc.roundedRect(x, y, w, h, r, r, style);
}

/**
 * Draw a box with label
 */
function drawBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  sublabel: string,
  bgColor: string,
  textColor: string
) {
  // Background
  doc.setFillColor(bgColor);
  doc.setDrawColor(bgColor);
  drawRoundedRect(doc, x, y, w, h, 3, 'F');

  // Type label (small, at top)
  doc.setFontSize(8);
  doc.setTextColor(textColor);
  doc.text(label, x + w / 2, y + 10, { align: 'center' });

  // Name (larger, below)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(sublabel, x + w / 2, y + h / 2 + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
}

/**
 * Draw an arrow between two points
 */
function drawArrow(
  doc: jsPDF,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  doc.setDrawColor(COLORS.arrow);
  doc.setLineWidth(0.8);
  doc.line(x1, y1, x2, y2);

  // Arrowhead
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const arrowLen = 5;
  doc.line(
    x2,
    y2,
    x2 - arrowLen * Math.cos(angle - Math.PI / 6),
    y2 - arrowLen * Math.sin(angle - Math.PI / 6)
  );
  doc.line(
    x2,
    y2,
    x2 - arrowLen * Math.cos(angle + Math.PI / 6),
    y2 - arrowLen * Math.sin(angle + Math.PI / 6)
  );
}

// ============================================================================
// Main PDF Generation
// ============================================================================

/**
 * Build slice data with associated actors and events
 */
function buildSlicesWithContext(model: GiraflowModel): SliceWithActors[] {
  const viewModel = buildSliceViewModel(model);
  const events = model.timeline.filter((el): el is Event => el.type === 'event');

  return viewModel.slices
    .filter(slice => slice.type === 'command')
    .map(slice => {
      // Find actors that trigger this command
      const actors = viewModel.actors.filter(a => a.sendsCommand === slice.name);
      
      // Find events produced by this command
      const sliceEvents = events.filter(e => 
        e.producedBy && e.producedBy.startsWith(`${slice.name}-`)
      );

      return { slice, actors, events: sliceEvents };
    });
}

/**
 * Render a single slice page
 */
function renderSlicePage(
  doc: jsPDF,
  sliceData: SliceWithActors,
  pageWidth: number,
  pageHeight: number
) {
  const margin = 20;
  const boxWidth = 80;
  const boxHeight = 40;
  const arrowLength = 25;

  // Title section
  doc.setFillColor(COLORS.background);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Slice name as title
  doc.setFontSize(18);
  doc.setTextColor(COLORS.title);
  doc.setFont('helvetica', 'bold');
  doc.text(`Slice: "${sliceData.slice.name}"`, margin, 25);
  doc.setFont('helvetica', 'normal');

  // Subtitle with tick info
  doc.setFontSize(10);
  doc.setTextColor(COLORS.subtitle);
  const ticksText = sliceData.slice.ticks.length > 1
    ? `Appears at ticks: ${sliceData.slice.ticks.join(', ')}`
    : `Tick: ${sliceData.slice.ticks[0]}`;
  doc.text(ticksText, margin, 38);

  // Separator line
  doc.setDrawColor(COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(margin, 50, pageWidth - margin, 50);

  // === Flow Diagram ===
  const flowY = 85;
  const centerX = pageWidth / 2;
  
  // Calculate total flow width
  const hasActor = sliceData.actors.length > 0;
  const hasEvent = sliceData.events.length > 0 || sliceData.slice.produces.length > 0;

  let elements = 1; // Command always present
  if (hasActor) elements++;
  if (hasEvent) elements += 2; // Event + State

  const totalWidth = elements * boxWidth + (elements - 1) * arrowLength;
  let currentX = centerX - totalWidth / 2;

  // Draw Actor box (if exists)
  if (hasActor) {
    const actorName = sliceData.actors[0]?.name || 'Actor';
    drawBox(
      doc,
      currentX,
      flowY,
      boxWidth,
      boxHeight,
      'Actor',
      actorName,
      COLORS.actor.bg,
      COLORS.actor.text
    );
    
    // Arrow to command
    currentX += boxWidth;
    drawArrow(doc, currentX, flowY + boxHeight / 2, currentX + arrowLength, flowY + boxHeight / 2);
    currentX += arrowLength;
  }

  // Draw Command box
  drawBox(
    doc,
    currentX,
    flowY,
    boxWidth,
    boxHeight,
    'Command',
    sliceData.slice.name,
    COLORS.command.bg,
    COLORS.command.text
  );

  // Arrow to event
  if (hasEvent) {
    currentX += boxWidth;
    drawArrow(doc, currentX, flowY + boxHeight / 2, currentX + arrowLength, flowY + boxHeight / 2);
    currentX += arrowLength;

    // Draw Event box
    const eventName = sliceData.events[0]?.name || sliceData.slice.produces[0]?.name || 'Event';
    drawBox(
      doc,
      currentX,
      flowY,
      boxWidth,
      boxHeight,
      'Event',
      eventName,
      COLORS.event.bg,
      COLORS.event.text
    );

    // Arrow to state
    currentX += boxWidth;
    drawArrow(doc, currentX, flowY + boxHeight / 2, currentX + arrowLength, flowY + boxHeight / 2);
    currentX += arrowLength;

    // State box (derived from event name)
    const stateName = eventName.replace(/Created|Updated|Deleted|Changed|Added|Removed$/i, '') || eventName;
    drawBox(
      doc,
      currentX,
      flowY,
      boxWidth,
      boxHeight,
      'State',
      stateName,
      COLORS.state.bg,
      COLORS.state.text
    );
  }

  // === Examples Section ===
  const examplesY = flowY + boxHeight + 40;
  doc.setDrawColor(COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(margin, examplesY - 10, pageWidth - margin, examplesY - 10);

  doc.setFontSize(12);
  doc.setTextColor(COLORS.title);
  doc.setFont('helvetica', 'bold');
  doc.text('Examples', margin, examplesY);
  doc.setFont('helvetica', 'normal');

  let exampleY = examplesY + 15;

  // Command example
  if (sliceData.slice.example) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.command.bg);
    doc.setFont('helvetica', 'bold');
    doc.text('Command:', margin, exampleY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.subtitle);
    
    const exampleLines = doc.splitTextToSize(
      JSON.stringify(sliceData.slice.example, null, 2),
      pageWidth - margin * 2 - 20
    );
    doc.setFontSize(9);
    doc.text(exampleLines.slice(0, 8), margin + 20, exampleY + 10);
    exampleY += 10 + Math.min(exampleLines.length, 8) * 5 + 10;
  }

  // Event example
  if (sliceData.events.length > 0 && sliceData.events[0].example) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.event.bg);
    doc.setFont('helvetica', 'bold');
    doc.text('Event:', margin, exampleY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.subtitle);
    
    const exampleLines = doc.splitTextToSize(
      JSON.stringify(sliceData.events[0].example, null, 2),
      pageWidth - margin * 2 - 20
    );
    doc.setFontSize(9);
    doc.text(exampleLines.slice(0, 8), margin + 20, exampleY + 10);
    exampleY += 10 + Math.min(exampleLines.length, 8) * 5 + 10;
  }

  // === Wireframes Section (if available) ===
  const wireframes = sliceData.actors.flatMap(a => a.wireframes || []);
  if (wireframes.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.subtitle);
    doc.setFont('helvetica', 'italic');
    doc.text(`Wireframes: ${wireframes.join(', ')}`, margin, Math.min(exampleY + 10, pageHeight - margin));
    doc.setFont('helvetica', 'normal');
  }

  // Footer with page metadata
  doc.setFontSize(8);
  doc.setTextColor(COLORS.subtitle);
  doc.text(
    `Generated from Giraflow`,
    pageWidth - margin,
    pageHeight - 10,
    { align: 'right' }
  );
}

/**
 * Generate and download a PDF with one slice per page
 */
export async function downloadSlicesPdf(model: GiraflowModel): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const slicesWithContext = buildSlicesWithContext(model);

  if (slicesWithContext.length === 0) {
    // No command slices found - create a single info page
    doc.setFontSize(16);
    doc.setTextColor(COLORS.title);
    doc.text('No command slices found in this Giraflow model.', 20, 30);
    doc.setFontSize(12);
    doc.setTextColor(COLORS.subtitle);
    doc.text('Add commands to your timeline to generate slice pages.', 20, 45);
  } else {
    // Render each slice on its own page
    slicesWithContext.forEach((sliceData, index) => {
      if (index > 0) {
        doc.addPage();
      }
      renderSlicePage(doc, sliceData, pageWidth, pageHeight);
    });
  }

  // Generate filename from model name
  const safeName = (model.name || 'giraflow').toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

  // Download
  doc.save(`${safeName}-slices.pdf`);
}
