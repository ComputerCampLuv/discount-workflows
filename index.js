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
  if (
    req.body?.line_items &&
    req.body?.line_items[0]?.id
  ) {
    console.log(req.body?.line_items[0]);
    res.json({
      actions: [
        {
          type: "require_custom_fields",
          title: "We need some information about this product",
          message: "Bla bla bla",
          entity: "line_item",
          entity_id: req.body?.line_items[0].id,
          required_custom_fields: [
            {
              name: "expiry_date"
            }
          ]
        }
      ]
    });
  } else {
    res.json({ actions: [] });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});
