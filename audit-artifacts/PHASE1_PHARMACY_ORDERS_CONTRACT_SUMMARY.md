# Pharmacy/Orders Contract Detail Summary

## GET /api/v1/orders
- summary: OrdersController_list_v1
- operationId: OrdersController_list_v1
- security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}
- parameters:
  - state (query, required=True, type=string)
  - search (query, required=True, type=string)
- requestBody: -
- responses:
  - 200: ; content=[]

## GET /api/v1/orders/mine
- summary: OrdersController_mine_v1
- operationId: OrdersController_mine_v1
- security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}
- parameters:
  - type (query, required=True, type=string)
- requestBody: -
- responses:
  - 200: ; content=[]

## GET /api/v1/orders/{id}
- summary: OrdersController_one_v1
- operationId: OrdersController_one_v1
- security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}
- parameters:
  - id (path, required=True, type=string)
- requestBody: -
- responses:
  - 200: ; content=[]

## POST /api/v1/orders/create
- summary: OrdersController_create_v1
- operationId: OrdersController_create_v1
- security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}
- parameters:
- requestBody: {"application/json": {"schema": {"$ref": "#/components/schemas/CreateOrderDto"}}}
- responses:
  - 201: ; content=[]

## POST /api/v1/orders/{id}/cancel
- summary: OrdersController_cancel_v1
- operationId: OrdersController_cancel_v1
- security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}
- parameters:
  - id (path, required=True, type=string)
- requestBody: -
- responses:
  - 201: ; content=[]

## GET /api/v1/cart
- summary: CartController_get_v1
- operationId: CartController_get_v1
- security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}
- parameters:
- requestBody: -
- responses:
  - 200: ; content=[]

## POST /api/v1/cart/lines
- summary: CartController_add_v1
- operationId: CartController_add_v1
- security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}
- parameters:
- requestBody: -
- responses:
  - 201: ; content=[]

## PATCH /api/v1/cart/lines/{lineId}
- summary: CartController_upd_v1
- operationId: CartController_upd_v1
- security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}
- parameters:
  - lineId (path, required=True, type=string)
- requestBody: -
- responses:
  - 200: ; content=[]

## DELETE /api/v1/cart/lines/{lineId}
- summary: CartController_rm_v1
- operationId: CartController_rm_v1
- security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}
- parameters:
  - lineId (path, required=True, type=string)
- requestBody: -
- responses:
  - 200: ; content=[]

## POST /api/v1/cart/clear
- summary: CartController_clr_v1
- operationId: CartController_clr_v1
- security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}
- parameters:
- requestBody: -
- responses:
  - 201: ; content=[]

## GET /api/v1/cart/checkout
- summary: CartController_chk_v1
- operationId: CartController_chk_v1
- security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}
- parameters:
- requestBody: -
- responses:
  - 200: ; content=[]

## GET /api/v1/cart/prescription
- summary: CartController_prescription_v1
- operationId: CartController_prescription_v1
- security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}
- parameters:
- requestBody: -
- responses:
  - 200: ; content=[]

## GET /api/v1/medicines
- summary: MedicinesController_list_v1
- operationId: MedicinesController_list_v1
- security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}
- parameters:
  - search (query, required=True, type=string)
  - q (query, required=True, type=string)
  - category (query, required=True, type=string)
  - page (query, required=True, type=string)
  - limit (query, required=True, type=string)
  - cursor (query, required=True, type=string)
  - authorization (header, required=True, type=string)
- requestBody: -
- responses:
  - 200: ; content=[]

## GET /api/v1/medicines/{id}
- summary: MedicinesController_one_v1
- operationId: MedicinesController_one_v1
- security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}
- parameters:
  - id (path, required=True, type=string)
- requestBody: -
- responses:
  - 200: ; content=[]

## PATCH /api/v1/medicines/{id}
- summary: MedicinesController_update_v1
- operationId: MedicinesController_update_v1
- security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}
- parameters:
  - id (path, required=True, type=string)
- requestBody: -
- responses:
  - 200: ; content=[]

## GET /api/v1/medicines/{id}/details
- summary: MedicinesController_details_v1
- operationId: MedicinesController_details_v1
- security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}
- parameters:
  - id (path, required=True, type=string)
  - authorization (header, required=True, type=string)
  - lang (query, required=True, type=string)
  - accept-language (header, required=True, type=string)
- requestBody: -
- responses:
  - 200: ; content=[]

## GET /api/v1/users/me/addresses
- summary: UsersAddressesController_getAddresses_v1
- operationId: UsersAddressesController_getAddresses_v1
- security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}
- parameters:
- requestBody: -
- responses:
  - 200: ; content=[]

## POST /api/v1/users/me/addresses
- summary: UsersAddressesController_addAddress_v1
- operationId: UsersAddressesController_addAddress_v1
- security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}
- parameters:
- requestBody: -
- responses:
  - 201: ; content=[]

## GET /api/v1/users/me/wishlist
- summary: UsersController_getWishlist_v1
- operationId: UsersController_getWishlist_v1
- security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}
- parameters:
- requestBody: -
- responses:
  - 200: ; content=[]

## POST /api/v1/prescriptions/upload
- summary: PrescriptionsController_upload_v1
- operationId: PrescriptionsController_upload_v1
- security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}
- parameters:
- requestBody: -
- responses:
  - 201: ; content=[]

## POST /api/v1/media/presigned
- summary: MediaController_getPresignedUrl_v1
- operationId: MediaController_getPresignedUrl_v1
- security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}
- parameters:
- requestBody: -
- responses:
  - 201: ; content=[]

## POST /api/v1/media/upload
- summary: MediaController_uploadFile_v1
- operationId: MediaController_uploadFile_v1
- security: {"bearer": {"scheme": "bearer", "bearerFormat": "JWT", "type": "http"}}
- parameters:
- requestBody: -
- responses:
  - 201: ; content=[]
