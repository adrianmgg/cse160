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
	if(selected_op === 'add' || selected_op === 'sub') {
		const v3 = new Vector3();
		v3.set(v1);
		v3[selected_op](v2);
		drawVector(v3, '#0F0');
	} else if(selected_op === 'mul' || selected_op === 'div') {
		const scalar = operation_scalar.valueAsNumber;
		const v3 = new Vector3();
		const v4 = new Vector3();
		v3.set(v1);
		v4.set(v2);
		v3[selected_op](scalar);
		v4[selected_op](scalar);
		drawVector(v3, '#0F0');
		drawVector(v4, '#0F0');
	}
}

function drawVector(v, color) {
	ctx.beginPath();
	ctx.moveTo(200, 200);
	ctx.strokeStyle = color;
	ctx.lineTo(200 + v.elements[0] * 20, 200 + v.elements[1] * -20);
	ctx.stroke();
}
