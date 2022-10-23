
// source: https://easings.net/#easeInOutCubic
/** @param {number} x @returns {number} */
function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
// https://easings.net/#easeInOutSine
/** @param {number} x @returns {number} */
function easeInOutSine(x) {
    return -(Math.cos(Math.PI * x) - 1) / 2;
}

/** @param {number} n @param {number} period @returns {number} */
function sawtooth(n, period) {
    return 2 * Math.abs((n / period) - Math.floor(n / period + 1 / 2));
}

/** @param {number} t @param {number} a @param {number} b @returns {number} */
function lerp(t, a, b) {
    // TODO clamp?
    return a * t + b * (1 - t);
}

