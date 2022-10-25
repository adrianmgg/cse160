import { promiseResolveReject } from "./util.js";

// TODO check for indexedDB support

export function idbRequest2Promise<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.addEventListener('success', ev => {
            resolve(request.result);
        });
        request.addEventListener('error', ev => {
            reject(request.error);
        });
    });
}

// TODO implement upgrading
export function idbOpen(name: string, version: number, upgrade: (db: IDBDatabase, ev: IDBVersionChangeEvent) => void): Promise<IDBDatabase> {
    const request = window.indexedDB.open(name, version);
    const [promise, resolve, reject] = promiseResolveReject<IDBDatabase>();
    // request.addEventListener('blocked', ev => {}); // TODO
    request.addEventListener('upgradeneeded', (ev) => {
        upgrade((ev.target as IDBOpenDBRequest).result, ev);
    });
    request.addEventListener('error', ev => {
        reject(request.error); // TODO how to get the actual error info
    });
    request.addEventListener('success', ev => {
        resolve(request.result);
    });
    return promise;
}

