/** Source-owned selectors are distinct from storage bindings and runtime values. */
export interface CommonJsDeclaration {
  name?: string;
  line: number;
  column: number;
  kind: 'class' | 'function' | 'method' | 'value';
}

interface Reference { reference?: CommonJsDeclaration; referenceIdentity?: string }
export type CommonJsValue = Reference & (
  { kind: 'data'; value: string | number | boolean | null | undefined; known: boolean } |
  { kind: 'identity'; id: string } | { kind: 'unknown'; reason: string } |
  { kind: 'absent' } | { kind: 'union'; values: CommonJsValue[] } |
  { kind: 'forward'; source: string; path: string[] }
);
export type CommonJsIntent = 'reference' | 'callable' | 'constructible';
export type CommonJsCapability = { status: 'positive'; selector?: CommonJsDeclaration; identity?: string } |
  { status: 'unknown' | 'absent' | 'non-callable'; reason?: string };
export interface CommonJsValueResult {
  reference: CommonJsCapability;
  callable: CommonJsCapability;
  constructible: CommonJsCapability;
  complete: boolean;
}
interface OwnedObject {
  kind: 'object' | 'function' | 'class' | 'module';
  selector?: CommonJsDeclaration;
  constructible: boolean;
  properties: Map<string, CommonJsValue>;
  prototype?: CommonJsValue;
  closed: boolean;
  source?: string;
}

/** The arena contains no ASTs, compiler symbols, or executable code. */
export class CommonJsValueGraph {
  readonly bindings = new Map<string, { value: CommonJsValue; reference?: CommonJsDeclaration }>();
  readonly objects = new Map<string, OwnedObject>();

  data(value: Extract<CommonJsValue, { kind: 'data' }>['value'], known = true): CommonJsValue { return { kind: 'data', value, known }; }
  unknown(reason: string): CommonJsValue { return { kind: 'unknown', reason }; }
  absent(): CommonJsValue { return { kind: 'absent' }; }
  allocate(kind: OwnedObject['kind'], id: string, selector?: CommonJsDeclaration, constructible = false, source?: string): CommonJsValue {
    if (!this.objects.has(id)) this.objects.set(id, { kind, selector, constructible, source, properties: new Map(), closed: true });
    return { kind: 'identity', id, reference: selector };
  }
  bind(binding: string, value: CommonJsValue, reference?: CommonJsDeclaration): void { this.bindings.set(binding, { value, reference }); }
  get(binding: string): CommonJsValue {
    const cell = this.bindings.get(binding);
    return !cell ? this.unknown('uninitialized binding') : cell.reference ?
      { ...cell.value, reference: cell.reference, referenceIdentity: binding } : cell.value;
  }
  write(owner: CommonJsValue, name: string, value: CommonJsValue): void {
    if (owner.kind === 'union') {
      for (const alternative of owner.values) if (alternative.kind === 'identity') {
        this.objects.get(alternative.id)!.properties.set(name, this.union([this.read(alternative, name), value]));
      }
    } else if (owner.kind === 'identity') this.objects.get(owner.id)!.properties.set(name, value);
  }
  setPrototype(owner: CommonJsValue, prototype: CommonJsValue): void {
    if (owner.kind === 'identity') this.objects.get(owner.id)!.prototype = prototype;
  }
  read(owner: CommonJsValue, name: string, seen = new Set<string>()): CommonJsValue {
    if (owner.kind === 'union') return this.union(owner.values.map(value => this.read(value, name, new Set(seen))));
    if (owner.kind === 'forward') return { ...owner, path: [...owner.path, name] };
    if (owner.kind === 'unknown' || owner.kind === 'absent') return owner;
    if (owner.kind === 'data') return owner.value == null ? this.absent() : this.unknown('boxed primitive member');
    if (seen.has(owner.id) || seen.size >= 16) return this.unknown('prototype cycle/depth');
    seen.add(owner.id);
    const object = this.objects.get(owner.id)!;
    if (object.properties.has(name)) return object.properties.get(name)!;
    if (object.source) return { kind: 'forward', source: object.source, path: [name] };
    if (!object.closed) return this.unknown('incomplete properties');
    return object.prototype ? this.read(object.prototype, name, seen) : this.absent();
  }
  invalidate(owner: CommonJsValue, reason: string): void {
    if (owner.kind === 'union') { for (const value of owner.values) this.invalidate(value, reason); return; }
    if (owner.kind !== 'identity') return;
    const object = this.objects.get(owner.id)!;
    object.closed = false;
    for (const name of object.properties.keys()) object.properties.set(name, this.unknown(reason));
  }
  escape(value: CommonJsValue, reason: string, seen = new Set<string>()): void {
    if (value.kind === 'union') { for (const alternative of value.values) this.escape(alternative, reason, seen); return; }
    if (value.kind !== 'identity' || seen.has(value.id)) return;
    seen.add(value.id);
    const object = this.objects.get(value.id)!;
    for (const child of object.properties.values()) this.escape(child, reason, seen);
    if (object.prototype) this.escape(object.prototype, reason, seen);
    this.invalidate(value, reason);
  }
  private key(value: CommonJsValue): string {
    return value.kind === 'identity' ? `identity:${value.id}` : value.kind === 'data' ? `data:${value.known}:${typeof value.value}:${String(value.value)}` :
      value.kind === 'forward' ? `forward:${value.source}:${value.path.join('.')}` : value.kind;
  }
  union(values: CommonJsValue[]): CommonJsValue {
    values = values.flatMap(value => value.kind === 'union' ? value.values : [value]);
    if (values.some(value => value.kind === 'unknown')) return this.unknown('unknown alternative');
    const unique = new Map<string, CommonJsValue>();
    for (const value of values) {
      const key = this.key(value), prior = unique.get(key);
      unique.set(key, prior && prior.referenceIdentity !== value.referenceIdentity ? { ...value, reference: undefined, referenceIdentity: undefined } : value);
    }
    return unique.size === 1 ? [...unique.values()][0]! : { kind: 'union', values: [...unique.values()] };
  }
  answer(value: CommonJsValue): CommonJsValueResult {
    const status = (status: 'unknown' | 'absent' | 'non-callable', reason?: string): CommonJsCapability => ({ status, ...(reason ? { reason } : {}) });
    if (value.kind === 'unknown' || value.kind === 'absent' || value.kind === 'forward') {
      const state = value.kind === 'absent' ? 'absent' : 'unknown';
      const reason = value.kind === 'unknown' ? value.reason : value.kind === 'forward' ? 'forwarded value' : undefined;
      return { reference: value.reference ? { status: 'positive', selector: value.reference, identity: value.referenceIdentity } : status(state, reason),
        callable: status(state, reason), constructible: status(state, reason), complete: state === 'absent' };
    }
    if (value.kind === 'union') {
      const answers = value.values.map(alternative => this.answer(alternative));
      const agree = (intent: CommonJsIntent): CommonJsCapability => {
        const first = answers[0]?.[intent];
        return first && answers.every(answer => JSON.stringify(answer[intent]) === JSON.stringify(first)) ? first : status('unknown', 'conflicting alternatives');
      };
      return { reference: agree('reference'), callable: agree('callable'), constructible: agree('constructible'), complete: answers.every(answer => answer.complete) };
    }
    const object = value.kind === 'identity' ? this.objects.get(value.id)! : undefined;
    const positive = (): CommonJsCapability => ({ status: 'positive', selector: object!.selector, identity: (value as Extract<CommonJsValue, { kind: 'identity' }>).id });
    return {
      reference: { status: 'positive', selector: value.reference, identity: value.referenceIdentity ?? (value.kind === 'identity' ? value.id : undefined) },
      callable: object?.kind === 'function' ? object.selector ? positive() : status('unknown', 'unindexed callable') : status('non-callable'),
      constructible: (object?.kind === 'class' || (object?.kind === 'function' && object.constructible)) && object.selector ? positive() : status('non-callable'),
      complete: object ? object.closed : true,
    };
  }
  fork(): CommonJsValueGraph {
    const clone = new CommonJsValueGraph();
    for (const [key, cell] of this.bindings) clone.bindings.set(key, cell);
    for (const [id, object] of this.objects) clone.objects.set(id, { ...object, properties: new Map(object.properties) });
    return clone;
  }
  static join(left: CommonJsValueGraph, right: CommonJsValueGraph): CommonJsValueGraph {
    const result = left.fork();
    for (const key of new Set([...left.bindings.keys(), ...right.bindings.keys()])) {
      const a = left.bindings.get(key), b = right.bindings.get(key);
      result.bind(key, result.union([a?.value ?? result.unknown('missing binding'), b?.value ?? result.unknown('missing binding')]),
        JSON.stringify(a?.reference) === JSON.stringify(b?.reference) ? a?.reference : undefined);
    }
    for (const id of new Set([...left.objects.keys(), ...right.objects.keys()])) {
      const a = left.objects.get(id), b = right.objects.get(id);
      if (!a || !b) { const object = (a ?? b)!; result.objects.set(id, { ...object, properties: new Map(object.properties) }); continue; }
      const properties = new Map<string, CommonJsValue>();
      for (const name of new Set([...a.properties.keys(), ...b.properties.keys()])) properties.set(name, result.union([
        a.properties.get(name) ?? (a.closed ? result.absent() : result.unknown('incomplete branch')),
        b.properties.get(name) ?? (b.closed ? result.absent() : result.unknown('incomplete branch')),
      ]));
      result.objects.set(id, { ...a, properties, closed: a.closed && b.closed,
        prototype: a.prototype || b.prototype ? result.union([a.prototype ?? result.absent(), b.prototype ?? result.absent()]) : undefined });
    }
    return result;
  }
}
