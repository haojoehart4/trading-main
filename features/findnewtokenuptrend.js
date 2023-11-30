const axios = require("axios");
const _ = require("lodash");

const handleFilterCondition = async (
  filterParam,
  usdtPairString,
  intervalTime
) => {
  const result = await axios.get(
    `https://api.binance.com/api/v3/ticker?windowSize=${intervalTime}&symbols=${usdtPairString}`
  );
  const highPercentChange = await result?.data?.filter((x) =>
    _.isArray(filterParam)
      ? parseFloat(x.priceChangePercent) > filterParam[0] && parseFloat(x.priceChangePercent) < filterParam[1]
      : parseFloat(x.priceChangePercent) > filterParam
  );
  const arr = highPercentChange?.map((x) => {
    return {
      symbol: x.symbol,
      price_percent_change: x?.priceChangePercent,
    };
  });
  return arr;
};

const handleLoop = async (childArray, filterParam, intervalTime) => {
  let usdtPairsString = "";
  let tokenPairsPriceChange = [];
  for (let i = 0; i < childArray.length; i++) {
    //join string [[1,2], [3,4]]
    usdtPairsString = `%5B${childArray[i]?.join(",")}%5D`;
    //filter 2 hours
    const result = await handleFilterCondition(
      filterParam,
      usdtPairsString,
      intervalTime
    );
    tokenPairsPriceChange = [...tokenPairsPriceChange, ...result];

    const usdtPairsArr = tokenPairsPriceChange.map((x) => `%22${x.symbol}%22`);
    usdtPairsString = `%5B${usdtPairsArr.join(",")}%5D`;
  }

  return {
    usdt_pair_string: usdtPairsString,
    token_pairs_price_change: tokenPairsPriceChange,
  };
};

const handleSeperateSymbols = async (arr, isGetAPI = false) => {
  let usdtPairs;
  if (isGetAPI) {
    usdtPairs = await arr?.symbols
      ?.filter((symbol) => symbol.quoteAsset === "USDT")
      ?.map((item) => {
        return `%22${item.symbol}%22`;
      });
  } else {
    usdtPairs = await arr?.map((item) => {
      return `%22${item.symbol}%22`;
    });
  }

  const limitLoop = usdtPairs.length / 99;
  let childArray = [];
  for (let i = 0; i < Math.ceil(limitLoop); i++) {
    const arr = await usdtPairs.slice(i * 99, 99 * (i + 1));
    childArray.push(arr);
    i++;
  }

  return childArray;
};

const findnewtokenuptrend = (telegramBot, chat_id) => {
  axios
    .get(`https://api.binance.com/api/v3/exchangeInfo`)
    .then(async (res) => {
      let childArray = [];
      let tokenPairsPriceChange = [];

      //filter 12 hours
      childArray = await handleSeperateSymbols(res?.data, true);
      const loopResult12h = await handleLoop(childArray, [-5, -1], "8h");
      usdtPairsString = loopResult12h.usdt_pair_string;
      tokenPairsPriceChange = loopResult12h.token_pairs_price_change;

      //filter 2 hours
      childArray = await handleSeperateSymbols(tokenPairsPriceChange);
      const loopResult = await handleLoop(childArray, 0.3, "2h");
      usdtPairsString = loopResult.usdt_pair_string;
      tokenPairsPriceChange = loopResult.token_pairs_price_change;

      let responseResult = [];
      for (let i of tokenPairsPriceChange) {
        let buyVol4Hrs = 0;
        let sellVol4Hrs = 0;
        let buyVol2Hrs = 0;
        let sellVol2Hrs = 0;
        // const result = await axios.get(
        //   `https://api.binance.com/api/v3/trades?symbol=${i.symbol}&limit=1000`
        // );
        const coupleFilterLatest = {startTime: new Date().getTime() - (2 * 60 * 60* 1000), endTime: new Date().getTime()}

        const coupleFilter4HsAgo = {startTime: new Date().getTime() - (4 * 60 * 60* 1000), endTime: new Date().getTime() - (2 * 60 * 60* 1000)}

        const resultPast4Hours = await axios.get(`https://api.binance.com/api/v3/aggTrades?symbol=${i.symbol}&limit=1000&startTime=${coupleFilter4HsAgo?.startTime}&endTime=${coupleFilter4HsAgo?.endTime}`)

        for (let x of resultPast4Hours?.data) {
          if (x?.m) {
            sellVol4Hrs += parseFloat(x?.q);
          } else {
            buyVol4Hrs += parseFloat(x?.q);
          }
        }

        const past4HoursRate = buyVol4Hrs / sellVol4Hrs

        const resultPast2Hours = await axios.get(`https://api.binance.com/api/v3/aggTrades?symbol=${i.symbol}&limit=1000&startTime=${coupleFilterLatest?.startTime}&endTime=${coupleFilterLatest?.endTime}`)

        for (let x of resultPast2Hours?.data) {
          if (x?.m) {
            sellVol2Hrs += parseFloat(x?.q);
          } else {
            buyVol2Hrs += parseFloat(x?.q);
          }
        }

        const past2HoursRate = buyVol2Hrs / sellVol2Hrs

        if(past2HoursRate > past4HoursRate && buyVol2Hrs > buyVol4Hrs && sellVol2Hrs < sellVol4Hrs) {
          responseResult.push(
            `${i.symbol}: sold volume in 4h: (${sellVol4Hrs}), bought volume in 4h: (${buyVol4Hrs}), sold volume in 2h: (${sellVol2Hrs}), bought volume in 2h: (${buyVol2Hrs}), percent_change: ${i.price_percent_change} \n`
          )
        }
      }

      const responseResultString = responseResult.length > 0 ? responseResult.join("\n") : 'Không có coin nào để mua hết!';
      await telegramBot.sendMessage(chat_id, responseResultString);
    })
    .catch((err) => {
      console.log(err);
    });
};

module.exports = findnewtokenuptrend;
