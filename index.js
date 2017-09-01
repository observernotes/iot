var rpio = require('rpio');
var process = require('child_process');
rpio.open(11, rpio.INPUT);

var faceLastState = 0;

while(true) {
	var faceValue = rpio.read(11);
	if (faceValue !== faceLastState && faceValue === 1) {
		console.log('video on and loading...');
		toggleFace();
		console.log('video loaded and uploaded.');
	}
	faceLastState = faceValue;
	rpio.msleep(200);
}

function toggleFace() {
	process.exec('raspivid -o facevideo.h264 -t 10000', function(error, stdout, stderr) {
		console.log('video loaded amd uploaded.');
	});	
} 