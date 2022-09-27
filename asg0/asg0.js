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

	// Draw a blue rectangle <- (3)
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, 400, 400);
	const v1 = new Vector3([2.25, 2.25, 0]);
	drawVector(v1, "red");
}

function drawVector(v, color) {
	ctx.beginPath();
	ctx.moveTo(200, 200);
	ctx.strokeStyle = color;
	ctx.lineTo(200 + v.elements[0] * 20, 200 + v.elements[1] * -20);
	ctx.stroke();
}
