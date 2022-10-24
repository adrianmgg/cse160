// @ts-check

/** @typedef {import('./types').EasingFunction} EasingFunction */

// source: https://easings.net/#easeInOutCubic
/** @type {EasingFunction} */
function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
// source: https://easings.net/#easeInOutSine
/** @type {EasingFunction} */
function easeInOutSine(x) {
    return -(Math.cos(Math.PI * x) - 1) / 2;
}
// source: https://easings.net/#easeOutQuint
/** @type {EasingFunction} */
function easeOutQuint(x) {
    return 1 - Math.pow(1 - x, 5);
}
// source: https://easings.net/#easeOutBounce
/** @type {EasingFunction} */
function easeOutBounce(x) {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    else if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
    else if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
    else return n1 * (x -= 2.625 / d1) * x + 0.984375;
}
// source: https://easings.net/#easeInBounce
/** @type {EasingFunction} */
function easeInBounce(x) {
    return 1 - easeOutBounce(1 - x);
}
// source: https://easings.net/#easeOutCubic
/** @type {EasingFunction} */
function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
}
// https://easings.net/#easeInBack
/** @type {EasingFunction} */
function easeInBack(x) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * x * x * x - c1 * x * x;
}
// https://easings.net/#easeOutBack
/** @type {EasingFunction} */
function easeOutBack(x) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}



/** @param {number} t @param {number} a @param {number} b @returns {number} */
function lerp(t, a, b) {
    // TODO clamp?
    return a * t + b * (1 - t);
}

function easeLinear(x) {
    return x;
}

/**
 * 
 * @param {number} t input value
 * @param {number} period period of the wave
 * @param {number} peakT where along the wave ([0, 1]) the switch from going up to going down is placed
 */
function generalizedTriangleWave(t, period, peakT) {
    const t_scaled = (t % period) / period;
    if(t_scaled < peakT) return (1 / peakT) * t_scaled;
    else return (-1/(1-peakT)) * (t_scaled - 1);
}

// TODO give this a better name - not actually an animator by the definition of the animator interface, since it just calculates the value rather than going setting it somewhere, so
class ValueAnimator {
    /**
     * @param {import('./types').AnimatorOptions} options
     */
    constructor(options) {
        /** @type {EasingFunction} */
        this.easeUp = options.easeUp !== undefined ? options.easeUp : options.ease !== undefined ? options.ease : easeLinear;
        /** @type {EasingFunction} */
        this.easeBack = options.easeBack !== undefined ? options.easeBack : options.ease !== undefined ? options.ease : easeLinear;
        /** @type {number} */
        this.period = options.period !== undefined ? options.period : 1.0;
        /** @type {number} */
        this.offset = options.offset !== undefined ? options.offset : 0.0;
        /** @type {number} */
        this.peakAt = options.peakAt !== undefined ? options.peakAt : 0.5;
        /** @type {number} */
        this.min = options.min !== undefined ? options.min : 0.0;
        /** @type {number} */
        this.max = options.max !== undefined ? options.max : 1.0;
    }

    /** @param {number} t @returns {number} */
    getval(t) {
        t = t + this.offset;
        const t_scaled = (t % this.period) / this.period;
        const v = (t_scaled < this.peakAt) ? this.easeUp((1 / this.peakAt) * t_scaled) : this.easeBack((-1/(1-this.peakAt)) * (t_scaled - 1));
        return lerp(v, this.min, this.max);
        // if(t_scaled < this.peakAt) return (1 / this.peakAt) * t_scaled;
        // else return (-1/(1-this.peakAt)) * (t_scaled - 1);
        // return lerp(this.easeIn(generalizedTriangleWave(t + this.offset, this.period, this.peakAt)), this.min, this.max);
    }
}

/** @typedef {import('./types').AnimatorOptions} AnimatorOptions */
/** @typedef {import('./types').TransformAnimatorOptions} TransformAnimatorOptions */
/** @typedef {import('./types').Animator} Animator */

/**
 * @template {string} K
 * @template {import('./types').HasKeyOfType<K, T>} T
 * @implements {Animator}
 */
class TransformAnimator {
    /**
     * @param {T[K] extends Mat4x4 ? T : Mat4x4 extends T[K] ? T : never} target
     * @param {K} prop
     * @param {TransformAnimatorOptions} options
     */
    constructor(target, prop, options) {
        /** @type {T} */
        this.target = target;
        /** @type {K} */
        this.prop = prop;
        // /** @type {TransformAnimatorOptions} */
        // this.options = options;
        this._a_posX = TransformAnimator.thing(options.posX, 0);
        this._a_posY = TransformAnimator.thing(options.posY, 0);
        this._a_posZ = TransformAnimator.thing(options.posZ, 0);
        this._a_rotX = TransformAnimator.thing(options.rotX, 0);
        this._a_rotY = TransformAnimator.thing(options.rotY, 0);
        this._a_rotZ = TransformAnimator.thing(options.rotZ, 0);
        this._a_sclX = TransformAnimator.thing(options.sclX, 1);
        this._a_sclY = TransformAnimator.thing(options.sclY, 1);
        this._a_sclZ = TransformAnimator.thing(options.sclZ, 1);
    }

    /** @private @param {AnimatorOptions | number | undefined} o @param {number} def */
    static thing(o, def) {
        if(o === undefined) return (t) => def;
        else if(typeof o === 'number') return (t) => o;
        else {
            const animator = new ValueAnimator(o);
            return (t) => animator.getval(t);
        }
    }

    /** @param {number} t */
    exec(t) {
        // @ts-ignore
        this.target[this.prop] = Mat4x4.locRotScale(this._a_posX(t), this._a_posY(t), this._a_posZ(t), this._a_rotX(t), this._a_rotY(t), this._a_rotZ(t), this._a_sclX(t), this._a_sclY(t), this._a_sclZ(t));
    }
}

/**
 * @implements {Animator}
 */
class AnimatorGroup {
    /** @param {Animator[]} animators */
    constructor(...animators) {
        /** @type {} */
        this.animators = animators;
    }

    /** @param {number} t */
    exec(t) {
        for(const animator of this.animators) animator.exec(t);
    }
}

/**
 * @implements {Animator}
 */
class AnimatorController {
    /** @param {Record<string, Animator>} animators */
    constructor(animators) {
        /** @type {Record<string, Animator>} */
        this.animators = animators;
        /** @private @type {string | null} */
        this.__currentAnimator = null;
    }

    set currentAnimator(v) {
        this.__currentAnimator = v;
    }
    get currentAnimator() {
        return this.__currentAnimator;
    }

    initUI() {
        const root = document.createElement('div');
        const animatorsContainer = document.createElement('figure');
        root.appendChild(animatorsContainer);
        const acCaption = document.createElement('figcaption');
        animatorsContainer.appendChild(acCaption);
        acCaption.textContent = 'Animators';
        const radiosName = `animator`; // TODO make this unique
        const onRadioChange = (/** @type {InputEvent} */ e) => { // or should this be on input?
            const value = e.target.value;
            this.currentAnimator = value === '' ? null : value;
        }
        {
            const fig = document.createElement('figure');
            animatorsContainer.appendChild(fig);
            const caption = document.createElement('figcaption');
            fig.appendChild(caption);
            caption.textContent = 'None';
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = radiosName;
            radio.checked = this.currentAnimator === null;
            radio.addEventListener('change', onRadioChange);
            radio.value = '';
            caption.appendChild(radio);
        }
        for(const name in this.animators) {
            const animatorContainer = document.createElement('figure');
            animatorsContainer.appendChild(animatorContainer);
            const acCaption = document.createElement('figcaption');
            animatorContainer.appendChild(acCaption);
            acCaption.textContent = name;
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = radiosName;
            radio.checked = this.currentAnimator === name;
            radio.value = name;
            radio.addEventListener('change', onRadioChange);
            acCaption.appendChild(radio);
        }
        return root;
    }

    /** @param {number} t */
    exec(t) {
        if(this.currentAnimator !== null) this.animators[this.currentAnimator].exec(t);
    }
}
