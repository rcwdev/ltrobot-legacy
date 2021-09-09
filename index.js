// Modules
const fs = require('fs');
const tmi = require('tmi.js');
const fetch = require('node-fetch');
const moment = require('moment-timezone');

// Variables
var config = JSON.parse(fs.readFileSync('config.json'));
var client;
var commandDatabase;

function syslog(data) {
    console.log(`[${config.name} ${config.version}] ${data}`)
};

syslog(`The bot is starting...`);

function connect() {
    client = new tmi.Client({
        connection: {
            reconnect: true,
            secure: true
        },
        identity: {
            username: config.twitch.chat.username,
            password: config.twitch.chat.password
        },
        channels: config.twitch.chat.channels
    });
    client.connect();
};

connect();

function fetchCommands() {
    fetch(config.restdb.url + "commands", {
        method: "GET",
        headers: {
            "x-apikey": config.restdb.api_key
        }
    })
    .catch(err => {if (err) throw err})
    .then(res => res.json())
    .then(body => {
        syslog(`Fetched ${body.length} commands from the database.`);
        commandDatabase = body;
    });
};

fetchCommands();

function createCommand(data) {
    fetch(config.restdb.url + "commands", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-apikey": config.restdb.api_key
        },
        body: JSON.stringify(data)
    })
    .catch(err => {if (err) throw err})
    .then(res => res.json())
    .then(body => {
        let x = {
            "_id":body._id,
            "trigger":body.trigger,
            "response":body.response,
            "enabled":body.enabled
        }
        commandDatabase.push(x);
    });
};

function deleteCommand(id) {
    fetch(config.restdb.url + "commands/" + id, {
        method: "DELETE",
        headers: {
            "x-apikey": config.restdb.api_key
        }
    })
    .catch(err => {if (err) throw err});

    commandDatabase.forEach((command, index) => {
        if (command._id == id) {
            commandDatabase.splice(index, 1);
        }
    })
};

function updateCommand(id, data) {
    fetch(config.restdb.url + "commands/" + id, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "x-apikey": config.restdb.api_key
        },
        body: JSON.stringify(data)
    }) 
};

function getTime(location) {
    let x = new Date();
    let y = moment(x);
    let z = y.tz(location).format('LT');
    return z;
};

function generateRandom(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
};

function getLastFM(username) {
    return fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${config.lastfm.api_key}&format=json&limit=1`)
    .catch(err => {if (err) throw err})
    .then(res => res.json())
};

client.on("logon", () => {
    syslog(`Logged in as ${config.twitch.chat.username}`);  
});

client.on("connecting", (address, port) => {
    syslog(`Attempting to connect to: ${address}:${port}`);
});

client.on("reconnect", () => {
    syslog(`Attempting to reconnect...`);
});

client.on("connected", (address, port) => {
    syslog(`Connected to: ${address}:${port}`);
});

client.on("disconnected", (reason) => {
    if (reason == undefined) {
        syslog(`Disconnected from chat.`);
    } else {
        syslog(`Disconnected from chat: ${reason}`);
    };
});

client.on("roomstate", (channel, state) => {
    syslog(`Joined the channel: ${channel}`);
});

client.on("notice", (channel, msgid, message) => {
    syslog(`${channel} - ${message}`);
});

client.on("ban", (channel, username, reason, tags) => {
    if (reason == undefined) {
        syslog(`${channel} - ${username} was banned.`);
    } else {
        syslog(`${channel} - ${username} was banned: ${reason}`);
    };
});

client.on("timeout", (channel, username, reason, duration, tags) => {
    if (reason == undefined) {
        syslog(`${channel} - ${username} was timed out for ${duration}s.`);
    } else {
        syslog(`${channel} - ${username} was timed out for ${duration}s: ${reason}`);
    };
});

client.on("messagedeleted", (channel, username, deletedMessage, tags) => {
    syslog(`${channel} - A message from ${username} was deleted: ${deletedMessage}`);
});

client.on("emoteonly", (channel, enabled) => {
    if (enabled) {
        syslog(`${channel} - Emote only enabled.`);
    } else {
        syslog(`${channel} - Emote only is no longer enabled.`);
    };
});

client.on("followersonly", (channel, enabled, length) => {
    if (enabled) {
        syslog(`${channel} - ${length}m follower only mode enabled.`);
    } else {
        syslog(`${channel} - Followers only is no longer enabled.`);
    };
});

client.on("subscribers", (channel, enabled) => {
    if (enabled) {
        syslog(`${channel} - Subscriber only enabled.`);
    } else {
        syslog(`${channel} - Subscriber only is no longer enabled.`);
    };
});

client.on("r9kbeta", (channel, enabled) => {
    if (enabled) {
        syslog(`${channel} - Unique mode (R9K) enabled.`);
    } else {
        syslog(`${channel} - Unique mode (R9K) is no longer enabled.`);
    };
});

client.on("clearchat", (channel) => {
    syslog(`${channel} - Chat was cleared.`);
});

client.on("slowmode", (channel, enabled, length) => {
    if (enabled) {
        syslog(`${channel} - ${length}s slow mode enabled.`);
    } else {
        syslog(`${channel} - Slow mode is no longer enabled.`);
    };
});

client.on("hosting", (channel, target, viewers) => {
    syslog(`${channel} - Now hosting ${target} with ${viewers} viewers.`);
});

client.on("raided", (channel, username, viewers) => {
    syslog(`${channel} - ${username} raided with ${viewers} viewers.`);
});

client.on("subscription", (channel, username, method, message, tags) => {
    syslog(`${channel} - ${username} subscribed.`);
});

client.on("subgift", (channel, username, streakMonths, recipient, methods, tags) => {
    syslog(`${channel} - ${username} gifted a subscription to ${recipient}. They have been subscribed for ${streakMonths} months.`)
});

client.on("resub", (channel, username, months, message, tags, methods) => {
    if (message == undefined) {
        syslog(`${channel} - ${username} resubscribed. They have been subscribed for ${months} months..`)
    } else {
        syslog(`${channel} - ${username} resubscribed. They have been subscribed for ${months} months: ${message}`);
    };
});

client.on("giftpaidupgrade", (channel, username, sender, tags) => {
    syslog(`${channel} - ${username} is continuing the gifted subscription from ${sender}.`);
});

client.on("anongiftpaidupgrade", (channel, username, tags) => {
    syslog(`${channel} - ${username} is continuing their anonymous gifted subscription.`);
});

client.on("action", (channel, tags, message, self) => {
    syslog(`${channel} - (/ME) ${tags['display-name']}: ${message}`);
});

client.on("whisper", (from, tags, message, self) => {
    if (!self) {
        syslog(`Whisper from ${from}: ${message}`)
    };
});

client.on("chat", async (channel, tags, message, self) => {
    syslog(`${channel} - ${tags['display-name']}: ${message}`);

    let isMod = tags.mod || tags['user-type'] === 'mod';
    let isBroadcaster = channel.slice(1) === tags.username;
    let isModUp = isMod || isBroadcaster;

    if (!self) {
        let params = message.split(" ");
        switch(params[0].toLowerCase()) {
            case `!${config.name.toLowerCase()}`:
                if (isModUp) {
                    switch (params[1].toLowerCase()) {
                        // Get the current bot version.
                        case "version":
                            client.say(channel, `@${tags['display-name']} - ${config.name} is operating on: ${config.version}`);
                            break;
                        // Manage the command list.
                        case "command":
                            switch(params[2].toLowerCase()) {
                                case "count": 
                                    client.say(channel, `@${tags['display-name']} - there are ${commandDatabase.length} commands in the database. SeemsGood`);
                                    break;
                                case "info":
                                    if (params[3] == undefined) {
                                        client.say(channel, `@${tags['display-name']} - command missing parameters. Usage: !${config.name} command info [TRIGGER]`);
                                    } else {
                                        let x = commandDatabase.find(cmd => cmd.trigger == params[3].toLowerCase())
                                        if (x == undefined) {
                                            client.say(channel, `@${tags['display-name']} - that command doesn't exist. FailFish`);
                                        } else {
                                            if (x.enabled) {
                                                client.say(channel, `@${tags['display-name']} - ${x.trigger} is enabled. Response: ${x.response}`);
                                            } else {
                                                client.say(channel, `@${tags['display-name']} - ${x.trigger} is disabled. Response: ${x.response}`);
                                            };
                                        };
                                    };
                                    break;
                                case "add":
                                    if (params[3] == undefined || params[4] == undefined) {
                                        client.say(channel, `@${tags['display-name']} - command missing parameters. Usage: !${config.name} command add [TRIGGER] [RESPONSE]`);
                                    } else {
                                        let cmdResponse = message.replace(`${params[0]} ${params[1]} ${params[2]} ${params[3]} `, ``);
                                        let x = commandDatabase.find(cmd => cmd.trigger == params[3].toLowerCase())
                                        if (x == undefined) {
                                            let data = {"trigger":params[3].toLowerCase(),"response":cmdResponse,"enabled":true};
                                            createCommand(data);
                                            client.say(channel, `@${tags['display-name']} - ${data.trigger} has been created: ${data.response}`);
                                        } else {
                                            client.say(channel, `@${tags['display-name']} - that command already exists. MaxLOL`);
                                        }
                                    };
                                    break;
                                case "delete":
                                    if (params[3] == undefined) {
                                        client.say(channel, `@${tags['display-name']} - command missing parameters. Usage: !${config.name} command delete [TRIGGER]`);
                                    } else {
                                        let x = commandDatabase.find(cmd => cmd.trigger == params[3].toLowerCase())
                                        if (x == undefined) {
                                            client.say(channel, `@${tags['display-name']} - you can't delete a command that doesn't exist. Hhhehehe`);
                                        } else {
                                            deleteCommand(x._id);
                                            client.say(channel, `@${tags['display-name']} - ${params[3].toLowerCase()} has been deleted.`);
                                        }
                                    }
                                    break;
                                case "toggle":
                                    if (params[3] == undefined) {
                                        client.say(channel, `@${tags['display-name']} - command missing parameters. Usage: !${config.name} command toggle [TRIGGER]`);
                                    } else {
                                        let x = commandDatabase.find(cmd => cmd.trigger == params[3].toLowerCase())
                                        if (x == undefined) {
                                            client.say(channel, `@${tags['display-name']} - you can't toggle a command that doesn't exist. Hhhehehe`);
                                        } else {
                                            if (x.enabled) {
                                                commandDatabase.forEach((command, index) => {
                                                    if (command.trigger == params[3].toLowerCase()) {
                                                        command.enabled = false;
                                                        let data = {
                                                            "trigger": command.trigger,
                                                            "response": command.response,
                                                            "enabled": command.enabled
                                                        };
                                                        updateCommand(command._id,data);
                                                        client.say(channel, `@${tags['display-name']} - ${command.trigger} is now disabled.`);
                                                        return;
                                                    }
                                                })
                                            } else {
                                                commandDatabase.forEach((command, index) => {
                                                    if (command.trigger == params[3].toLowerCase()) {
                                                        command.enabled = true;
                                                        let data = {
                                                            "trigger": command.trigger,
                                                            "response": command.response,
                                                            "enabled": command.enabled
                                                        };
                                                        updateCommand(command._id,data);
                                                        client.say(channel, `@${tags['display-name']} - ${command.trigger} is now enabled.`);
                                                        return;
                                                    }
                                                })
                                            }
                                        }
                                    }
                                    break;
                                case "edit":
                                    if (params[3] == undefined || params[4] == undefined) {
                                        client.say(channel, `@${tags['display-name']} - missing command parameters. Usage: !${config.name} command edit [TRIGGER] [NEW RESPONSE]`);
                                    } else {
                                        let cmdResponse = message.replace(`${params[0]} ${params[1]} ${params[2]} ${params[3]} `, ``);
                                        let x = commandDatabase.find(cmd => cmd.trigger == params[3].toLowerCase())
                                        if (x == undefined) {
                                            client.say(channel, `@${tags['display-name']} - you can't edit a command that doesn't exist. Hhhehehe`);
                                        } else {
                                            commandDatabase.forEach((command, index) => {
                                                if (command.trigger == params[3].toLowerCase()) {
                                                    command.response = cmdResponse;
                                                    let data = {
                                                        "trigger": command.trigger,
                                                        "response": command.response,
                                                        "enabled": command.enabled
                                                    };
                                                    updateCommand(command._id,data);
                                                    client.say(channel, `@${tags['display-name']} - ${command.trigger} has been edited: ${command.response}`);
                                                    return;
                                                }
                                            })
                                        }
                                    }
                                    break;
                                case "reload":
                                    client.say(channel, `@${tags['display-name']} - attempted to reload any new commands added via web management.`);
                                    fetchCommands();
                                    break;
                            }
                            break;
                    }
                };
                break;
            default: {
                commandDatabase.forEach(async command => {
                    if (params[0].toLowerCase() == command.trigger) {
                        if (!command.enabled) {
                            return;
                        };
                        let formattedResponse = command.response;
                        let responseVars = formattedResponse.match(/\{{.*?\}}/ig);
                        if (responseVars !== null) {
                            responseVars.forEach(async (variable, index) => {
                                cleanVariable = variable.replace(/{{|}}/g,"");
                                let varParams = cleanVariable.split(" ");
                                switch(varParams[0]) {
                                    case "username":
                                        formattedResponse = formattedResponse.replace(variable, tags.username);
                                        if (index + 1 == responseVars.length) {
                                            client.say(channel, formattedResponse);
                                        };
                                        break;
                                    case "displayname":
                                        formattedResponse = formattedResponse.replace(variable, tags['display-name']);
                                        if (index + 1 == responseVars.length) {
                                            client.say(channel, formattedResponse);
                                        };
                                        break;
                                    case "lastfm":
                                        getLastFM(varParams[1])
                                        .then((response) => {
                                            let x = response.recenttracks.track[0];
                                            formattedResponse = formattedResponse.replace(variable, `${x.name} - ${x.artist["#text"]}`);
                                            if (index + 1 === responseVars.length) {
                                                client.say(channel, formattedResponse);
                                            };
                                        });
                                        break;
                                    case "time":
                                        if (varParams[1] == undefined) {
                                            formattedResponse = formattedResponse.replace(variable, "[MISSING LOCATION]");
                                            if (index + 1 === responseVars.length) {
                                                client.say(channel, formattedResponse);
                                            };
                                        } else {
                                            formattedResponse = formattedResponse.replace(variable, getTime(varParams[1]));
                                            if (index + 1 === responseVars.length) {
                                                client.say(channel, formattedResponse);
                                            };
                                        };
                                        break;
                                    case "random":
                                        if (varParams[1] == undefined || varParams[2] == undefined) {
                                            formattedResponse = formattedResponse.replace(variable, "[MISSING PARAMETERS]");
                                            if (index + 1 === responseVars.length) {
                                                client.say(channel, formattedResponse);
                                            };
                                        } else {
                                            if (!isNaN(varParams[1]) && !isNaN(varParams[2])) {
                                                formattedResponse = formattedResponse.replace(variable, generateRandom(varParams[1],varParams[2]));
                                                if (index + 1 === responseVars.length) {
                                                    client.say(channel, formattedResponse);
                                                };
                                            }
                                        };
                                        break;
                                    default:
                                        if (index + 1 === responseVars.length) {
                                            client.say(channel, formattedResponse);
                                        };
                                }
                            })
                        } else if (responseVars == null) {
                            client.say(channel, formattedResponse);
                        }
                    }
                })
            };
            break;
        };
    };
});