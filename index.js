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
const port = process.env.NODE_PORT;

app.get('/', (req, res) => {
  res.send('Hello from Node.js!');
});

const binance = new Binance().options({
  APIKEY: process.env.BINACE_API_KEY,
  APISECRET: process.env.BINANCE_API_SECRET_KEY, 
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
const token = "6745247864:AAH6Bw7evYIJN6cAu5Hj6BmXhqeJWU5-yoM";
const bot = new TelegramBot(token, { polling: true });

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
const ws = new WebSocket("wss://stream.binance.com:9443/ws/lqtyusdt@kline_1h");
const targetTime = new Date();
targetTime.setHours(targetTime.getHours() + 1);

let chat_id = 0;
let countingStepBalance = 0;
let mileStone = 0;
let boolToCheck = false;
let notificationVolume = "";
let tradingStatus = "stop";
let tokenPairs = "";

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

bot.onText(/\/stop/, (msg) => {
  tradingStatus = "stop";
  tokenPairs = "";
  chat_id = 0;
  bot.sendMessage(msg.chat.id, "Stop bot successfully");
});

bot.on("message", (msg) => {
  if (msg.text.toString().toLowerCase().indexOf("yes") !== -1) {
    notificationVolume = "";
    boolToCheck = false;
  }

  if (msg.text.toString().toLowerCase().indexOf("invest new token") !== -1) {
    bot.sendMessage(msg.chat.id, "Please type new token pairs to invest");
  }

  if (
    msg.text.toString().toLowerCase().indexOf("usdt") !== -1 &&
    msg.text.toString().toLowerCase().indexOf("pair") !== -1
  ) {
    axios
      .get(
        `https://api.binance.com/api/v3/historicalTrades?symbol=${msg.text.split(' ')[1]}&limit=1`
      )
      .then((res) => {
        tradingStatus = "start";
        tokenPairs = msg.text.toString();
        bot.sendMessage(msg.chat.id, "BOT run successfully.");
      })
      .catch((err) => {
        bot.sendMessage(msg.chat.id, "BOT not found the token pairs.");
      });
  }
});

setTimeout(() => {
  ws.on("message", (message) => {
    const marketData = JSON.parse(message);
    const volume = marketData.k.v;
    const taker_buy_base_asset_volume = marketData.k.V;
    const taker_buy_quote_asset_volume = marketData.k.Q;
    const close_price = marketData.k.c;
    const start_time = marketData.k.t;
    const close_time = marketData.k.T;
    handleTrading(
      volume,
      taker_buy_base_asset_volume,
      taker_buy_quote_asset_volume,
      close_price,
      start_time,
      close_time
    );
  });
}, 100);

const handleTrading = async (volume, takerBase, takerQuote, closePrice) => {
  const volume1 = parseFloat(volume);
  const takerBase1 = parseFloat(takerBase);
  const takerQuote1 = parseFloat(takerQuote);
  const closePrice1 = parseFloat(closePrice);
  const rateOfUSDT = takerBase1;
  const rateOfAnother = takerQuote1 / closePrice1;
  if (tradingStatus === "start") {
    bot.sendMessage(
      chat_id,
      'bot run...'
    );
    if (
      (countingStepBalance === 3 || countingStepBalance === 2) &&
      closePrice1 <= mileStone
    ) {
      // bán hết
      bot.sendMessage(5678390935, `Bán hết step2 or step 3 - ${closePrice1}`);
      countingStepBalance = 0;
      mileStone = 0;
      tradingStatus = "stop";
    } else if (
      countingStepBalance === 1 &&
      closePrice1 <= mileStone - mileStone * 0.01
    ) {
      bot.sendMessage(5678390935, `Bán hết step 1 - ${closePrice1}`);
      countingStepBalance = 0;
      mileStone = 0;
      tradingStatus = "stop";
    }
  }

  // if (new Date().getMinutes() === 58 || new Date().getMinutes() === 59 && tradingStatus === 'start') {
  //   if (notificationVolume === "") {
  //     bot.sendMessage(
  //       5678390935,
  //       `base_asset_volume: ${rateOfAnother} - quote_asset_volume: ${rateOfUSDT}`
  //     );
  //     notificationVolume = `base_asset_volume: ${rateOfAnother} - quote_asset_volume: ${rateOfUSDT}`;
  //     bot.sendMessage(5678390935, "Reset boolToCheck and notificationVolume?", {
  //       reply_markup: {
  //         keyboard: [["Yes"], ["No"]],
  //       },
  //     });
  //   }
  //   if (rateOfAnother - rateOfUSDT > 0 && !boolToCheck) {
  //     if (countingStepBalance < 3) {
  //       if (countingStepBalance === 0 || countingStepBalance === 1) {
  //         // const balanceTrade = balance1 *  0.25; // get 10% balance to buy for the first and second trade
  //         // balance1 = balance1 - balanceTrade; // Remain of default balance after negative first and second 25% to buy tokens
  //         if (countingStepBalance === 0) {
  //           //mua 25%
  //           mileStone = closePrice1 - closePrice1 * 0.01;
  //           boolToCheck = true;
  //           bot.sendMessage(
  //             5678390935,
  //             `Giá lúc mua lần 1: ${closePrice1} - Khối lượng mua 25%`
  //           );
  //         } else {
  //           //mua 25%
  //           mileStone = closePrice1 - closePrice1 * 0.005;
  //           boolToCheck = true;
  //           bot.sendMessage(
  //             5678390935,
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
  //           5678390935,
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

ws.on("open", () => {
  console.log("Websocket connection opened");
});

ws.on("close", () => {
  console.log("Websocket connection closed");
});

const server = require("http").createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:80",
  },
});

// io.on((socket, next) => {

// })

server.listen(port, () => {
  console.log(`Let's trade now at ${port}`);
});
