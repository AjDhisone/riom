const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
	{
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		password: {
			type: String,
			required: true,
		},
		name: {
			type: String,
			required: true,
			trim: true,
		},
		role: {
			type: String,
			enum: ['admin', 'manager', 'staff'],
			default: 'staff',
			trim: true,
		},
		permissions: {
			type: [String],
			default: [],
		},
		picture: {
			type: String,
		},
		lastLogin: {
			type: Date,
		},
	},
	{
		timestamps: true,
	}
);

// Hash password before saving
userSchema.pre('save', async function (next) {
	// Only hash the password if it has been modified (or is new)
	if (!this.isModified('password')) {
		return next();
	}

	try {
		const salt = await bcrypt.genSalt(10);
		this.password = await bcrypt.hash(this.password, salt);
		next();
	} catch (error) {
		next(error);
	}
});

userSchema.methods.toSafeObject = function toSafeObject() {
	const doc = this.toObject({ versionKey: false });
	delete doc.password;
	return doc;
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
