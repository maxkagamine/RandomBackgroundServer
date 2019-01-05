const { promises: fs } = require('fs');
const path = require('path');
const { log } = require('./log');
const config = require('./config');

let images = null;
let lastUpdate = 0;

const isValidExt = filename => Object.keys(config.fileTypes).includes(path.extname(filename));
const isValidSize = async filePath => (await fs.stat(filePath)).size <= config.maxSize;

async function refresh() {
  let files = await fs.readdir(config.wallpaperDir, { withFileTypes: true });
  let promises = files.map(async dirent => {
    let fullPath = path.join(config.wallpaperDir, dirent.name);
    if (dirent.isFile() && isValidExt(dirent.name) && await isValidSize(fullPath)) {
      return fullPath;
    }
  });
  images = (await Promise.all(promises)).filter(x => x);
  log(`Wallpaper cache refreshed, found ${images.length} images`);
}

async function getAll() {
  if (Date.now() - lastUpdate > config.cacheTimeout) {
    lastUpdate = Date.now();
    let promise = refresh();
    if (!images) {
      await promise;
    }
  }
  return images;
}

async function getRandom() {
  let images = await getAll();
  return images[Math.floor(Math.random() * images.length)];
}

exports.getAll = getAll;
exports.getRandom = getRandom;
