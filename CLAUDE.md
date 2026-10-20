# E-commerce Microservices MVP — Project Instructions

Build and maintain the project according to the attached assignment design.

## Fixed architecture

Client -> REST/JSON -> API Gateway.
API Gateway -> gRPC -> Auth, Customer, Product, Order, Shipment services.
Order Service -> Kafka `order-created` -> Shipment Service.
Redis belongs to API Gateway for rate limiting/cache.

Database-per-Service:
- Auth: PostgreSQL
- Customer & Membership: PostgreSQL
- Product: MongoDB
- Order: PostgreSQL
- Shipment: MongoDB

## Bounded contexts
1. Identity & Access: User, Role/JWT.
2. Customer & Membership: Customer(uid, fullname, mid), Membership(mid, mname, score).
3. Product Catalog: Product(pid, pname, price, quantity).
4. Order Management: Order, OrderDetail, discount, OutboxEvent.
5. Shipment: Shipment(shipid, oid, status).

## Required rubric behaviors
- TC-PRO-01 GET product list.
- TC-CUS-04 get Membership mname + score.
- TC-CUS-05 missing JWT -> 401.
- TC-ORD-04 discount based on score.
- TC-ORD-05 persist order and publish OrderCreated to Kafka.

## Discount assumption
Source documents require score-based discount but do not define thresholds.
Use and document: <100=0%, 100-499=5%, 500-999=10%, >=1000=20%.
Never silently change this rule.

## Engineering rules
- External REST only at API Gateway.
- Internal synchronous calls use gRPC.
- Do not directly read another service's database.
- Passwords are hashed; never log passwords/JWT secrets.
- Order persistence uses DB transaction for Order + OrderDetail + OutboxEvent.
- Shipment creation is idempotent for duplicate OrderCreated events.
- Keep README rubric steps accurate.

## Agent workflow
BA Agent: requirements, traceability, API/architecture docs; no production code.
Dev Agent: implementation, Docker, gRPC, Kafka, checks.
Test Agent: execute objective tests, record PASS/FAIL, do not silently fix production code.
