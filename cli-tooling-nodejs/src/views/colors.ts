import chalk from 'chalk';

/**
 * Color theme for consistent styling across all views
 */
export const colors = {
  // Element types
  event: chalk.hex('#FF8C00'),      // Orange
  state: chalk.green,               // Green
  command: chalk.blue,              // Blue
  actor: chalk.white,               // White
  
  // UI elements
  dim: chalk.dim,
  bold: chalk.bold,
  cyan: chalk.cyan,
  yellow: chalk.yellow,
  red: chalk.red,
  green: chalk.green,
  grey: chalk.grey,
  white: chalk.white,
  
  // Combined styles
  eventBold: chalk.hex('#FF8C00').bold,
  stateBold: chalk.green.bold,
  commandBold: chalk.blue.bold,
  actorBold: chalk.white.bold,
  
  // Symbols
  symbols: {
    event: '●',
    state: '◆',
    command: '▶',
    actor: '○',
    timelineLine: '│',
    timelineEnd: '↓',
    arrow: '→',
    arrowLeft: '←',
    bullet: '•',
  }
};

/**
 * Format element name with appropriate color based on type
 */
export function formatElement(type: string, name: string, bold = false): string {
  switch (type) {
    case 'event':
      return bold ? colors.eventBold(name) : colors.event(name);
    case 'state':
      return bold ? colors.stateBold(name) : colors.state(name);
    case 'command':
      return bold ? colors.commandBold(name) : colors.command(name);
    case 'actor':
      return bold ? colors.actorBold(name) : colors.actor(name);
    default:
      return name;
  }
}

/**
 * Get symbol and color for element type
 */
export function getElementStyle(type: string): { symbol: string; color: typeof chalk } {
  switch (type) {
    case 'event':
      return { symbol: colors.symbols.event, color: colors.event };
    case 'state':
      return { symbol: colors.symbols.state, color: colors.state };
    case 'command':
      return { symbol: colors.symbols.command, color: colors.command };
    case 'actor':
      return { symbol: colors.symbols.actor, color: colors.actor };
    default:
      return { symbol: '?', color: colors.white };
  }
}

/**
 * Create a horizontal rule
 */
export function rule(text?: string, style: 'full' | 'left' | 'center' = 'center'): string {
  const width = process.stdout.columns || 80;
  const lineChar = '─';
  
  if (!text) {
    return colors.dim(lineChar.repeat(width));
  }
  
  const textLength = text.replace(/\x1b\[[0-9;]*m/g, '').length; // Strip ANSI codes for length
  const padding = 2;
  const totalPadding = textLength + padding * 2;
  
  if (style === 'left') {
    const rightPart = width - totalPadding - 2;
    return colors.dim(lineChar.repeat(2)) + ` ${text} ` + colors.dim(lineChar.repeat(Math.max(0, rightPart)));
  }
  
  const sideLength = Math.floor((width - totalPadding) / 2);
  return colors.dim(lineChar.repeat(sideLength)) + ` ${text} ` + colors.dim(lineChar.repeat(sideLength));
}

/**
 * Create a box around text
 */
export function box(content: string, options?: { borderColor?: typeof chalk; padding?: number }): string {
  const { borderColor = colors.grey, padding = 1 } = options || {};
  const lines = content.split('\n');
  const maxLength = Math.max(...lines.map(l => l.replace(/\x1b\[[0-9;]*m/g, '').length));
  const width = maxLength + padding * 2;
  
  const top = borderColor('╭' + '─'.repeat(width) + '╮');
  const bottom = borderColor('╰' + '─'.repeat(width) + '╯');
  
  const paddedLines = lines.map(line => {
    const visibleLength = line.replace(/\x1b\[[0-9;]*m/g, '').length;
    const rightPad = maxLength - visibleLength;
    return borderColor('│') + ' '.repeat(padding) + line + ' '.repeat(rightPad + padding) + borderColor('│');
  });
  
  return [top, ...paddedLines, bottom].join('\n');
}
