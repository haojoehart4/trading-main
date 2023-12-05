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
  const highPercentChange = await result?.data?.filter(
    (x) => parseFloat(x.priceChangePercent) < filterParam
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

let sleep = (time) => new Promise((resolve) => setTimeout(resolve, time));

const refetchGetVol = async (coupleFilters) => {
  let isComplete = false;
  let sellVol = coupleFilters.sellVol;
  let buyVol = coupleFilters.buyVol;
  let timeout;
  const result = await axios.get(
    `https://api.binance.com/api/v3/aggTrades?symbol=${coupleFilters.symbol}&limit=1000&startTime=${coupleFilters?.startTime}&endTime=${coupleFilters?.endTime}`
  );
  isComplete =
    (await result?.data?.filter((x) => x.T < coupleFilters?.endTime)?.length) <
    1000
      ? true
      : false;

  await result?.data?.map((x) => {
    if (x?.m) {
      sellVol += parseFloat(x?.q);
    } else {
      buyVol += parseFloat(x?.q);
    }
  });

  if (isComplete) {
    return { isComplete: isComplete, sellVol: sellVol, buyVol: buyVol };
  }

  await sleep(1000);

  return refetchGetVol({
    startTime: result?.data.at(-1)?.T,
    endTime: coupleFilters?.endTime,
    symbol: coupleFilters?.symbol,
    buyVol: buyVol,
    sellVol: sellVol,
  });
};

const findnewtokenuptrend = (telegramBot, chat_id) => {
  axios
    .get(`https://api.binance.com/api/v3/exchangeInfo`)
    .then(async (res) => {
      let childArray = [];
      let tokenPairsPriceChange = [];

      // filter 16h hours
      childArray = await handleSeperateSymbols(res?.data, true);
      const loopResult16Hrs = await handleLoop(childArray, -4.5, "16h");
      usdtPairsString = loopResult16Hrs.usdt_pair_string;
      tokenPairsPriceChange = loopResult16Hrs.token_pairs_price_change;

      //filter 8h hours
      childArray = await handleSeperateSymbols(tokenPairsPriceChange);
      const loopResult4Hrs = await handleLoop(childArray, -2.5, "8h");
      usdtPairsString = loopResult4Hrs.usdt_pair_string;
      tokenPairsPriceChange = loopResult4Hrs.token_pairs_price_change;

      //filter 2 hours
      childArray = await handleSeperateSymbols(tokenPairsPriceChange);
      const loopResult = await handleLoop(childArray, -1.5, "4h");
      usdtPairsString = loopResult.usdt_pair_string;
      tokenPairsPriceChange = loopResult.token_pairs_price_change;

      let responseResultUp = [];
      for (let i of tokenPairsPriceChange) {
        let buyVol2Hrs = 0;
        let sellVol2Hrs = 0;
        let buyVol1Hr = 0;
        let sellVol1Hr = 0;
        const coupleFilterLatest = {
          startTime: new Date().getTime() - 1 * 60 * 60 * 1000,
          endTime: new Date().getTime(),
        };

        const coupleFilter2HrsAgo = {
          startTime: new Date().getTime() - 2 * 60 * 60 * 1000,
          endTime: new Date().getTime() - 1 * 60 * 60 * 1000,
        };

        //2hrs
        const result2HrsAgo = await refetchGetVol({
          ...coupleFilter2HrsAgo,
          symbol: i.symbol,
          buyVol: buyVol2Hrs,
          sellVol: sellVol2Hrs,
        });
        const past2HrsRate = result2HrsAgo.buyVol / result2HrsAgo.sellVol;

        //a hour
        const result = await refetchGetVol({
          ...coupleFilterLatest,
          symbol: i.symbol,
          buyVol: buyVol1Hr,
          sellVol: sellVol1Hr,
        });
        const past1HrRate = result.buyVol / result.sellVol;

        if (
          past1HrRate > past2HrsRate &&
          result.buyVol + result.sellVol >
            result2HrsAgo.buyVol + result2HrsAgo.sellVol
        ) {
          responseResultUp.push(
            `${i.symbol}: sold volume in 2h: (${result2HrsAgo.sellVol}), bought volume in 2h: (${result2HrsAgo.buyVol}), sold volume in 1h: (${result.sellVol}), bought volume in 1h: (${result.buyVol}), percent_change: ${i.price_percent_change} \n`
          );
        }
      }

      const responseResultString1 =
        responseResultUp.length > 0
          ? responseResultUp.join("\n")
          : "Không có coin nào để mua hết!";

      await telegramBot.sendMessage(chat_id, responseResultString1);
    })
    .catch((err) => {
      console.log(err);
    });
};

module.exports = findnewtokenuptrend;
