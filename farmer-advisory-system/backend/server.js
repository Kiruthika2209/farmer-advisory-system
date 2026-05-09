const express = require("express");
const cors = require("cors");
const data = require("./advisory.json");

const app = express();

app.use(cors());
app.use(express.json());

// Root route (browser test)
app.get("/", (req, res) => {
  res.send("Server running da 🚀");
});

// Main API
app.post("/ask", (req, res) => {
  const question = req.body.question.toLowerCase();

  const result = data.find(item =>
    question.includes(item.crop) &&
    question.includes(item.issue)
  );

  if (result) {
    res.json({ reply: result.solution });
  } else {
    res.json({ reply: "No matching advisory found." });
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});