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
let proconUpdateEmoji = null;
let proconStartEmoji = null;
let proconStopEmoji = null;
let proconRestartEmoji = null;

var proconStatusChannel = null;

client.on('ready', async () => {
    proconStatusChannel = client.channels.cache.get(process.env.PROCON_STATUS_CHANNEL);
    preparations(); // Fetch custom emojis
    updateProconStatus(true); // Initial update at boot
    logger.info('Bot connected and initial update started');
})

function preparations() {
    // TODO: Some kind of check if fetching emoji fails
    proconUpdateEmoji = client.emojis.cache.get(process.env.PROCON_UPDATE_ID);
    logger.debug('Update emoji: ', proconUpdateEmoji);
    proconStartEmoji = client.emojis.cache.get(process.env.PROCON_START_ID);
    logger.debug('Start emoji: ', proconStartEmoji);
    proconStopEmoji = client.emojis.cache.get(process.env.PROCON_STOP_ID);
    logger.debug('Stop emoji: ', proconStopEmoji);
    proconRestartEmoji = client.emojis.cache.get(process.env.PROCON_RESTART_ID);
    logger.debug('Restart emoji: ', proconRestartEmoji);
}

async function updateProconStatus(initialCheck) {
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
        if (initialCheck && prevMessage && prevMessage.author.id === client.user.id) { // Remove previous message if it was from startup (so reactions work)
            await prevMessage.delete();
            prevMessage = null;
        }

        if (prevMessage && prevMessage.author.id === client.user.id) { // Edit last embed
            prevMessage.edit(embed);
        }
        else { // Edit last message
            const m = await proconStatusChannel.send(embed);

            // Add reactions
            await m.react(proconUpdateEmoji);
            await m.react(proconRestartEmoji);
            await m.react(proconStartEmoji);
            await m.react(proconStopEmoji);

            // Add reaction listeners
            const filter = (reaction, user) => {
                // TODO: Add check for authorized users only
                return [process.env.PROCON_UPDATE_ID, process.env.PROCON_RESTART_ID, process.env.PROCON_START_ID, process.env.PROCON_STOP_ID].includes(reaction.emoji.id);
            };

            m.awaitReactions(filter, { max: 1 })
                .then(async collected => {
                    const reaction = collected.first();

                    switch (reaction.emoji.id) {
                        case process.env.PROCON_UPDATE_ID:
                            logger.debug("Implemented Procon status Update");
                            await m.delete();
                            updateProconStatus();
                            break;
                        case process.env.PROCON_RESTART_ID:
                            logger.debug("Not implemented Procon Restart");
                            await m.delete();
                            updateProconStatus();
                            break;
                        case process.env.PROCON_START_ID:
                            logger.debug("Not implemented Procon Start");
                            await m.delete();
                            updateProconStatus();
                            break;
                        case process.env.PROCON_STOP_ID:
                            logger.debug("Not implemented Procon Stop");
                            await m.delete();
                            updateProconStatus();
                            break;
                    }
                })
                .catch(console.error);
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
setInterval(updateProconStatus, (process.env.UPDATE_INTERVAL_SECONDS || 30) * 1000);
