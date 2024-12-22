/** @format */

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const {
  initWhatsApp,
  retryFailedMessages,
  sendQueueMessages,
  readFromExcel,
} = require("./whatsappClient");
const cron = require("node-cron");

const app = express();
const PORT = 5000;

// Konfigurasi SQLite
const db = new sqlite3.Database("./database.sqlite");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      status TEXT DEFAULT 'queued',
      retries INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Inisialisasi WhatsApp Client
initWhatsApp();

// Endpoint untuk mengirim pesan teks
app.post("/send", async (req, res) => {
  const { number, message } = req.body;

  if (!number || !message) {
    return res.status(400).json({ error: "Nomor dan pesan harus diisi" });
  }

  try {
    await runQuery(
      "INSERT INTO messages (number, message, status) VALUES (?, ?, ?)",
      [number, message, "queued"]
    );
    res.json({ success: true, message: "Pesan ditambahkan ke antrean" });
  } catch (error) {
    console.error("Gagal menambahkan ke antrean:", error);
    res.status(500).json({ error: "Gagal menambahkan ke antrean" });
  }
});

// Endpoint untuk mengirim gambar
app.post("/send-image", async (req, res) => {
  const { number, imageUrl, caption } = req.body;

  if (!number || !imageUrl) {
    return res.status(400).json({ error: "Nomor dan URL gambar harus diisi" });
  }

  try {
    await runQuery(
      "INSERT INTO messages (number, message, type, status) VALUES (?, ?, ?, ?)",
      [number, `${imageUrl} ; ${caption || ""}`, "image", "queued"]
    );
    res.json({ success: true, message: "Gambar ditambahkan ke antrean" });
  } catch (error) {
    console.error("Gagal mengirim gambar:", error);
    res.status(500).json({ error: "Gagal mengirim gambar" });
  }
});

// Endpoint untuk mendapatkan semua pesan
app.get("/messages", async (req, res) => {
  const { status } = req.query;
  const condition = status ? "WHERE status = ?" : "";
  const values = status ? [status] : [];

  try {
    const rows = await getQuery(
      `SELECT * FROM messages ${condition} ORDER BY created_at DESC`,
      values
    );
    res.json(rows);
  } catch (error) {
    console.error("Gagal mengambil log pesan:", error);
    res.status(500).json({ error: "Gagal mengambil log pesan" });
  }
});

// Jalankan cron setiap 5 menit untuk retry
cron.schedule("*/1 * * * *", async () => {
  console.log("Menjalankan retry pesan gagal...");
  await retryFailedMessages();
});

// Jalankan cron setiap 10 detik
cron.schedule("*/10 * * * * *", async () => {
  console.log("Menjalankan pengiriman queue");
  await sendQueueMessages();
});

// Menjadwalkan tugas setiap hari pukul 08:00 pagi
// cron.schedule("45 16 * * *", async () => { // 16:45 testing
cron.schedule("0 8 * * *", async () => {
  console.log("Memulai proses membaca file Excel...");
  await readFromExcel("./data.xlsx"); // Ganti dengan path file Excel Anda
  console.log("Proses membaca file Excel selesai.");
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`Server backend berjalan di http://localhost:${PORT}`);
});

// Helper untuk query SQLite
const runQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
};

const getQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};
