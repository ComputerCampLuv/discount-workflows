const express = require('express');
const app = express();

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.use(express.json())

app.get('/', (req, res) => {
  res.json({ ok: true });
});

app.post('/', (req, res) => {
  console.log(req.body);
  res.json({ actions: [] });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});
