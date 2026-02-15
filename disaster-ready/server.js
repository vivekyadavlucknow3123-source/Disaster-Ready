const express = require("express");
const axios = require("axios");
const mysql = require("mysql2");
require("dotenv").config();
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const {
  DB_HOST = "localhost",
  DB_USER = "root",
  DB_PASSWORD = "password",
  DB_NAME = "disaster_db",
  WEATHER_KEY,
  PORT = 5000
} = process.env;

// Check for missing API key
if (!WEATHER_KEY) {
  console.error("WEATHER_KEY is missing in .env file");
  process.exit(1);
}

let db;
function initDB() {
  db = mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME, // ✅ ensure we connect to DB
    multipleStatements: true
  });

  db.connect(err => {
    if (err) {
      console.log("⏳ Waiting for MySQL...");
      setTimeout(initDB, 2000);
      return;
    }
    console.log("MySQL Connected");

    const setupSql = `
      CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;
      USE \`${DB_NAME}\`;
      CREATE TABLE IF NOT EXISTS weather_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        city VARCHAR(100),
        temperature FLOAT,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    db.query(setupSql, err => {
      if (!err) console.log("Database + Table Ready");
      else console.error("DB Setup Error:", err);
    });
  });
}
initDB();

// Route: Get weather by city
app.get("/weather/:city", async (req, res) => {
  const city = req.params.city;
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${WEATHER_KEY}&units=metric`;
    const resp = await axios.get(url);

    const weather = {
      city: resp.data.name,
      temperature: resp.data.main.temp,
      description: resp.data.weather[0].description
    };

    // Insert into DB with error handling
    db.query(
      "INSERT INTO weather_logs (city, temperature, description) VALUES (?, ?, ?)",
      [weather.city, weather.temperature, weather.description],
      (err) => {
        if (err) console.error("DB Insert Error:", err);
      }
    );

    res.json(weather);
  } catch (e) {
    console.error(" Weather API Error:", e.message);
    res.status(500).json({ error: "Weather API failed" });
  }
});

// Route: Fetch last 30 logs
app.get("/weather/logs", (req, res) => {
  db.query(
    "SELECT * FROM weather_logs ORDER BY created_at DESC LIMIT 30",
    (err, results) => {
      if (err) {
        console.error("DB Fetch Error:", err);
        return res.status(500).json({ error: "DB error" });
      }
      res.json(results);
    }
  );
});

// Start server
app.listen(PORT, () => console.log(` Server running on port ${PORT}`));
