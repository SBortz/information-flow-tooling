/**
 * Shared types for Information Flow models
 *
 * These types are used by both server and client.
 */
// Type guards
export function isEvent(el) {
    return el.type === 'event';
}
export function isState(el) {
    return el.type === 'state';
}
export function isStateView(el) {
    return el.type === 'state';
}
export function isCommand(el) {
    return el.type === 'command';
}
export function isActor(el) {
    return el.type === 'actor';
}
