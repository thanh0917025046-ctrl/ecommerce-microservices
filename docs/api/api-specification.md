# REST API Specification

Base URL: `http://localhost:3000`

## Auth
- POST `/api/auth/register` — no token.
- POST `/api/auth/login` — no token.
- POST `/api/auth/logout` — Bearer token.

## Customer & Membership
- GET `/api/customers/:uid` — Bearer; self/admin.
- PUT `/api/customers/:uid` — Bearer; self/admin; body `{fullname, mid}`.
- GET `/api/customers/:uid/membership` — Bearer; self/admin; returns `mid,mname,score`.
- GET `/api/customers` — admin.
- POST `/api/customers` — admin helper endpoint.
- DELETE `/api/customers/:uid` — admin helper endpoint.

## Product
- GET `/api/products` — Bearer.
- GET `/api/products/:pid` — Bearer.
- POST `/api/products` — admin.
- PUT `/api/products/:pid` — admin.
- DELETE `/api/products/:pid` — admin.

## Order
- POST `/api/orders` — Bearer; body `{items:[{pid,qty}]}`.
- GET `/api/orders` — Bearer.
- GET `/api/orders/:oid` — Bearer; own order/admin.

## Shipment
- GET `/api/shipments/:shipid` — Bearer.
- PATCH `/api/shipments/:shipid/status` — admin; body `{status}`.

## Health
- GET `/api/health` — public.
