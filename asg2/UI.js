


/**
 * @param {string} s 
 */
function parseColor(s) {
	return [Number.parseInt(s.slice(1, 1+2), 16) / 255.0, Number.parseInt(s.slice(3, 3+2), 16) / 255.0, Number.parseInt(s.slice(5, 5+2), 16) / 255.0];
}

function initUI() {
	document.getElementById('button__undo').addEventListener('click', () => { popPoint(); });
	document.getElementById('button__clear').addEventListener('click', () => { clearPoints(); });
	for(const [id, path, getval] of [
		['option__mode', ['mode'], el => el.options[el.selectedIndex].value],
		['option__stamp__sides', ['stampOptions', 'sides'], el => el.valueAsNumber],
		['option__stamp__size', ['stampOptions', 'size'], el => el.valueAsNumber],
		['option__stamp__angle', ['stampOptions', 'angle'], el => el.valueAsNumber / 180 * Math.PI],
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
	// TODO didn't have a chance to build a proper system for programatically changing the ui-controlled options so this'll have to do for now
	document.getElementById('button__preset__triangle').addEventListener('click', e => {
		paintProgramOptions.mode = 'stamp';
		document.getElementById('option__stamp__sides').value = paintProgramOptions.stampOptions.sides = 3;
		onSettingsChanged();
	});
	document.getElementById('button__preset__circle').addEventListener('click', e => {
		paintProgramOptions.mode = 'stamp';
		document.getElementById('option__stamp__sides').value = paintProgramOptions.stampOptions.sides = 32;
		onSettingsChanged();
	});
	document.getElementById('button__preset__square').addEventListener('click', e => {
		paintProgramOptions.mode = 'stamp';
		document.getElementById('option__stamp__sides').value = paintProgramOptions.stampOptions.sides = 4;
		document.getElementById('option__stamp__angle').value = paintProgramOptions.stampOptions.angle = Math.PI / 4;
		onSettingsChanged();
	});
	onSettingsChanged();

	document.getElementById('button__loaddrawing').addEventListener('click', e => {
		const circleR = 1e-1;
		const dirtC = parseColor('#583d28');
		const grassC = parseColor('#506b39');
		const logC = parseColor('#6a5a4c');
		const leafC = parseColor('#384626');
		for(const [x, y, c] of [
			[0, 0, dirtC],
			[1, 0, dirtC],
			[2, 0, dirtC],
			[3, 0, dirtC],
			[4, 0, dirtC],
			[5, 0, dirtC],
		]) {
			pushPoint(new Circle({
				x: x * circleR * 1.4,
				y: y * circleR * 2,
				size: circleR * 400,
				steps: 4,
				color: [...c, 1.0],
				angle: Math.PI / 4,
			}));
		}
		renderAll();
	});
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





