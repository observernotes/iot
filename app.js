const rfid = require('./src/rfid.js');
// const request = require('superagent');

// request.get('http://192.168.78.248:3000/addItem').end((err, res) => {
//     console.log(res);
// })

const { query } = rfid
setInterval(() => {
    query()
}, 1000)