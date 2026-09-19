const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/* ---------------- User ---------------- */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ["admin", "agent"], default: "admin" },
  },
  { timestamps: true }
);

// Hash on create and on any password change, so no route ever handles a plain password.
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

/* ---------------- Lead ---------------- */
const noteSchema = new mongoose.Schema(
  {
    body: { type: String, required: true, trim: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address"],
    },
    phone: { type: String, trim: true },
    company: { type: String, trim: true },
    source: {
      type: String,
      enum: ["Contact form", "Pricing page", "Referral", "LinkedIn", "Cold email", "Webinar", "Other"],
      default: "Contact form",
    },
    status: { type: String, enum: ["new", "contacted", "converted", "lost"], default: "new" },
    value: { type: Number, default: 0 },
    followUpDate: { type: Date },
    message: { type: String, trim: true },
    notes: [noteSchema],
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = {
  User: mongoose.model("User", userSchema),
  Lead: mongoose.model("Lead", leadSchema),
};
