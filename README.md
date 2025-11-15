# RIOM - Retail Inventory Order Management System

A comprehensive backend system for managing retail inventory, orders, products, and SKUs with robust authentication and analytics capabilities.

## 🚀 Features

- **Authentication & Authorization**
  - Email/password authentication with bcrypt hashing
  - Session-based authentication with secure cookies
  - Role-based access control (Admin/Staff)
  
- **Product Management**
  - Create and manage product catalogs
  - Product categorization and pricing
  - Image management support

- **SKU (Stock Keeping Unit) Management**
  - Variant tracking (size, color, etc.)
  - Real-time stock quantity monitoring
  - Barcode generation and management
  - Low stock alerts

- **Order Processing**
  - Complete order lifecycle management
  - Order number generation
  - Status tracking (pending, processing, completed, cancelled)
  - Customer information management

- **Analytics & Reporting**
  - Sales analytics and trends
  - Stock movement tracking
  - Inventory reports
  - Custom date range filtering

- **Settings Management**
  - Configurable low stock thresholds
  - Business information settings
  - Notification preferences

- **Audit Trail**
  - Stock history tracking
  - User activity logging

## 🛠️ Technology Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** bcryptjs + express-session
- **Security:** Helmet, CORS
- **Logging:** Pino
- **Session Store:** connect-mongo

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/AjDhisone/riom.git
   cd riom
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/riom

   # Session
   SESSION_SECRET=your-secure-secret-key-here
   SESSION_COOKIE_NAME=riom.sid

   # CORS
   CORS_ORIGIN=http://localhost:3000

   # Server
   PORT=5000
   NODE_ENV=development
   ```

4. **Start MongoDB**
   ```bash
   # Make sure MongoDB is running
   mongod
   ```

5. **Start the server**
   
   Development mode:
   ```bash
   npm run dev
   ```
   
   Production mode:
   ```bash
   npm start
   ```

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/logout` - Logout and destroy session
- `GET /api/auth/me` - Get current user profile

### Product Endpoints

- `POST /api/products` - Create a product (Admin only)
- `GET /api/products` - Get all products (with pagination)
- `GET /api/products/:id` - Get product by ID
- `PUT /api/products/:id` - Update product (Admin only)
- `DELETE /api/products/:id` - Delete product (Admin only)

### SKU Endpoints

- `POST /api/skus` - Create a SKU (Admin only)
- `GET /api/skus` - Get all SKUs (with pagination)
- `GET /api/skus/:id` - Get SKU by ID
- `PUT /api/skus/:id` - Update SKU (Admin only)
- `DELETE /api/skus/:id` - Delete SKU (Admin only)

### Order Endpoints

- `POST /api/orders` - Create an order
- `GET /api/orders` - Get all orders (with pagination)
- `GET /api/orders/:id` - Get order by ID
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Cancel order

### Analytics Endpoints

- `GET /api/analytics/sales` - Get sales analytics
- `GET /api/analytics/inventory` - Get inventory statistics

### More Endpoints

- `GET /api/settings` - Get system settings
- `PUT /api/settings` - Update system settings (Admin only)
- `GET /api/alerts` - Get alerts (low stock, etc.)
- `GET /api/users` - Get all users (Admin only)

For complete API documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

## 🏗️ Project Structure

```
RIOM-SERVER/
├── src/
│   ├── constants/        # Error codes and constants
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Route definitions
│   ├── middleware/      # Custom middleware
│   ├── utils/           # Utility functions
│   └── tests/           # Test files
├── app.js               # Express app configuration
├── server.js            # Server entry point
├── package.json         # Dependencies
└── .env                 # Environment variables
```

For detailed architecture information, see [ARCHITECTURE.md](./ARCHITECTURE.md)

## 🔐 Security Features

- **Password Security:** bcrypt hashing with salt rounds
- **Session Security:** httpOnly, secure cookies
- **CORS Protection:** Configurable origin whitelist
- **HTTP Security Headers:** Helmet middleware
- **Input Validation:** Request validation middleware
- **MongoDB Injection Prevention:** Mongoose query sanitization

## 🧪 Testing

Run tests:
```bash
npm test
```

## 📝 Response Format

All API responses follow a standardized format:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional information"
  }
}
```

## 🚦 Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

## 🔄 Development Workflow

1. Create a new branch for features
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

3. Push to GitHub
   ```bash
   git push origin feature/your-feature-name
   ```

## 📦 Deployment

### Environment Setup

Ensure the following in production:
- Set `NODE_ENV=production`
- Use strong `SESSION_SECRET`
- Configure MongoDB replica set
- Enable HTTPS
- Set appropriate `CORS_ORIGIN`

### Production Checklist

- [ ] Environment variables configured
- [ ] MongoDB connection secured
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] Session secret is strong and unique
- [ ] Logging configured
- [ ] Monitoring set up
- [ ] Backups automated

## 🔄 Development Workflow

1. Create a new branch for features
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

3. Push to GitHub
   ```bash
   git push origin feature/your-feature-name
   ```
