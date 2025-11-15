const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/user.model');

const dropGoogleIndex = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Drop the googleId index if it exists
    console.log('Checking for googleId index...');
    const indexes = await User.collection.indexes();
    console.log('Current indexes:', indexes.map(i => i.name));

    const googleIdIndex = indexes.find(i => i.key && i.key.googleId);
    if (googleIdIndex) {
      console.log('Dropping googleId index...');
      await User.collection.dropIndex('googleId_1');
      console.log('✓ googleId index dropped successfully');
    } else {
      console.log('⚠ No googleId index found');
    }

    await mongoose.connection.close();
    console.log('✓ Done');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

dropGoogleIndex();
