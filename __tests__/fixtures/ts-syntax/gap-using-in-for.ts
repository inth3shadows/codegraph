// Known gap: `using` / `await using` declarations in for-of heads (TS 5.2).
declare const handles: Disposable[];
declare const asyncHandles: AsyncIterable<AsyncDisposable>;
for (using h of handles) { void h; }
export async function drain() { for await (await using h of asyncHandles) { void h; } }
