// 密码分装的第三方库： https://github.com/indutny/elliptic
// 公钥直接当成地址用（或者截取公钥前20位）
// 公钥可以根据私钥计算出来
var fs = require('fs') 
var EC = require('elliptic').ec;

// Create and initialize EC context
// (better do it once and reuse it)
var ec = new EC('secp256k1');// 指定某种加密算法

// Generate keys 
var keypair = ec.genKeyPair(); // 生成了简单的公私钥对

//取出来
// const res = {
//     prv: keypair.getPrivate('hex').toString(),
//     pub: keypair.getPublic('hex').toString()
// }
// 持久化公私钥对
const keys = generateKeys()
console.log(keys.pub)
function generateKeys(){
    const fileName = './wallet.json'
    try{
        let res = JSON.parse(fs.readFileSync(fileName)) 
        if(res.prv&&res.pub&&getPub(res.prv)==res.pub){
            keypair = ec.keyFromPrivate(res.prv)
            return res
        }else {
            throw 'wrong'
        }
    }catch(error){
        //公私钥对未录入
        const res = {
            prv: keypair.getPrivate('hex').toString(),
            pub: keypair.getPublic('hex').toString()
        }
        fs.writeFileSync(fileName,JSON.stringify(res))
        return res
    }
}
//由私钥得出公钥
function getPub(prv){
    return ec.keyFromPrivate(prv).getPublic('hex').toString()

}
// 签名
function sign({from,to,amount}){
    // 字符串信息转化为二进制
    const bufferMsg = Buffer.from(`${from}-${to}-${amount}`)
    //把二进制塞入签名api然后还是转化为二进制,最后转化为字符串;keypair是公私钥对
    let signature = Buffer.from(keypair.sign(bufferMsg).toDER()).toString('hex')
    return signature
}
//校验签名,检验是没有私钥的
function verify({from, to, amount, signature}, pub){
    const keypairTemp =  ec.keyFromPublic(pub,'hex')//这里获取公钥指定了而格式
    const bufferMsg = Buffer.from(`${from}-${to}-${amount}`)
    //api 校验信息和签名
    return keypairTemp.verify(bufferMsg,signature) 
}
const trans = {from: 'ym', to: 'mt', amount: 100 }
const trans1 = {from: 'ym1', to: 'mt', amount: 100 }
const signature = sign(trans1)
trans1.signature = signature
console.log(verify(trans1,keys.pub))
// console.log(res)
module.exports = {sign, verify, keys}