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
const draw_button = document.getElementById('draw_button');
draw_button.addEventListener('click', (e) => { handleDrawEvent(); });

function handleDrawEvent() {
	// clear the canvas
	// (could also use clearRect, but that gives #0000 not and we want #000F so it'd take another fill for that anyways)
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, 400, 400);
	const v1 = new Vector3([v1_x_input.valueAsNumber, v1_y_input.valueAsNumber, 0]);
	drawVector(v1, "red");
}

function drawVector(v, color) {
	ctx.beginPath();
	ctx.moveTo(200, 200);
	ctx.strokeStyle = color;
	ctx.lineTo(200 + v.elements[0] * 20, 200 + v.elements[1] * -20);
	ctx.stroke();
}
