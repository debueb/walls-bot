const   localtunnel         = require('localtunnel'),
        Bot                 = require('./bot'),
        env                 = process.env.NODE_ENV || 'development';
        port                = process.env.PORT || 3000,
        telegramApiToken    = process.env.BOT_TOKEN,
        backendUrl          = process.env.BACKEND_URL || 'http://localhost:8080',
        iconUrl             = process.env.ICON_URL;

const initBot = function(url){
    let bot = new Bot(url, port, telegramApiToken, backendUrl, iconUrl);
    bot.init();
}

switch(env){
    case "development":
        let tunnel = localtunnel(port, function(err, tunnel) {
            if (err) {
                console.log(err);
                exit();
            } 
            initBot(tunnel.url);
        });
        tunnel.on('close', function() {
            console.log("localtunnel closed");
            exit();
        });
        break;
    default:
        initBot(process.env.APPLICATION_URL);
}
