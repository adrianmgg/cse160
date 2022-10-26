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
// https://easings.net/#easeInExpo
/** @type {EasingFunction} */
function easeInExpo(x) {
    return x === 0 ? 0 : Math.pow(2, 10 * x - 10);
}
// https://easings.net/#easeInOutExpo
/** @type {EasingFunction} */
function easeInOutExpo(x) {
    return x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;
}


/** @param {number} t @param {number} a @param {number} b @returns {number} */
function lerp(t, a, b) {
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

    onActivate() {}
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

    onActivate() {}
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
        /** @private @type {HTMLInputElement[]} */
        this.radios = []; // TODO prob a better way of doing this part lol
    }

    set currentAnimator(v) {
        this.__currentAnimator = v;
        for(const radio of this.radios) {
            if(radio.value === (v === null ? '' : v)) radio.checked = true;
        }
    }
    get currentAnimator() {
        return this.__currentAnimator;
    }

    initUI() {
        const root = document.createElement('div');
        const animatorsContainer = document.createElement('details');
        // animatorsContainer.open = true;
        root.appendChild(animatorsContainer);
        const acCaption = document.createElement('summary');
        animatorsContainer.appendChild(acCaption);
        acCaption.textContent = 'Animation Control';
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
            this.radios.push(radio);
            caption.appendChild(radio);
        }
        for(const name in this.animators) {
            const animator = this.animators[name];
            // @ts-expect-error
            const hasWidget = animator.initUI !== undefined;
            const animatorContainer = document.createElement(hasWidget ? 'details' : 'figure');
            // if(hasWidget) animatorContainer.open = true;
            animatorsContainer.appendChild(animatorContainer);
            const acCaption = document.createElement(hasWidget ? 'summary' : 'figcaption');
            animatorContainer.appendChild(acCaption);
            acCaption.textContent = name;
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = radiosName;
            radio.checked = this.currentAnimator === name;
            radio.value = name;
            radio.addEventListener('change', onRadioChange);
            this.radios.push(radio);
            acCaption.appendChild(radio);
            if(hasWidget) {
                // @ts-expect-error
                animatorContainer.appendChild(animator.initUI());
            }
        }
        return root;
    }

    /** @param {number} t */
    exec(t) {
        if(this.currentAnimator !== null) this.animators[this.currentAnimator].exec(t);
    }

    onActivate() {}
}

/**
 * @implements {Animator}
 */
class ManualControlAnimator {
    /** @param {Bone} armatureRoot */
    constructor(armatureRoot) {
        /** @type {Bone} */
        this.armatureRoot = armatureRoot;
        /** @type {Record<string, [number, number, number, number, number, number, number, number, number]>} */
        this.data = {};
    }

    /** @private @param {HTMLElement} target @param {Bone} bone */
    buildUI(target, bone) {
        if(!(bone.name in this.data)) this.data[bone.name] = [0, 0, 0, 0, 0, 0, 1, 1, 1];
        const container = document.createElement('details');
        const caption = document.createElement('summary');
        container.appendChild(caption);
        caption.textContent = bone.name;
        /** @type {[string, [number, string, number, number, number][]][]} */
        const sliderGroupsInfo = [
            ['position', [
                [0, 'x', -10, 0, 10],
                [1, 'y', -10, 0, 10],
                [2, 'z', -10, 0, 10],
            ]],
            ['rotation', [
                [3, 'x', -Math.PI, 0, Math.PI],
                [4, 'y', -Math.PI, 0, Math.PI],
                [5, 'z', -Math.PI, 0, Math.PI],
            ]],
            ['scale', [
                [6, 'x', 0.1, 1, 5],
                [7, 'y', 0.1, 1, 5],
                [8, 'z', 0.1, 1, 5],
            ]],
        ];
        for(const [sliderGroupName, sliderGroup] of sliderGroupsInfo) {
            const sgc = document.createElement('details');
            container.appendChild(sgc);
            const sgcc = document.createElement('summary');
            sgc.appendChild(sgcc);
            sgcc.textContent = sliderGroupName;
            for(const [dataIdx, sliderName, min, def, max] of sliderGroup) {
                const label = document.createElement('label');
                label.textContent = sliderName;
                sgc.appendChild(label);
                const slider = document.createElement('input');
                slider.type = 'range';
                slider.min = min;
                slider.max = max;
                slider.value = def;
                slider.step = 'any';
                label.appendChild(slider);
                const onSliderChange = (e) => {
                    this.data[bone.name][dataIdx] = slider.valueAsNumber;
                };
                slider.addEventListener('input', onSliderChange);
                slider.addEventListener('change', onSliderChange);
            }
        }
        target.appendChild(container);
        for(const child of bone.headChildren) if(child instanceof Bone) this.buildUI(target, child);
        for(const child of bone.tailChildren) if(child instanceof Bone) this.buildUI(target, child);
    }

    initUI() {
        const root = document.createElement('div');
        this.buildUI(root, this.armatureRoot);
        return root;
    }

    /** @private @param {Bone} bone */
    _execWalk(bone) {
        bone.animMat = Mat4x4.locRotScale(...this.data[bone.name]);
        for(const child of bone.headChildren) if(child instanceof Bone) this._execWalk(child);
        for(const child of bone.tailChildren) if(child instanceof Bone) this._execWalk(child);
    }

    /** @param {number} t */
    exec(t) {
        this._execWalk(this.armatureRoot);
    }

    onActivate() {
    }
}
