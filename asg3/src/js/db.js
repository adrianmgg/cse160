import { promiseResolveReject } from "./util.js";
// TODO check for indexedDB support
export function idbRequest2Promise(request) {
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
export function idbOpen(name, version, upgrade) {
    const request = window.indexedDB.open(name, version);
    const [promise, resolve, reject] = promiseResolveReject();
    // request.addEventListener('blocked', ev => {}); // TODO
    request.addEventListener('upgradeneeded', (ev) => {
        upgrade(ev.target.result, ev);
    });
    request.addEventListener('error', ev => {
        reject(request.error); // TODO how to get the actual error info
    });
    request.addEventListener('success', ev => {
        resolve(request.result);
    });
    return promise;
}
//# sourceMappingURL=db.js.map