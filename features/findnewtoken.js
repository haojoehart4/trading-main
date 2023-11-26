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

const findnewtoken = (telegramBot, chat_id) => {
  axios
    .get(`https://api.binance.com/api/v3/exchangeInfo`)
    .then(async (res) => {
      let childArray = [];
      let tokenPairsPriceChange = [];

      //filter 12 hours
      // childArray = await handleSeperateSymbols(res?.data, true);
      // const loopResult12h = await handleLoop(childArray, [-3, 1], "12h");
      // usdtPairsString = loopResult12h.usdt_pair_string;
      // tokenPairsPriceChange = loopResult12h.token_pairs_price_change;

      //filter 2 hours
      childArray = await handleSeperateSymbols(res?.data, true);
      const loopResult = await handleLoop(childArray, 0.8, "2h");
      usdtPairsString = loopResult.usdt_pair_string;
      tokenPairsPriceChange = loopResult.token_pairs_price_change;

      let responseResult = [];
      for (let i of tokenPairsPriceChange) {
        let buyVolume = 0;
        let sellVolume = 0;
        const result = await axios.get(
          `https://api.binance.com/api/v3/trades?symbol=${i.symbol}&limit=1000`
        );
        for (let x of result?.data) {
          if (x?.isBuyerMaker) {
            sellVolume += parseFloat(x?.qty);
          } else {
            buyVolume += parseFloat(x?.qty);
          }
        }

        if(buyVolume / sellVolume > 1.5) {
            responseResult.push(
              `${i.symbol}: sell_volume(${sellVolume}), buy_volume(${buyVolume}), percent_change: ${i.price_percent_change} \n`
            );
        }
      }

      const responseResultString = responseResult.length > 0 ? responseResult.join("\n") : 'Không có coin nào để mua hết!';
      await telegramBot.sendMessage(chat_id, responseResultString);
    })
    .catch((err) => {
      console.log(err);
    });
};

module.exports = findnewtoken;
