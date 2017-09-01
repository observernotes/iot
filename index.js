var rpio = require('rpio');
var process = require('child_process');
var request =  require('superagent');
rpio.open(11, rpio.INPUT);

var faceLastState = 0;

while(true) {
	var faceValue = rpio.read(11);
	if (faceValue !== faceLastState && faceValue === 1) {
		console.log('video on and loading...');
		toggleFace();
		console.log('video loaded and uploaded.');
		sendToServer();
	}
	faceLastState = faceValue;
	rpio.msleep(200);
}

function toggleFace() {
	process.exec('raspivid -o facevideo.h264 -t 5000', function(error, stdout, stderr) {
		console.log('video loaded amd uploaded.');
	});	
} 

function sendToServer() {
	console.log('ready to upload');
	request.post('http://30.131.35.131:3000/faceMatch').send({ command: 'face detect', data: {}}).end(function(err, res){
		console.log(res)
	});
console.log('ready to upload');
}