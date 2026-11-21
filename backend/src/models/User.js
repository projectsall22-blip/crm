import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

const ROLES = ['admin', 'manager', 'producer'];

const userSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, index: true },
    phone: { type: String, trim: true },
    country: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
    // Producers may belong to a team / be managed by a manager
    managerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    // refresh-token hash for rotating refresh tokens
    refreshTokenHash: { type: String, default: null },
    // password reset
    resetTokenHash: { type: String, default: null },
    resetTokenExpires: { type: Date, default: null },
    // email OTP (login 2FA)
    otpHash: { type: String, default: null, select: false },
    otpExpires: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    avatarUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokenHash;
  delete obj.resetTokenHash;
  delete obj.resetTokenExpires;
  delete obj.otpHash;
  delete obj.otpExpires;
  delete obj.__v;
  return obj;
};

userSchema.index({ role: 1, isActive: 1 });

export const ROLES_LIST = ROLES;
export default mongoose.model('User', userSchema);
