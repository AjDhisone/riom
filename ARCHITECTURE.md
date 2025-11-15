# RIOM Backend Architecture & System Design

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Pattern](#architecture-pattern)
4. [Project Structure](#project-structure)
5. [Core Components](#core-components)
6. [Data Models](#data-models)
7. [Authentication & Authorization](#authentication--authorization)
8. [Request Flow](#request-flow)
9. [Error Handling](#error-handling)
10. [Security Considerations](#security-considerations)
11. [Performance & Scalability](#performance--scalability)

---

## Overview

RIOM (Retail Inventory Order Management) is a backend system designed to manage inventory, orders, products, and SKUs for retail operations. The system follows a modular, layered architecture with clear separation of concerns.

**Key Features:**
- User authentication and role-based access control
- Product and SKU management
- Order processing and tracking
- Stock history and inventory management
- Analytics and reporting
- Alert system for low stock and order notifications
- Settings management

---

## Technology Stack

### Core Technologies
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Session Store:** MongoDB (connect-mongo)
- **Authentication:** bcryptjs for password hashing

### Key Libraries
- **Security:**
  - `helmet` - HTTP security headers
  - `cors` - Cross-Origin Resource Sharing
  - `express-session` - Session management
  - `cookie-parser` - Cookie parsing
  
- **Logging:**
  - `pino` - High-performance logging
  - `pino-http` - HTTP request logging

- **Utilities:**
  - `barcodeGenerator` - Custom barcode generation
  - `generateOrderNumber` - Order number generation

---

## Architecture Pattern

The system follows a **Layered Architecture** pattern with clear separation between:

```
┌─────────────────────────────────────┐
│         Routes Layer                │  ← HTTP endpoint definitions
├─────────────────────────────────────┤
│         Middleware Layer            │  ← Auth, validation, error handling
├─────────────────────────────────────┤
│         Controller Layer            │  ← Request/response handling
├─────────────────────────────────────┤
│         Service Layer               │  ← Business logic
├─────────────────────────────────────┤
│         Model Layer                 │  ← Data models & database
└─────────────────────────────────────┘
```

### Design Principles

1. **Separation of Concerns:** Each layer has a single responsibility
2. **DRY (Don't Repeat Yourself):** Shared utilities and middleware
3. **Modularity:** Features organized into self-contained modules
4. **Standardization:** Consistent response formats and error handling
5. **Security First:** Authentication, authorization, and input validation

---

## Project Structure

```
RIOM-SERVER/
├── app.js                    # Express app configuration
├── server.js                 # Server entry point
├── package.json              # Dependencies and scripts
├── .env                      # Environment variables
│
├── src/
│   ├── constants/            # Application constants
│   │   └── errorCodes.js     # Standardized error codes
│   │
│   ├── controllers/          # Request handlers
│   │   ├── auth.controller.js
│   │   ├── product.controller.js
│   │   ├── sku.controller.js
│   │   ├── order.controller.js
│   │   ├── analytics.controller.js
│   │   ├── report.controller.js
│   │   ├── settings.controller.js
│   │   ├── alert.controller.js
│   │   └── user.controller.js
│   │
│   ├── services/             # Business logic
│   │   ├── auth.service.js
│   │   ├── product.service.js
│   │   ├── sku.service.js
│   │   ├── order.service.js
│   │   ├── report.service.js
│   │   ├── settings.service.js
│   │   ├── user.service.js
│   │   └── audit.service.js
│   │
│   ├── models/               # Mongoose schemas
│   │   ├── user.model.js
│   │   ├── product.model.js
│   │   ├── sku.model.js
│   │   ├── order.model.js
│   │   ├── stockHistory.model.js
│   │   └── settings.model.js
│   │
│   ├── routes/               # Route definitions
│   │   ├── auth.routes.js
│   │   ├── product.routes.js
│   │   ├── sku.routes.js
│   │   ├── order.routes.js
│   │   ├── analytics.routes.js
│   │   ├── report.routes.js
│   │   ├── settings.routes.js
│   │   ├── alert.routes.js
│   │   ├── user.routes.js
│   │   └── test.routes.js
│   │
│   ├── middleware/           # Custom middleware
│   │   ├── requireAuth.js        # Authentication check
│   │   ├── requireRole.js        # Role-based authorization
│   │   ├── validateRequest.js    # Request validation
│   │   ├── sessionMiddleware.js  # Session handling
│   │   └── errorHandler.js       # Global error handler
│   │
│   ├── utils/                # Utility functions
│   │   ├── response.js           # Response formatters
│   │   ├── httpError.js          # Error utilities
│   │   ├── logger.js             # Logging configuration
│   │   ├── barcodeGenerator.js   # Barcode generation
│   │   └── generateOrderNumber.js # Order number generation
│   │
│   └── tests/                # Test files
│       ├── auth.test.js
│       ├── order.test.js
│       └── sku.test.js
```

---

## Core Components

### 1. Routes Layer

**Purpose:** Define HTTP endpoints and map them to controllers

**Example:**
```javascript
// src/routes/auth.routes.js
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', requireAuth, getCurrentUser);
```

### 2. Middleware Layer

**Purpose:** Process requests before they reach controllers

**Key Middleware:**
- `requireAuth` - Validates session authentication
- `requireRole` - Checks user role permissions
- `validateRequest` - Validates request payloads
- `errorHandler` - Catches and formats errors

**Example:**
```javascript
// Authentication middleware
const requireAuth = async (req, res, next) => {
  if (!req.session?.userId) {
    return next(createHttpError('Authentication required', 401));
  }
  next();
};
```

### 3. Controller Layer

**Purpose:** Handle HTTP requests and responses

**Responsibilities:**
- Extract data from request
- Call appropriate service methods
- Format and send responses
- Handle controller-level errors

**Example:**
```javascript
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await authService.loginUser({ email, password });
    req.session.userId = user._id;
    return res.json(success(user, 'Logged in successfully'));
  } catch (err) {
    return next(err);
  }
};
```

### 4. Service Layer

**Purpose:** Implement business logic

**Responsibilities:**
- Execute business rules
- Interact with models
- Perform data transformations
- Handle service-level errors

**Example:**
```javascript
const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid credentials');
  
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) throw new Error('Invalid credentials');
  
  user.lastLogin = new Date();
  await user.save();
  return sanitizeUser(user);
};
```

### 5. Model Layer

**Purpose:** Define data schemas and database interactions

**Example:**
```javascript
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff'], default: 'staff' }
}, { timestamps: true });
```

---

## Data Models

### User Model
- **Purpose:** Store user accounts and authentication data
- **Key Fields:** email, password, name, role, permissions, lastLogin
- **Relationships:** Created orders, audit logs

### Product Model
- **Purpose:** Template for items sold (e.g., "T-Shirt")
- **Key Fields:** name, description, category, basePrice, images
- **Relationships:** Has many SKUs

### SKU Model (Stock Keeping Unit)
- **Purpose:** Specific variant of a product (e.g., "T-Shirt - Red - Large")
- **Key Fields:** product reference, variant details, stock quantity, barcode
- **Relationships:** Belongs to Product, appears in Orders

### Order Model
- **Purpose:** Track customer orders
- **Key Fields:** orderNumber, items[], status, totalAmount, customer info
- **Relationships:** Contains SKUs, created by User

### StockHistory Model
- **Purpose:** Audit trail for inventory changes
- **Key Fields:** sku reference, quantityChange, reason, timestamp
- **Relationships:** References SKU

### Settings Model
- **Purpose:** Application configuration
- **Key Fields:** lowStockThreshold, notifications, business details

---

## Authentication & Authorization

### Authentication Flow

1. **Registration:**
   - User submits email, password, name
   - Password is hashed using bcrypt (salt rounds: 10)
   - User document created in MongoDB
   - Session established automatically

2. **Login:**
   - User submits email and password
   - System finds user by email
   - Password compared with bcrypt
   - On success: session created, cookie set
   - On failure: 401 error returned

3. **Session Management:**
   - Sessions stored in MongoDB via connect-mongo
   - Session cookie: `riom.sid` (configurable)
   - Cookie settings:
     - `httpOnly: true` (prevents XSS)
     - `secure: true` in production (HTTPS only)
     - `sameSite: 'none'` in production (cross-origin)
     - `maxAge: 24 hours`

4. **Protected Routes:**
   - `requireAuth` middleware checks `req.session.userId`
   - `requireRole` middleware validates user role
   - Session automatically validated by express-session

### Authorization Model

**Role-Based Access Control (RBAC)**

- **Roles:**
  - `admin` - Full access to all features
  - `staff` - Limited access based on permissions

- **Implementation:**
```javascript
const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    const user = await User.findById(req.session.userId);
    if (!allowedRoles.includes(user.role)) {
      return next(createHttpError('Forbidden', 403));
    }
    next();
  };
};
```

---

## Request Flow

### Complete Request Lifecycle

```
1. Client Request
   ↓
2. Express Middleware Stack
   ├─ pino-http (logging)
   ├─ helmet (security headers)
   ├─ cors (CORS handling)
   ├─ express.json (body parsing)
   ├─ cookieParser
   └─ express-session
   ↓
3. Route Matching
   ↓
4. Route-Specific Middleware
   ├─ requireAuth (if protected)
   ├─ requireRole (if role-restricted)
   └─ validateRequest (if validation needed)
   ↓
5. Controller
   ├─ Extract request data
   ├─ Call service method
   └─ Format response
   ↓
6. Service Layer
   ├─ Execute business logic
   ├─ Database operations
   └─ Return data
   ↓
7. Response Formatter
   └─ Standardized JSON response
   ↓
8. Error Handler (if error occurs)
   └─ Format error response
   ↓
9. Client Response
```

### Example: Create Product Request

```javascript
POST /api/products
Authorization: Cookie (riom.sid)
Body: { name: "T-Shirt", basePrice: 15.99 }

→ requireAuth middleware (validates session)
→ requireRole(['admin']) (checks user role)
→ productController.createProduct
  → productService.createProduct
    → Product.create() (MongoDB)
  → success(product, 'Product created')
→ Response: { success: true, data: {...} }
```

---

## Error Handling

### Error Handling Strategy

**Centralized Error Handler:**
```javascript
// src/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  res.status(statusCode).json({
    success: false,
    message,
    error: {
      code: err.code || 'SERVER_ERROR',
      details: err.details || null
    }
  });
};
```

### Error Types

1. **HTTP Errors:**
   - Created using `createHttpError` utility
   - Include statusCode, message, and error code
   - Example: `createHttpError('Not found', 404, 'NOT_FOUND')`

2. **Validation Errors:**
   - Thrown by request validation middleware
   - 400 status code
   - Include field-specific error details

3. **Database Errors:**
   - Mongoose validation errors
   - Duplicate key errors
   - Connection errors

4. **Service Errors:**
   - Business logic errors (e.g., "Insufficient stock")
   - Converted to HTTP errors in controllers

### Error Codes

Standardized error codes defined in `src/constants/errorCodes.js`:
```javascript
module.exports = {
  INVALID_INPUT: 'INVALID_INPUT',
  NOT_AUTHORIZED: 'NOT_AUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  SERVER_ERROR: 'SERVER_ERROR',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  // ... more codes
};
```

---

## Security Considerations

### 1. Authentication Security
- **Password Hashing:** bcrypt with 10 salt rounds
- **Session Security:** httpOnly, secure cookies
- **No Password Exposure:** Passwords excluded from responses

### 2. Input Validation
- Request body validation before processing
- MongoDB injection prevention via Mongoose
- XSS prevention via helmet

### 3. HTTP Security Headers
```javascript
app.use(helmet()); // Sets security headers:
// - X-Content-Type-Options
// - X-Frame-Options
// - Strict-Transport-Security
// - Content-Security-Policy
```

### 4. CORS Configuration
```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN, // Whitelist specific origins
  credentials: true                 // Allow cookies
}));
```

### 5. Session Security
- Sessions stored server-side in MongoDB
- Session IDs in httpOnly cookies
- Automatic session expiration
- Session regeneration on login

### 6. Environment Variables
- Sensitive config in `.env` file
- Never committed to version control
- Separate configs for dev/staging/production

### 7. Logging
- Structured logging with pino
- Sensitive data excluded from logs
- Different log levels for environments

---

## Performance & Scalability

### Database Optimization

1. **Indexes:**
   - Email (unique index on User)
   - Product references in SKU
   - Order numbers
   - Timestamps for time-based queries

2. **Query Optimization:**
   - Lean queries when full documents not needed
   - Projection to limit returned fields
   - Pagination on list endpoints

3. **Connection Pooling:**
   - Mongoose manages connection pool
   - Configurable pool size

### Session Store

- MongoDB session store for horizontal scaling
- Sessions shared across multiple server instances
- Automatic session cleanup for expired sessions

### Caching Strategy (Future Enhancement)

Potential caching layers:
- Redis for frequently accessed data
- Product catalog caching
- Analytics data caching
- Session caching

### Horizontal Scaling

The architecture supports horizontal scaling:
- Stateless application servers (sessions in DB)
- Load balancer distributes traffic
- Shared MongoDB cluster
- All servers share session store

### Monitoring & Observability

**Current Implementation:**
- Structured logging with pino
- HTTP request/response logging
- Error logging with stack traces

**Future Enhancements:**
- Application Performance Monitoring (APM)
- Metrics collection (Prometheus)
- Distributed tracing
- Real-time alerts

---

## API Response Format

### Success Response
```javascript
{
  success: true,
  message: "Descriptive message",
  data: { /* actual data */ }
}
```

### Error Response
```javascript
{
  success: false,
  message: "Error description",
  error: {
    code: "ERROR_CODE",
    details: "Additional context"
  }
}
```

### Pagination Response
```javascript
{
  success: true,
  message: "Products fetched",
  data: {
    items: [ /* array of items */ ],
    pagination: {
      currentPage: 1,
      totalPages: 5,
      totalItems: 47,
      itemsPerPage: 10
    }
  }
}
```

---

## Deployment Considerations

### Environment Variables

Required environment variables:
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/riom

# Session
SESSION_SECRET=your-secret-key
SESSION_COOKIE_NAME=riom.sid

# CORS
CORS_ORIGIN=http://localhost:3000

# Environment
NODE_ENV=production
PORT=5000
```

### Production Checklist

- [ ] Set strong SESSION_SECRET
- [ ] Configure MONGODB_URI for production cluster
- [ ] Set NODE_ENV=production
- [ ] Configure CORS_ORIGIN to frontend domain
- [ ] Enable HTTPS
- [ ] Set up MongoDB replica set
- [ ] Configure backup strategy
- [ ] Set up monitoring and alerts
- [ ] Review and test error handling
- [ ] Load test critical endpoints
- [ ] Set up log aggregation
- [ ] Configure rate limiting (future)

---

## Future Enhancements

### Planned Features
1. **Rate Limiting:** Prevent API abuse
2. **File Upload:** Product image handling
3. **Email Notifications:** Order confirmations, alerts
4. **WebSocket Support:** Real-time updates
5. **API Versioning:** Backward compatibility
6. **GraphQL Endpoint:** Flexible queries
7. **Background Jobs:** Async processing (Bull/Agenda)
8. **Multi-tenancy:** Support multiple organizations
9. **Audit Logging:** Comprehensive activity tracking
10. **Two-Factor Authentication:** Enhanced security

### Technical Debt
- Add comprehensive unit tests
- Implement integration tests
- Add API documentation generation (Swagger)
- Improve error messages
- Add request rate limiting
- Implement data backup automation

---

## Conclusion

The RIOM backend follows modern best practices with a clean, layered architecture that promotes maintainability, scalability, and security. The system is designed to be extended easily with new features while maintaining consistency across all modules.

