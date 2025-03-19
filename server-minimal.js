const express = require("express");
const app = express();

app.use(express.json());

app.use((req, res, next) => {
  console.log(`✅ Request received: ${req.method} ${req.url}`);
  next();
});

app.get("/", (req, res) => {
  console.log("✅ Root endpoint hit");
  const response = { success: true, message: "Welcome to the e-voting backend!" };
  console.log("✅ Sending response:", response);
  res.json(response);
  console.log("✅ Response sent");
});

app.get("/test", (req, res) => {
  console.log("✅ /test endpoint hit");
  const response = { success: true, message: "Backend is running!" };
  console.log("✅ Sending response:", response);
  res.json(response);
  console.log("✅ Response sent");
});

app.use((req, res) => {
  console.log(`❌ 404: ${req.method} ${req.url}`);
  res.status(404).json({ success: false, message: "Route not found" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));