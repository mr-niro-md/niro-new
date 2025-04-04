const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers,
    delay
} = require('@whiskeysockets/baileys')

const pino = require('pino')
const fs = require('fs')
const express = require('express')
const { File } = require('megajs')
const config = require('./config')
const yts = require('yt-search')
const DY_SCRAP = require('@dark-yasiya/scrap')
const dy_scrap = new DY_SCRAP()
const app = express()
const port = process.env.PORT || 8000
const prefix = '.'

const ownerNumbers = ['94762296665'] // Add your owner numbers here

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
                
                if (msg.key && msg.key.remoteJid === 'status@broadcast') {
                    try {
                        await conn.readMessages([msg.key])
                    } catch (err) {
                        console.error('Error handling status:', err)
                    }
                    return
                }

                const sender = msg.key.participant || msg.key.remoteJid
                const isOwnerMessage = ownerNumbers.some(num => 
                    sender.includes(num) || from.includes(num)
                )

                if (isOwnerMessage) {
                    try {
                        const reactions = ['👨🏻‍💻', '👨🏻‍💻', '👨🏻‍💻', '👨🏻‍💻', '👨🏻‍💻', '👨🏻‍💻', '👨🏻‍💻', '👨🏻‍💻']
                        const reaction = reactions[Math.floor(Math.random() * reactions.length)]
                        
                        await delay(1000)
                        await conn.sendMessage(from, {
                            react: {
                                text: reaction,
                                key: msg.key
                            }
                        })
                    } catch (err) {
                        console.error('Error sending reaction:', err)
                    }
                }

                try {
                    if (from && from !== 'status@broadcast') {
                        await conn.sendPresenceUpdate('recording', from)
                        await delay(500)
                        await conn.sendPresenceUpdate('available', from)
                    }
                } catch (err) {
                    console.error('Error updating presence:', err)
                }

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
                            const aliveMsg = `*🤖 NIRO-MD BOT ALIVE!*\n\n*Version:* 1.5.0\n*Prefix:* ${prefix}\n*Runtime:* ${runtime(process.uptime())}\n\n*Features:*\n• 24/7 Active\n• Fast Response\n\n*Developer:* Niro\n*Powered By:* Programing Niro`

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
                                    text: "✅",
                                    key: msg.key
                                }
                            })
                        } catch (err) {
                            console.error('Error in alive command:', err)
                        }
                        break

                    case 'song':
                        try {
                            if (!body.slice(prefix.length + command.length).trim()) {
                                await conn.sendMessage(from, { text: '*Please provide a song name!*\nExample: .song tionwayne we won' })
                                return
                            }
                            
                            const query = body.slice(prefix.length + command.length).trim()
                            const search = await dy_scrap.ytsearch(query)
                            const data = search.results[0]
                            const url = data.url

                            const desc = `*NIRO-MD SONG DOWNLOADER*\n\n╭─❏ TITLE - ${data.title}\n┣❐ ➤ 🎵\n┗⬣ NIRO-MD BOT\n\n© NIRO-MD Developers`

                            await conn.sendMessage(from, {
                                image: { url: data.thumbnail },
                                caption: desc
                            }, { quoted: msg })

                            const audioData = await dy_scrap.ytmp3(url)
                            const downloadUrl = audioData.result.download.url

                            await conn.sendMessage(from, {
                                audio: { url: downloadUrl },
                                mimetype: "audio/mpeg"
                            }, { quoted: msg })

                            await conn.sendMessage(from, {
                                document: { url: downloadUrl },
                                mimetype: "audio/mpeg",
                                fileName: `${data.title}.mp3`,
                                caption: "©NIRO-MD Developers"
                            }, { quoted: msg })

                            await conn.sendMessage(from, {
                                react: {
                                    text: "✅",
                                    key: msg.key
                                }
                            })

                        } catch (err) {
                            console.error('Error in song command:', err)
                            await conn.sendMessage(from, { text: 'Error downloading song. Please try again.' })
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

app.get('/', (req, res) => {
    res.send('NIRO-MD Server Running! ✅')
})

app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})

setTimeout(() => {
    connectToWA()
}, 3000)

setInterval(() => {
    console.log('Bot is running... ' + new Date().toLocaleString())
}, 1000 * 60 * 5)

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err)
})

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err)
})
