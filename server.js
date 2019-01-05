const http = require('http');
const { promises: fs } = require('fs');
const path = require('path');
const util = require('util');
const { log, color } = require('./log');
const wallpaper = require('./wallpaper');
const config = require('./config');

const PORT = process.env.PORT || 8039;

function send(res, statusCode, data, mediaType = 'text/plain') {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', mediaType);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.end(data);
}

function logRequest(req, res, file) {
  let status =
    res.statusCode == 200 ? color.green(res.statusCode) :
    res.statusCode >= 500 ? color.red(res.statusCode) :
    res.statusCode >= 400 ? color.yellow(res.statusCode) :
    color.blue(res.statusCode);
  let message = `${req.method} ${req.url} ${status}`;
  if (file) {
    message += ` -> ${color.blue(file)}`;
  }
  log(message);
}

http.createServer(async function(req, res) {
  try {
    if (req.url != '/random') {
      send(res, 404, 'Not Found');
    } else if (req.method != 'GET') {
      send(res, 405, 'Method Not Allowed');
    } else {
      let image = await wallpaper.getRandom();
      let mediaType = config.fileTypes[path.extname(image)];
      let data = await fs.readFile(image);
      send(res, 200, data, mediaType);
      logRequest(req, res, path.basename(image));
      return;
    }
  } catch (e) {
    send(res, 500, util.inspect(e));
  }
  logRequest(req, res);
}).listen(PORT, function() {
  log(`Server listening on port ${PORT}`);
});
