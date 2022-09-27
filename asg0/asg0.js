// resources used
//   - mdn for api reference

function main() {
	// Retrieve <canvas> element <- (1)
	var canvas = document.getElementById('example');
	if (!canvas) {
		console.log('Failed to retrieve the <canvas> element');
		return;
	}

	// Get the rendering context for 2DCG <- (2)
	var ctx = canvas.getContext('2d');
	// TODO - jank lazy version for now, need to figure out how they actually want us to structure this
	window.ctx = ctx;
	
	handleDrawEvent();
}

const v1_x_input = document.getElementById('v1.x');
const v1_y_input = document.getElementById('v1.y');
const v2_x_input = document.getElementById('v2.x');
const v2_y_input = document.getElementById('v2.y');
const draw_button = document.getElementById('draw_button');
const operation_dropdown = document.getElementById('operation_dropdown');
const operation_scalar = document.getElementById('operation_scalar');
draw_button.addEventListener('click', (e) => { handleDrawEvent(); });

const operations = {
	add: ['Add', (ctx, v1, v2) => {
		const v3 = new Vector3();
		v3.set(v1);
		v3.sub(v2);
		drawVector(v3, '#0F0');
	}],
	sub: ['Subtract', (ctx, v1, v2) => {
		const v3 = new Vector3();
		v3.set(v1);
		v3.sub(v2);
		drawVector(v3, '#0F0');
	}],
	mul: ['Multiply', (ctx, v1, v2) => {
		const scalar = operation_scalar.valueAsNumber;
		const v3 = new Vector3();
		const v4 = new Vector3();
		v3.set(v1);
		v4.set(v2);
		v3.mul(scalar);
		v4.mul(scalar);
		drawVector(v3, '#0F0');
		drawVector(v4, '#0F0');
	}],
	div: ['Divide', (ctx, v1, v2) => {
		const scalar = operation_scalar.valueAsNumber;
		const v3 = new Vector3();
		const v4 = new Vector3();
		v3.set(v1);
		v4.set(v2);
		v3.div(scalar);
		v4.div(scalar);
		drawVector(v3, '#0F0');
		drawVector(v4, '#0F0');
	}],
	magnitude: ['Magnitude', (ctx, v1, v2) => {
		console.log(`Magnitude v1: ${v1.magnitude()}`);
		console.log(`Magnitude v2: ${v2.magnitude()}`);
	}],
	normalize: ['Normalize', (ctx, v1, v2) => {
		const v3 = new Vector3();
		v3.set(v1);
		v3.normalize();
		drawVector(v3, '#0F0');
		v3.set(v2);
		v3.normalize();
		drawVector(v3, '#0F0');
	}],
};

for(const op_id in operations) {
	const optionElem = document.createElement('option');
	optionElem.value = op_id;
	optionElem.textContent = operations[op_id][0];
	operation_dropdown.appendChild(optionElem);
}

function handleDrawEvent() {
	// clear the canvas
	// (could also use clearRect, but that gives #0000 not and we want #000F so it'd take another fill for that anyways)
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, 400, 400);
	const v1 = new Vector3([v1_x_input.valueAsNumber, v1_y_input.valueAsNumber, 0]);
	drawVector(v1, "red");
	const v2 = new Vector3([v2_x_input.valueAsNumber, v2_y_input.valueAsNumber, 0]);
	drawVector(v2, '#00F');
	const selected_op = operation_dropdown.options[operation_dropdown.selectedIndex].value;
	operations[selected_op][1](ctx, v1, v2);
}

function drawVector(v, color) {
	ctx.beginPath();
	ctx.moveTo(200, 200);
	ctx.strokeStyle = color;
	ctx.lineTo(200 + v.elements[0] * 20, 200 + v.elements[1] * -20);
	ctx.stroke();
}
