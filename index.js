var rpio = require('rpio');
var process = require('child_process');
var request =  require('superagent');
rpio.open(11, rpio.INPUT);
initFace();

function initFace() {
	var faceLastState = 0;
	setInterval(() => {
		var faceValue = rpio.read(11);
		if (faceValue !== faceLastState && faceValue === 1) {
			toggleFace();
		}
		faceLastState = faceValue;
	}, 150);	
}

function toggleFace() {
	console.log('video on and loading...');
	process.exec('raspivid -o facevideo.h264 -t 4000', function(error, stdout, stderr) {
		console.log('video loaded and saved.');
		sendToServer();
	});	
} 

function sendToServer() {
	request.post('http://120.27.19.195/faceMatch').send({ command: 'face detect', data: {}}).end((err, res) => {
		console.log('upload face video success');		
	});
}