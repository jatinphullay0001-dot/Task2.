require("dotenv").config();
const mongoose = require("mongoose");
const { User, Lead } = require("./models");

const ahead = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const back = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([User.deleteMany({}), Lead.deleteMany({})]);

  const admin = await User.create({
    name: "Admin", email: "admin@leaddesk.dev", password: "admin123", role: "admin",
  });

  await Lead.create([
    { name: "Ananya Sharma", email: "ananya@brightloom.in", phone: "+91 98110 22345",
      company: "Brightloom Studio", source: "Contact form", status: "new", value: 85000,
      followUpDate: ahead(1), owner: admin._id,
      notes: [{ body: "Asked about a 6-page redesign through the website form.", author: admin._id }] },
    { name: "Rohit Verma", email: "rohit.verma@kadamtech.com", phone: "+91 99887 10230",
      company: "Kadam Technologies", source: "Pricing page", status: "contacted", value: 240000,
      followUpDate: ahead(3), owner: admin._id,
      notes: [{ body: "Wants a proposal for a customer portal. Sending scope Friday.", author: admin._id }] },
    { name: "Meera Iyer", email: "meera@leafandclay.co", company: "Leaf & Clay",
      source: "Referral", status: "converted", value: 115000, owner: admin._id,
      notes: [{ body: "Signed. 40% advance received.", author: admin._id }] },
    { name: "Daniel Okafor", email: "d.okafor@northwind.io", company: "Northwind Labs",
      source: "LinkedIn", status: "contacted", value: 360000, followUpDate: back(2), owner: admin._id,
      notes: [{ body: "Demo done. Waiting on their CTO to approve budget.", author: admin._id }] },
    { name: "Karan Malhotra", email: "karan@zephyrmotors.in", company: "Zephyr Motors",
      source: "Webinar", status: "lost", value: 190000, owner: admin._id,
      notes: [{ body: "Went in-house. Revisit next quarter.", author: admin._id }] },
  ]);

  console.log("Seeded. Sign in with admin@leaddesk.dev / admin123");
  process.exit(0);
})();
