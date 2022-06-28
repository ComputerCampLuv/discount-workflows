const express = require("express");
const app = express();
const Decimal = require("decimal.js");

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

const discountRules = [
  { days: 1, hours: 0, minutes: 0, reduction: 1 },     // "2022-06-30 00:00:00"
  { days: 0, hours: 17, minutes: 0, reduction: 0.95 }, // "2022-06-29 17:00:00"
  { days: 0, hours: 12, minutes: 0, reduction: 0.75 }, // "2022-06-29 12:00:00"
  { days: 0, hours: 0, minutes: 0, reduction: 0.50 },  // "2022-06-29 00:00:00"
  { days: -1, hours: 0, minutes: 0, reduction: 0.25 }, // "2022-06-28 17:00:00"
  { days: -2, hours: 0, minutes: 0, reduction: 0.1 }   // "2022-06-27 17:00:00"
];

const satisfiesRule = (expiry, rule) => {
  const now = new Date();
  const cutoff = new Date(
    expiry.getFullYear(),
    expiry.getMonth(),
    expiry.getDate() + rule.days,
    rule.hours,
    rule.minutes
  );

  if (now.getTime() > cutoff.getTime()) {
    return true;
  }

  return false;
};

app.use(express.json())

app.get("/", (req, res) => {
  res.json({ ok: true });
});


app.post("/", (req, res) => {
  const today = new Date().setUTCHours(0, 0, 0, 0);
  const now = new Date();

  const actions = [];

  (req.body.line_items || []).forEach(lineItem => {
    console.log('lineItem:', lineItem);
    // Line item was created as a result of a previous action
    if (
      lineItem.note === "Donated" ||
      lineItem.note === "Reduced"
    ) {
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
      const expiryDate = new Date(expiryDateField.string_value);

      const discount = discountRules.find((rule) => satisfiesRule(expiryDate, rule));

      if (discount) {
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
          unit_price: new Decimal(lineItem.price).mul(1 - discount.reduction).toFixed(2),
          note: "Reduced"
        });
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
