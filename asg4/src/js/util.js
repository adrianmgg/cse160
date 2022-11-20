export function assert(condition, message) {
    if (!condition) {
        debugger;
        let errMsg = 'assertion failed';
        if (message !== null)
            errMsg += ` - ${message}`;
        throw new Error(errMsg);
    }
}
/**
 * similar to {@link assert}, but not enabled in production
 * (TODO: need to actually implement that lol)
 */
export function debugAssert(condition, message) {
    // TODO have debug toggle
    if (!condition) {
        let errMsg = 'assertion failed';
        if (message !== null)
            errMsg += ` - ${message}`;
        console.error(errMsg);
        debugger;
    }
}
// TODO give this a better name
// TODO wait couldn't i just put the code that's using this in the func of a promise constructor instead?
export function promiseResolveReject() {
    let resolve = null;
    let reject = null;
    const promise = new Promise((resolve_, reject_) => {
        resolve = resolve_;
        reject = reject_;
    });
    assert(resolve !== null);
    assert(reject !== null);
    return [promise, resolve, reject];
}
export class Dict2D {
    constructor() {
        this.data = {};
        this.size = 0;
    }
    get(a, b) {
        var _a;
        return (_a = this.data[a]) === null || _a === void 0 ? void 0 : _a[b];
    }
    getRow(a) {
        return this.data[a];
    }
    getOrCreateRow(a) {
        var _a;
        return (_a = this.data[a]) !== null && _a !== void 0 ? _a : (this.data[a] = {});
    }
    set(a, b, v) {
        if (!this.has(a, b))
            this.size++;
        this.getOrCreateRow(a)[b] = v;
    }
    del(a, b) {
        if (this.has(a, b))
            this.size--;
        const row = this.data[a];
        if (row === undefined)
            return;
        delete row[b];
        // TODO delete column if it's empty?
    }
    has(a, b) {
        const row = this.getRow(a);
        if (row === undefined)
            return false;
        else
            return b in row;
    }
    *[Symbol.iterator]() {
        for (const k1 in this.data) {
            const row = this.data[k1];
            if (row === undefined)
                continue;
            for (const k2 in row) {
                const v = row[k2];
                if (v === undefined)
                    continue;
                yield [v, [k1, k2]];
            }
        }
    }
}
let warnCount = 0;
const MAX_WARNINGS = 128;
// TODO give this a better name
const SUBSEQUENT_SILENCEDWARN_CHUNK_SIZE = 1000;
// TODO give this a better name. it's an lifetime max, "rate limit" implies a per-time max (or could
//      make it be a per-time max, that might be better tbh)
// TODO maybe make this take a unique identifier for the warning type rather than being a global limit
//      (maybe use symbols?)
export function warnRateLimited(...data) {
    if (warnCount < MAX_WARNINGS) {
        console.warn(...data);
    }
    else if (warnCount === MAX_WARNINGS) {
        console.warn(`${warnCount} warnings reached, subsequent warnings will not be displayed!`);
    }
    else if ((warnCount - MAX_WARNINGS) % SUBSEQUENT_SILENCEDWARN_CHUNK_SIZE === 0) {
        console.warn(`silenced ${SUBSEQUENT_SILENCEDWARN_CHUNK_SIZE} more warnings`);
    }
    warnCount += 1;
}
export function setFind(set, predicate) {
    for (const x of set) {
        if (predicate(x))
            return x;
    }
    return undefined;
}
export function setMap(set, func) {
    const newSet = new Set;
    for (const el of set)
        newSet.add(func(el, set));
    return newSet;
}
export function isPow2(n) {
    // TODO probably better to do this a bit fiddly way instead?
    return Math.log2(n) % 1 === 0;
}
export function lerp(a, b, t) {
    // return a * t + b * (1 - t);
    return (1 - t) * a + t * b;
}
//# sourceMappingURL=util.js.map