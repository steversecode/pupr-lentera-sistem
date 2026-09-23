const https = require('https');
const fs = require('fs');

const url = "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Coat_of_arms_of_East_Nusa_Tenggara.svg/512px-Coat_of_arms_of_East_Nusa_Tenggara.svg.png";
const file = fs.createWriteStream("src/assets/images/logo_ntt.png");

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } }, function(response) {
  response.pipe(file);
  file.on("finish", () => {
    file.close();
    console.log("Download completed");
  });
}).on("error", (err) => {
  fs.unlink("src/assets/images/logo_ntt.png");
  console.log("Error: ", err.message);
});
