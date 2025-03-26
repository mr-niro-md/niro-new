const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}
module.exports = {

SESSION_ID: process.env.SESSION_ID || "PRABATH-MD~nuoF3ChY#9GuT64GN94fUYPaO_xGcPxk_hl0G0mhw1VeB2KDjt-M",
};


