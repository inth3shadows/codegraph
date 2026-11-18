// Was a gap until fork v0.25.0: `await using` declaration in a for-await-of head (TS 5.2).
declare const asyncHandles: AsyncIterable<AsyncDisposable>;
export async function drain() { for await (await using h of asyncHandles) { void h; } }
