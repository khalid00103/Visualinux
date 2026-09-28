// The shared Filesystem Simulation Engine (Architecture §3, §6-7). This is what
// makes the frontend's optimistic client-side simulation and the backend's
// authoritative execution the *same* engine, not two implementations that could
// drift apart — exactly the principle the Architecture Document names as the
// reason the hybrid execution model (Component Hierarchy §3, Milestone 4) is safe.

export * from "./tree.js";
export * from "./parser.js";
export * from "./types.js";
export * from "./interpreter.js";
export * from "./ids.js";
export * from "./handlers/index.js";

export const SIMULATION_ENGINE_PACKAGE_VERSION = "0.1.0";
