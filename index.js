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
    req.body?.line_items[0]
  ) {
    const lineItem = req.body.line_items[0];

    console.log('line_item:', JSON.stringify(lineItem));

    const expiry = lineItem
      .custom_fields
      .find(({ name }) => name === 'expiry_date');

    if (
      expiry
      // expiry.string_value &&
      // expiry.string_value.length > 0
    ) {
      // res.json({ actions: [] });
      // {
      //   "actions": [
      //     {
      //       "type": "add_line_item",
      //       "product_id": "0242ac12-0002-11e9-e8c4-659494e33153",
      //       "quantity": "2.4",
      //       "unit_price": "3.75",
      //       "note": "Such an awesome line item!"
      //     }
      //   ]
      // }
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
            unit_price: "5",
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
