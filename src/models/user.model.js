const mongoose = require('mongoose');

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
			enum: ['admin', 'staff'],
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

userSchema.methods.toSafeObject = function toSafeObject() {
	const doc = this.toObject({ versionKey: false });
	delete doc.password;
	return doc;
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
