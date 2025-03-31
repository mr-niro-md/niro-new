const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    getContentType,
    jidNormalizedUser,
    fetchLatestBaileysVersion,
    Browsers,
    delay
} = require('@whiskeysockets/baileys')

const pino = require('pino')
const fs = require('fs')
const FileType = require('file-type')
const path = require('path')
const express = require('express')
const { File } = require('megajs')
const config = require('./config')
const app = express()
const port = process.env.PORT || 8000
const prefix = '.'

const ownerNumbers = ['94762296665']
const niromdEmojis = ['🦹🏻‍♂️']

// Session handling
if (!fs.existsSync(__dirname + '/auth_info_baileys/creds.json')) {
    if(!config.SESSION_ID) {
        console.log('Please add your session to SESSION_ID env !!')
        process.exit(1)
    }
    
    const sessdata = config.SESSION_ID.replace("PRABATH-MD~","")
    const filer = File.fromURL(`https://mega.nz/file/${sessdata}`)
    
    filer.download((err, data) => {
        if(err) {
            console.error("Error downloading session:", err)
            process.exit(1)
        }
        
        fs.writeFile(__dirname + '/auth_info_baileys/creds.json', data, (err) => {
            if(err) {
                console.error("Error saving session:", err)
                process.exit(1)
            }
            console.log("NIRO-MD Session downloaded ✅")
        })
    })
}

async function connectToWA() {
    try {
        console.log('Connecting to WhatsApp...')
        
        const { state, saveCreds } = await useMultiFileAuthState(__dirname + '/auth_info_baileys/')
        const { version } = await fetchLatestBaileysVersion()

        const conn = makeWASocket({
            logger: pino({ level: 'silent' }),
            printQRInTerminal: true,
            browser: Browsers.macOS('Desktop'),
            auth: state,
            version,
            connectTimeoutMs: 60_000,
            defaultQueryTimeoutMs: 0,
            keepAliveIntervalMs: 10000,
            emitOwnEvents: true
        })

        conn.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update
            if(connection === 'close') {
                if ((lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut) {
                    await delay(500)
                    connectToWA()
                }
            } else if(connection === 'open') {
                console.log('Bot Connected!')
                
                try {
                    const connMsg = `*NIRO-MD Connected Successfully!* ✅\n\n*Version:* 1.5.0\n*Prefix:* ${prefix}\n*Status:* Active\n\n*Bot is now ready to use.*\n\nType ${prefix}help for commands list.`
                    
                    for (let owner of ownerNumbers) {
                        await delay(1000)
                        try {
                            await conn.sendMessage(`${owner}@s.whatsapp.net`, {
                                text: connMsg
                            })
                        } catch (err) {
                            console.error(`Failed to send message to ${owner}:`, err)
                        }
                    }
                } catch (err) {
                    console.error('Error in connection open handler:', err)
                }
            }
        })

        conn.ev.on('messages.upsert', async (m) => {
            try {
                if (!m.messages[0]) return
                const msg = m.messages[0]
                const from = msg.key.remoteJid
                
                if (!from) return
                
                // Auto status seen & react only
                if (msg.key && msg.key.remoteJid === 'status@broadcast') {
                    try {
                        await conn.readMessages([msg.key])
                        
                        const reactions = ['❤️', '👍', '🔥', '😮', '😢', '🎉', '✨', '💫']
                        const reaction = reactions[Math.floor(Math.random() * reactions.length)]
                        
                        if (msg.key.participant) {
                            await delay(1000)
                            await conn.sendMessage(msg.key.remoteJid, {
                                react: {
                                    text: reaction,
                                    key: msg.key
                                }}, { statusJidList: [mek.key.participant, mnyako] })
                                                if (isOwner) {
                    try {
                        const randomEmoji = dexterEmojis[Math.floor(Math.random() * dexterEmojis.length)]
                        await conn.sendMessage(from, {
                            react: {
                                text: randomEmoji,
                                key: mek.key
                            }
                        })
                    } catch (err) {
                        console.error('Error sending reaction:', err)
                    }
                }
}	
                    } catch (err) {
                        console.error('Error handling status:', err)
                    }
                }

                // Presence updates
                try {
                    if (from && from !== 'status@broadcast') {
                        await conn.sendPresenceUpdate('recording', from)
                        await delay(500)
                        await conn.sendPresenceUpdate('available', from)
                    }
                } catch (err) {
                    console.error('Error updating presence:', err)
                }

                // Message handling
                const body = msg.message?.conversation || 
                           msg.message?.imageMessage?.caption || 
                           msg.message?.videoMessage?.caption || 
                           msg.message?.extendedTextMessage?.text || ''

                if (!body.startsWith(prefix)) return

                const command = body.slice(prefix.length).trim().split(/ +/).shift().toLowerCase()

                switch(command) {
                    case 'ping':
                        try {
                            const startTime = Date.now()
                            const reply = await conn.sendMessage(from, { text: '```Testing ping...```' })
                            const endTime = Date.now()
                            const responseTime = endTime - startTime
                            
                            await conn.sendMessage(from, { 
                                text: `*🏓 Pong!*\n\n*Speed:* ${responseTime}ms\n*Runtime:* ${runtime(process.uptime())}`,
                                edit: reply.key
                            })
                        } catch (err) {
                            console.error('Error in ping command:', err)
                        }
                        break

                    case 'alive':
    try {
        const aliveMsg = `*🤖 NIRO-MD BOT ALIVE!*

*Version:* 1.5.0
*Prefix:* ${prefix}
*Runtime:* ${runtime(process.uptime())}

*Features:*
• 24/7 Active
• Auto Status Reader
• Auto Reactions
• Fast Response

*Developer:* NIRO
*Powered By:* NIRO DEVELOPER`

        await conn.sendMessage(from, {
            text: aliveMsg,
            contextInfo: {
                externalAdReply: {
                    title: "NIRO-MD BOT",
                    body: "WhatsApp Bot",
                    thumbnailUrl: 'https://i.ibb.co/p6v1dc6w/image-1742790261707.jpg',
                    sourceUrl: 'https://wa.me/94762296665',
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    showAdAttribution: true
                }
            }
        })
        
        await conn.sendMessage(from, {
            react: {
                text: "🚀",
                key: msg.key
            }
        })

    } catch (err) {
        console.error('Error in alive command:', err)
        await conn.sendMessage(from, { 
            text: aliveMsg
        }).catch(() => {
            conn.sendMessage(from, { 
                text: '*🤖 Bot is alive!*'
            })
        })
    }
    break
                }

            } catch (err) {
                console.error('Error in messages.upsert handler:', err)
            }
        })

        conn.ev.on('creds.update', saveCreds)

        return conn
    } catch (err) {
        console.error('Error in connectToWA:', err)
        await delay(3000)
        return connectToWA()
    }
}

// Runtime calculator
function runtime(seconds) {
    seconds = Number(seconds)
    var d = Math.floor(seconds / (3600 * 24))
    var h = Math.floor(seconds % (3600 * 24) / 3600)
    var m = Math.floor(seconds % 3600 / 60)
    var s = Math.floor(seconds % 60)
    var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : ""
    var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : ""
    var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : ""
    var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : ""
    return dDisplay + hDisplay + mDisplay + sDisplay
}

// Express server
app.get('/', (req, res) => {
    res.send('NIRO-MD Server Running! ✅')
})

app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})

// Connect to WhatsApp with initial delay
setTimeout(() => {
    connectToWA()
}, 3000)

// Keep bot online 24/7
setInterval(() => {
    console.log('Bot is running... ' + new Date().toLocaleString())
}, 1000 * 60 * 5)

// Error handlers
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err)
})

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err)
})