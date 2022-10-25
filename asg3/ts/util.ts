
export function assert(condition: boolean, message?: string): asserts condition {
    if(!condition) {
        let errMsg = 'assertion failed';
        if(message !== null) errMsg += ` - ${message}`;
        throw new Error(errMsg);
    }
}

// TODO give this a better name
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
