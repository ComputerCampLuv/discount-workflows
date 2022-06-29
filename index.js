const express = require("express");
const app = express();
const Decimal = require("decimal.js");
const axios = require('axios');
const _ = require('lodash');

let port = process.env.PORT;
if (port == null || port == "") {
  port = 5000;
}

const discountRules = {
  computercamplove: [
    { days: 1, hours: 0, minutes: 0, reduction: 1 },
    { days: 0, hours: 17, minutes: 0, reduction: 0.95 },
    { days: 0, hours: 12, minutes: 0, reduction: 0.75 },
    { days: 0, hours: 0, minutes: 0, reduction: 0.50 },
    { days: -1, hours: 0, minutes: 0, reduction: 0.25 },
    { days: -2, hours: 0, minutes: 0, reduction: 0.1 }
  ]
};

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

app.get("/discounts", (req, res) => {
  res.json({ data: discountRules[req.query.domain_prefix] });
});

// {
//   personal_token: '',
//   domain_prefix: '',
//   discounts: [
//     {
//       days: 0,
//       hours: 0,
//       minutes: 0,
//       reduction: 0.5
//     }
//   ]
// };
app.post("/discounts", async (req, res) => {
  const client = axios.create({
    baseURL: `https://${req.body.domain_prefix}.vendhq.com/api/2.0`,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${req.body.personal_token}`
    }
  });

  let customFields = (
    await client.get("/workflows/custom_fields?entity=product")
  ).data.data;

  if (
    !customFields.find(({ name }) => name === "expires")
  ) {
    // Add custom field to product if not already present
    await client.post(
      "/workflows/custom_fields",
      {
        entity: "product",
        name: "expires",
        title: "Expires",
        type: "boolean",
        visible_in_ui: true,
        editable_in_ui: true,
        print_on_receipt: false,
      }
    );
  }

  const remoteRules = (
    await client.get("/workflows/remote_rules")
  ).data.data;

  let remoteRule = remoteRules.find(({ url }) => url === "https://nameless-sea-27513.herokuapp.com/");
  if (!remoteRule) {
    // Add remote rule if not already present
    remoteRule = (
      await client.post(
        "/workflows/remote_rules",
        { url: "https://nameless-sea-27513.herokuapp.com/" }
      )
    ).data.data;
  }
  
  const rules = (
    await client.get("/workflows/rules")
  ).data.data;

  if (
    !rules.find((rule) => rule.event_type === "sale.line_items.added" && rule.remote_rule_id === remoteRule.id)
  ) {
    // Add rule if not already present
    await client.post(
      "/workflows/rules",
      {
        event_type: "sale.line_items.added",
        remote_rule_id: remoteRule.id
      }
    );
  }

  const defaults = { days: 0, hours: 0, minutes: 0, reduction: 0 };
  const discounts = _.map(
    req.body.discounts,
    (dc) => _.pick(
      { ...defaults, ...dc },
      ['days', 'hours', 'minutes', 'reduction']
    )
  );

  discountRules[req.body.domain_prefix] = discounts;

  res.json({ data: discounts });
});

app.post("/", (req, res) => {
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

      const discount = discountRules[req.body.retailer.domain_prefix].find((rule) => satisfiesRule(expiryDate, rule));

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
