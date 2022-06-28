const express = require("express");
const app = express();
const Decimal = require("decimal.js");

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.use(express.json())

app.get("/", (req, res) => {
  res.json({ ok: true });
});


app.post("/", (req, res) => {
  const today = new Date().setUTCHours(0, 0, 0, 0);

  const actions = [];

  (req.body.line_items || []).forEach(lineItem => {
    console.log('lineItem:', lineItem);
    // Line item was created as a result of a previous action
    if (lineItem.note === "Reduced") {
      return;
    }

    const productExpires = lineItem
      .product
      .custom_fields
      .find(({ name }) => name === "expires")
      ?.boolean_value || false;

    // Product is one that does not expire
    if (!productExpires) {
      return;
    }

    const expiryDateField = lineItem
      .custom_fields
      .find(({ name }) => name === "expiry_date");

    console.log('expiryDateField:', expiryDateField);

    if (expiryDateField) {
      const expiryDate = new Date(expiryDateField.string_value).getTime();

      console.log('expiryDate:', expiryDate);

      if (expiryDate === today) {
        // remove the line item with product nearing expiry
        actions.push({
          type: "remove_line_item",
          line_item_id: lineItem.id
        });
        // replace the line item with a reduced variant
        actions.push({
          type: "add_line_item",
          product_id: lineItem.product_id,
          quantity: lineItem.quantity,
          unit_price: new Decimal(lineItem.price).mul(0.75).toFixed(2),
          note: "Reduced"
        });

        return;
      }

      if (expiryDate < today) {
        // something
        actions.push({
          type: "stop",
          title: "No sale of products beyond their expiry date",
          message: "Item will be removed",
          dismiss_label: "Remove Item"
        });
        // remove the line item with product past expiry
        actions.push({
          type: "remove_line_item",
          line_item_id: lineItem.id
        });

        return;
      }

      return;
    }

    // product expires but the exiry date is not yet known
    actions.push({
      type: "require_custom_fields",
      title: "We need some information about this product",
      message: "Please check the product expiry",
      entity: "line_item",
      entity_id: lineItem.id,
      required_custom_fields: [
        {
          name: "expiry_date"
        }
      ]
    });
  });

  console.log('actions:', actions);

  res.json({ actions });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});
