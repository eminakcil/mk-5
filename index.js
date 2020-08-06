if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const Discord = require("discord.js");
const { prefix } = require("./config.json");
const ytdl = require("ytdl-core");
const ytSearch = require("yt-search");

const client = new Discord.Client();

const queue = new Map();

client.once("ready", () => {
  console.log("hazırım");
});

client.once("reconnecting", () => {
  console.log("tekrar bağlanılıyor!");
});

client.once("disconnect", () => {
  console.log("bağlantı kesildi");
});

client.on("message", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const serverQueue = queue.get(message.guild.id);

  if (message.content.startsWith(`${prefix}oynat`)) {
    execute(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}atla`)) {
    skip(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}dur`)) {
    stop(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}ara`)) {
    
  }
});

async function execute(message, serverQueue) {
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      "müzik oynatmak için ses kanalında olmanız gerekir"
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "ses kanalınıza katılmak ve konuşmak için izinlere ihtiyacım var"
    );
  }

  
  //search algorithm

  const args = message.content.split(" ");
  console.log(args);
  if (args.length > 1) {
    const args = message.content.split(" ");
    args.shift()
    const searchText = args.join(' ').toString();
    const r = await ytSearch(searchText)
    if (r.videos.length != 0) {
      console.log(r.videos[0]);

      const songInfo = await ytdl.getInfo(r.videos[0].url);
      const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url
      };
    
      if (!serverQueue) {
        const queueContruct = {
          textChannel: message.channel,
          voiceChannel: voiceChannel,
          connection: null,
          songs: [],
          volume: 5,
          playing: true
        };
    
        queue.set(message.guild.id, queueContruct);
    
        queueContruct.songs.push(song);
    
        try {
          var connection = await voiceChannel.join();
          queueContruct.connection = connection;
          play(message.guild, queueContruct.songs[0]);
        } catch (err) {
          console.log(err);
          queue.delete(message.guild.id);
          return message.channel.send(err);
        }
      } else {
        serverQueue.songs.push(song);
        return message.channel.send(`**${song.title}** sıraya eklendi`);
      }

    } else {
      message.channel.send("sonuç bulunamadı");
    }
  } else {
    message.channel.send("hatalı kullanım");
  }

  
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "müziği atlamak için ses kanalında olmalısınız"
    );
  if (!serverQueue)
    return message.channel.send("atlayabileceğim bir şarkı yok");
  serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "müziği durdurmak için ses kanalında olmalısınız!"
    );
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const dispatcher = serverQueue.connection
    .play(ytdl(song.url))
    .on("finish", () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on("error", error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`**${song.title}** oynatılıyor`);
}

client.login(process.env.DC_TOKEN);