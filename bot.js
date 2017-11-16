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

// Global var
let chans_announce = [];

// Client ready
client.on("ready", () => {
  // This event will run if the bot starts, and logs in, successfully.
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`); 
  // Example of changing the bot's playing game to something useful. `client.user` is what the
  // docs refer to as the "ClientUser".
  client.user.setUsername(config.bot_username).catch(console.error);
  client.user.setGame(config.bot_game).catch(console.error);
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


client.on("message", async message => {
  // This event will run on every single message received, from any channel or DM.

  // Check for tts
  if (message.tts) {
    console.log(`Deleted a tts message`);
    message.channel.send(`${message.author.username} est un GROS CONNARD qui utilise le TTS`)
    .then(msg => { message.delete(); msg.delete(config.time_before_delete); })
    .catch(console.error);
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
  console.log(`----- commande received from ${message.author.id} - ${message.author.username}#${message.author.discriminator} : ${command}`);
  
  if (command === "ping") {
    // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
    // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
    const m = await message.channel.send("Ping?");
    m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`).catch(console.error);
  }
  else if (command === "help") {
    // Display help message
    message.channel.send(`${config.prefix}help    : t'es con ou quoi ?\n${config.prefix}ping    : test de latence\n${config.prefix}lolo : punchline random de ${client.emojis.find("name", "lolo")}\n${config.prefix}orel : punchline random d'orelsan\n${config.prefix}weather {NomVille},{CodePays} : affiche le temps pour la ville voulue (par défaut Nantes, {NomVille} et {CodePays} optionnels)\n${config.prefix}sub_to_break_announce Inscrire le chan aux alertes des pauses`).catch(console.error);;
    message.delete();
  }
  else if (command === "weather") {
    // Display weather in cities
    if (args[1] !== undefined) {
      message.channel.send(`WRONG FORMAT ASSHOLE : !weather NomVille,codepays (!weather LosAngeles,us)`)
      .then(msg => { message.delete(); msg.delete(config.time_before_delete); })
      .catch(console.error);
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
      message.channel.send(`A ${city}, la temperature extérieur est de ${data.main.temp}°C, avec un vent de ${data.wind.speed}km/h`);
    })
    .catch(function() {
      message.channel.send(`Erreur appel API pour la ville ${city}`);
      console.log(`Problème d'API météo :(`);
    });
  }
  else if (command === "lolo") {
    // Handler for the !lolo command
    let msg = "";
    // Take a random number betwen 0 and the number of punchlines available
    let rnd = Math.floor(Math.random() * punchlines.lolo.length)
    msg = punchlines.lolo[rnd];
    message.channel.send(msg);
  }
  else if (command === "break") {
    let _msg = "";
    let _min = 3600;
    _.each(breaks, function(_break) {
      let _diff = moment(_break.time, _break.format).diff(moment(), 'minutes');
      console.log(_diff);
      if (_diff > 0 && _diff < _min) {
        _msg = `${_diff} minutes avant ${_break.name}`;
      }
    });
    if (_msg == "") {
      _msg = "No moar breaks ;(";
    } else {
      message.channel.send(_msg).catch(console.error);
    }
  }
  else if (command === "orel") {
    // Handler for the !lolo command
    let msg = "";
    // Take a random number betwen 0 and the number of punchlines available
    let rnd = Math.floor(Math.random() * punchlines.orel.length)
    msg = punchlines.orel[rnd];
    message.channel.send(msg);
  }
  else if (command === "sub_to_break_announce") {
    let _chan_id = message.channel.id;
    if (!_.contains(chans_announce, _chan_id)) {
      chans_announce.push(_chan_id);
      message.channel.send(`Ce chan va maintenant recevoir automatiquement les alertes aux pauses`)
      .then(msg => { message.delete(); msg.delete(config.time_before_delete) })
      .catch(console.error);
    } else {
      message.channel.send(`Ce chan est déjà abonné aux alertes`)
      .then(msg => { message.delete(); msg.delete(config.time_before_delete) })
      .catch(console.error);
    }
  }
  else {
    message.channel.send(`Elle existe pas ta commande poto ...`)
    .then(msg => { message.delete(); msg.delete(config.time_before_delete) })
    .catch(console.error);
  }
});

// Schedules
for (var i = breaks.length - 1; i >= 0; i--) {
  let _break = breaks[i];
  schedule.scheduleJob(`${_break.schedule}`, function() {
    _.each(chans_announce, function(el) {
      client.channels.find("id", el).send(`Bientôt ${_break.name} dans 5 min`).catch(console.error);
    });
  });
}

client.login(process.env.BOT_TOKEN);
