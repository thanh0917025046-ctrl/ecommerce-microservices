# Architecture

Client communicates with API Gateway using REST/JSON. API Gateway performs authentication, authorization, routing, rate limiting and product-list caching. Internal synchronous communication uses gRPC. OrderCreated is asynchronous through Kafka.

Database-per-Service:
- Auth Service -> PostgreSQL Auth DB.
- Customer Service -> PostgreSQL Customer DB.
- Product Service -> MongoDB Product DB.
- Order Service -> PostgreSQL Order DB.
- Shipment Service -> MongoDB Shipment DB.

Order flow:
1. Gateway validates JWT.
2. Gateway calls Order Service by gRPC.
3. Order Service gets Customer Membership score by gRPC.
4. Order Service asks Product Service to validate/reserve stock by gRPC.
5. Order Service calculates score-based discount.
6. Order Service writes Order, OrderDetail and OutboxEvent in one PostgreSQL transaction.
7. Outbox publisher sends OrderCreated to Kafka topic `order-created`.
8. Shipment Service consumes event idempotently and creates Shipment(PENDING).
