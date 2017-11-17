// Load up the discord.js library
const Discord = require("discord.js");

// Load up the moment.js library
const moment = require('moment-timezone');
moment.locale("fr");

// Load up the schedule library
const schedule = require('node-schedule');

// Load up the underscore-node library
const _ = require('underscore-node');

// Load up the fetch libraries
const fetchXml = require('node-fetch');
const fetchJson = require('node-fetch-json');

// This is your client. Some people call it `bot`, some people call it `self`,
// some might call it `cootchie`. Either way, when you see `client.something`, or `bot.something`,
// this is what we're refering to. Your client.
const client = new Discord.Client();

// Here we load the config.json file that contains our token and our prefix values.
const config = require("./config/config.json");

// Load bibliothèque de punchlines
const punchlines = require("./config/punchlines.json");

// Load break config
const breaks = require("./config/breaks.json");

// Load up sqlite library
const Sequelize = require('sequelize');
const sequelize = new Sequelize('breakBot', null, null, {
    dialect: 'sqlite',
    storage: './bot.sqlite',
});
sequelize
.authenticate()
.then(function(err) {
    console.log('Connection has been established successfully.');
}, function (err) {
    console.log('Unable to connect to the database:', err);
});

//  MODELS
var Punchlines = sequelize.define('Punchlines', {
    artist: Sequelize.STRING,
    punchline: Sequelize.TEXT,
    whoAdded: Sequelize.STRING,
    createdAt: Sequelize.DATE
});
var Subs = sequelize.define('Subs', {
    chan_id: Sequelize.STRING
});
sequelize.sync({force: config.clear_db}).then(function(err) {
    console.log('It worked!');
    // Populate data
    Punchlines.count()
    .then(c => {
        if (c == 0) {
            Punchlines.bulkCreate(punchlines.lolo).catch(console.error);
            Punchlines.bulkCreate(punchlines.orel).catch(console.error);
        }
    })
    .catch(console.error);
}, function (err) {
    console.log('An error occurred while creating the table:', err);
});

// Global var
let chans_announce = [];

// Client ready
client.on("ready", () => {
    // This event will run if the bot starts, and logs in, successfully.
    console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
    // Example of changing the bot's playing game to something useful. `client.user` is what the
    // docs refer to as the "ClientUser".
    // client.user.setUsername(config.bot_username).catch(console.error);
    // client.user.setGame(config.bot_game).catch(console.error);
});

client.on("guildCreate", guild => {
    // This event triggers when the bot joins a guild.
    console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    client.user.setUsername(config.bot_username).catch(console.error);
    client.user.setGame(config.bot_game).catch(console.error);
});

client.on("guildDelete", guild => {
    // this event triggers when the bot is removed from a guild.
    console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
});

client.on("channelDelete", channel => {
    unSub(channel.id);
});


client.on("message", async message => {
    // This event will run on every single message received, from any channel or DM.

    // Check for tts
    if (message.tts) {
        console.log(`Deleted a tts message`);
        sendMessage(`${message.author.username} est un GROS CONNARD qui utilise le TTS`, message, true);
    }

    // Ignore other bots
    if(message.author.bot) return;

    // Ignore non-command message
    if(message.content.indexOf(config.prefix) !== 0) return;

    // Here we separate our "command" name, and our "arguments" for the command.
    // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
    // command = say
    // args = ["Is", "this", "the", "real", "life?"]
    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    // Log command
    console.log(`----- command received from ${message.author.id} - ${message.author.username}#${message.author.discriminator}`, command);

    switch (command) {
        case 'ping': {
            // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
            // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
            const m = await message.channel.send("Ping?");
            m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`).catch(console.error);
            break;
        }
        case 'help': {
            // Display help message
            sendMessage(`${config.prefix}help\t: t'es con ou quoi ?\n${config.prefix}break\t: temps avant la prochaine pause\n${config.prefix}punchlines\t: menu des punchlines\n${config.prefix}weather\t: affiche le temps pour la ville voulue (par défaut Nantes, paramètre optionel : NomVille,CodePays)\n${config.prefix}sub_to_break_announce\t: Inscrire le chan aux alertes des pauses\n${config.prefix}unsub_to_break_announce\t: Désinscrire le chan aux alertes des pauses\n${config.prefix}sub_to_break_announce_status\t: Connaitre l'état de l'inscription aux alertes\n${config.prefix}ping\t: test de latence`, message)
            break;
        }
        case 'weather': {
            // Display weather in cities
            if (args[1] !== undefined) {
                sendMessage(`WRONG FORMAT ASSHOLE : !weather NomVille,codepays (!weather LosAngeles,us)`, message, true);
                return;
            }
            let city = "Nantes";
            if (args[0] !== undefined) {
                city = args[0];
            }

            let weather = "";
            let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&APPID=${process.env.WEATHER_TOKEN}&units=metric`;

            fetchJson(url)
            .then(function(data) {
                sendMessage(`A ${city}, la temperature extérieur est de ${data.main.temp}°C, avec un vent de ${data.wind.speed}km/h`, message);
            })
            .catch(function() {
                sendMessage(`Erreur appel API pour la ville ${city}`, message);
            });
            break;
        }
        case 'break': {
            let _msg = "";
            let _min = 3600;
            _.each(breaks, function(_break) {
                let _diff = moment(_break.time, _break.format).diff(moment(), 'minutes');
                if (_diff > 0 && _diff < _min) {
                    _msg = `${_diff} minutes avant ${_break.name}`;
                    _min = _diff;
                }
            });
            if (_msg == "") {
                _msg = "No moar breaks ;(";
            }
            sendMessage(_msg, message);
            break;
        }
        case 'sub_to_break_announce': {
            let _chan_id = message.channel.id;
            let _chans = [];
            if (!getSubById(_chan_id)) {
                Subs.create({ chan_id: _chan_id }).then(sub => {
                    sendMessage(`Ce chan va maintenant recevoir automatiquement les alertes aux pauses`, message, true);
                }).catch(console.error);
            } else {
                sendMessage(`Ce chan est déjà abonné aux alertes`, message, true);
            }
            break;
        }
        case 'unsub_to_break_announce': {
            let _chan_id = message.channel.id;
            let _msg = "";
            if (!getSubById(_chan_id)) {
                _msg = `Ce chan n'est pas abonné aux alertes`;
            } else {
                unSub(message.channel.id);
                _msg = `Ce chan ne recevra plus d'alertes`;
            }
            sendMessage(_msg, message, true);
            break;
        }
        case 'sub_to_break_announce_status': {
            if (!getSubById(message.channel.id)) {
                sendMessage(`Ce chan n'est pas abonné aux alertes`, message, true);
            } else {
                sendMessage(`Ce chan est abonné aux alertes`, message, true);
            }
            break;
        }
        case 'punchlines': {
            if (args[0] === undefined) {
                sendMessage(`La commande doit être ${config.prefix}punchlines mode (mode = add, count, listartists)`, message, true);
            } else {
                let mode = args.shift().toLowerCase();
                switch (mode) {
                    case "add": {
                        if (args[0] === undefined || args[1] === undefined) {
                            sendMessage(`La commande doit être ${config.prefix}punchlines add artist punchline`, message, true);
                        } else {
                            let _artist = args.shift().toLowerCase();
                            let _punchline = args.join(' ');
                            Punchlines.create({ artist: _artist, punchline: _punchline, whoAdded: `${message.author.id}-${message.author.username}#${message.author.discriminator}` })
                            .catch(console.error);
                        }
                        break;
                    }
                    case "count": {
                        if (args[0] !== undefined) {
                            let _artist = args.shift().toLowerCase();
                            Punchlines.count({ where: {artist: _artist} })
                            .then(c => {
                                sendMessage(`${c} punchlines correspondantes à ${_artist}`, message);
                            })
                            .catch(console.error);
                        } else {
                            Punchlines.count()
                            .then(c => {
                                sendMessage(`${c} punchlines correspondantes`, message);
                            })
                            .catch(console.error);
                        }
                        break;
                    }
                    case "listartists": {
                        Punchlines.findAll({ attributes: [[sequelize.fn('DISTINCT', sequelize.col('artist')), 'artist']] })
                        .then(artists => {
                            let _artists = _.map(artists, function(item) { return `${config.prefix}${item.artist}` });
                            sendMessage(`Liste des commandes disponibles : ${_artists.join(', ')}`, message);
                        })
                        .catch(console.error);
                        break;
                    }
                    default: {
                        sendMessage(`Ce mode n'existe pas ...`, message, true);
                    }
                }
            }
            break;
        }
        default: {
            // Check if it's a punchline command
            Punchlines.findAll({ where: {artist: command} })
            .then(punchlines => {
                if (punchlines.length > 0) {
                    console.log('punchline');
                    let _msg = "";
                    // Take a random number betwen 0 and the number of punchlines available
                    let _rnd = Math.floor(Math.random() * punchlines.length)
                    _msg = punchlines[_rnd].punchline;
                    sendMessage(_msg, message);
                    return;
                } else {
                    sendMessage(`Wech c'est pas une commande ça poto ...`, message, true);
                }
            })
            .catch(console.error);
        }
    }
});

// Schedules
for (var i = breaks.length - 1; i >= 0; i--) {
    let _break = breaks[i];
    schedule.scheduleJob(`${_break.schedule}`, function() {
        Subs.findAll()
        .then(subs => {
            _.each(subs, function(el) {
                client.channels.find("id", el.chan_id).send(`Bientôt ${_break.name} dans 5 min`).catch(console.error);
            });
        })
        .catch(console.error);
    });
}

// Functions
var unSub = function (_chan_id) {
    Subs.destroy({ where: {chan_id: _chan_id} }).catch(console.error);
}
var getSubById = function(_chan_id) {
    Subs.findOne({ where: {chan_id: _chan_id} })
    .then(sub => {
        console.log(!sub);
        return sub;
    })
    .catch(console.error);
}
var sendMessage = function(message, obj_msg, doDelete = false) {
    if (!doDelete) {
        obj_msg.channel.send(message)
        .catch(console.error);
    } else {
        obj_msg.channel.send(message)
        .then(msg => { obj_msg.delete(); msg.delete(config.time_before_delete) })
        .catch(console.error);
    }
}

client.login(process.env.BOT_TOKEN);
