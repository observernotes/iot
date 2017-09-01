var rpio = require('rpio');
var process = require('child_process');
var request =  require('superagent');
rpio.open(11, rpio.INPUT);

var faceLastState = 0;

while(true) {
	var faceValue = rpio.read(11);
	if (faceValue !== faceLastState && faceValue === 1) {
		break;
	}
	faceLastState = faceValue;
	rpio.msleep(200);
}
console.log('video on and loading...');
toggleFace();
sendToServer();

function toggleFace() {
	process.exec('raspivid -o facevideo.h264 -t 5000', function(error, stdout, stderr) {
		console.log('video loaded amd uploaded.');
	});	
} 
toggleFace();
sendToServer();

function sendToServer() {
	console.log('ready to upload');
	request.post('http://30.131.35.131:3000/faceMatch').send({ command: 'face detect', data: {}}).end(function(err, res){
		console.log('ready to upload');
	});
}