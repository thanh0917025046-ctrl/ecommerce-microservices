# E-commerce Microservices MVP — Thực hành 3

Dự án Node.js Microservices bám theo tài liệu thiết kế và bảng chấm thực hành:

- Client → **REST/JSON** → API Gateway.
- API Gateway → **gRPC** → các microservice.
- Database-per-Service.
- Redis tại API Gateway cho rate limiting và cache danh sách sản phẩm.
- Kafka cho sự kiện bất đồng bộ `OrderCreated`.
- Order Service dùng **Transactional Outbox** để lưu Order/OrderDetail/OutboxEvent trong cùng transaction PostgreSQL.
- Shipment Service consume `OrderCreated` và tạo Shipment `PENDING`.
- Có 3 Claude Code custom SubAgent: BA, Dev, Test.

> Không cần tạo `.env` để chạy demo. `docker-compose.yml` đã có giá trị local mặc định. Nếu máy đang có project khác dùng port 3000, hãy tắt project đó trước.

---

## 1. Cấu trúc dự án

```text
ecommerce-microservices-full/
├── CLAUDE.md
├── .claude/
│   └── agents/
│       ├── ba-agent.md
│       ├── dev-agent.md
│       └── test-agent.md
├── docs/
│   ├── requirements/
│   ├── architecture/
│   ├── api/
│   ├── test/
│   └── reports/
├── postman/
│   └── Ecommerce-Microservices.postman_collection.json
├── proto/
│   ├── auth.proto
│   ├── customer.proto
│   ├── product.proto
│   ├── order.proto
│   └── shipment.proto
├── services/
│   ├── api-gateway/
│   ├── auth-service/
│   ├── customer-service/
│   ├── product-service/
│   ├── order-service/
│   └── shipment-service/
├── scripts/
│   └── rubric-check.sh
├── docker-compose.yml
└── README.md
```

### Ý nghĩa thư mục

- `services/api-gateway`: REST API public, Authentication, Authorization/RBAC, Rate Limiting, request routing, Redis cache.
- `services/auth-service`: User, register/login/logout/verify JWT; PostgreSQL Auth DB.
- `services/customer-service`: Customer + Membership; PostgreSQL Customer DB.
- `services/product-service`: Product + tồn kho; MongoDB Product DB.
- `services/order-service`: discount, Order, OrderDetail, Transactional Outbox, publish Kafka; PostgreSQL Order DB.
- `services/shipment-service`: consume Kafka `OrderCreated`, tạo/cập nhật Shipment; MongoDB Shipment DB.
- `proto`: contract gRPC dùng chung giữa các service.
- `.claude/agents`: 3 custom SubAgent cho Claude Code.
- `postman`: collection để demo/test REST API.

---

## 2. Giải thích các file `.proto`

`.proto` là **hợp đồng giao tiếp gRPC**. Nó định nghĩa service, RPC method và message request/response. Client bên trong hệ thống chỉ cần tuân theo contract này, không cần biết service kia lưu database bằng công nghệ gì.

### `auth.proto`

Contract của Auth Service:

- `Register`
- `Login`
- `Logout`
- `VerifyToken`

Auth Service quản lý `User(uid, username, password, role)`. Password được hash bằng bcrypt-compatible hashing (`bcryptjs`). JWT chứa `uid`, `username`, `role`.

### `customer.proto`

Contract của Customer & Membership Service:

- `EnsureCustomer`
- `CreateCustomer`
- `GetCustomer`
- `ListCustomers`
- `UpdateCustomer`
- `DeleteCustomer`
- `GetMembership`

Dữ liệu chính:

- Customer: `uid, fullname, mid`
- Membership: `mid, mname, score`

### `product.proto`

Contract của Product Service:

- `ListProducts`
- `GetProduct`
- `CreateProduct`
- `UpdateProduct`
- `DeleteProduct`
- `ReserveProducts`
- `RestoreProducts`

`ReserveProducts` được Order Service gọi để kiểm tra tồn kho và trừ số lượng khi đặt hàng.

### `order.proto`

Contract của Order Service:

- `CreateOrder`
- `ListOrders`
- `GetOrder`

Order Service lấy Membership score từ Customer Service, lấy giá/tồn kho từ Product Service, tính discount, rồi lưu `Order` + `OrderDetail` + `OutboxEvent`.

### `shipment.proto`

Contract đồng bộ để API Gateway đọc/cập nhật Shipment:

- `GetShipment`
- `UpdateStatus`

Việc **tạo Shipment không gọi gRPC trực tiếp**. Shipment được tạo bất đồng bộ khi Shipment Service consume `OrderCreated` từ Kafka.

---

## 3. Kiến trúc giao tiếp

```text
Client
  |
  | REST / JSON
  v
API Gateway ---- Redis
  |
  | gRPC synchronous
  +--> Auth Service ------ PostgreSQL Auth DB
  +--> Customer Service -- PostgreSQL Customer DB
  +--> Product Service --- MongoDB Product DB
  +--> Order Service ----- PostgreSQL Order DB
  +--> Shipment Service -- MongoDB Shipment DB
                          ^
Order Service             |
     |                    |
     +--- Kafka: order-created ---+
```

- REST chỉ được expose tại API Gateway.
- Các service không truy cập database của service khác.
- Kafka là giao tiếp asynchronous giữa Order và Shipment.

---

## 4. Chạy toàn bộ hệ thống

Tại thư mục project:

```bash
docker compose up -d --build
```

Xem danh sách container:

```bash
docker compose ps
```

Theo thiết kế sẽ có:

- `api-gateway`
- `auth-service`
- `customer-service`
- `product-service`
- `order-service`
- `shipment-service`
- `postgres-auth`
- `postgres-customer`
- `postgres-order`
- `mongo-product`
- `mongo-shipment`
- `redis`
- `kafka`

Health check:

```bash
curl http://localhost:3000/api/health
```

Kỳ vọng:

```json
{"status":"UP","service":"api-gateway","message":"E-commerce API is running"}
```

Tắt hệ thống:

```bash
docker compose down
```

Reset toàn bộ database/volume khi cần chạy demo lại từ đầu:

```bash
docker compose down -v
```

---

## 5. Kiểm tra Kafka

Liệt kê topic:

```bash
docker compose exec kafka /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server kafka:9092 --list
```

Sau khi đã tạo Order, xem event `OrderCreated`:

```bash
docker compose exec kafka /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server kafka:9092 \
  --topic order-created \
  --from-beginning \
  --max-messages 1
```

Xem log Order và Shipment:

```bash
docker compose logs --tail=100 order-service shipment-service
```

Order Service sẽ có log dạng `Published OrderCreated event for order ...` và Shipment Service có log `Shipment created for oid ...`.

---

## 6. Postman

Import file:

```text
postman/Ecommerce-Microservices.postman_collection.json
```

Collection có sẵn biến `baseUrl=http://localhost:3000` và tự lưu token/uid/oid từ các request register/login/order.

Luồng demo khuyến nghị:

1. Register Admin.
2. Register Member.
3. Login Admin.
4. Login Member.
5. Member cập nhật Customer của chính mình `mid=3` (GOLD, score=500).
6. `TC-PRO-01` Get Product List bằng Member token.
7. `TC-CUS-04` Get Membership → `GOLD`, `score=500`.
8. `TC-CUS-05` Get Customer **không gửi token** → `401`.
9. `TC-ORD-04 + TC-ORD-05` Create Order → discount `10`, Order được lưu và `OrderCreated` vào Kafka.
10. Chờ 1–3 giây rồi Get Shipment với `shipid = oid` → `PENDING`.

---

## 7. Discount policy dùng cho TC-ORD-04

Tài liệu yêu cầu tính discount theo `score` nhưng **không cung cấp ngưỡng cụ thể**, vì vậy project ghi rõ assumption:

| Score | Discount |
|---:|---:|
| `< 100` | 0% |
| `100–499` | 5% |
| `500–999` | 10% |
| `>= 1000` | 20% |

Membership seed:

| mid | mname | score |
|---:|---|---:|
| 1 | BRONZE | 0 |
| 2 | SILVER | 100 |
| 3 | GOLD | 500 |
| 4 | PLATINUM | 1000 |

Do đó khi Customer có `mid=3`, TC-ORD-04 kỳ vọng `discount = 10`.

---

## 8. Checklist đúng bảng chấm Thực hành 3

### 1) Giải thích `.proto` và cấu trúc dự án

Dùng mục **1–3 của README này**.

### 2) CLI compose và liệt kê container

```bash
docker compose up -d --build
docker compose ps
```

### 3) Kiểm tra và giải thích Kafka

```bash
docker compose exec kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:9092 --list
```

Kafka nhận `OrderCreated` từ Order Service và Shipment Service consume event bất đồng bộ.

### 4) TC-PRO-01 — Lấy danh sách Product

```text
GET /api/products
Authorization: Bearer <memberToken>
```

Kỳ vọng HTTP `200`, trả danh sách sản phẩm seed.

### 5) TC-CUS-04 — Lấy thông tin Membership

```text
GET /api/customers/:uid/membership
Authorization: Bearer <memberToken>
```

Kỳ vọng trả `mid`, `mname`, `score`.

### 6) TC-CUS-05 — Customer không có token

```text
GET /api/customers/:uid
```

Không có Authorization header → HTTP `401 Unauthorized`.

### 7) TC-ORD-04 — Tính discount theo score

Customer `mid=3` → `score=500` → discount `10%`.

```text
POST /api/orders
Authorization: Bearer <memberToken>
Body: {"items":[{"pid":1,"qty":2}]}
```

### 8) TC-ORD-05 — Tạo Order và phát sự kiện

Cùng request POST Order ở trên:

- Order + OrderDetail được lưu PostgreSQL.
- OutboxEvent được lưu cùng DB transaction.
- Publisher gửi `OrderCreated` vào Kafka topic `order-created`.
- Shipment Service consume và tạo Shipment `PENDING`.

---

## 9. Claude Code + 3 SubAgent

Mở Claude Code tại project root:

```bash
claude
```

Agents nằm tại:

```text
.claude/agents/ba-agent.md
.claude/agents/dev-agent.md
.claude/agents/test-agent.md
```

Ví dụ:

```text
Use the ba-agent. Review requirements and traceability only; do not code.
Use the dev-agent. Implement or fix the requested service and run checks.
Use the test-agent. Execute rubric test cases and update the test report.
```
