declare module '#q-app/wrappers' {
    // Minimal shim for boot wrapper used in Quasar/renderer boot files
    // Keep types permissive (any) to avoid strict coupling here.
    export type BootContext = any;
    export type BootHandler = (ctx: BootContext) => any;

    export function defineBoot(handler: BootHandler): any;
    export default defineBoot;
}
