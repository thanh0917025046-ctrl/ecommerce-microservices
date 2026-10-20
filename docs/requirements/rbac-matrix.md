# RBAC Matrix

| Endpoint | member | admin |
|---|---:|---:|
| GET /api/customers/:uid (self) | Yes | Yes |
| PUT /api/customers/:uid (self) | Yes | Yes |
| GET /api/customers/:uid/membership (self) | Yes | Yes |
| GET /api/customers | No | Yes |
| POST /api/customers | No | Yes |
| DELETE /api/customers/:uid | No | Yes |
| GET /api/products | Yes | Yes |
| GET /api/products/:pid | Yes | Yes |
| POST/PUT/DELETE /api/products | No | Yes |
| POST /api/orders | Yes | Yes |
| GET own orders | Yes | Yes |
| PATCH /api/shipments/:shipid/status | No | Yes |
