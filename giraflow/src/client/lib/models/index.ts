/**
 * View-specific data models
 *
 * Architecture:
 * Raw Model (JSON) → Builder Function → View-specific Data Model → View
 *
 * - Anemic models: Pure data structures (interfaces), no methods
 * - Builder functions: Transform raw data into view models
 * - Separation: Each view gets exactly the data it needs
 */

export * from './timeline-model';
export * from './table-model';
export * from './slice-model';
