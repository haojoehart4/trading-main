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
  APIKEY: process.env.BINACE_API_KEY,
  APISECRET: process.env.BINANCE_API_SECRET_KEY,
  useServerTime: true,
  reconnect: true,
  family: 4,
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

// ---------------------------------TELEGRAM-BOT------------------------------------//

// -------------------------- Binance Code Example ---------------
// Subscribe to the Binance websocket stream for the market price of BTCUSDT
let chat_id = 0;
let countingStepBalance = 0;
let mileStone = 1;
let priceStone1 = 0;
let priceStone2 = 0;
let priceStone3 = 0;
let priceBought1 = 0;
let priceBought2 = 0;
let priceBought3 = 0;
let defaultPriceStone2 = 0;
let multipleStep2 = 1;
let tradingStatus = "stop";
let tokenPairs = "btcusdt";
let intervalInvest = { text: "1m", value: timeConvert("1m") };
let boughtPrice = 0;
let isStopService = false;
let interval = null;
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
  tokenPairs = "BTCUSDT";
  await bot.sendMessage(msg.chat.id, "Stop bot successfully");
  mileStone = 1;
  priceStone1 = 0;
  priceStone2 = 0;
  priceStone3 = 0;
  priceBought1 = 0;
  priceBought2 = 0;
  defaultPriceStone2 = 0;
  multipleStep2 = 1;
  boughtPrice = 0;
  interval = null;
  clearInterval(interval); 
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
    priceStone1 =
      parseFloat(boughtPriceFloat) - parseFloat(boughtPriceFloat) * 0.02;
    priceStone2 = parseFloat(boughtPriceFloat);
    priceStone3 =
      parseFloat(boughtPriceFloat) + parseFloat(boughtPriceFloat) * 0.02;
    // priceStone3 = parseFloat(boughtPriceFloat) * 0.04 + parseFloat(boughtPriceFloat)
    // defaultPriceStone3 = parseFloat(boughtPriceFloat) * 0.04 + parseFloat(boughtPriceFloat)

    priceBought1 =
      parseFloat(boughtPriceFloat) * 0.02 + parseFloat(boughtPriceFloat);
    priceBought2 =
      parseFloat(boughtPriceFloat) * 0.04 + parseFloat(boughtPriceFloat);
    // priceBought3 = parseFloat(boughtPriceFloat) * 0.06 + parseFloat(boughtPriceFloat)

    console.log("boughtPrice::", boughtPrice);
    tradingStatus = "start";
    const connectAndListen = async () => {
      try {
        const result = await axios.get(
          `https://api.binance.com/api/v3/ticker/price?symbol=${tokenPairs.toUpperCase()}`
        );
        handleTrading(result?.data?.price);
      } catch (e) {
        console.log(e?.response?.data?.message);
      }
    };
    interval = setInterval(connectAndListen, 20000);
  }

  if (msg.text.toString().toLowerCase().indexOf("find new token") !== -1) {
    findnewtoken(bot, chat_id);
  }
});

const handleTrading = async (close_price) => {
  binance.balance((error, balances) => {
    if (error) return console.error(error.body);
    bot.sendMessage(chat_id, balances.USDT.available);
  });

  //buy case
  // bot.sendMessage(chat_id, close_price);
  if (close_price >= priceBought1 && mileStone === 1) {
    mileStone += 1;
    console.log("mileStone::", mileStone);
  } else if (
    close_price >= priceBought2 &&
    (mileStone === 2 || mileStone === 3)
  ) {
    // mileStone += 1
    console.log("mileStone::", mileStone);
    const futurePrice = close_price / priceBought2 - 1;
    if (futurePrice >= 0.005 * multipleStep2) {
      priceBought2 = defaultPriceStone2 + defaultPriceStone2 * 0.005;
      mileStone = 3;
    }
  }

  //sold case
  if (close_price <= priceStone1) {
    bot.sendMessage(
      chat_id,
      `Sell all tokens with price ${close_price} at default position`
    );
    clearInterval(interval);
  } else {
    if (close_price <= priceStone2 && mileStone === 2) {
      bot.sendMessage(
        chat_id,
        `Sell all tokens with price ${close_price} at mileStone = ${mileStone}`
      );
      clearInterval(interval);
    } else if (close_price <= priceStone3 && mileStone === 3) {
      bot.sendMessage(
        chat_id,
        `Sell all tokens with price ${close_price} at mileStone = ${mileStone}`
      );
      clearInterval(interval);
    }
  }

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
