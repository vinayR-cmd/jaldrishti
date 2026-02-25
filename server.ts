import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("water_data.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS sensor_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tds_value REAL,
    location_lat REAL,
    location_lng REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS community_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_type TEXT,
    description TEXT,
    location_lat REAL,
    location_lng REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed Dummy Data if empty
const sensorCount = db.prepare("SELECT COUNT(*) as count FROM sensor_data").get() as { count: number };
if (sensorCount.count === 0) {
  const insertSensor = db.prepare("INSERT INTO sensor_data (tds_value, location_lat, location_lng) VALUES (?, ?, ?)");
  insertSensor.run(450.5, 28.6139, 77.2090); // New Delhi example
  insertSensor.run(120.2, 28.6139, 77.2090);
  insertSensor.run(850.0, 28.6139, 77.2090);
}

const reportCount = db.prepare("SELECT COUNT(*) as count FROM community_reports").get() as { count: number };
if (reportCount.count === 0) {
  const insertReport = db.prepare("INSERT INTO community_reports (issue_type, description, location_lat, location_lng) VALUES (?, ?, ?, ?)");
  insertReport.run("Taste", "Water tastes slightly metallic today in Sector 4.", 28.6139, 77.2090);
  insertReport.run("Color", "Noticeable yellowish tint in the tap water.", 28.6139, 77.2090);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/water-data", (req, res) => {
    const { tds, lat, lng } = req.body;
    if (tds === undefined) return res.status(400).json({ error: "TDS value required" });
    
    const stmt = db.prepare("INSERT INTO sensor_data (tds_value, location_lat, location_lng) VALUES (?, ?, ?)");
    stmt.run(tds, lat || 0, lng || 0);
    
    res.json({ status: "success", message: "Data recorded" });
  });

  app.get("/api/water-data", (req, res) => {
    const data = db.prepare("SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 50").all();
    res.json(data);
  });

  app.post("/api/reports", (req, res) => {
    const { issue_type, description, lat, lng } = req.body;
    const stmt = db.prepare("INSERT INTO community_reports (issue_type, description, location_lat, location_lng) VALUES (?, ?, ?, ?)");
    stmt.run(issue_type, description, lat || 0, lng || 0);
    res.json({ status: "success" });
  });

  app.get("/api/reports", (req, res) => {
    const data = db.prepare("SELECT * FROM community_reports ORDER BY timestamp DESC LIMIT 50").all();
    res.json(data);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Jal-Drishti Server running on http://localhost:${PORT}`);
  });
}

startServer();
