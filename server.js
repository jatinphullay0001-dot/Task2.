require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { User, Lead } = require("./models");

const app = express();

/* ---------------- database ---------------- */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });

app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use(express.json());

// Keep brute-force attempts off the login route, and cap the public form.
app.use("/api/auth/login", rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));
app.use("/api/leads/public", rateLimit({ windowMs: 60 * 60 * 1000, max: 30 }));

/* ---------------- auth middleware ---------------- */
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

const shape = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });

async function protect(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return res.status(401).json({ message: "Sign in to continue" });
  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "This account no longer exists" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Your session expired. Sign in again." });
  }
}

// Wraps async handlers so a rejected promise reaches the error handler.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ---------------- auth routes ---------------- */
app.post("/api/auth/register", wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "Name, email and password are all required" });
  if (password.length < 6)
    return res.status(400).json({ message: "Use a password of at least 6 characters" });
  if (await User.findOne({ email }))
    return res.status(409).json({ message: "An account with that email already exists" });

  const user = await User.create({ name, email, password });
  res.status(201).json({ token: signToken(user._id), user: shape(user) });
}));

app.post("/api/auth/login", wrap(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");
  // Same message either way, so the response can't be used to enumerate accounts.
  if (!user || !(await user.matchPassword(password)))
    return res.status(401).json({ message: "Wrong email or password" });
  res.json({ token: signToken(user._id), user: shape(user) });
}));

app.get("/api/auth/me", protect, (req, res) => res.json({ user: shape(req.user) }));

/* ---------------- lead routes ---------------- */

// Open endpoint for the marketing site's contact form. Must sit above "/:id".
app.post("/api/leads/public", wrap(async (req, res) => {
  const { name, email, phone, company, message } = req.body;
  const lead = await Lead.create({
    name, email, phone, company, message,
    source: "Contact form",
    status: "new",
    notes: message ? [{ body: `From the contact form: ${message}` }] : [],
  });
  res.status(201).json({ message: "Thanks — we'll be in touch shortly", id: lead._id });
}));

app.get("/api/leads/stats", protect, wrap(async (req, res) => {
  const grouped = await Lead.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]);
  const byStatus = { new: 0, contacted: 0, converted: 0, lost: 0 };
  grouped.forEach((g) => { byStatus[g._id] = g.n; });
  const overdue = await Lead.countDocuments({
    followUpDate: { $lt: new Date(), $ne: null },
    status: { $in: ["new", "contacted"] },
  });
  res.json({ total: await Lead.countDocuments(), byStatus, overdue });
}));

app.get("/api/leads", protect, wrap(async (req, res) => {
  const { status, source, search, page = 1, limit = 50 } = req.query;
  const query = {};
  if (status && status !== "all") query.status = status;
  if (source && source !== "all") query.source = source;
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ name: rx }, { email: rx }, { company: rx }, { phone: rx }];
  }
  const leads = await Lead.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));
  res.json({ count: await Lead.countDocuments(query), leads });
}));

app.post("/api/leads", protect, wrap(async (req, res) => {
  const { note, ...fields } = req.body;
  const lead = await Lead.create({
    ...fields,
    owner: req.user._id,
    notes: note ? [{ body: note, author: req.user._id }] : [],
  });
  res.status(201).json(lead);
}));

app.get("/api/leads/:id", protect, wrap(async (req, res) => {
  const lead = await Lead.findById(req.params.id).populate("notes.author", "name");
  if (!lead) return res.status(404).json({ message: "That lead no longer exists" });
  res.json(lead);
}));

app.put("/api/leads/:id", protect, wrap(async (req, res) => {
  // Notes are append-only, so they can't be overwritten through this route.
  const { notes, owner, ...fields } = req.body;
  const lead = await Lead.findByIdAndUpdate(req.params.id, fields, { new: true, runValidators: true });
  if (!lead) return res.status(404).json({ message: "That lead no longer exists" });
  res.json(lead);
}));

app.delete("/api/leads/:id", protect, wrap(async (req, res) => {
  const lead = await Lead.findByIdAndDelete(req.params.id);
  if (!lead) return res.status(404).json({ message: "That lead no longer exists" });
  res.json({ message: "Lead deleted", id: req.params.id });
}));

app.post("/api/leads/:id/notes", protect, wrap(async (req, res) => {
  const body = (req.body.body || "").trim();
  if (!body) return res.status(400).json({ message: "Write something before saving the note" });
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ message: "That lead no longer exists" });
  lead.notes.push({ body, author: req.user._id });
  if (req.body.followUpDate !== undefined) lead.followUpDate = req.body.followUpDate || null;
  await lead.save();
  res.status(201).json(lead);
}));

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

/* ---------------- error handler ---------------- */
app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === "ValidationError")
    return res.status(400).json({ message: Object.values(err.errors)[0].message });
  if (err.code === 11000) return res.status(409).json({ message: "That record already exists" });
  if (err.name === "CastError") return res.status(400).json({ message: "That id is not valid" });
  res.status(err.statusCode || 500).json({ message: err.message || "Something went wrong" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
