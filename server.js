const path = require('path');
const config = require('./config');
const App = require('./framework');
const { log } = require('./log');
const wallpaper = require('./wallpaper');

const PORT = process.env.PORT || 8039;

let app = new App();

app.get('/random', async function(req, res) {
  // Send random wallpaper image
  let image = await wallpaper.getRandom();
  let contentType = config.fileTypes[path.extname(image)];
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return this.file(image, contentType);
});

app.listen(PORT, () => log(`Server listening on port ${PORT}`));
