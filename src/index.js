const fetch = require('node-fetch');
const pino = require('pino');
const Discord = require("discord.js");
const dotenv = require('dotenv');
dotenv.config();

var updater = null;

// Logger
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
logger.info(`Current environment: ${process.env.NODE_ENV}`);

// Procon
const Procon = require('./procon/procon.js');
const procon = new Procon(process.env.SERVER_ID, process.env.AUTH_TOKEN);

// Discord
const client = new Discord.Client();
client.login(process.env.BOT_TOKEN);

let PROCON_UPDATE_ID = (process.env.PROCON_UPDATE_ID || "810980162559541289");
let PROCON_START_ID = (process.env.PROCON_START_ID || "810981548144721940");
let PROCON_STOP_ID = (process.env.PROCON_STOP_ID || "810981203430604820");
let PROCON_RESTART_ID = (process.env.PROCON_RESTART_ID || "810980616962048000");

let PROCON_UPDATE_DEBUG_ID = (process.env.PROCON_UPDATE_DEBUG_ID || "811273100544573471");
let PROCON_START_DEBUG_ID = (process.env.PROCON_START_DEBUG_ID || "811273085083975680");
let PROCON_STOP_DEBUG_ID = (process.env.PROCON_STOP_DEBUG_ID || "811273071360606279");
let PROCON_RESTART_DEBUG_ID = (process.env.PROCON_RESTART_DEBUG_ID || "811273053363109909");

let proconUpdateEmoji = null;
let proconStartEmoji = null;
let proconStopEmoji = null;
let proconRestartEmoji = null;

let proconUpdateDebugEmoji = null;
let proconStartDebugEmoji = null;
let proconStopDebugEmoji = null;
let proconRestartDebugEmoji = null;

var proconStatusChannel = null;
var oldState = null;
var statusOverride = null; // Debug use only

client.on('ready', async () => {
    proconStatusChannel = client.channels.cache.get(process.env.PROCON_STATUS_CHANNEL);
    preparations(); // Fetch custom emojis
    updateProconStatus(true); // Initial update at boot
    logger.info('Bot connected and initial update started');
})

function preparations() {
    // TODO: Some kind of check if fetching emoji fails
    proconUpdateEmoji = client.emojis.cache.get(PROCON_UPDATE_ID);
    logger.debug(`Update emoji: ${proconUpdateEmoji.name}`);
    proconStartEmoji = client.emojis.cache.get(PROCON_START_ID);
    logger.debug(`Start emoji: ${proconStartEmoji.name}`);
    proconStopEmoji = client.emojis.cache.get(PROCON_STOP_ID);
    logger.debug(`Stop emoji: ${proconStopEmoji.name}`);
    proconRestartEmoji = client.emojis.cache.get(PROCON_RESTART_ID);
    logger.debug(`Restart emoji: ${proconRestartEmoji.name}`);

    if (process.env.NODE_ENV === 'development') {
        proconUpdateDebugEmoji = client.emojis.cache.get(PROCON_UPDATE_DEBUG_ID);
        logger.debug(`Update debug emoji: ${proconUpdateDebugEmoji.name}`);
        proconStartDebugEmoji = client.emojis.cache.get(PROCON_START_DEBUG_ID);
        logger.debug(`Start debug emoji: ${proconStartDebugEmoji.name}`);
        proconStopDebugEmoji = client.emojis.cache.get(PROCON_STOP_DEBUG_ID);
        logger.debug(`Stop debug emoji: ${proconStopDebugEmoji.name}`);
        proconRestartDebugEmoji = client.emojis.cache.get(PROCON_RESTART_DEBUG_ID);
        logger.debug(`Restart debug emoji: ${proconRestartDebugEmoji.name}`);
    }
}

async function updateProconStatus(initialCheck) {
    try {
        if (proconStatusChannel == null) {
            logger.warn("Skipping Procon status update because channel couldn't be found.");
            return;
        }

        let status = await procon.updateStatus();
        if (!updater) { // Start automatic updater
            setUpdater();
        }

        // For debug purposes only
        if (process.env.NODE_ENV === 'development') {
            if (statusOverride) status = statusOverride;
        }

        const embed = new Discord.MessageEmbed()
            .setColor(status.color)
            .setTitle(status.message)
            .setAuthor('Procon', 'https://cdn.discordapp.com/attachments/250724258743844864/810943983333277746/2Q.png', 'https://www.g-portal.com/en/')
            .setImage('https://cdn.discordapp.com/attachments/250724258743844864/810960989569679360/large.png')
            .setTimestamp()
            .setFooter('Procon status updater by xfileFIN');

        let deleteMessage = initialCheck | (oldState != status.state);
        oldState = status.state;

        if (deleteMessage) {
            logger.debug(`Force message delete initiated - initialCheck: ${initialCheck} | old state: ${oldState} - new state: ${status.state}`);
        }
        let prevMessage = await getLastMessage(proconStatusChannel);
        if (deleteMessage && prevMessage && prevMessage.author.id === client.user.id) { // Remove previous message if it was from startup or state has changed (so reactions work)
            await prevMessage.delete().catch(err => logger.error(err));
            prevMessage = null;
        }

        if (prevMessage && prevMessage.author.id === client.user.id) { // Edit last embed
            prevMessage.edit(embed).catch(err => logger.error(err));
        }
        else { // Edit last message
            const m = await proconStatusChannel.send(embed).catch(err => logger.error(err));

            // Add reactions
            await m.react(proconUpdateEmoji);
            if (status.state === 3) {
                await m.react(proconStartEmoji);
            }
            else {
                await m.react(proconRestartEmoji);
                await m.react(proconStopEmoji);
            }

            // Debug purposes only
            if (process.env.NODE_ENV === 'development') {
                await m.react(proconUpdateDebugEmoji);
                await m.react(proconRestartDebugEmoji);
                await m.react(proconStartDebugEmoji);
                await m.react(proconStopDebugEmoji);
            }

            // Add reaction listeners
            const filter = (reaction, user) => {
                // TODO: Add check for authorized users only
                return [
                    PROCON_UPDATE_ID, PROCON_RESTART_ID, PROCON_START_ID, PROCON_STOP_ID,
                    PROCON_UPDATE_DEBUG_ID, PROCON_RESTART_DEBUG_ID, PROCON_START_DEBUG_ID, PROCON_STOP_DEBUG_ID
                ].includes(reaction.emoji.id);
            };

            m.awaitReactions(filter, { max: 1 })
                .then(async collected => {
                    const reaction = collected.first();

                    switch (reaction.emoji.id) {
                        case PROCON_UPDATE_ID: {
                            clearUpdater();
                            logger.debug("Procon status Update");
                            const newStatus = { message: "Refreshing manually..." };
                            logger.info(newStatus);
                            sendActionUpdate(newStatus.message, m);
                            break;
                        }
                        case PROCON_RESTART_ID: {
                            clearUpdater();
                            logger.debug("Procon Restart");
                            const newStatus = await procon.restart();
                            logger.info(newStatus);
                            sendActionUpdate(newStatus.message, m);
                            break;
                        }
                        case PROCON_START_ID: {
                            clearUpdater();
                            logger.debug("Procon Start");
                            const newStatus = await procon.start();
                            logger.info(newStatus);
                            sendActionUpdate(newStatus.message, m);
                            break;
                        }
                        case PROCON_STOP_ID: {
                            clearUpdater();
                            logger.debug("Procon Stop");
                            const newStatus = await procon.stop();
                            logger.info(newStatus);
                            sendActionUpdate(newStatus.message, m);
                            break;
                        }
                        // Debug cases
                        case PROCON_UPDATE_DEBUG_ID: {
                            clearUpdater();
                            logger.debug("Procon status Update (debug)");
                            const newStatus = { message: "Refreshing manually..." };
                            logger.info(newStatus);
                            sendActionUpdate(newStatus.message, m);
                            break;
                        }
                        case PROCON_RESTART_DEBUG_ID: {
                            clearUpdater();
                            logger.debug("Procon Restart (debug)");

                            statusOverride = { message: "Layer is running", color: '#5af70c', state: 6 };

                            const newStatus = { message: 'Procon Layer restarted successfully' };
                            logger.info(newStatus);
                            sendActionUpdate(newStatus.message, m);
                            break;
                        }
                        case PROCON_START_DEBUG_ID: {
                            clearUpdater();
                            logger.debug("Procon Start (debug)");

                            statusOverride = { message: "Layer is running", color: '#5af70c', state: 6 };

                            const newStatus = { message: 'Procon Layer started successfully' };
                            logger.info(newStatus);
                            sendActionUpdate(newStatus.message, m);
                            break;
                        }
                        case PROCON_STOP_DEBUG_ID: {
                            clearUpdater();
                            logger.debug("Procon Stop (debug)");

                            statusOverride = { message: "Layer is offline", color: '#f70c0c', state: 3 };

                            const newStatus = { message: 'Procon Layer stopped successfully' };
                            logger.info(newStatus);
                            sendActionUpdate(newStatus.message, m);
                            break;
                        }
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

function generateStatusEmbed(message) {
    return embed = new Discord.MessageEmbed()
        .setTitle(message)
        .setAuthor('Procon', 'https://cdn.discordapp.com/attachments/250724258743844864/810943983333277746/2Q.png', 'https://www.g-portal.com/en/')
        .setImage('https://cdn.discordapp.com/attachments/250724258743844864/810960989569679360/large.png')
        .setTimestamp()
        .setFooter('Procon status updater by xfileFIN');
}

async function sendActionUpdate(message, m) {
    if (message && m) {
        await m.reply(generateStatusEmbed(message))
            .then(msg => {
                m.delete().catch(err => logger.error(err));
                setTimeout(() => {
                    try {
                        msg.delete().catch(err => logger.error(err));
                    }
                    finally {
                        updateProconStatus();
                    }
                }, 5000);
            })
            .catch(async ex => {
                logger.error(ex);
                await m.delete().catch(err => logger.error(err));
                updateProconStatus();
            });
    }
    else {
        await m.delete().catch(err => logger.error(err));
        updateProconStatus();
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

function setUpdater() {
    const updateInterval = (process.env.UPDATE_INTERVAL_SECONDS || 30) * 1000;
    updater = setInterval(updateProconStatus, updateInterval);
    logger.info(`Updater set to ${updateInterval} milliseconds`);
}

function clearUpdater() {
    clearInterval(updater);
    updater = null;
    logger.info(`Updater cleared`);
}
