const crypto = require('crypto') // nodejs自带的加密解密的包
const rsa = require('./rsa')
const dgram = require('dgram')

// 创世区块
const initBlock = {
  index: 0,
  data: 'welcome ym',
  preHash: '0',
  timestamp: 1544342691074,
  nonce: 23836,
  hash: '0000bbcc4e4dbe46c31f942eb15cbd7d3a31c585bb4cd693a2cd0755441d24b1'
}
class Blockchain {
  constructor () {
    this.blockchain = [
      initBlock
    ]
    this.data = []
    this.difficulty = 4
    // 所有的网络节点信息，address,port
    this.peers = []
    this.remote = {}
    // 种子节点,上线之后种子节点要是公网ip
    this.seed = { port: 8001, address: 'localhost' }
    this.udp = dgram.createSocket('udp4')
    this.init()
  }
  init () {
    this.bindP2p()
    this.bindExit()
  }
  // 判断重复
  isEqualObj (obj1, obj2) {
    const key1 = Object.keys(obj1)
    const key2 = Object.keys(obj2)
    if (key1.length !== key2.length) {
      return false
    }
    return key1.every(key => { return obj1[key] === obj2[key] })
  }
  bindP2p () {
    this.udp.on('message', (data, remote) => {
      // console.log(data.toString())// data是二进制,发送的时候是buffer转化为二进制
      // console.log(remote)
      const { address, port } = remote
      const action = JSON.parse(data)
      if (action.type) {
        this.dispatch(action, { address, port })
      }
    })
    this.udp.on('listening', () => {
      const address = this.udp.address()
      console.log('[信息]:监听到的地址' + address)
    })
    // 区分种子接口和普通节点
    const port = Number(process.argv[2]) || 0
    this.startNode(port)
  }
  dispatch (action, remote) { // remote是当前节点端口信息（普通节点（新节点））
    // 接收信息
    switch (action.type) {
      case 'newpeer':// 新节点,以下是接受消息之后种子节点要做的事
        // 种子节点要做的事： 公网ip和port是什么，现在全部节点的列表，告诉所有已知节点，来个新朋友，现在的区块链数据
        // 你的公网ip和port是什么(公布)
        this.send({
          type: 'remoteAddress',
          data: remote
        }, remote.port, remote.address)
        // 现在全部节点的列表
        this.send({
          type: 'peerlist',
          data: this.peers
        }, remote.port, remote.address)
        // 告诉所有已知节点
        this.boardcast({// 告诉所有节点这个新节点的地址信息
          type: 'sayhi',
          data: remote// 新（本）节点的地址信息
        })
        // 4： 告诉你现在区块链的数据
        this.send({
          type: 'blockchain',
          data: JSON.stringify({
            blockchain: this.blockchain,
            trans: this.data
          })
        }, remote.port, remote.address)
        this.peers.push(remote)
        console.log('hi', remote)// 这是新的节点
        break
      case 'blockchain':
        // 同步本地链
        console.log('同步其他链条的数据中')
        let allData = JSON.parse(action.data)
        let newChain = allData.blockchain
        let newTrans = allData.trans
        this.replaceChain(newChain)
        this.replaceTrans(newTrans)
        break
      case 'remoteAddress':// 存储远程信息，退出的时候用
        this.remote = action.data
        break
      case 'peerlist':// 远程告诉我现在的所有节点
        const newPeers = action.data
        this.addPeers(newPeers)
        break
      case 'sayhi':// 接受广播（除种子节点以外的节点接收信息并且加入通讯白名单）
        const remotePeer = action.data// 接受到的地址信息，就是新节点的信息
        this.peers.push(remotePeer)
        this.send({ type: 'hi', data: 'hi' }, remotePeer.port, remotePeer.address)// 把新名单加入白名单，向这个新节点发送信息
        break
      case 'hi':
        console.log(`${remote.address}:${remote.port}:${action.data}`)
        break
      case 'trans':
        // 网路收到的交易请求
        if (!this.data.find(v => this.isEqualObj(v, action.data))) {
          console.log('[信息]：新的交易请注意查收')
          this.addTrans(action.data)
          this.boardcast({ type: 'trans', data: action.data })
        }
        break
      case 'mine':
        // 网络上有人挖矿成功
        // 校验防止重复
        const lastBlock = this.getLastBlock()
        if (lastBlock.hash === action.data.hash) {
          return
        }
        if (this.isValideBlock(action.data, lastBlock)) {
          console.log('[信息]：有节点挖矿成功')
          this.blockchain.push(action.data)
          // 清空本地
          this.data = []
          this.boardcast({
            type: 'mine',
            data: action.data
          })
        } else {
          console.log('[信息]： 挖矿的区块不合法')
        }

        break
      default:
    }
  }
  // 广播
  boardcast (action) {
    this.peers.forEach(v => {
      this.send(action, v.port, v.address)
    })
  }
  addPeers (peers) {
    peers.forEach(peer => {
      // 新节点不存在就添加进入
      if (!this.peers.find(v => this.isEqualObj(peer, v))) {
        this.peers.push(peer)
      }
    })
  }
  startNode (port) {
    this.udp.bind(port)
    // 如果不是种子节点需要通知一下
    if (port !== 8001) {
      this.send({ type: 'newpeer' }, this.seed.port, this.seed.address)// 通知的是种子节点，告诉他是新节点，只有种子节点才能够接受
      // 把种子节点加入本地节点
      this.peers.push(this.seed)
    }
  }
  send (message, port, address) {
    this.udp.send(JSON.stringify(message), port, address)
  }
  bindExit () {
    process.on('exit', () => {
      console.log('exit')
    })
  }
  // 查看余额
  blance (address) {
    let blance = 0
    this.blockchain.forEach(item => {
      // 防止像创世区块的情况data里面没数据，非数组
      if (Array.isArray(item.data)) {
        item.data.forEach(trans => {
          if (address === trans.from) {
            blance -= trans.amount
          }
          if (address === trans.to) {
            blance += trans.amount
          }
        })
      } else {

      }
    })
    console.log('aa', blance)
    return blance
  }
  // 获取最新区块
  getLastBlock () {
    return this.blockchain[this.blockchain.length - 1]
  }
  // 挖矿-打包交易
  mine (address) {
    // 校验所有交易合法性
    // if(!this.data.every((v)=>{this.isValidTransfer(v)})){
    //     return
    // }
    this.data = this.data.filter(v => { this.isValidTransfer(v) })
    // 矿工奖励
    this.transfer('0', address, 100)// address是公钥地址
    const newBlock = this.generateNewBlock()
    // 区块合法就新增一下
    if (this.isValideBlock(newBlock) && this.isValideChain()) { // 挖矿的时候
      this.blockchain.push(newBlock)
      this.data = [] // 校验合法生成新区块那么清空此区块的data
      // 广播挖矿成功
      this.boardcast({
        type: 'mine',
        data: newBlock
      })
      console.log('[信息]：挖矿成功')
      return newBlock // 为了index.js中取得数据
    } else {
      console.log('被篡改的区块:', this.getLastBlock())
    }
  }
  isValidTransfer (trans) {
    // 是不是合法转账
    return rsa.verify(trans, trans.from)
  }
  addTrans (trans) {
    if (this.isValidTransfer(trans)) {
      this.data.push(trans)
    }
  }
  // 转账
  transfer (from, to, amount) { // 现有交易信息后挖矿
    const timestamp = new Date().getTime()
    // 校验签名
    const signature = rsa.sign({ from, to, amount, timestamp })
    const sigTrans = { from, to, amount, timestamp, signature }
    if (from !== '0') { // 挖矿不需要做余额校验，是凭空产生的
      // 这里是交易验证
      const blance = this.blance(from)
      if (blance < amount) {
        console.log('余额不足', from, to, amount)
      }
      // 交易广播
      this.boardcast({
        type: 'trans',
        data: sigTrans
      })
    }
    this.data.push(sigTrans)
    return sigTrans
  }
  // 生成新区块
  generateNewBlock () {
    let nonce = 0
    const index = this.blockchain.length// 最新区块索引
    const data = this.data // 存放交易信息
    const preHash = this.getLastBlock().hash
    let timestamp = new Date().getTime()
    let hash = this.computeHash(index, preHash, timestamp, data, nonce)
    while (hash.slice(0, this.difficulty) !== '0'.repeat(this.difficulty)) {
      hash = this.computeHash(index, preHash, timestamp, data, (++nonce).toString())
    }
    return {
      index,
      data,
      preHash,
      timestamp,
      nonce,
      hash
    }
  }
  computedHashForBlock ({ index, preHash, timestamp, data, nonce }) {
    return this.computeHash(index, preHash, timestamp, data, nonce)
  }
  // 计算哈希 nonce:随机数
  computeHash (index, preHash, timestamp, data, nonce) {
    return crypto
      .createHash('sha256')// 创建实例
      .update(index + preHash + timestamp + data + nonce)// 加入数据
      .digest('hex')// 转化为想要的数据
  }
  // 校验区块
  isValideBlock (newBlock, lastBlock = this.getLastBlock()) {
    // 当前区块的index等于最新区块的index+1
    // 当前区块的time大于最新区块
    // 当前区块的preHash等于最新区块的hash
    // 当前区块符合难度要求
    // hash值校验
    if (newBlock.index !== lastBlock.index + 1) {
      return false
    } else if (newBlock.timestamp <= lastBlock.timestamp) {
      return false
    } else if (newBlock.preHash !== lastBlock.hash) {
      return false
    } else if (newBlock.hash.slice(0, this.difficulty) !== '0'.repeat(this.difficulty)) {
      return false
    } else if (newBlock.hash !== this.computedHashForBlock(newBlock)) {
      return false
    }
    return true
  }
  // 校验区块链
  isValideChain (chain = this.blockchain) {
    for (let i = chain.length - 1; i > 1; i--) {
      if (!this.isValideBlock(chain[i], chain[i - 1])) {
        return false
      }
    }
    if (JSON.stringify(chain[0]) !== JSON.stringify(initBlock)) {
      return false
    }
    return true
  }
  // 替换链条
  replaceChain (newChain) {
    // 先不校验交易
    // 排除创世区块
    console.log('替换链条执行中')
    if (newChain.length === 1) {
      return
    }
    if (this.isValideChain(newChain) && newChain.length > this.blockchain.length) {
      this.blockchain = JSON.parse(JSON.stringify(newChain))
    } else {
      console.log('[错误]: 不合法链条')
    }
  }
  // 替换交易链条
  replaceTrans (trans) {
    if (trans.every(v => this.isValidTransfer(v))) {
      this.data = trans
    }
  }
}
// let block = new Blockchain()
// block.mine()
// block.mine()
// block.mine()
// block.blockchain[3].preHash = 12
// block.mine()
// block.mine()

// console.log(block.blockchain)
module.exports = Blockchain
