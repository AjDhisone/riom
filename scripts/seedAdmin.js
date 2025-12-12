const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/user.model');

const SAMPLE_USERS = [
  {
    name: 'Admin User',
    email: 'admin@riom.com',
    password: '123456',
    role: 'admin',
    permissions: ['all'],
  },
  {
    name: 'Manager User',
    email: 'manager@riom.com',
    password: '123456',
    role: 'manager',
    permissions: ['products', 'skus', 'orders', 'reports'],
  },
  {
    name: 'Staff User',
    email: 'staff@riom.com',
    password: '123456',
    role: 'staff',
    permissions: ['orders', 'products.view'],
  },
];

const seedUsers = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Hash password (same for all users)
    console.log('Hashing passwords...');
    const salt = await bcrypt.genSalt(10);

    for (const userData of SAMPLE_USERS) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`⚠ ${userData.role} user already exists (${userData.email})`);
        continue;
      }

      // Hash password and create user
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      const user = await User.create({
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        permissions: userData.permissions,
      });

      console.log(`✓ ${userData.role} user created: ${user.email}`);
    }

    console.log('─────────────────────────────────');
    console.log('Sample Users Created:');
    console.log('─────────────────────────────────');
    SAMPLE_USERS.forEach((u) => {
      console.log(`${u.role.toUpperCase()}: ${u.email} / ${u.password}`);
    });
    console.log('─────────────────────────────────');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('✗ Error seeding users:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedUsers();
