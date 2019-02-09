// // dgram 自带自带功能处理udp
// const dgram = require('dgram')
// const udp = dgram.createSocket('udp4')
// // udp收信息
// udp.on('message', (data, remote) => {
//   console.log(data.toString())// data是二进制,发送的时候是buffer转化为二进制
//   console.log(remote)
// })
// udp.on('listening', function () {
//   const address = udp.address()
//   console.log(address.address + address.port)
// })
// // udp发信息
// udp.bind(8002)
// function send (message, port, host) {
//   udp.send(BUffer.from(message), port, host)// 转化为二进制
// }
// const port = Number(process.argv[2])
// const host = Number(process.argv[3])
// if (port && host) {
//   send('hello', port, host)
// }
