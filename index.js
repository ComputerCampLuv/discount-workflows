const express = require('express');
const app = express();
// const port = 3000;
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port);

app.get('/', (req, res) => {
  res.send('Hello World!')
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});
