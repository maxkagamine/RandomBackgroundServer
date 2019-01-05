
const color = code => str => process.stdout.isTTY ? `\x1b[${code}m${str}\x1b[m` : str;
color.green = color(32);
color.red = color(31);
color.yellow = color(33);
color.blue = color(34);
color.gray = color('1;30');

function log(str) {
  console.log(color.gray(`[${new Date().toISOString()}] `) + str);
}

exports.color = color;
exports.log = log;
