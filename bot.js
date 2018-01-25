// Load up the file system library
const fs = require('fs');
const path = require('path');

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

// Load up the request library
const request = require('request');

// This is your client. Some people call it `bot`, some people call it `self`,
// some might call it `cootchie`. Either way, when you see `client.something`, or `bot.something`,
// this is what we're refering to. Your client.
const client = new Discord.Client();

// Here we load the config.json file that contains our token and our prefix values.
const config = require("./config/config.json");

// Load break config
const breaks = require("./config/breaks.json");

// Load up mongoose library
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI, { useMongoClient: true });
mongoose.Promise = global.Promise;
const Schema = mongoose.Schema;

// Prices
var PricesSchema = new Schema({
    currency: String,
    date: {type: Date, default: Date.now},
    value: Number
});
var Prices = mongoose.model('Prices', PricesSchema);

// Punchlines
var PunchlinesSchema = new Schema({
    artist: String,
    punchline: String,
    whoAdded: String,
    createdAt: {type: Date, default: Date.now}
});
var Punchlines = mongoose.model('Punchlines', PunchlinesSchema);

// Subs
var SubsSchema = new Schema({
    chan_id: String,
    createdAt: {type: Date, default: Date.now}
});
var Subs = mongoose.model('Subs', SubsSchema);

// DestinNames
var DestinNamesSchema = new Schema({
    name: String,
    whoAdded: String,
    createdAt: {type: Date, default: Date.now}
});
var DestinNames = mongoose.model('DestinNames', DestinNamesSchema);

// DestinActions
var DestinActionsSchema = new Schema({
    action: String,
    whoAdded: String,
    createdAt: {type: Date, default: Date.now}
});
var DestinActions = mongoose.model('DestinActions', DestinActionsSchema);

// Auto bulk insert
var db_dir = './db/';
var constructors = {
   Prices: Prices,
   Punchlines: Punchlines,
   Subs: Subs,
   DestinNames: DestinNames,
   DestinActions: DestinActions
};
fs.readdir(db_dir, function(error, files) {
    if (error) console.error(error);
    files.forEach(file => {
        fs.readFile(path.join(db_dir, file), 'utf8', function(error, data) {
            if (error) console.error(error);
            var myObject = new constructors[file];
            myObject.collection.count({}, function(error, c) {
                if (c == 0) {
                    myObject.collection.initializeOrderedBulkOp();
                    myObject.collection.insert(JSON.parse(data), function(error, docs) {
                        if (error) console.error(error);
                    });
                } else {
                    console.log(`${file} déjà initialisé`);
                }
            });
        });
    });
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

    // Ignore other bots, allow himself
    if(message.author.bot && message.author.id != "373101871285665803") return;

    // Ignore non-command message
    if(message.content.indexOf(config.prefix) !== 0) return;

    // Here we separate our "command" name, and our "arguments" for the command.
    // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
    // command = say
    // args = ["Is", "this", "the", "real", "life?"]
    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
    
    // Ignore commands send by himself
    if (command != "ping" && message.author.id == "373101871285665803") return;

    // Log command
    console.log(`----- command received from ${message.author.id} - ${message.author.username}#${message.author.discriminator} : `, message.content);

    switch (command) {
        case 'ping': {
            // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
            // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
            const m = await message.channel.send("Ping?");
            m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`)
            .then(msg => { message.delete(); msg.delete(config.time_before_delete) })
            .catch(console.error);
            break;
        }
        case 'help': {
            // Display help message
            sendMessage(`${config.prefix}help\t: t'es con ou quoi ?\n${config.prefix}break\t: temps avant la prochaine pause\n${config.prefix}punchlines\t: menu des punchlines\n${config.prefix}weather\t: affiche le temps pour la ville voulue (par défaut Nantes, paramètre optionel : NomVille,CodePays)\n${config.prefix}sub_to_break_announce\t: Inscrire le chan aux alertes des pauses\n${config.prefix}unsub_to_break_announce\t: Désinscrire le chan aux alertes des pauses\n${config.prefix}sub_to_break_announce_status\t: Connaitre l'état de l'inscription aux alertes\n${config.prefix}ping\t: test de latence\n${config.prefix}destin : jeu du destin, essayez ${config.prefix}destin -h pour de l'aide`, message)
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
            let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&APPID=${process.env.WEATHER_TOKEN}&units=metric&lang=fr`;

            fetchJson(url)
            .then(function(data) {
                sendMessage(`A ${city}, la temperature extérieur est de ${data.main.temp}°C, avec un vent de ${data.wind.speed}km/h, ${data.wind.deg}°.\nCondition météo : ${data.weather[0].main}, ${data.weather[0].description}.\nTaux d'humidité : ${data.main.humidity}%.\nPression atmosphérique : ${data.main.pressure}hPa.`, message);
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
                var sub = new Subs({ chan_id: _chan_id });
                sub.save(function (error) {
                    if (error) console.error(error);
                    sendMessage(`Ce chan va maintenant recevoir automatiquement les alertes aux pauses`, message, true);
                });
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
                            var punchline = new Punchlines({ artist: _artist, punchline: _punchline, whoAdded: `${message.author.id}-${message.author.username}#${message.author.discriminator}` });
                            punchline.save(function (error) {
                                if (error) console.error(error);
                            });
                        }
                        break;
                    }
                    case "count": {
                        if (args[0] !== undefined) {
                            let _artist = args.shift().toLowerCase();
                            Punchlines.count({artist: _artist})
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
                        Punchlines.distinct('artist', function(error, artists) {
                            if (error) console.error(error);
                            let _artists = _.map(artists, function(item) { return `${config.prefix}${item}` });
                            sendMessage(`Liste des commandes disponibles : ${_artists.join(', ')}`, message);
                        });
                        break;
                    }
                    default: {
                        sendMessage(`Ce mode n'existe pas ...`, message, true);
                    }
                }
            }
            break;
        }
        case 'd':
        case 'destin': {
            // Scope de mes couilles 
            var pickedName1 = "";
            var pickedName2 = "";
            var pickedAction = "";

            if (args[0] === undefined) {
                args[0] = 'play';
            }
            let mode = args.shift().toLowerCase();
            switch (mode) {
                case 'play': {
                    var pickedName1 = "";
                    var pickedName2 = "";
                    var pickedAction = "";
                
                    // Récupération de 2 noms
                    DestinNames.find({}, function(error, names) {
                        if (error) console.error(error);
                        if (names.length > 1) {
                            // Take a random number betwen 0 and the number of name available
                            let _rnd = Math.floor(Math.random() * names.length);
                            pickedName1 = names[_rnd].name;
                            names.splice(_rnd, 1);
                            // Take a second random number betwen 0 and the number of name available
                            let _rnd2 = Math.floor(Math.random() * names.length);
                            pickedName2 = names[_rnd2].name;
                            DestinActions.find({}, function(error, actions) {
                                if (actions.length > 0) {
                                    // Take a random number betwen 0 and the number of actions available
                                    let _rnd = Math.floor(Math.random() * actions.length)
                                    pickedAction= actions[_rnd].action;
                                    sendMessage(`Destin : \n${pickedName1} ${pickedAction} ${pickedName2}`, message);
                                } else {
                                    sendMessage(`Faut ajouter des actions pour que ça marche !!!`, message, true);
                                }
                            });
                        } else {
                            sendMessage(`Faut ajouter des noms pour que ça marche !!!`, message, true);
                        }
                    });
                
                    break;
                }
                case '-n':
                case 'add_name': {
                    if (args[0] === undefined){
                        sendMessage(`Faut ajouter un nom espèce de gogol !`, message, true);
                    } else {
                        let nameToAdd = args.join(' ');
                        var destin = new DestinNames({name: nameToAdd, whoAdded: `${message.author.username}#${message.author.discriminator}`});
                        destin.save(function (error) {
                            if (error) console.error(error);
                            sendMessage(`Le nom  "${nameToAdd}" a bien été ajouté ! `, message, true);
                        });
                    }                       
                    break;
                }
                case '-a':
                case 'add_action': {
                    if (args[0] === undefined){
                        sendMessage(`Faut ajouter une action espèce de gogol !`, message, true);
                    } else {
                        let actionToAdd = args.join(' ');
                        var destin = new DestinActions({action: actionToAdd, whoAdded: `${message.author.username}#${message.author.discriminator}`});
                        destin.save(function (error) {
                            if (error) console.error(error);
                            sendMessage(`L'action  "${actionToAdd}" a bien été ajouté ! `, message, true);
                        });
                    }                       
                    break;
                }
                case '-h':
                case 'help': {
                    sendMessage(`Liste des commandes du Destin : \nplay : lance une phrase random \nadd_name (ou -n) : ajoute un nom\nadd_action (ou -a) : ajoute une action\nlist_action (ou -la) : liste des actions \nlist_name (ou -ln) : liste des noms\ndel_a ID : supprime l'action avec l'ID spécifié\ndel_n ID : supprime le nom avec l'ID spécifié\nhelp (ou -h) : tu serais pas un petit peu con garçon ?`, message);
                    break;
                }
                case '-ln':
                case 'list_name': {
                    DestinNames.find({}, function (error, names) {
                        let _names = _.map(names, function(item) { return `${item.id} : ${item.name}, added by : ${item.whoAdded}` });
                        sendMessage(`Liste des noms du Destin disponibles :\n ${_names.join(', \n ')}`, message);
                    });
                    break;
                }
                case '-la':
                case 'list_action': {
                    DestinActions.find({}, function (error, actions) {
                        let _actions = _.map(actions, function(item) { return `${item.id} : ${item.action}, added by : ${item.whoAdded}` });
                        sendMessage(`Liste des actions du Destin disponibles :\n ${_actions.join(', \n ')}`, message);
                    });
                    break;
                }
                case 'del_a': {
                    if (args[0] === undefined){
                        sendMessage(`Merci de spécifier un ID après la commande del_a`,message);
                    } else {
                        DestinActions.remove({id: args[0]}).catch(console.error);
                        sendMessage(`L'action avec l'id ${args[0]} a été supprimée`,message, true);
                    }
                    break;
                }
                case 'del_n': {
                    if (args[0] === undefined){
                        sendMessage(`Merci de spécifier un ID après la commande del_n`,message);
                    } else {
                        DestinNames.remove({id: args[0]}).catch(console.error);
                        sendMessage(`Le nom avec l'id ${args[0]} a été supprimé`,message, true);
                    }
                    break;
                }
                default: {
                    sendMessage(`Cette commande n'existe pas sur !destin, consulter !destin -h pour de l'aide`, message);
                }
            }
            break;
        }
        default: {
            // Check if it's a punchline command
            Punchlines.find({artist: command}, function(error, punchlines) {
                if (error) console.error(error);
                if (punchlines.length > 0) {
                    let _msg = "";
                    // Take a random number betwen 0 and the number of punchlines available
                    let _rnd = Math.floor(Math.random() * punchlines.length)
                    _msg = punchlines[_rnd].punchline;
                    sendMessage(_msg, message);
                    return;
                } else {
                    sendMessage(`Wech c'est pas une commande ça poto ...`, message, true);
                }
            });
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
// Keepalive
schedule.scheduleJob("0 /5 * * * *", function() {
    console.log(`Sending keepalive...`);
    request(process.env.APP_URL, function (error, response, body) {
      console.log('error:', error); // Print the error if one occurred
      console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    });
});

// Functions
var unSub = function (_chan_id) {
    Subs.remove({chan_id: _chan_id}).catch(console.error);
}
var getSubById = function(_chan_id) {
    Subs.findOne({chan_id: _chan_id})
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
