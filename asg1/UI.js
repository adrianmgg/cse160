
function createSlider({min, max, step = undefined, value}) {
	return create('input', {
		type: 'range',
		min,
		max,
		step,
		value,
	});
}

/**
 * @param {([string, string][])} options 
 * @param {(string) => undefined} onChange
 * @returns {HTMLSelectElement}
 */
function createDropdown(options, onChange) {
	return create('select', {
		children: options.map(([value, label]) => create('option', {
			value,
			textContent: label,
		})),
		events: {
			change: (e) => {
				onChange(e.target.options[e.target.selectedIndex].value);
			},
		}
	});
}

function labelify(text, el) {
	return create('label', {
		textContent: text,
		children: [el],
	});
}

/** @typedef {'stamp' | 'brush'} PaintMode */
/** @typedef {'ngon'} StampMode */
/** @typedef {[number, number, number]} Color */

const paintProgramOptions = {
	/** @type {PaintMode} */
	mode: 'stamp',
	stampOptions: {
		/** @type {StampMode} */
		mode: 'ngon',
		/** @type {number} */
		sides: 3,
		/** @type {number} */
		angle: 0,
		/** @type {Color} */
		color: [0, 0, 0],
		/** @type {number} */
		alpha: 1,
		/** @type {number} */
		size: 0,
	},
};

function setByPath(target, path, value) {
	let cur = target;
	for(let i = 0; i < path.length - 1; i++) {
		cur = cur[path[i]];
	}
	cur[path[path.length - 1]] = value;
}

const uiContainer = document.getElementById('ui_container');

function onSettingsChanged() {
	uiContainer.dataset.mode = paintProgramOptions.mode;
	console.log(paintProgramOptions);
}

/**
 * @param {string} s 
 */
function parseColor(s) {
	console.log('parseColor', s);
	return [Number.parseInt(s.slice(1, 1+2), 16) / 255.0, Number.parseInt(s.slice(3, 3+2), 16) / 255.0, Number.parseInt(s.slice(5, 5+2), 16) / 255.0];
}

function initUI() {
	setup(document.getElementById('button__undo'), {
		events: {
			click: e => {
				popPoint();
			},
		},
	});

	for(const [id, path, getval] of [
		['option__mode', ['mode'], el => el.options[el.selectedIndex].value],
		['option__stamp__sides', ['stampOptions', 'sides'], el => el.valueAsNumber],
		['option__stamp__size', ['stampOptions', 'size'], el => el.valueAsNumber],
		['option__stamp__angle', ['stampOptions', 'angle'], el => el.valueAsNumber],
		['option__stamp__color', ['stampOptions', 'color'], el => parseColor(el.value)]
	]) {
		const elem = document.getElementById(id);
		const getval_ = getval ?? ( (e => e.value) );
		elem.addEventListener('change', (e) => {
			setByPath(paintProgramOptions, path, getval_(elem));
			onSettingsChanged();
		});
		setByPath(paintProgramOptions, path, getval_(elem));
	}
	onSettingsChanged();
	// const option__mode = document.getElementById('option__mode');
	// option__mode.addEventListener('change', e => {

	// });
	// const uiContainer = document.getElementById('ui_container');
	// const drawmodeDropdown = labelify('mode', createDropdown([
	// 	['stamp', 'Stamp'],
	// 	['brush', 'Brush'],
	// ], (val) => {
	// 	paintProgramOptions.mode = val;
	// 	updateUI();
	// }));
	// setup(drawmodeDropdown, { parent: uiContainer, });
	// const modeSettingsContainer = create('div', { parent: uiContainer });
	// // ==== stamp settings
	// create('div', {
	// 	parent: modeSettingsContainer,
	// 	dataset: { mode: 'stamp', },
	// 	children: [
	// 		labelify('sides', createSlider({min: 3, max: 32, step: 1, value: 3})),
	// 		labelify('angle', createSlider({min: 0, max: 360, value: 0})),
	// 		labelify('color', create('input', {
	// 			type: 'color',
	// 			events: {
	// 				change: e => paintProgramOptions.mode.
	// 			}
	// 		})),
	// 	],
	// });
	// // ==== brush settings
	// create('div', {
	// 	parent: modeSettingsContainer,
	// 	dataset: { mode: 'brush', },
	// 	children: [
	// 	],
	// });
	// // ====
	// updateUI = function() {
	// 	for(const el of modeSettingsContainer.childNodes) {
	// 		el.style.display = (el.dataset.mode === paintProgramOptions.mode) ? 'unset' : 'none';
	// 	}
	// };
	// updateUI();
}





