let sha256 = require("js-sha256").sha256
//this.password = sha256(this.passWord)//要加密的密码
// console.log(this.password)//这就是你加密之后的密码
class Blockchain{
    constructor(){
        this.chain = [] // 块
        this.currentTransactions = [] //当前的交易信息
        this.lastBlock = function () {//获取最后一个块的索引？
         return this.chain.pop()
        }
        this.newBlock()//创建创世区块 
    }
    newBlock(proof,previousHash=none) {//添加一个块
        var block ={
            index: this.chain.length ? this.chain.length + 1 : 1 ,
            timestamp: Date.parse(new Date()),
            transactions: this.currentTransactions,//当前交易信息
            proof: `${proof}`, //这个区块的工作量证明，
            previousHash: previousHash!==none ? `${previousHash}` : this.hash(this.chain.pop())   //上一个区块的哈希值
        }
        this.currentTransactions = [] //已经打包成区块，当前交易清空
        this.chain.push(block)
        return block

    }
    newTransaction(sender,recipient,amount) {//添加交易 // 后期这里可以解构优化一下
        let object= {}
        obj.sender = sender
        obj.recipient =recipient
        obj.amount = amount
        this.currentTransactions.push(obj)
        return this.lastBlock.pop()+1 //返回的是int类型，是最新的区块索引
    }
    hash () {//计算hash值
        sha256(this.passWord)//  这里有问题，原本是要拿到摘要信息，hexdigest是python中方法
    }
}