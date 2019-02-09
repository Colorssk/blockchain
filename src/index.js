const vorpal = require('vorpal')();
const Blockchain = require('./blockChain') //类
const blockchain = new Blockchain() // 实例化 
const  Table =  require('cli-table')
const rsa = require('./rsa')

function formatLog(data){
  if(!data || data.length === 0){
    return 0
  }
   if(!Array.isArray(data)){
     data=[data]
   }
   const first = data[0]
   const head = Object.keys(first)
   const table =new Table({
     head,
     colWidths: new Array(head.length).fill(15)
   })
   const res = data.map(obj=>{                   // 空格
     return head.map(h=>JSON.stringify(obj[h],null,1))//对象格式成字符串为了防止[Object，Object]
   })
   table.push(...res)//数组参数形式压栈
    console.log(table.toString())
}

// instantiate
// const table = new Table({
//     head: ['TH 1 label', 'TH 2 label']
//   , colWidths: [10, 20]
// });

// table is an Array, so you can `push`, `unshift`, `splice` and friends
// table.push(
//     ['First value', 'Second value']
//   , ['First value', 'Second value']
// );
vorpal
  .command('blance <address>', '查询区块详情')
  .action(function(args, callback) {
    const blance = blockchain.blance(args.address)
    if(blance){
      formatLog({blance,address:args.address})
    }else{

    }
    // this.log('回调一下');//执行的显示
    callback();
  });
vorpal
  .command('mine', '挖矿')
  .action(function(args, callback) {
    const newBlock = blockchain.mine(rsa.keys.pub)
    if(newBlock){
        formatLog(newBlock)
    }
    // this.log('回调一下');//执行的显示
    callback();
  });
  vorpal
  .command('detail <index>', '查看区块详情')
  .action(function(args, callback) {
    const block = blockchain.blockchain(args.index)
    // formatLog(newBlock)
    this.log(JSON.stringify(block,null,2))
    
    // this.log('回调一下');//执行的显示
    callback();
  });
  
  vorpal
  .command('trans <to> <amount>', '转账')
  .action(function(args, callback) {
    // this.log(blockchain.blockchain)
    let trans = blockchain.transfer(rsa.keys.pub,args.to, args.amount)//文档中args参数的用法,这里把公钥当做转账的起始地址
    if(trans){
      formatLog(trans)  
    }
    // this.log('回调一下');//执行的显示
    callback();//不执行callback就会退出
  }); 

  vorpal
  .command('blockchain', '查看区块链')
  .action(function(args, callback) {
    // this.log(blockchain.blockchain)
    formatLog(blockchain.blockchain)
    // this.log('回调一下');//执行的显示
    callback();
  });

  vorpal
  .command('pub', '查看本地地址')
  .action(function(args, callback) {
    // this.log(blockchain.blockchain)
    console.log(rsa.keys.pub)
    // this.log('回调一下');//执行的显示
    callback();
  });
  vorpal
  .command('peers', '查看网络节点')
  .action(function(args, callback) {
    formatLog(blockchain.peers)
    // this.log('回调一下');//执行的显示
    callback();
  });
  vorpal
  .command('chat <msg>', '与其他节点通信')
  .action(function(args, callback) {
    blockchain.boardcast({
      type: 'hi',
      data: args.msg
    })
    // this.log('回调一下');//执行的显示
    callback();
  });


vorpal.exec('help')//默认的一个help命令
vorpal
  .delimiter('ym') //前缀
  .show();//启动