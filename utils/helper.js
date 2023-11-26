const timeConvert = (time) => {

    return new Promise((resolve, reject) => {
        let timeResult = 0
        switch(time) {
            case '1m':
                timeResult =  60000
                break
            case '2m':
                timeResult = 120000
                break
            case '3m':
                timeResult = 180000
                break
            case '5m':
                timeResult = 300000
                break
            case '7m':
                timeResult = 420000
                break
            case '9m':
                timeResult = 540000
                break
            case '11m':
                timeResult = 660000
                break
            case '30m':
                timeResult = 1800000
                break
            case '1h':
                timeResult = 3600000
                break
            case '2h':
                timeResult = 7200000
                break
            case '4h':
                timeResult = 14400000
                break
            case '6h':
                timeResult = 21600000
                break
            case '8h':
                timeResult = 28800000
                break
            case '12h':
                timeResult = 43200000
                break
    
        }
        resolve(timeResult)
    })
}

module.exports = {timeConvert}