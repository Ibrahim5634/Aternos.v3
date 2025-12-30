const mineflayer = require('mineflayer');
const Movements = require('mineflayer-pathfinder').Movements;
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const { GoalBlock } = require('mineflayer-pathfinder').goals;

const config = require('./settings.json');
const express = require('express');

const app = express();

app.get('/', (req, res) => {
  res.send('Bot is arrived')
});

app.listen(8000, () => {
  console.log('server started');
});

function createBot() {
   const bot = mineflayer.createBot({
      username: config['bot-account']['username'],
      password: config['bot-account']['password'],
      auth: config['bot-account']['type'],
      host: config.server.ip,
      port: config.server.port,
      version: config.server.version,
   });

   bot.loadPlugin(pathfinder);
   const mcData = require('minecraft-data')(bot.version);
   const defaultMove = new Movements(bot, mcData);
   bot.settings.colorsEnabled = false;

   bot.once('spawn', () => {
      console.log('\x1b[33m[AfkBot] Bot joined to the server', '\x1b[0m');

      if (config.utils['auto-auth'].enabled) {
         console.log('[INFO] Started auto-auth module');

         var password = config.utils['auto-auth'].password;
         setTimeout(() => {
            bot.chat(`/register ${password} ${password}`);
            bot.chat(`/login ${password}`);
         }, 500);

         console.log(`[Auth] Authentification commands executed.`);
      }

      if (config.utils['chat-messages'].enabled) {
         console.log('[INFO] Started chat-messages module');
         var messages = config.utils['chat-messages']['messages'];

         if (config.utils['chat-messages'].repeat) {
            var delay = config.utils['chat-messages']['repeat-delay'];
            let i = 0;

            let msg_timer = setInterval(() => {
               bot.chat(`${messages[i]}`);

               if (i + 1 == messages.length) {
                  i = 0;
               } else i++;
            }, delay * 1000);
         } else {
            messages.forEach((msg) => {
               bot.chat(msg);
            });
         }
      }

      const pos = config.position;

      if (config.position.enabled) {
         console.log(
            `\x1b[32m[Afk Bot] Starting moving to target location (${pos.x}, ${pos.y}, ${pos.z})\x1b[0m`
         );
         bot.pathfinder.setMovements(defaultMove);
         bot.pathfinder.setGoal(new GoalBlock(pos.x, pos.y, pos.z));
      }

      if (config.utils['anti-afk'].enabled) {
         console.log('[INFO] Started anti-AFK module with random jump/walk/look');
         
         const performRandomAction = () => {
            const randomDelay = Math.random() * 2000 + 3000; // 3-5 seconds
            
            setTimeout(() => {
               const actions = ['jump', 'walk', 'look', 'sneak'];
               const action = actions[Math.floor(Math.random() * actions.length)];
               
               if (action === 'jump') {
                  console.log('[Anti-AFK] Bot jumping');
                  bot.setControlState('jump', true);
                  setTimeout(() => {
                     bot.setControlState('jump', false);
                  }, 200);
               } else if (action === 'walk') {
                  console.log('[Anti-AFK] Bot walking forward');
                  bot.setControlState('forward', true);
                  setTimeout(() => {
                     bot.setControlState('forward', false);
                  }, 400);
               } else if (action === 'look') {
                  // Random camera rotation
                  const yawChange = (Math.random() - 0.5) * 0.5; // Random yaw rotation
                  const pitchChange = (Math.random() - 0.5) * 0.3; // Random pitch rotation
                  bot.look(bot.entity.yaw + yawChange, bot.entity.pitch + pitchChange);
                  console.log('[Anti-AFK] Bot looking around');
               } else if (action === 'sneak') {
                  console.log('[Anti-AFK] Bot sneaking');
                  bot.setControlState('sneak', true);
                  setTimeout(() => {
                     bot.setControlState('sneak', false);
                  }, 300);
               }
               
               performRandomAction(); // Schedule next action
            }, randomDelay);
         };
         
         performRandomAction();
      }

      // Disconnect and reconnect every 1 hour
      console.log('[INFO] Bot will disconnect in 1 hour and rejoin');
      const oneHourMs = 60 * 60 * 1000; // 1 hour
      setTimeout(() => {
         console.log('[INFO] 1 hour passed, disconnecting bot...');
         bot.end();
      }, oneHourMs);
   });

   bot.on('chat', (username, message) => {
      if (config.utils['chat-log']) {
         console.log(`[ChatLog] <${username}> ${message}`);
      }
   });

   bot.on('goal_reached', () => {
      console.log(
         `\x1b[32m[AfkBot] Bot arrived to target location. ${bot.entity.position}\x1b[0m`
      );
   });

   bot.on('death', () => {
      console.log(
         `\x1b[33m[AfkBot] Bot has been died and was respawned ${bot.entity.position}`,
         '\x1b[0m'
      );
   });

   if (config.utils['auto-reconnect']) {
      bot.on('end', () => {
         setTimeout(() => {
            createBot();
         }, config.utils['auto-recconect-delay']);
      });
   }

   bot.on('kicked', (reason) =>
      console.log(
         '\x1b[33m',
         `[AfkBot] Bot was kicked from the server. Reason: \n${reason}`,
         '\x1b[0m'
      )
   );
   bot.on('error', (err) =>
      console.log(`\x1b[31m[ERROR] ${err.message}`, '\x1b[0m')
   );
}

createBot();
