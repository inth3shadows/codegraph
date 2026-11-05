// Known gap: import attributes on re-exports.
export { default as data } from "./data.json" with { type: "json" };
export * from "./more.json" with { type: "json" };
