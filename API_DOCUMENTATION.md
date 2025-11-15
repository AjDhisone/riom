# RIOM Inventory API Documentation

This document provides a complete reference for the RIOM Inventory Management System's backend API.

---

### Authentication & Session Flow

Authentication is handled via a session-based flow using email and password.

1.  **Registration**: New users register with email, password, and name via the `/api/auth/register` endpoint.
2.  **Login**: Users authenticate with their email and password via the `/api/auth/login` endpoint.
3.  **Session Creation**: The server validates credentials, and establishes a session.
4.  **Cookie Response**: A secure, `httpOnly` session cookie (e.g., `riom.sid`) is set in the client's browser.
5.  **Authenticated Requests**: All subsequent requests to protected endpoints must include this session cookie for authentication. The server automatically validates the session.

---

### Common Response Format

All API responses follow a standardized JSON format.

**Success Response**

```json
{
  "success": true,
  "message": "Descriptive success message.",
  "data": {
    "key": "value"
  }
}
```

**Error Response**

```json
{
  "success": false,
  "message": "Descriptive error message.",
  "error": {
    "code": "ERROR_CODE",
    "details": "Optional additional error details."
  }
}
```

---

### Pagination Rules

Endpoints that return a list of resources support pagination via query parameters.

-   `page` (number, optional, default: `1`): The page number to retrieve.
-   `limit` (number, optional, default: `10` or `20`): The number of items per page.

---

### Date Range Filter Rules

Endpoints that support time-based filtering accept the following query parameters.

-   `from` (string, optional, format: `YYYY-MM-DD`): The start date of the range (inclusive).
-   `to` (string, optional, format: `YYYY-MM-DD`): The end date of the range (inclusive).

---

## Authentication

Endpoints for managing user authentication and sessions.

### Register

**URL:** `/api/auth/register`  
**Method:** `POST`  
**Auth Required:** No  
**Roles Allowed:** N/A  
**Description:** Creates a new user account with email and password. Automatically logs in the user and establishes a session.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe",
  "role": "staff"
}
```

**Fields:**
- `email` (string, required): User's email address (must be unique)
- `password` (string, required): User's password (will be hashed)
- `name` (string, required): User's full name
- `role` (string, optional): User role, either "admin" or "staff" (defaults to "staff")

**Success Response (201 Created):**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "staff",
    "permissions": [],
    "createdAt": "2025-11-15T10:30:00.000Z",
    "updatedAt": "2025-11-15T10:30:00.000Z"
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "message": "Email, password, and name are required",
  "error": {
    "code": "INVALID_INPUT",
    "details": null
  }
}
```

**Error Response (409 Conflict):**

```json
{
  "success": false,
  "message": "User already exists",
  "error": {
    "code": "INVALID_INPUT",
    "details": null
  }
}
```

### Login

**URL:** `/api/auth/login`  
**Method:** `POST`  
**Auth Required:** No  
**Roles Allowed:** N/A  
**Description:** Authenticates a user with email and password. Establishes a session and returns a session cookie.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Logged in successfully",
  "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "staff",
    "permissions": [],
    "lastLogin": "2025-11-15T10:35:00.000Z",
    "createdAt": "2025-11-15T10:30:00.000Z",
    "updatedAt": "2025-11-15T10:35:00.000Z"
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "message": "Email and password are required",
  "error": {
    "code": "INVALID_INPUT",
    "details": null
  }
}
```

**Error Response (401 Unauthorized):**

```json
{
  "success": false,
  "message": "Invalid credentials",
  "error": {
    "code": "NOT_AUTHORIZED",
    "details": null
  }
}
```

### Get Current User

**URL:** `/api/auth/me`  
**Method:** `GET`  
**Auth Required:** Yes  
**Roles Allowed:** `admin`, `staff`  
**Description:** Retrieves the profile of the currently authenticated user based on their session cookie.

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Current user fetched",
  "data": {
    "_id": "60d21b4667d0d8992e610c85",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "staff",
    "permissions": [],
    "lastLogin": "2025-11-15T10:35:00.000Z",
    "createdAt": "2025-11-15T10:30:00.000Z",
    "updatedAt": "2025-11-15T10:35:00.000Z"
  }
}
```

**Error Response (401 Unauthorized):**

```json
{
  "success": false,
  "message": "Authentication required",
  "error": {
    "code": "NOT_AUTHORIZED",
    "details": null
  }
}
```

### Logout

**URL:** `/api/auth/logout`  
**Method:** `POST`  
**Auth Required:** No  
**Description:** Destroys the current session and clears the session cookie.

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Logged out",
  "data": null
}
```

---

## Products

Endpoints for managing product information. A product is a template for one or more SKUs.

### Create Product

**URL:** `/api/products`  
**Method:** `POST`  
**Auth Required:** Yes  
**Roles Allowed:** `admin`  
**Description:** Creates a new product.

**Request Body:**

```json
{
  "name": "Organic Cotton T-Shirt",
  "description": "A soft, durable, and eco-friendly t-shirt.",
  "category": "Apparel",
  "basePrice": 15.99,
  "images": ["https://example.com/image1.jpg"]
}
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "product": {
      "_id": "60d21b4667d0d8992e610c99",
      "name": "Organic Cotton T-Shirt",
      "category": "Apparel",
      "isActive": true
    }
  }
}
```

### Get Products

**URL:** `/api/products`  
**Method:** `GET`  
**Auth Required:** Yes  
**Roles Allowed:** `admin`, `staff`  
**Description:** Retrieves a paginated list of products, with optional filters.

**Query Params:**

-   `page` (number, optional): Page number.
-   `limit` (number, optional): Items per page.
-   `q` (string, optional): Search query for product name.
-   `category` (string, optional): Filter by category name.
-   `isActive` (boolean, optional): Filter by active status.

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Products fetched successfully",
  "data": {
    "products": [
      {
        "_id": "60d21b4667d0d8992e610c99",
        "name": "Organic Cotton T-Shirt",
        "category": "Apparel",
        "skuCount": 3
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

### Get Product by ID

**URL:** `/api/products/:id`  
**Method:** `GET`  
**Auth Required:** Yes  
**Roles Allowed:** `admin`, `staff`  
**Description:** Retrieves a single product by its ID.

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Product fetched successfully",
  "data": {
    "product": {
      "_id": "60d21b4667d0d8992e610c99",
      "name": "Organic Cotton T-Shirt",
      "description": "A soft, durable, and eco-friendly t-shirt."
    }
  }
}
```

### Update Product

**URL:** `/api/products/:id`  
**Method:** `PUT`  
**Auth Required:** Yes  
**Roles Allowed:** `admin`  
**Description:** Updates a product's details.

**Request Body:**

```json
{
  "name": "Premium Organic Cotton T-Shirt",
  "basePrice": 19.99
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "product": {
      "_id": "60d21b4667d0d8992e610c99",
      "name": "Premium Organic Cotton T-Shirt",
      "basePrice": 19.99
    }
  }
}
```

### Archive Product

**URL:** `/api/products/:id`  
**Method:** `DELETE`  
**Auth Required:** Yes  
**Roles Allowed:** `admin`  
**Description:** Archives a product by setting its `isActive` status to `false`. This is a soft delete.

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Product archived successfully",
  "data": {
    "success": true
  }
}
```

---

## SKUs (Stock Keeping Units)

Endpoints for managing individual stock-keeping units, which are variants of a product.

### Create SKU

**URL:** `/api/skus`  
**Method:** `POST`  
**Auth Required:** Yes  
**Roles Allowed:** `admin`  
**Description:** Creates a new SKU for a given product. A unique barcode is generated automatically if not provided.

**Request Body:**

```json
{
  "productId": "60d21b4667d0d8992e610c99",
  "sku": "TS-COT-MED-BLK",
  "price": 15.99,
  "stock": 100,
  "attributes": {
    "color": "Black",
    "size": "Medium"
  }
}
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "message": "SKU created successfully",
  "data": {
    "sku": {
      "_id": "60d21b4667d0d8992e610d11",
      "productId": "60d21b4667d0d8992e610c99",
      "sku": "TS-COT-MED-BLK",
      "barcode": "100000000123",
      "stock": 100
    }
  }
}
```

### Get SKU by ID

**URL:** `/api/skus/:id`  
**Method:** `GET`  
**Auth Required:** Yes  
**Roles Allowed:** `admin`, `staff`  
**Description:** Retrieves a single SKU by its ID.

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "SKU fetched successfully",
  "data": {
    "sku": {
      "_id": "60d21b4667d0d8992e610d11",
      "sku": "TS-COT-MED-BLK",
      "stock": 98
    }
  }
}
```

### Update SKU

**URL:** `/api/skus/:id`  
**Method:** `PUT`  
**Auth Required:** Yes  
**Roles Allowed:** `admin`  
**Description:** Updates an SKU's details, such as price or attributes. To change stock, use the stock adjustment endpoints.

**Request Body:**

```json
{
  "price": 16.50,
  "reorderThreshold": 15
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "SKU updated successfully",
  "data": {
    "sku": {
      "_id": "60d21b4667d0d8992e610d11",
      "price": 16.50,
      "reorderThreshold": 15
    }
  }
}
```

### Adjust SKU Stock

**URL:** `/api/skus/:id/stock`  
**Method:** `POST`  
**Auth Required:** Yes  
**Roles Allowed:** `admin`, `staff`  
**Description:** Adjusts the stock for a single SKU. Use a positive `delta` to add stock and a negative `delta` to remove it.

**Request Body:**

```json
{
  "delta": -2,
  "reason": "Sale"
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "SKU stock adjusted successfully",
  "data": {
    "sku": { "_id": "60d21b4667d0d8992e610d11", "stock": 98 },
    "history": { "_id": "60d21b4667d0d8992e610e22", "change": -2 }
  }
}
```

### Search SKUs

**URL:** `/api/skus/search`  
**Method:** `GET`  
**Auth Required:** Yes  
**Roles Allowed:** `admin`, `staff`  
**Description:** Performs a text search for SKUs by name, SKU code, or barcode.

**Query Params:**

-   `query` (string, required): The search term.

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "SKUs matched",
  "data": [
    {
      "skuId": "60d21b4667d0d8992e610d11",
      "productName": "Organic Cotton T-Shirt",
      "sku": "TS-COT-MED-BLK",
      "barcode": "100000000123"
    }
  ]
}
```

### Scan SKU by Barcode

**URL:** `/api/skus/scan`  
**Method:** `GET`  
**Auth Required:** Yes  
**Roles Allowed:** `admin`, `staff`  
**Description:** Retrieves a single SKU by its exact barcode.

**Query Params:**

-   `barcode` (string, required): The barcode to look up.

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "SKU fetched by barcode",
  "data": {
    "_id": "60d21b4667d0d8992e610d11",
    "sku": "TS-COT-MED-BLK",
    "barcode": "100000000123",
    "stock": 98
  }
}
```

---

## Orders

Endpoints for creating and viewing customer orders.

### Create Order

**URL:** `/api/orders`  
**Method:** `POST`  
**Auth Required:** Yes  
**Roles Allowed:** `admin`, `staff`  
**Description:** Creates a new order. The process is transactional: stock is deducted for all items, and a stock history is recorded.

**Request Body:**

```json
{
  "items": [
    { "skuId": "60d21b4667d0d8992e610d11", "quantity": 2 },
    { "skuId": "60d21b4667d0d8992e610d12", "quantity": 1 }
  ],
  "taxRate": 0.08,
  "customer": {
    "name": "Jane Doe"
  }
}
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": {
      "_id": "60d21b4667d0d8992e610f33",
      "orderNumber": "ORD-2025-0001",
      "total": 54.50,
      "status": "completed"
    }
  }
}
```

### Get Orders

**URL:** `/api/orders`  
**Method:** `GET`  
**Auth Required:** Yes  
**Roles Allowed:** `admin`, `staff`  
**Description:** Retrieves a paginated list of orders. `staff` users can only see orders they created.

**Query Params:**

-   `page`, `limit` (pagination).
-   `from`, `to` (date range).
-   `status` (string, optional): Filter by `pending`, `completed`, or `cancelled`.
-   `createdBy` (string, optional, admin-only): Filter by user ID.

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Orders fetched successfully",
  "data": {
    "orders": [
      {
        "_id": "60d21b4667d0d8992e610f33",
        "orderNumber": "ORD-2025-0001",
        "total": 54.50
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

### Get Order by ID

**URL:** `/api/orders/:id`  
**Method:** `GET`  
**Auth Required:** Yes  
**Roles Allowed:** `admin`, `staff`  
**Description:** Retrieves a single order by its ID. `staff` users can only view their own orders.

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Order fetched successfully",
  "data": {
    "order": {
      "_id": "60d21b4667d0d8992e610f33",
      "orderNumber": "ORD-2025-0001",
      "items": [...]
    }
  }
}
```

---

## Analytics

Endpoints for retrieving sales and inventory reports.

### Get Sales Summary

**URL:** `/api/analytics/sales-summary`  
**Method:** `GET`  
**Auth Required:** Yes  
**Roles Allowed:** `admin`  
**Description:** Calculates key sales metrics over a specified date range.

**Query Params:** `from`, `to` (date range).

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Sales summary fetched successfully",
  "data": {
    "range": { "from": "...", "to": "..." },
    "summary": {
      "totalRevenue": 10500.75,
      "totalOrders": 150,
      "averageOrderValue": 70.01
    }
  }
}
```

### Get Top Selling SKUs

**URL:** `/api/analytics/top-selling`  
**Method:** `GET`  
**Auth Required:** Yes  
**Roles Allowed:** `admin`  
**Description:** Retrieves the top-selling SKUs by quantity sold within a date range.

**Query Params:**

-   `from`, `to` (date range).
-   `limit` (number, optional, default: `5`).

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Top selling SKUs fetched successfully",
  "data": {
    "range": { "from": "...", "to": "..." },
    "items": [
      {
        "skuId": "60d21b4667d0d8992e610d11",
        "sku": "TS-COT-MED-BLK",
        "totalQuantity": 120
      }
    ]
  }
}
```

### Get Daily Sales Trend

**URL:** `/api/analytics/daily-trend`  
**Method:** `GET`  
**Auth Required:** Yes  
**Roles Allowed:** `admin`  
**Description:** Provides daily aggregated sales data for chart visualizations.

**Query Params:** `from`, `to` (date range).

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Daily sales trend fetched successfully",
  "data": {
    "range": { "from": "...", "to": "..." },
    "data": [
      { "date": "2025-11-14", "totalRevenue": 450.50, "orderCount": 5 },
      { "date": "2025-11-15", "totalRevenue": 600.25, "orderCount": 8 }
    ]
  }
}
```

---

## Settings

Endpoints for managing global application settings.

### Get Settings

**URL:** `/api/settings`  
**Method:** `GET`  
**Auth Required:** Yes  
**Roles Allowed:** `admin`  
**Description:** Retrieves all global settings.

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Settings fetched successfully",
  "data": {
    "settings": {
      "defaultReorderThreshold": 10,
      "shopName": "RIOM Store"
    }
  }
}
```

### Update Settings

**URL:** `/api/settings`  
**Method:** `PUT`  
**Auth Required:** Yes  
**Roles Allowed:** `admin`  
**Description:** Updates one or more global settings.

**Request Body:**

```json
{
  "defaultReorderThreshold": 15
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Settings updated successfully",
  "data": {
    "settings": {
      "defaultReorderThreshold": 15,
      "shopName": "RIOM Store"
    }
  }
}
```

---

## Alerts

Endpoints for system-generated alerts.

### Get Low Stock Alerts

**URL:** `/api/alerts/low-stock`  
**Method:** `GET`  
**Auth Required:** Yes  
**Roles Allowed:** `admin`  
**Description:** Retrieves a list of all SKUs where the stock level is at or below the reorder threshold.

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Low stock alerts fetched",
  "data": {
    "alerts": [
      {
        "skuId": "60d21b4667d0d8992e610d11",
        "productName": "Organic Cotton T-Shirt",
        "sku": "TS-COT-MED-BLK",
        "stock": 8,
        "reorderThreshold": 10
      }
    ]
  }
}
```

---

## Health Check

### Get API Health

**URL:** `/api/health`  
**Method:** `GET`  
**Auth Required:** No  
**Description:** A public endpoint to verify that the API is running and available.

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Healthy",
  "data": {
    "status": "ok"
  }
}
```

---

## Common Error Codes

| Code                 | Description                                          |
| -------------------- | ---------------------------------------------------- |
| `SKU_NOT_FOUND`      | The requested SKU ID does not exist.                 |
| `PRODUCT_NOT_FOUND`  | The requested Product ID does not exist.             |
| `ORDER_NOT_FOUND`    | The requested Order ID does not exist.               |
| `NOT_AUTHORIZED`     | Authentication is required or role is not permitted. |
| `INVALID_INPUT`      | The request body or query params are invalid.        |
| `INSUFFICIENT_STOCK` | Not enough stock is available to fulfill an order.   |
| `DUPLICATE_BARCODE`  | The provided barcode is already in use.              |
| `ROUTE_NOT_FOUND`    | The requested endpoint does not exist.               |
| `SERVER_ERROR`       | An unexpected error occurred on the server.          |

---

RIOM Backend API — v1.0
