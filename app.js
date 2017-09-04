const request = require('superagent');
const SerialPort = require('serialport');
var WebSocket = require('ws');
const PRESET_VALUE = 0xFFFF;
const POLYNOMIAL = 0x8408;
const commandList = {
    '0x01': [],
    '0x02': [],
    '0x03': [],
};

function uiCrc16Cal(pucY, ucX) {
    let ucI;
    let ucJ;
    let uiCrcValue = PRESET_VALUE;
    for (ucI = 0; ucI < ucX; ucI++) {
        uiCrcValue = uiCrcValue ^ pucY[ucI];
        for (ucJ = 0; ucJ < 8; ucJ++) {
            if (uiCrcValue & 0x0001) {
                uiCrcValue = (uiCrcValue >> 1) ^ POLYNOMIAL;
            } else {
                uiCrcValue = (uiCrcValue >> 1);
            }
        }
    }
    return uiCrcValue;
}

function parseQueryDataCmd(dataField) {
    const dataFieldArr = dataField.split('');
    const ENum = parseInt(dataFieldArr.splice(0, 2).join(''), 16);
    const ret = [];
    for (let i = 0; i < ENum; i++) {
        const EPClen = parseInt(dataFieldArr.splice(0, 2).join(''), 16);
        const EPC = dataFieldArr.splice(0, EPClen * 2).join('');
        ret.push(EPC);
    }
    return ret;
}

function parseReadDataCmd(dataField) {
    const dataFieldArr = dataField.split('');
    const ret = [];
    for (let i = 0; i < dataFieldArr.length / 2; i++) {
        const Word = parseInt(dataFieldArr.splice(0, 2).join(''), 16);
        ret.push(Word);
    }
    return ret;
}

function parseDataCmd3(dataField) {
    // const ENum = parseInt(dataField.splice(0, 2).join(''), 16);
    // const ret = [];
    // for (let i = 0; i < ENum; i++) {
    //   const EPClen = parseInt(dataField.splice(0, 2).join(''), 16);
    //   const EPC = dataField.splice(0, EPClen * 2).join('');
    //   ret.push(EPC);
    // }
    return dataField;
}

const port = new SerialPort('/dev/ttyUSB0', {
    baudRate: 57600,
    dataBits: 8,
    stopBits: 1,
});
const parseResponse = data => {
    const dataString = data.toString('hex');
    const len = parseInt(dataString.slice(0, 2), 16);
    const adr = dataString.slice(2, 4);
    const reCmd = dataString.slice(4, 6);
    const status = dataString.slice(6, 8);
    const dataField = dataString.slice(8, (len + 1) * 2 - 4);
    let parsedData = [];
    switch (reCmd) {
        case '01':
            parsedData = parseQueryDataCmd(dataField);
            break;
        case '02':
            parsedData = parseReadDataCmd(dataField);
            break;
        case '03':
            parsedData = parseDataCmd3(dataField);
            break;
        default:
            parsedData = [];
    }
    // let dataNum = dataField.slice(0,2);
    // let EPCIDLen = dataField.slice(2,4);
    // let EPCIDData = dataField.slice(4,dataField.length)
    const LSB = dataString.slice(-4, -2);
    const MSB = dataString.slice(dataString.length - 2, dataString.length);
    const result = {
        len,
        adr,
        reCmd,
        status,
        dataField,
        parsedData,
        LSB,
        MSB,
    };
    return result;
};
const createQueryDataString = (data = []) => {
    return data;
};
const createReadDataString = (cardId = '') => {
    const ENum = '0x0' + Math.ceil((cardId.length / 4)).toString(16);
    const EPC = cardId.split('').reduce((pre, curr, index, arr) => { if (index < arr.length / 2) { pre.push('0x' + arr.slice(index * 2, index * 2 + 2).join('')); } return pre; }, []);
    const Mem = '0x03';
    const WordPtr = '0x00';
    // 读取64字节
    const Num = '0x04';
    const Pwd = ['00', '00', '00', '00'];
    // const MaskAdr = '';
    // const MaskLen = '';
    return [ENum, ...EPC, Mem, WordPtr, Num, ...Pwd];
};
const createWriteDataStringTest = (cardId = '') => {
    const WNum = '0x01';
    const ENum = '0x' + Math.ceil((cardId.length / 4)).toString(16);
    const EPC = cardId.split('').reduce((pre, curr, index, arr) => { if (index < arr.length / 2) { pre.push(arr.slice(index * 2, index * 2 + 2).join('')); } return pre; }, []);
    const Mem = '0x03';
    const WordPtr = '0x00';
    const Wdt = ['01', '01'];
    const Pwd = ['00', '00', '00', '00'];
    // const MaskAdr = '';
    // const MaskLen = '';
    return [WNum, ENum, ...EPC, Mem, WordPtr, ...Wdt, ...Pwd];
};

function sendCommand(cmd, options = {}) {
    let { data = [], cardId = '' } = options;
    switch (cmd) {
        case '0x01':
            data = createQueryDataString(data);
            break;
        case '0x02':
            data = createReadDataString(cardId);
            break;
        case '0x03':
            data = createWriteDataStringTest(cardId, data);
            break;
        default:
    }
    // var data1 = [0x04, 0x00, 0x01, 0xDB, 0x4B];
    const Len = '0x' + (4 + data.length).toString(16);
    const Adr = '0x00';
    const Cmd = cmd;
    const crc16Data = [Len, Adr, Cmd, ...data];
    const crc16Result = uiCrc16Cal(crc16Data, crc16Data.length).toString(16);
    const LSB = '0x' + crc16Result.slice(2, 4);
    const MSB = '0x' + crc16Result.slice(0, 2);
    const commandData = [...crc16Data, LSB, MSB];
    return new Promise(resolve => {
        port.write(commandData, 'hex', function(err) {
            if (err) {
                return console.log('Error on write: ', err.message);
            }
            // console.info(`命令写入成功:${commandData}`);
            resolve(new Promise(resolve => {
                commandList[Cmd].push(data => resolve(data));
                // console.log(commandList);
            }).catch(err => console.log(err)));
        });
    });
}
port.on('open', function() {
    // var data1 = [0x04, 0x00, 0x01,0xDB,0x4B];
    // setInterval(()=>{
    //   port.write(data1,'hex', function(err) {
    //   if (err) {
    //     return console.log('Error on write: ', err.message);
    //   }
    //   console.log('message written');
    // });
    // }, 1000)
    console.info('读写器启动成功');
});

// open errors will be emitted as an error event
port.on('error', function(err) {
    console.log('Error: ', err.message);
});

let dataList = [],
    timer;
port.on('data', data => {
    // console.info(`数据接受成功:${data.toString('hex')}`);
    const result = parseResponse(data);
    // console.info(`数据解析成功:${JSON.stringify(result)}`);
    const resolve = commandList[`0x${result.reCmd}`].shift();
    let { parsedData } = result;
    console.log(parsedData);
    console.log(parsedData.length && dataList.indexOf(parsedData[0]) < 0)
    if (parsedData.length && dataList.indexOf(parsedData[0]) < 0) {
        dataList = dataList.concat(parsedData);
        request.get('http://120.27.19.195/putItem').end((res) => {});
	clearInterval(timer)
    }
    resolve(result)
});

function query() {
    timer = setInterval(() => {
	sendCommand('0x01', { data: [] });
    }, 200)
}

function readData(cardId = '1234') {
    const result = sendCommand('0x02', { cardId });
    return result;
}

function writeDataTest(cardId = '1234', data = '') {
    const result = sendCommand('0x03', { cardId, data });
    return result;
}

function initRfidCard() {
	
	var ws = new WebSocket('ws://120.27.19.195');
	ws.on('open', function open(){
		console.log('Rfid observer is opened.');
	});
	ws.on('message', function(message) {
		console.log(message, 'message');
		const obj = JSON.parse(message);
		if (obj.type == 'init') {
			dataList = [];
			query();	
		}
	});
}
initRfidCard();
query();
