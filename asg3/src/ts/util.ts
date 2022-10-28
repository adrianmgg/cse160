
export function assert(condition: boolean, message?: string): asserts condition {
    if(!condition) {
        debugger;
        let errMsg = 'assertion failed';
        if(message !== null) errMsg += ` - ${message}`;
        throw new Error(errMsg);
    }
}

/**
 * similar to {@link assert}, but not enabled in production
 * (TODO: need to actually implement that lol)
 */
export function debugAssert(condition: boolean, message?: string): asserts condition {
    // TODO have debug toggle
    if(!condition) {
        let errMsg = 'assertion failed';
        if(message !== null) errMsg += ` - ${message}`;
        console.error(errMsg);
        debugger;
    }
}

// TODO give this a better name
// TODO wait couldn't i just put the code that's using this in the func of a promise constructor instead?
export function promiseResolveReject<T>(): [Promise<T>, (value: T | PromiseLike<T>) => void,  (reason?: any) => void] {
    let resolve: null | ((value: T | PromiseLike<T>) => void) = null;
    let reject: null | ((reason?: any) => void) = null;
    const promise = new Promise<T>((resolve_, reject_) => {
        resolve = resolve_;
        reject = reject_;
    });
    assert(resolve !== null);
    assert(reject !== null);
    return [promise, resolve, reject];
}

// source: https://stackoverflow.com/a/52490977/8762161
export type NTupleOf<T, N extends number, R extends unknown[] = []> = R['length'] extends N ? R : NTupleOf<T, N, [T, ...R]>;

export class Dict2D<
    TKeyOuter extends keyof any,
    TKeyInner extends keyof any,
    // essentially just Exclude<any, undefined>, which doesn't actually work, so instead i'm using a
    // a union of all the primitive types *except* undefined
    TValue extends object | string | number | boolean | bigint | symbol | null,
> implements Iterable<readonly [TValue, readonly [TKeyOuter, TKeyInner]]> {
    private readonly data: {[K1 in TKeyOuter]?: {[K2 in TKeyInner]?: TValue}} = {};

    public get(a: TKeyOuter, b: TKeyInner): TValue | undefined {
        return this.data[a]?.[b];
    }

    private getOrCreateRow(a: TKeyOuter): {[K in TKeyInner]?: TValue} {
        return this.data[a] ?? (this.data[a] = {});
    }

    public set(a: TKeyOuter, b: TKeyInner, v: TValue): void {
        this.getOrCreateRow(a)[b] = v;
    }

    public del(a: TKeyOuter, b: TKeyInner): void {
        const row = this.data[a];
        if(row === undefined) return;
        delete row[b];
        // TODO delete column if it's empty?
    }

    public has(a: TKeyOuter, b: TKeyInner): boolean {
        const row = this.data[a];
        if(row === undefined) return false;
        else return b in row;
    }

    *[Symbol.iterator](): Generator<readonly [TValue, readonly [TKeyOuter, TKeyInner]], void, unknown> {
        for(const k1 in this.data) {
            const row: {[K in TKeyInner]?: TValue} | undefined = this.data[k1 as TKeyOuter];
            if(row === undefined) continue;
            for(const k2 in row) {
                const v: TValue | undefined = row[k2 as TKeyInner];
                if(v === undefined) continue;
                yield [v, [k1 as TKeyOuter, k2 as TKeyInner]] as const;
            }
        }
    }
}

let warnCount: number = 0;
const MAX_WARNINGS: number = 128;
// TODO give this a better name
const SUBSEQUENT_SILENCEDWARN_CHUNK_SIZE: number = 1000;
// TODO give this a better name. it's an lifetime max, "rate limit" implies a per-time max (or could
//      make it be a per-time max, that might be better tbh)
// TODO maybe make this take a unique identifier for the warning type rather than being a global limit
//      (maybe use symbols?)
export function warnRateLimited(...data: any[]) {
    if(warnCount < MAX_WARNINGS) {
        console.warn(...data);
    } else if(warnCount === MAX_WARNINGS) {
        console.warn(`${warnCount} warnings reached, subsequent warnings will not be displayed!`);
    } else if((warnCount - MAX_WARNINGS) % SUBSEQUENT_SILENCEDWARN_CHUNK_SIZE === 0) {
        console.warn(`silenced ${SUBSEQUENT_SILENCEDWARN_CHUNK_SIZE} more warnings`);
    }
    warnCount += 1;
}

export function setFind<T>(set: Set<T>, predicate: (v: T) => boolean): T | undefined {
    for(const x of set) {
        if(predicate(x)) return x;
    }
    return undefined;
}
