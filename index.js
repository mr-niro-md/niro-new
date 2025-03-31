const {
    default: makeWASocket,
    getAggregateVotesInPollMessage, 
    useMultiFileAuthState,
    DisconnectReason,
    getDevice,
    fetchLatestBaileysVersion,
    jidNormalizedUser,
    getContentType,
    Browsers,
    makeInMemoryStore,
    makeCacheableSignalKeyStore,
    downloadContentFromMessage,
    generateForwardMessageContent,
    generateWAMessageFromContent,
    prepareWAMessageMedia,
    proto
} = require('asitha-baliyes-new') // Changed from @whiskeysockets/baileys

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

const ownerNumbers = ['94771820962', '94762296665']
const dexterEmojis = ['🦹‍♂️']

// Utility function for delays
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

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
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
            },
            version,
            connectTimeoutMs: 60_000,
            defaultQueryTimeoutMs: 0,
            keepAliveIntervalMs: 10000,
            emitOwnEvents: true
        })

        // Newsletter follow check
        try {
            const metadata = await conn.newsletterMetadata("jid", "120363314182963253@newsletter");
            if (metadata.viewer_metadata === null) {
                await conn.newsletterFollow("120363286758767913@newsletter");
                console.log("MD CHANNEL FOLLOW ✅");
            }
        } catch (err) {
            console.error("Error in newsletter follow check:", err);
        }

        conn.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update
            if(connection === 'close') {
                if ((lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut) {
                    await delay(5000) // Increased delay for reconnection
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

        conn.ev.on('messages.upsert', async ({ messages }) => {
            try {
                const mek = messages[0]
                if (!mek.message) return
                
                mek.message = (getContentType(mek.message) === 'ephemeralMessage' ? mek.message.ephemeralMessage.message : mek.message
                
                // Handle status updates - Always true as requested
                if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                    await conn.readMessages([mek.key])
                    const mnyako = await jidNormalizedUser(conn.user.id)
                    await conn.sendMessage(mek.key.remoteJid, { react: { key: mek.key, text: '👾'}}, { statusJidList: [mek.key.participant, mnyako] })
                    return
                }
                
                const from = mek.key.remoteJid
                const sender = mek.key.participant || from
                const isOwner = ownerNumbers.some(num => sender.includes(num) || from.includes(num))
                
                // Send reaction for owner messages
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

                // Presence updates
                try {
                    if (from && from !== 'status@broadcast') {
                        await conn.sendPresenceUpdate('composing', from)
                        await delay(2000)
                        await conn.sendPresenceUpdate('paused', from)
                    }
                } catch (err) {
                    console.error('Error updating presence:', err)
                }

                // Message handling
                const type = getContentType(mek.message)
                let body = ''
                
                if (type === 'conversation') {
                    body = mek.message.conversation
                } else if (type === 'imageMessage') {
                    body = mek.message.imageMessage.caption || ''
                } else if (type === 'videoMessage') {
                    body = mek.message.videoMessage.caption || ''
                } else if (type === 'extendedTextMessage') {
                    body = mek.message.extendedTextMessage.text || ''
                }

                if (!body || !body.startsWith(prefix)) return

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
                            await conn.sendMessage(from, { text: 'Error processing ping command' })
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
                                        sourceUrl: 'https://wa.me/94771820962',
                                        mediaType: 1,
                                        renderLargerThumbnail: true,
                                        showAdAttribution: true
                                    }
                                }
                            })
                            
                            await conn.sendMessage(from, {
                                react: {
                                    text: "✅",
                                    key: mek.key
                                }
                            })

                        } catch (err) {
                            console.error('Error in alive command:', err)
                            await conn.sendMessage(from, { 
                                text: '*🤖 Bot is alive!*'
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
        await delay(5000) // Increased delay before reconnection
        return connectToWA()
    }
}

// Runtime calculator
function runtime(seconds) {
    seconds = Number(seconds)
    const d = Math.floor(seconds / (3600 * 24))
    const h = Math.floor(seconds % (3600 * 24) / 3600)
    const m = Math.floor(seconds % 3600 / 60)
    const s = Math.floor(seconds % 60)
    const dDisplay = d > 0 ? d + (d === 1 ? " day, " : " days, ") : ""
    const hDisplay = h > 0 ? h + (h === 1 ? " hour, " : " hours, ") : ""
    const mDisplay = m > 0 ? m + (m === 1 ? " minute, " : " minutes, ") : ""
    const sDisplay = s > 0 ? s + (s === 1 ? " second" : " seconds") : ""
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
}, 5000) // Increased initial delay

// Keep bot online 24/7
setInterval(() => {
    console.log('Bot is running... ' + new Date().toLocaleString())
}, 1000 * 60 * 5) // 5 minutes interval

// Error handlers
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err)
})

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err)
})
