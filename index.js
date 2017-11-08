// Load up the discord.js library
const Discord = require("discord.js");

// Load up the moment.js livrary
const moment = require('moment-timezone');
moment.locale("fr");

// This is your client. Some people call it `bot`, some people call it `self`, 
// some might call it `cootchie`. Either way, when you see `client.something`, or `bot.something`,
// this is what we're refering to. Your client.
const client = new Discord.Client();

// Here we load the config.json file that contains our token and our prefix values. 
const config = require("./config.json");

// Load bibliothèque de punchlines
const punchlines = require("./punchlines.json");

// Load consts
const break_am = moment(config.break_am, config.break_am_format);
const break_pm = moment(config.break_pm, config.break_pm_format);
const work_start = moment(config.work_start, config.work_start_format);
const work_end = moment(config.work_end, config.work_end_format);

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
  console.log(`----- commande received from ${message.author.id}#${message.author.discriminator} - ${message.author.username} : ${command}`);
  
  if(command === "ping") {
    // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
    // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
    const m = await message.channel.send("Ping?");
    m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`).catch(console.error);
  }

  if(command === "help") {
    // Display help message
    message.channel.send(`${config.prefix}help    : t'es con ou quoi ?\n${config.prefix}ping    : test de latence\n${config.prefix}break  : temps avant la prochaine pause\n${config.prefix}lolo : une punchline de :lolo: random \n${config.prefix}orel : une punchline de :Orelsan: random`).catch(console.error);;
  }

  if (command === "break") {
    // Display time before the next break
    let now = moment();
    let msg = "";
    let weather = "";
    let url = "http://api.openweathermap.org/data/2.5/weather?q=Nantes,fr&APPID="+config.API_METEO+"&units=metric"

    fetch(url)
      .then(function(data) {
        weather = 'Temperature extérieur : '+data.main.temp+'°C, vent '+data.wind.speed+'km/h';
      })
      .catch(function(){
        weather = `Problème d'API météo :( `;
      })

    if (now < work_start) {
        msg = `WTF faut pas se lever aussi tôt ...`;
    } else if (now < break_am) {
        msg = break_am.fromNow();
    } else if (now < break_pm) {
        msg = break_pm.fromNow();
    } else if (now < work_end) {
        msg = `Les pauses c'est fini ...`;
    } else {
        msg = `La journée est finie les gars ... Faut partir maintenant ...`;
    }

    msg = msg + '\n' + weather;
    message.channel.send(msg);
  }

  // Handler for the !lolo command
  if (command === "lolo") {
    let msg = "";
    // Take a random number betwen 0 and the number of punchlines available
    let rnd = Math.floor(Math.random() * punchlines.lolo.length)
    msg = punchlines.lolo[rnd];
    message.channel.send(msg);
  }

  // Handler for the !lolo command
  if (command === "orel") {
    let msg = "";
    // Take a random number betwen 0 and the number of punchlines available
    let rnd = Math.floor(Math.random() * punchlines.orel.length)
    msg = punchlines.orel[rnd];
    message.channel.send(msg);
  }


});

client.login(config.token);