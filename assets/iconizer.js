const rcedit = require('rcedit');

(async() => {
  await rcedit("./luna.exe", {
    icon: "./icon.ico"
  })
})();