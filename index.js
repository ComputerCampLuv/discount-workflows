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
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setUTCHours(23, 59, 59, 999);

  const actions = [];

  req.body.line_items.forEach(lineItem => {
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

    if (expiryDateField) {
      const expiryDate = new Date(expiryDateField.string_value);

      if (
        expiryDate.getTime() > startOfDay &&
        expiryDate.getTime() < endOfDay
      ) {
        // remove the line item with product nearing expiry
        actions.push({
          type: "remove_line_item",
          line_item_id: lineItem.id
        });
        // replace the line item with a reduced variant
        actions.push({
          type: "add_line_item",
          product_id: lineItem.product_id,
          quantity: lineItem.price.quantity,
          unit_price: new Decimal(lineItem.price).mul(0.75).toFixed(2),
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
      entity_id: lineItem,
      required_custom_fields: [
        {
          name: "expiry_date"
        }
      ]
    });
  });

  res.json({ actions });
});

// app.post("/", (req, res) => {
//   const startOfDay = new Date();
//   startOfDay.setUTCHours(0, 0, 0, 0);
//   // console.log(startOfDay);

//   const endOfDay = new Date();
//   endOfDay.setUTCHours(23, 59, 59, 999);
//   // console.log(endOfDay);

//   const lineItem = req.body.line_items[0];

//   console.log("line_item:", JSON.stringify(lineItem));

//   const expiryDate = lineItem
//     .custom_fields
//     .find(({ name }) => name === "expiry_date");

//   const expires = lineItem
//     .product
//     .custom_fields
//     .find(({ name }) => name === "expires")
//     ?.boolean_value;

//   if (
//     !expires || lineItem.note === "Reduced"
//   ) {
//     res.json({ actions: [] });
//   } else if (expiryDate) {
//     const today = new Date();
//     const expiry = new Date(expiryDate.string_value);
    
//     if (
//       expiry.getYear() === today.getYear() &&
//       expiry.getMonth() === today.getMonth() &&
//       expiry.getDay() === today.getDay()
//     ) {
//       res.json({
//         actions: [
//           {
//             type: "remove_line_item",
//             line_item_id: lineItem.id
//           },
//           {
//             type: "add_line_item",
//             product_id: lineItem.product_id,
//             quantity: "1",
//             unit_price: new Decimal(lineItem.price_total).mul(0.75).toFixed(2),
//             note: "Reduced"
//           }
//         ]
//       });
//     } else {
//       res.json({ actions: [] });
//     }
//   } else {
//     res.json({
//       actions: [
//         {
//           type: "require_custom_fields",
//           title: "We need some information about this product",
//           message: "Bla bla bla",
//           entity: "line_item",
//           entity_id: req.body?.line_items[0].id,
//           required_custom_fields: [
//             {
//               name: "expiry_date"
//             }
//           ]
//         }
//       ]
//     });
//   }
// });

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});
