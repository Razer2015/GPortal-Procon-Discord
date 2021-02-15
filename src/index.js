const fetch = require('node-fetch');
const pino = require('pino');
const Discord = require("discord.js");
const dotenv = require('dotenv');
dotenv.config();

// Logger
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Procon
const Procon = require('./procon/procon.js');
const procon = new Procon(process.env.SERVER_ID, process.env.AUTH_TOKEN);

// Discord
const client = new Discord.Client();
client.login(process.env.BOT_TOKEN);

var proconStatusChannel = null;

client.on('ready', async () => {
    proconStatusChannel = client.channels.cache.get(process.env.PROCON_STATUS_CHANNEL);
    updateProconStatus(); // Initial update at boot
    logger.info('Bot connected and initial update started');
})

async function updateProconStatus() {
    try {
        if (proconStatusChannel == null) {
            logger.warn("Skipping Procon status update because channel couldn't be found.");
            return;
        }

        const status = await procon.updateStatus();
        const embed = new Discord.MessageEmbed()
            .setColor(status.color)
            .setTitle(status.message)
            .setAuthor('Procon', 'https://cdn.discordapp.com/attachments/250724258743844864/810943983333277746/2Q.png', 'https://www.g-portal.com/en/')
            .setImage('https://cdn.discordapp.com/attachments/250724258743844864/810960989569679360/large.png')
            .setTimestamp()
            .setFooter('Procon status updater by xfileFIN');

        let prevMessage = await getLastMessage(proconStatusChannel);
        if (prevMessage && prevMessage.author.id === client.user.id) { // Edit last embed
            prevMessage.edit(embed);
        }
        else { // Edit last message
            proconStatusChannel.send(embed);
        }

        logger.debug(`Procon status updated to: ${status.message}`);
    }
    catch (exception) {
        logger.error(exception);
    }
}

async function getLastMessage(channel) {
    return await channel.messages.fetch({ limit: 1 }).then(messages => {
        const lastMessage = messages.first()
        return lastMessage
    }).catch(err => {
        logger.error(err)
    })
}

// Keep updating procon status every 10 seconds
setInterval(updateProconStatus, 10 * 1000);
