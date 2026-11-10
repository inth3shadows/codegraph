P2 — Shadowed module writes disable the unknown-eval guard. src/resolution/commonjs-export-members.ts:75 treats a local parameter’s assignment as a CommonJS root export:

exports.known = function known() {};
function pretend(module) { module.exports = {}; }
pretend({});
function yield(v) { return function ignored() {}; }
yield?.(eval)("ignored");

With caller const named=require('./m'); function run(){named.missing();} and unrelated export class Decoy { missing() {} }, actual CommonJS runtime exports only known; missing is undefined. Current graph incorrectly returns calls:["decoy.js:Decoy::missing"]. The reader records exportForm:"value", evalState:"unknown", bypassing the guard at name-matcher.ts:25403. Block-local and arrow-parameter shadowing reproduce.

Loading both saved pre-F12 source files in memory yields calls:[] for identical inputs, confirming this correction introduces the regression.

Evidence: /tmp/cg-a10-boundary.cjs, /tmp/cg-a10-boundary.log, /tmp/cg-a10-before-loader.cjs, /tmp/cg-a10-boundary-before-source.log, /tmp/cg-a10-shadow-runtime.log.

Original F12 object/instance reproducers independently clear: runtime returns 42, graph reaches m.js:Store::load. Original F10 and both F11 directions independently remain cleared.

Read-only preservation confirmed: all 15 source hashes match the checkpoint. No source/control edits, build, full suite, commits, or network writes.
