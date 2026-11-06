// Known gap: variance annotations on type parameters (TS 4.7), tree-sitter-typescript#370.
export interface Producer<out T> { get(): T; }
export interface Consumer<in T> { set(v: T): void; }
export interface State<in out T> { get(): T; set(v: T): void; }
export type Fn<in A, out R> = (a: A) => R;
export class Cell<in out T> { constructor(public value: T) {} }
export abstract class Source<out T> { abstract read(): T; }
