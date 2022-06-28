const express = require('express');
const app = express();
const Decimal = require('decimal.js');

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
    req.body?.line_items[0]
  ) {
    const lineItem = req.body.line_items[0];

    console.log('line_item:', JSON.stringify(lineItem));

    const expiry = lineItem
      .custom_fields
      .find(({ name }) => name === 'expiry_date');

    if (lineItem.note) {
      res.json({ actions: [] });
    } else if (expiry) {
      res.json({
        actions: [
          {
            type: "remove_line_item",
            line_item_id: lineItem.id
          },
          {
            type: "add_line_item",
            product_id: lineItem.product_id,
            quantity: "1",
            unit_price: new Decimal(lineItem.total_price).mul(0.75).toFixed(2),
            note: "Reduced"
          }
        ]
      });
    } else {
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
    }
    
  } else {
    res.json({ actions: [] });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});
