const https = require('https')
const cheerio = require('cheerio')
const xlsx = require('node-xlsx')
const fs = require('fs')
const mysql = require('mysql')
let connection = mysql.createConnection({
  host: 'localhost',
  user: 'hzlj', // 用户名
  password: '123456', // 密码
  port: '3306',
  database: 'hzlj' // 数据库名称
})
let addSql = 'INSERT INTO hzljtable(title,price,address) VALUES(?,?,?)'
connection.connect((err, result) => {
  if (err) {
    console.log(err);
    console.log("连接失败");
    return;
  }
  console.log(result);
  console.log("连接成功");
});

const startPage = 1 // 开始页
const endPage = 100 // 结束页

let page = startPage // 当前抓取页
let total = 0 // 数据总数

// 初始化url
const url = 'https://hz.fang.lianjia.com/loupan/'
// https://sh.lianjia.com/zufang/pujiang1/pg2rt200600000001l0/

// 收集最终数据
let result = [
  {
    name: '链家',
    data: []
  }
]

// 抓取开始
getData(url)

/**
 * 抓取数据请求函数
 * @param {抓取地址} url
 */
function getData(url) {
  https.get(url, res => {
    let data = ''
    res.on('data', function(chunk) {
      data += chunk
    })
    res.on('end', function() {
      let formatData = filter(data) // 筛选出需要的数据
      result[0].data = result[0].data.concat(formatData) // 拼接此次抓取到的数据
      page++
      if (page <= endPage) {
        // 继续抓取下一页
        // 通过分析 url 规律，拼出下一页的 url
        let tempUrl = 'https://hz.fang.lianjia.com/loupan/pg' + page
        getData(tempUrl) // 递归继续抓取
      } else {
        // 结束抓取
        // result[0].data.push(['总数', total]); // 在最后添加一个总数
        for(var i=0;i<result[0].data.length;i++){
          connection.query(addSql,result[0].data[i], (err, result) => {
            if (err) {
              console.log('[增加失败]', err.message);
              return;
            }   
            console.log('增加成功:');
          });
        }
        console.log(result[0].data)
        writeData(result, 'LJ.xlsx') // 写入文件
      }
    })
  })
}

/**
 * 处理抓取到的dom函数
 * @param {dom数据} data
 */
function filter(data) {
  let final = [] // 用来存储本页所有数据信息
  //将页面源代码转换为$对象
  let $ = cheerio.load(data)

  if (total == 0)
    // 如果没获取过总数，那么获取一次总数
    total = $('.resblock-list-container resblock-have-find span.value').text()
  // 找到列表外层
  let items = $(
    '.resblock-list-container .resblock-list-wrapper .resblock-list'
  )
  // 遍历处理每一条数据（each是cheerio提供的方法，不可以使用forEach）
  items.each((index, item) => {
    let temp = [] // 用来存储此条数据的信息
    let price
    let title = $(item).find('a.name').text().replace(/\s/g, '')
    if (($(item).find('span.desc').text().indexOf('元/平(均价)'))>=0) {
        price = $(item).find('span.number').text()
    } else {
      return final
    }
  // 过滤万/套的数据方便处理
    let info = $(item).find('div.resblock-location').text().replace(/\s/g, '')
    let address = info
    temp.push(title, price, address)
    final.push(temp)
  })
  return final
}

/**
 *
 * @param {要写入的数据} data
 * @param {文件名} fileName
 */
function writeData(data, fileName) {
  // 写xlsx
  var buffer = xlsx.build(data);
  fs.writeFile(fileName, buffer, function (err) {
      if (err) throw err;
      console.log('Write to xls has finished');
      // 读xlsx
      // var obj = xlsx.parse("./" + "resut.xls");
      // console.log(JSON.stringify(obj));
  });
}
