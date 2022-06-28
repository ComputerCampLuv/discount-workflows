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
  const lineItem = req.body.line_items[0];

  console.log('line_item:', JSON.stringify(lineItem));

  const expiryDate = lineItem
    .custom_fields
    .find(({ name }) => name === 'expiry_date');

  const expires = lineItem
    .product
    .custom_fields
    .find(({ name }) => name === 'expires')
    ?.boolean_value;

  if (!expires || lineItem.note === "Reduced") {
    res.json({ actions: [] });
  } else if (expiry) {
    const today = new Date();
    const expiry = new Date(expiryDate.string_value);
    
    if (
      expiry.getYear() === today.getYear() &&
      expiry.getMonth() === today.getMonth() &&
      expiry.getDay() === today.getDay()
    ) {
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
            unit_price: new Decimal(lineItem.price_total).mul(0.75).toFixed(2),
            note: "Reduced"
          }
        ]
      });
    } else {
      res.json({ actions: [] });
    }
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
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});
