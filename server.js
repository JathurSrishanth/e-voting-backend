require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const app = express();
app.use(express.json());
app.get("/test", (req, res) => {
  res.json({ success: true, message: "Backend is running!" });
});

// ✅ **CORS Configuration**
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*", credentials: true }));

// ✅ **Ensure MongoDB URI is Set**
if (!process.env.MONGO_URI) {
  console.error("❌ Error: MONGO_URI is not defined in .env file");
  process.exit(1);
}

// ✅ **MongoDB Connection**
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// ✅ **User Schema**
const UserSchema = new mongoose.Schema({
  voterID: { type: String, required: true, unique: true, index: true }, // Added indexing
  username: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
});

const User = mongoose.model("User", UserSchema);

// ✅ **Vote Schema**
const VoteSchema = new mongoose.Schema({
  voterID: { type: String, required: true, index: true }, // Added indexing
  candidate: { type: String, required: true },
  position: { type: String, required: true, enum: ["MLA", "MP"] },
  timestamp: { type: Date, default: Date.now },
});

const Vote = mongoose.model("Vote", VoteSchema);

// ✅ **Register API**
app.post("/register", async (req, res) => {
  try {
    const { voterID, username, password } = req.body;
    if (!voterID || !username || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const existingUser = await User.findOne({ voterID });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Voter ID already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ voterID: voterID.trim(), username: username.toLowerCase(), password: hashedPassword });
    await newUser.save();

    res.json({ success: true, message: "User registered successfully!" });
  } catch (error) {
    console.error("❌ Registration Error:", error);
    res.status(500).json({ success: false, message: "Error registering user" });
  }
});

// ✅ **Login API**
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect password" });
    }

    res.json({ success: true, message: "Login successful", voterID: user.voterID });
  } catch (error) {
    console.error("❌ Login Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ **Voting API (Prevents Multiple Votes for the Same Position)**
app.post("/vote", async (req, res) => {
  try {
    let { voterID, candidate, position } = req.body;
    voterID = voterID.trim();

    if (!voterID || !candidate || !position) {
      return res.status(400).json({ success: false, message: "Voter ID, Candidate, and Position are required" });
    }

    // 🔹 Check if the voter has already voted for this position
    const existingVote = await Vote.findOne({ voterID, position });
    if (existingVote) {
      return res.status(400).json({ success: false, message: "You have already voted for this position!" });
    }

    // 🔹 Save the vote
    const vote = new Vote({ voterID, candidate, position });
    await vote.save();

    res.json({ success: true, message: "🗳️ Vote cast successfully!" });
  } catch (error) {
    console.error("❌ Voting Error:", error);
    res.status(500).json({ success: false, message: "Failed to vote" });
  }
});

// ✅ **Check Vote API**
app.get("/check-vote/:voterID", async (req, res) => {
  try {
    const { voterID } = req.params;
    if (!voterID) {
      return res.status(400).json({ success: false, message: "Voter ID is required" });
    }

    const votes = await Vote.find({ voterID });
    res.json({ success: votes.length > 0, votes });
  } catch (error) {
    console.error("❌ Check Vote Error:", error);
    res.status(500).json({ success: false, message: "Error checking vote" });
  }
});

// ✅ **Results API (Shows Vote Counts Sorted by Most Votes)**
app.get("/results", async (req, res) => {
  try {
    const results = await Vote.aggregate([
      {
        $group: {
          _id: { candidate: "$candidate", position: "$position" },
          totalVotes: { $sum: 1 },
        },
      },
      { $sort: { totalVotes: -1 } }, // Sort by totalVotes in descending order
    ]);

    res.json({ success: true, results });
  } catch (error) {
    console.error("❌ Results Fetch Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch results" });
  }
});

// ✅ **Delete All Votes API (For Debugging)**
app.delete("/clear-votes", async (req, res) => {
  try {
    await Vote.deleteMany({});
    console.log("🗑️ All votes cleared");
    res.json({ success: true, message: "All votes cleared" });
  } catch (error) {
    console.error("❌ Clear Votes Error:", error);
    res.status(500).json({ success: false, message: "Failed to clear votes" });
  }
});

// ✅ **404 Error Handler**
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ✅ **Start Server**
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
