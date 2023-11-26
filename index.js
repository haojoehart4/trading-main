const express = require("express");
const app = express();
const { Server } = require("socket.io");
// const ws = require('ws')
const cors = require("cors");
const mysql = require("mysql2");
const Binance = require("node-binance-api");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const axios = require("axios");
app.use(cors());
app.use(cookieParser());
app.use(express.json());
const request = require("request");
const _ = require("lodash");
dotenv.config();
const WebSocket = require("ws");
const schedule = require("node-schedule");
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
const TelegramBot = require("node-telegram-bot-api");
const { timeConvert } = require("./utils/helper");
const findnewtoken = require("./features/findnewtoken");

app.get("/", (req, res) => {
  res.send("Hello from Node.js!");
});

const binance = new Binance().options({
  APIKEY:
    process.env.BINACE_API_KEY ||
    "8Xktj5lcXas28Zwa9GY1n9cRFV8xAd9yrWX8pxzWKvZaqt7GOGesqm03x8NkSERO",
  APISECRET:
    process.env.BINANCE_API_SECRET_KEY ||
    "d5fJ0KFH2AO6iHUqkhyO9pUCkUIonrg4YLwW8KerXrw2ezQhgmHzlcR8Uv2SLZPQ",
});

// binance.futuresPrices()
// .then((data) => console.log(`Future Price`, data))
// .catch((err) => console.log(err))

// binance.futuresAccount()
// .then((data) => console.log(`Future ACCOUNT`, data))
// .catch((err) => console.log(err))

// binance.marketSell("FISUSDT", 64)
// .then((data) => console.log('__', data))
// .catch((err) => console.log(err.body))

// binance.prices('LQTYUSDT', (error, ticker) => {
//   console.info("Price of BNB: ", ticker);
// });

// binance.bookTickers('LQTYUSDT')
// .then((x) => console.log('bookTickers::', x))
// .catch((err) => console.log(err))

// binance.depth("LQTYUSDT", (error, depth, symbol) => {
//   console.info(symbol+" market depth", depth);
// });

// binance.trades("LQTYUSDT", (error, trades, symbol) => {
//   let totalBuyVolume = 0;
//   let totalSellVolume = 0;
//   for (let trade of trades) {
//     if (trade.isBuyer) {
//       totalBuyVolume += parseFloat(trade.qty);
//     } else {
//       totalSellVolume += parseFloat(trade.qty);
//     }
//   }
//   console.log("Total buy volume: ", totalBuyVolume);
//   console.log("Total sell volume: ", totalSellVolume);
// });

// binance.balance((error, balances) => {
//   if ( error ) return console.error(error);
//   console.info("balances()", balances);
//   console.info("ETH balance: ", balances.ETH.available);
// });

// binance.futuresMiniTickerStream( 'LQTYUSDT', (response) => {
//   console.log('LQTYUSDT::', response)
// })

// Get the depth of market for the LQTYUSDT trading pair
// binance.futuresDepth( 'BTCUSDT', (error, depth) => {
//   console.log('response::', depth)
// });

// ====//===
// const getKLines = async (marketSymbol, timeInterval, startTime, endTime) => {
//   const instance = axios.create({
//     baseURL: `https://api.binance.com/api/v3`,
//   });
//   const response = await axios.get(
//     `https://api.binance.com/api/v3/klines?symbol=${marketSymbol}&interval=${timeInterval}&startTime=${startTime}&endTime=${endTime}&limit=${1000}`
//   );
//   return response.data;
// };
// getKLines('LQTYUSDT', '1h', new Date('11/17/2023 03:00:00').getTime(),  new Date('11/17/2023 07:00:00').getTime())

// ---------------------------------TELEGRAM-BOT------------------------------------//
const token = process.env.TELEGRAM_HAPPIER_TRADING_BOT;
const bot = new TelegramBot(token, {
  polling: true,
});

bot.on("polling_error", (msg) => console.log(msg));
// bot.onText(/\/start/, (msg) => {
//   bot.sendMessage(msg.chat.id, 'Welcome to Mr.Hoa space')
// })
// bot.on('message', (msg) => {
//   const greetingText = 'hi'
//   if(msg.text.toString().toLowerCase().indexOf(greetingText) === 0) {
//     bot.sendMessage(msg.chat.id, 'I am a bot which was created by Mr.Hoa, what do you want now?', {
//       "reply_markup": {
//         "keyboard": [["Find new token to invest"], ["Get price of BTC now"], ["Get balance information"]]
//       }
//     })
//   }

//   if(msg.text.toString().toLowerCase().indexOf('btc') !== -1){
//     axios.get(`https://api.binance.com/api/v3/avgPrice?symbol=BTCUSDT`)
//     .then((res) => {
//       bot.sendMessage(msg.chat.id, `Average price of Bitcoin now is: ${res.data.price} usd`)
//     })
//   }

//   if(msg.text.toString().toLowerCase().indexOf('balance') !== -1) {
//     binance.balance((error, balances) => {
//       if ( error ) return console.error(error);
//       let balanceResult = []
//       for(const x in balances) {
//         if(parseFloat(balances[x].available) > 0) {
//           balanceResult.push(`${x}: ${balances[x].available}`)
//         }
//       }
//       const responseToUser = balanceResult.join(', ')
//       bot.sendMessage(msg.chat.id, `Your balance information here: ${responseToUser}`)
//     });
//   }
// });

// ---------------------------------TELEGRAM-BOT------------------------------------//

// -------------------------- Binance Code Example ---------------
// Subscribe to the Binance websocket stream for the market price of BTCUSDT
let chat_id = 0;
let countingStepBalance = 0;
let mileStone = 1;
let priceStone1 = 0
let priceStone2 = 0
let priceStone3 = 0
let priceBought1 = 0
let priceBought2 = 0
let priceBought3 = 0
let defaultPriceStone2 = 0;
let multipleStep2 = 1;
let redFlag = false;
let tradingStatus = "stop";
let tokenPairs = "btcusdt";
let intervalInvest = { text: "1m", value: timeConvert("1m") };
let boughtPrice = 0;
let startTime = new Date();
let ws = null;

const targetTime = new Date();
targetTime.setHours(targetTime.getHours() + 1);

bot.onText(/\/start/, (msg) => {
  chat_id = msg.chat.id;
  bot.sendMessage(
    msg.chat.id,
    "Hello mate, wish your day will be greater than yesterday. Can i help you ?",
    {
      reply_markup: {
        keyboard: [
          [
            "Invest new token",
            "Find new token to invest",
            "Get balance information",
          ],
        ],
      },
    }
  );
});

bot.onText(/\/stop/, async (msg) => {
  tradingStatus = "stop";
  tokenPairs = "";
  chat_id = 0;
  await bot.sendMessage(msg.chat.id, "Stop bot successfully");
  if (bot.isPolling()) {
    await bot.stopPolling({ cancel: true });
  }
  //  ws.close()
});

bot.on("message", (msg) => {
  if (msg.text.toString().toLowerCase().indexOf("yes") !== -1) {
    notificationVolume = "";
    boolToCheck = false;
  }

  if (msg.text.toString().toLowerCase().indexOf("invest new token") !== -1) {
    bot.sendMessage(msg.chat.id, "Please type new token pairs to invest");
  }

  if (msg.text.toString().toLowerCase().indexOf("balance") !== -1) {
    binance.balance((error, balances) => {
      if (error) return console.error(error);
      let balanceResult = [];
      for (const x in balances) {
        if (parseFloat(balances[x].available) > 0) {
          balanceResult.push(`${x}: ${balances[x].available}`);
        }
      }
      const responseToUser = balanceResult.join(", ");
      bot.sendMessage(
        msg.chat.id,
        `Your balance information here: ${responseToUser}`
      );
    });
  }

  if (
    msg.text.toString().toLowerCase().indexOf("usdt") !== -1 &&
    msg.text.toString().toLowerCase().indexOf("pair") !== -1
  ) {
    axios
      .get(
        `https://api.binance.com/api/v3/historicalTrades?symbol=${msg.text
          .split(" ")[1]
          .trim()
          .toUpperCase()}&limit=1`
      )
      .then((res) => {
        tokenPairs = msg.text.split(" ")[1].trim();
        bot.sendMessage(chat_id, "Please type bought price homie.");
      })
      .catch((err) => {
        bot.sendMessage(msg.chat.id, err.message);
        bot.sendMessage(msg.chat.id, "BOT not found the token pairs.");
      });
  }

  if (msg.text.toString().toLowerCase().indexOf("price") !== -1) {
    const boughtPriceFloat = msg.text.split(":")[1].trim();
    boughtPrice = parseFloat(boughtPriceFloat);
    priceStone1 = parseFloat(boughtPriceFloat) - parseFloat(boughtPriceFloat) * 0.02
    priceStone2 = parseFloat(boughtPriceFloat)
    priceStone3 = parseFloat(boughtPriceFloat) + parseFloat(boughtPriceFloat) * 0.02
    // priceStone3 = parseFloat(boughtPriceFloat) * 0.04 + parseFloat(boughtPriceFloat)
    // defaultPriceStone3 = parseFloat(boughtPriceFloat) * 0.04 + parseFloat(boughtPriceFloat)

    priceBought1 = parseFloat(boughtPriceFloat) * 0.02 + parseFloat(boughtPriceFloat)
    priceBought2 = parseFloat(boughtPriceFloat) * 0.04 + parseFloat(boughtPriceFloat)
    // priceBought3 = parseFloat(boughtPriceFloat) * 0.06 + parseFloat(boughtPriceFloat)

    console.log("boughtPrice::", boughtPrice);
    bot.sendMessage(msg.chat.id, "Please set the interval to invest.", {
      reply_markup: {
        keyboard: [
          ["interval: 1m", "interval: 2m"],
          ["interval: 3m", "interval: 5m"],
          ["interval: 7m", "interval: 9m"],
          ["interval: 11m", "interval: 30m"],
          ["interval: 1h", "interval: 2h"],
          ["interval: 4h", "interval: 6h"],
          ["interval: 8h", "interval: 12h"],
        ],
      },
    });
  }

  if (msg.text.toString().toLowerCase().indexOf("interval") !== -1) {
    tradingStatus = "start";
    intervalInvest = {
      text: msg.text.toString().split(":")[1].trim(),
      value: timeConvert(msg.text.toString().split(":")[1].trim()),
    };
    timeConvert(intervalInvest.text).then(async(res) => {
      const connectAndListen = () => {
        ws = new WebSocket(
          `wss://stream.binance.com:9443/ws/${tokenPairs.toLowerCase()}@kline_${
            intervalInvest.text
          }`
        );

        ws.on("open", () => {
          console.log("Connect open")
        });

        //multiple signal in one time => redFlag = true => multiple ws.close() => 1st one close then the second can not close the websocket
         ws.on("message", async (message) => {
          if (!redFlag) {
            const marketData = JSON.parse(message);
            const close_price = parseFloat(marketData.k.c);
            await handleTrading(close_price);
          } else {
            if(ws.isReadyState === 1) {
              ws.close();
              redFlag = false;
            }
          }
        });

        // if(redFlag) {
        //   ws.close()
        //   bot.sendMessage(chat_id, `close connect:: ${redFlag}`)
        //   redFlag = false
        // }

        // setTimeout(() => {
        //   ws.close()
        //   bot.sendMessage(chat_id, `close connect:: ${redFlag}`)
        // }, 10000);
      };
      setInterval(connectAndListen, 40000);
    });
    // ws = new WebSocket(
    //   `wss://stream.binance.com:9443/ws/${tokenPairs.toLowerCase()}@kline_${intervalInvest}`
    // );

    // ws.on("message", (message) => {
    //   const marketData = JSON.parse(message);
    //   const volume = marketData.k.v;
    //   const taker_buy_base_asset_volume = marketData.k.V;
    //   const taker_buy_quote_asset_volume = marketData.k.Q;
    //   const close_price = marketData.k.c;
    //   const start_time = marketData.k.t;
    //   const close_time = marketData.k.T;
    //   handleTrading(
    //     volume,
    //     taker_buy_base_asset_volume,
    //     taker_buy_quote_asset_volume,
    //     close_price,
    //     start_time,
    //     close_time
    //   );
    // });

    //   ws.on("message", async(message) => {
    //     const marketData = JSON.parse(message);
    //     const volume = marketData.k.v;
    //     const taker_buy_base_asset_volume = marketData.k.V;
    //     const taker_buy_quote_asset_volume = marketData.k.Q;
    //     const close_price = marketData.k.c;
    //     const start_time = marketData.k.t;
    //     const close_time = marketData.k.T;
    //     handleTrading(
    //       volume,
    //       taker_buy_base_asset_volume,
    //       taker_buy_quote_asset_volume,
    //       close_price,
    //       start_time,
    //       close_time
    //     );
    //     await bot.sendMessage(msg.chat.id, close_price)
    //     .catch(err => {
    //       console.log('haha', err.response.data.message)
    //     })

    //     setTimeout(() => {
    //       ws.close()
    //     }, 20000);
    //   });

    // }

    // setInterval(() => {
    //   if(tradingStatus === 'start') {
    //     ws.close()
    //   }
    // }, 30000)
    // ws = new WebSocket(
    //   `wss://stream.binance.com:9443/ws/${tokenPairs.toLowerCase()}@kline_${
    //     intervalInvest !== "" ? intervalInvest : "1h"
    //   }`
    // );

    // ws.on("message", (message) => {
    //   const marketData = JSON.parse(message);
    //   const volume = marketData.k.v;
    //   const taker_buy_base_asset_volume = marketData.k.V;
    //   const taker_buy_quote_asset_volume = marketData.k.Q;
    //   const close_price = marketData.k.c;
    //   const start_time = marketData.k.t;
    //   const close_time = marketData.k.T;
    //   handleTrading(
    //     volume,
    //     taker_buy_base_asset_volume,
    //     taker_buy_quote_asset_volume,
    //     close_price,
    //     start_time,
    //     close_time
    //   );
    // });

    // ws.on("open", () => {
    //   console.log("Websocket connection opened");
    // });

    // ws.on("close", () => {
    //   console.log("Websocket connection closed");
    // });
  }

  if (msg.text.toString().toLowerCase().indexOf("find new token") !== -1) {
    findnewtoken(bot, chat_id);
  }
});


const handleTrading = async (close_price) => {
  //buy case
  if(close_price >= priceBought1 && mileStone === 1) {
    mileStone += 1
    console.log('mileStone::', mileStone)
  } else if(close_price >= priceBought2 && mileStone === 2) {
    // mileStone += 1
    console.log('mileStone::', mileStone)
    const futurePrice = close_price / priceBought2 - 1
    if(futurePrice >= 0.005 * multipleStep2) {
      priceBought2 = defaultPriceStone2 + defaultPriceStone2 * 0.005 
    }

  } 

  //sold case
  if(close_price <= boughtPrice) {
    bot.sendMessage(chat_id, `Sell all tokens with price ${close_price} at default position`)
  } else {
    if(close_price <= priceStone1 && mileStone === 1) {
      bot.sendMessage(chat_id, `Sell all tokens with price ${close_price} at mileStone = ${mileStone}`)
    } else if(close_price <= priceStone2 && mileStone === 2) {
      bot.sendMessage(chat_id, `Sell all tokens with price ${close_price} at mileStone = ${mileStone}`)
    }
  }

  redFlag = true
  // bot.sendMessage(chat_id, data.close_price);
  // const volume = parseFloat(data.volume);
  // const quoteVolume = parseFloat(data.quoteVolume);
  // const weightedAvgPrice = parseFloat(data.weightedAvgPrice);
  // let quantityBuy = 0;
  // let quantitySell = 0;
  // let lastPrice = 0;
  // for (let i = 0; i < data.length; i++) {
  //   if(i === data.length - 1) {
  //     lastPrice =  parseFloat(data[i].price)
  //   }
  //   if(data[i]?.isBuyerMaker) {
  //     quantityBuy += parseFloat(data[i]?.qty)
  //   } else {
  //     quantitySell += parseFloat(data[i]?.qty)
  //   }
  // }
  // bot.sendMessage(chat_id, `quantityBuy: ${quantityBuy}, quantitySell: ${quantitySell}, lastPrice: ${lastPrice}`)
  // bot.sendMessage(chat_id, closePrice)
  // if (tradingStatus === "start") {
  //   if (
  //     (countingStepBalance === 3 || countingStepBalance === 2) &&
  //     closePrice1 <= mileStone
  //   ) {
  //     // bán hết
  //     bot.sendMessage(chat_id, `Bán hết step2 or step 3 - ${closePrice1}`);
  //     countingStepBalance = 0;
  //     mileStone = 0;
  //     tradingStatus = "stop";
  //   } else if (
  //     countingStepBalance === 1 &&
  //     closePrice1 <= mileStone - mileStone * 0.01
  //   ) {
  //     bot.sendMessage(chat_id, `Bán hết step 1 - ${closePrice1}`);
  //     countingStepBalance = 0;
  //     mileStone = 0;
  //     tradingStatus = "stop";
  //   }
  // }
  // if (
  //   (new Date().getMinutes() === 58 ||new Date().getMinutes() === 59) && tradingStatus === "start"
  // ) {
  //   if (notificationVolume === "") {
  //     bot.sendMessage(
  //       chat_id,
  //       `base_asset_volume: ${rateOfAnother} - quote_asset_volume: ${rateOfUSDT}`
  //     );
  //     notificationVolume = `base_asset_volume: ${rateOfAnother} - quote_asset_volume: ${rateOfUSDT}`;
  //     bot.sendMessage(chat_id, "Reset boolToCheck and notificationVolume?", {
  //       reply_markup: {
  //         keyboard: [["Yes"], ["No"]],
  //       },
  //     });
  //   }
  //   if (rateOfAnother - rateOfUSDT > 0 && !boolToCheck) {
  //     if (countingStepBalance < 3) {
  //       if (countingStepBalance === 0 || countingStepBalance === 1) {
  //         if (countingStepBalance === 0) {
  //           //mua 25%
  //           mileStone = closePrice1 - closePrice1 * 0.01;
  //           boolToCheck = true;
  //           bot.sendMessage(
  //             chat_id,
  //             `Giá lúc mua lần 1: ${closePrice1} - Khối lượng mua 25%`
  //           );
  //         } else {
  //           //mua 25%
  //           mileStone = closePrice1 - closePrice1 * 0.005;
  //           boolToCheck = true;
  //           bot.sendMessage(
  //             chat_id,
  //             `Giá lúc mua lần 2: ${closePrice1} - Khối lượng mua 25% - Update milestone lên ${mileStone}`
  //           );
  //         }
  //       } else if (
  //         countingStepBalance === 2 &&
  //         1.002 < rateOfAnother / rateOfUSDT < 1.1
  //       ) {
  //         mileStone = closePrice1 - closePrice1 * 0.005;
  //         boolToCheck = true;
  //         bot.sendMessage(
  //           chat_id,
  //           `Giá lúc mua lần 3: ${closePrice1} - Khối lượng mua 50% - Update milestone lên ${mileStone}`
  //         );
  //         isEndBalance = true;
  //         // mua 50%
  //       }
  //       countingStepBalance += 1;
  //     } else {
  //       if (rateOfAnother - rateOfUSDT > 0) {
  //         mileStone = closePrice1 - closePrice1 * 0.005;
  //       }
  //     }
  //   }
  // }
};

const server = require("http").createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:80",
  },
});

// io.on((socket, next) => {

// })

const port = process.env.PORT || process.env.NODE_PORT;
server.listen(port, () => {
  console.log(`Let's trade now at ${port}`);
});
