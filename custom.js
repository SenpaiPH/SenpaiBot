const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync('config.json'));
const dbPath = path.join(__dirname, 'database', 'customsg.json');

function getPhilippineTime() {
    const now = new Date();
    const phTime = now.toLocaleString("en-US", { timeZone: "Asia/Manila" });
    return new Date(phTime);
}

// Load or create the database
function loadDatabase() {
    if (!fs.existsSync(dbPath)) {
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        const initialData = { lastSent: null };
        fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
    }
    return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

let db = loadDatabase();

function saveDatabase() {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

// Calculate the countdown to October 30
function getCountdownToOctober30() {
    const now = getPhilippineTime();
    const targetDate = new Date(now.getFullYear(), 9, 30); // October 30 (month index is 0-based, so 9 is October)

    // If today is past October 30 of this year, target the next year
    if (now > targetDate) {
        targetDate.setFullYear(now.getFullYear() + 1);
    }

    const diff = targetDate - now;

    // Convert the time difference into days, hours, minutes, and seconds
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${days} days, ${hours} hours, ${minutes} minutes, and ${seconds} seconds until October 30!`;
}

function sendDailyMessageAt830AM(api, message) {
    setInterval(() => {
        const now = getPhilippineTime();
        const lastSent = db.lastSent ? new Date(db.lastSent) : null;
        
        const currentTime = now.getHours() === 8 && now.getMinutes() === 30;
        const todayDateString = now.toDateString();

        // Check if the message was already sent today and if it's 8:30 AM
        if ((!lastSent || now.toDateString() !== lastSent.toDateString()) && currentTime) {
            let updatedMessage;

            // If today is October 30, send the special message
            if (now.getMonth() === 9 && now.getDate() === 30) {  // Check if today is October 30
                updatedMessage = "Goodluck Everyone!\nFighting.....";
            } else {
                const countdown = getCountdownToOctober30(); // Get the countdown for normal days
                updatedMessage = `${message}\n\n${countdown}`; // Append countdown to the message
            }

            api.getThreadList(100, null, ["INBOX"], (err, list) => {
                if (err) {
                    console.error('Error fetching thread list:', err);
                    return;
                }
                list.forEach(thread => {
                    api.sendMessage(updatedMessage, thread.threadID, (err) => {
                        if (err) {
                            console.error(`Error sending message to thread ${thread.threadID}:`, err);
                        } else {
                            console.log(`Message sent to thread ${thread.threadID}`);
                        }
                    });
                });

                // Update the lastSent time in the database
                db.lastSent = now.toISOString();
                saveDatabase();
            });
        } else {
            //console.log('Message not sent yet, either it\'s not 8:30 AM or it was already sent today.');
        }
    }, 60 * 1000); // Check every minute
}

function init(api) {
    const message = config.ADS;

    /* using fs 
    const message  = {
        body: `WELCOME TO YETANOTHERFBBOT`,
        attachment: fs.createReadStream('cache/logo1.png')
      };
    */
    
    sendDailyMessageAt830AM(api, message);
}

module.exports = {
    init
};
