const https = require("https");
const http = require("http");
const cheerio = require("cheerio");
const xlsx = require("node-xlsx");
const fs = require("fs");
const mysql = require("mysql");

const startPage = 1; // 开始页
const endPage = 100; // 结束页

let page = startPage; // 当前抓取页
let total = 0; // 数据总数

// 初始化url
const url = "https://hz.fang.lianjia.com/loupan/";
// 收集最终数据
let result = [
];

// 抓取开始
getData(url);

/**
 * 抓取数据请求函数
 * @param {抓取地址} url
 */
function getData(url) {
  https.get(url, res => {
    let data = "";
    res.on("data", function(chunk) {
      data += chunk;
    });
    res.on("end", function() {
      let formatData = filter(data); // 筛选出需要的数据
      result = result.concat(formatData); // 拼接此次抓取到的数据
      page++;
      if (page <= endPage) {
        // 继续抓取下一页
        // 通过分析 url 规律，拼出下一页的 url
        let tempUrl = "https://hz.fang.lianjia.com/loupan/pg" + page;
        getData(tempUrl); // 递归继续抓取
      } else {
        fs.writeFile(
          "url.js",
          "let data = " + JSON.stringify(result),
          err => {
            if (!err) console.log("success~");
          }
        );
      }
    });
  });
}

/**
 * 处理抓取到的dom函数
 * @param {dom数据} data
 */
function filter(data) {
  let final = []; // 用来存储本页所有数据信息
  //将页面源代码转换为$对象
  let $ = cheerio.load(data);

  if (total == 0)
    // 如果没获取过总数，那么获取一次总数
    total = $(".resblock-list-container resblock-have-find span.value").text();
  // 找到列表外层
  let items = $(
    ".resblock-list-container .resblock-list-wrapper .resblock-list"
  );
  // 遍历处理每一条数据（each是cheerio提供的方法，不可以使用forEach）
  items.each((index, item) => {
    let temp = {}; // 用来存储此条数据的信息
    let price;
    let title = $(item)
      .find("a.name")
      .text()
      .replace(/\s/g, "");
    if (
      $(item)
        .find("span.desc")
        .text()
        .indexOf("元/平(均价)") >= 0
    ) {
      price = $(item)
        .find("span.number")
        .text();
    } else {
      return final;
    }
    // 过滤万/套的数据方便处理
    let info = $(item)
      .find("div.resblock-location")
      .text()
      .replace(/\s/g, "");
    let address = info;
    temp.name = title;
    temp.value = price;
    temp.address=address
    final.push(temp);
  });
  return final;
}
