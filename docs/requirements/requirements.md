# Requirements Summary

Source-aligned MVP requirements:

- FR01 Register account.
- FR02 Login.
- FR03 Manage customer information.
- FR04 Manage Customer + Membership.
- FR05 Admin manages products.
- FR06 Authenticated user views products and quantity.
- FR07 Place order with product/qty.
- FR08 Calculate discount from membership score.
- FR09 Update inventory after successful order flow.
- FR10 Persist Order + OrderDetail.
- FR11 Create/update Shipment.
- FR12 View shipment/order status.
- FR13 Authorization using JWT role.

## Assignment assumption
The supplied requirements say discount is based on score but do not define thresholds. This implementation uses: `<100=0%`, `100–499=5%`, `500–999=10%`, `>=1000=20%`.
