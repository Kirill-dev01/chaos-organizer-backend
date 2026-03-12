# Серверная часть дипломного проекта "Chaos Organizer".

Описание:

Бэкенд обеспечивает работу чата в реальном времени с использованием WebSockets, а также предоставляет REST API для загрузки медиафайлов (картинок, видео, аудио) и получения истории сообщений (ленивая загрузка).

## Стек технологий

1. Node.js
2. Koa.js (koa-body, @koa/router, koa-static)
3. WebSockets (библиотека ws)
4. uuid для генерации уникальных идентификаторов сообщений
   
## Запуск проекта локально

1. Клонируйте репозиторий на свой компьютер:

git clone [https://github.com/Kirill-dev01/chaos-organizer-backend.git](https://github.com/Kirill-dev01/chaos-organizer-backend.git)

2. Установите зависимости:

npm install

3. Запустите сервер:

npm start 
