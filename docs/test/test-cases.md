# Key Test Cases

| ID | Input / Condition | Expected |
|---|---|---|
| TC-PRO-01 | GET /api/products with JWT | 200 + product list |
| TC-CUS-04 | Customer has mid=3 | Membership GOLD, score=500 |
| TC-CUS-05 | GET Customer without JWT | 401 Unauthorized |
| TC-ORD-04 | Customer score=500, valid items | discount=10 |
| TC-ORD-05 | Valid order | persisted Order/OrderDetail + Kafka OrderCreated |
| TC-SHP-01 | valid OrderCreated event | Shipment PENDING created |
| TC-SHP-05 | duplicate event | no duplicate Shipment |
