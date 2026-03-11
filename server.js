const Koa = require('koa');
const { koaBody } = require('koa-body');
const cors = require('@koa/cors');
const serve = require('koa-static');
const http = require('http');
const WS = require('ws');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = new Koa();

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

app.use(cors());
app.use(serve(publicDir));
app.use(koaBody({
  multipart: true,
  formidable: { uploadDir: publicDir, keepExtensions: true },
  urlencoded: true,
}));

// Наша In-memory "База Данных"
const messages = [];

// Сгенерируем 15 фейковых сообщений для теста ленивой загрузки
for (let i = 1; i <= 15; i++) {
  messages.push({
    id: uuidv4(),
    type: 'text',
    content: `Тестовое сообщение #${i}`,
    timestamp: Date.now() - (1000 * 60 * (20 - i)), // Разное время
  });
}

app.use(async (ctx, next) => {
  if (ctx.request.url === '/upload' && ctx.request.method === 'POST') {
    const file = ctx.request.files.file;
    if (file) {
      const fileName = path.basename(file.filepath);
      ctx.response.body = {
        url: `http://localhost:7070/${fileName}`,
        name: file.originalFilename,
        mimeType: file.mimetype
      };
      return;
    }
  }

  // Роут для ленивой загрузки сообщений (принимает параметр start)
  if (ctx.request.url.startsWith('/messages') && ctx.request.method === 'GET') {
    const url = new URL('http://localhost' + ctx.request.url);
    const start = parseInt(url.searchParams.get('start') || 0); // Сколько уже загружено
    const limit = 10; // Сколько грузим за раз

    // Берем сообщения с конца
    const endIdx = messages.length - start;
    const startIdx = Math.max(0, endIdx - limit);

    // Возвращаем порцию старых сообщений
    const chunk = messages.slice(startIdx, endIdx);

    ctx.response.body = chunk;
    return;
  }

  await next();
});

const server = http.createServer(app.callback());
const wsServer = new WS.Server({ server });

wsServer.on('connection', (ws) => {
  ws.on('message', (msg) => {
    const parsedData = JSON.parse(msg);
    const messageObj = {
      id: uuidv4(),
      type: parsedData.type || 'text',
      content: parsedData.content || '',
      fileUrl: parsedData.fileUrl || null,
      fileName: parsedData.fileName || null,
      timestamp: Date.now(),
    };

    messages.push(messageObj);

    const messageJson = JSON.stringify(messageObj);
    Array.from(wsServer.clients)
      .filter(client => client.readyState === WS.OPEN)
      .forEach(client => client.send(messageJson));

    if (messageObj.type === 'text' && messageObj.content.startsWith('@bot:')) {
      handleBotCommand(messageObj.content);
    }
  });
});

function handleBotCommand(text) {
  const command = text.split('@bot:')[1].trim().toLowerCase();
  let botReply = '';

  if (command === 'ping') {
    botReply = 'pong!';
  } else if (command === 'time') {
    botReply = `Текущее время: ${new Date().toLocaleTimeString()}`;
  } else if (command === 'date') {
    botReply = `Сегодня: ${new Date().toLocaleDateString()}`;
  } else if (command === 'coin') {
    botReply = Math.random() > 0.5 ? 'Выпал Орел 🦅' : 'Выпала Решка 🪙';
  } else if (command === 'weather') {
    const weather = ['Солнечно ☀️', 'Дождь 🌧️', 'Облачно ☁️', 'Снег ❄️'];
    botReply = `Прогноз: ${weather[Math.floor(Math.random() * weather.length)]}`;
  } else {
    botReply = 'Неизвестная команда. Доступные: ping, time, date, coin, weather';
  }

  if (botReply) {
    const botMsg = {
      id: uuidv4(),
      type: 'text',
      content: `🤖 Бот: ${botReply}`,
      timestamp: Date.now()
    };
    messages.push(botMsg);

    const botMsgJson = JSON.stringify(botMsg);
    Array.from(wsServer.clients)
      .filter(client => client.readyState === WS.OPEN)
      .forEach(client => client.send(botMsgJson));
  }
}

const PORT = process.env.PORT || 7070;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));