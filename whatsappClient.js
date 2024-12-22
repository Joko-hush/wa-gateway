/** @format */

const venom = require("venom-bot");
const sqlite3 = require("sqlite3").verbose();
const XLSX = require("xlsx");

// Konfigurasi SQLite
const db = new sqlite3.Database("./database.sqlite");

let client;

const initWhatsApp = async () => {
  try {
    client = await venom.create(
      "whatsapp-gateway",
      (base64Qr) => {
        console.log("QR Code tersedia, scan di WhatsApp:");
      },
      undefined,
      { multidevice: true }
    );

    client.onAck(async (ack) => {
      const statusMap = {
        1: "sent",
        2: "delivered",
        3: "read",
      };

      const status = statusMap[ack.ack];
      if (status && ack.fromMe) {
        await runQuery("UPDATE messages SET status = ? WHERE id = ?", [
          status,
          ack.id,
        ]);
      }
    });

    console.log("WhatsApp Client berhasil diinisialisasi");
  } catch (error) {
    console.error("Gagal menginisialisasi WhatsApp Client:", error);
  }
};

const sendMessage = async (number, message) => {
  try {
    if (!client) throw new Error("WhatsApp Client belum diinisialisasi");
    const formattedNumber = `${formatPhoneNumber(number)}@c.us`;
    const result = await client.sendText(formattedNumber, message);

    await runQuery(
      "INSERT INTO messages (number, message, status) VALUES (?, ?, ?)",
      [number, message, result.erro ? "failed" : "sent"]
    );
    return {
      success: true,
      message: "Pesan berhasil dikirim",
    };
  } catch (error) {
    console.error("Gagal mengirim pesan:", error);
    return { success: false, message: "Gagal mengirim pesan", error };
  }
};

const sendImage = async (number, imageUrl, caption) => {
  try {
    if (!client) throw new Error("WhatsApp Client belum diinisialisasi");
    const formattedNumber = `${formatPhoneNumber(number)}@c.us`;
    const result = await client.sendImage(
      formattedNumber,
      imageUrl,
      caption || "",
      "caption"
    );
    const status = result.erro ? "failed" : "sent";
    await runQuery(
      "INSERT INTO messages (number, message, type, status) VALUES (?, ?, ?, ?)",
      [number, `${imageUrl} ; ${caption || ""}`, "image", status]
    );

    return {
      success: true,
      message: "Gambar berhasil dikirim",
    };
  } catch (error) {
    console.error("Gagal mengirim gambar:", error);
    return { success: false, message: "Gagal mengirim gambar", error };
  }
};

// Retry pesan gagal
const retryFailedMessages = async () => {
  try {
    // Ambil pesan yang gagal
    const failedMessages = await getQuery(
      "SELECT * FROM messages WHERE status = ? AND retries < ? LIMIT 1",
      ["failed", 3]
    );

    if (failedMessages.length === 0) {
      console.log("Tidak ada pesan gagal untuk di-retry.");
      return; // Keluar jika tidak ada pesan gagal
    }

    for (const msg of failedMessages) {
      const { number, message, id, type } = msg;

      console.log(
        `Memproses pesan ID: ${id}, Number: ${number}, Type: ${type}`
      );

      let result;

      try {
        if (type === "text") {
          console.log(`Mengirim pesan teks ke: ${number}`);
          result = await sendMessage(number, message);
        } else if (type === "image") {
          console.log(`Mengirim gambar ke: ${number}`);
          const parsedMessage = parseText(message);
          result = await sendImage(
            number,
            parsedMessage.imageUrl,
            parsedMessage.caption
          );
        }

        // Log hasil pengiriman
        console.log(
          `Hasil pengiriman untuk ID ${id}: ${JSON.stringify(result)}`
        );

        const isFailed = result.erro !== false; // Pastikan result.erro hanya false jika berhasil

        // Update status pesan
        await runQuery(
          "UPDATE messages SET status = ?, retries = retries + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [isFailed ? "sent" : "failed", id]
        );

        console.log(
          `Pesan ID ${id} berhasil diupdate ke status: ${
            isFailed ? "sent" : "failed"
          }`
        );
      } catch (sendError) {
        console.error(
          `Gagal mengirim pesan ID ${id}. Error:`,
          sendError.message
        );

        // Tetap tingkatkan retry meskipun pengiriman gagal
        await runQuery(
          "UPDATE messages SET status = ?, retries = retries + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          ["failed", id]
        );

        console.log(`Pesan ID ${id} diupdate ke status: failed`);
      }
    }

    console.log("Retry selesai.");
  } catch (error) {
    console.error("Gagal melakukan retry pesan:", error.message);
  }
};
const sendQueueMessages = async () => {
  try {
    // Ambil pesan yang gagal
    const queuedMessages = await getQuery(
      "SELECT * FROM messages WHERE status = ?  LIMIT 1",
      ["queued"]
    );

    if (queuedMessages.length === 0) {
      console.log("Tidak ada pesan gagal untuk di-retry.");
      return; // Keluar jika tidak ada pesan gagal
    }

    for (const msg of queuedMessages) {
      const { number, message, id, type } = msg;

      console.log(
        `Memproses pesan ID: ${id}, Number: ${number}, Type: ${type}`
      );

      let result;

      try {
        if (type === "text") {
          console.log(`Mengirim pesan teks ke: ${number}`);
          result = await sendMessage(number, message);
        } else if (type === "image") {
          console.log(`Mengirim gambar ke: ${number}`);
          const parsedMessage = parseText(message);
          result = await sendImage(
            number,
            parsedMessage.imageUrl,
            parsedMessage.caption
          );
        }

        // Log hasil pengiriman
        console.log(
          `Hasil pengiriman untuk ID ${id}: ${JSON.stringify(result)}`
        );

        const isqueued = result.erro !== false; // Pastikan result.erro hanya false jika berhasil

        // Update status pesan
        await runQuery(
          "UPDATE messages SET status = ?, retries = retries + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [isqueued ? "sent" : "queued", id]
        );

        console.log(
          `Pesan ID ${id} berhasil diupdate ke status: ${
            isqueued ? "sent" : "queued"
          }`
        );
      } catch (sendError) {
        console.error(
          `Gagal mengirim pesan ID ${id}. Error:`,
          sendError.message
        );

        // Tetap tingkatkan retry meskipun pengiriman gagal
        await runQuery(
          "UPDATE messages SET status = ?, retries = retries + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          ["queued", id]
        );

        console.log(`Pesan ID ${id} diupdate ke status: queued`);
      }
    }

    console.log("Pengiriman Selesai.");
  } catch (error) {
    console.error("Gagal melakukan retry pesan:", error.message);
  }
};

const readFromExcel = async (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    for (const row of data) {
      const { number, message } = row;

      if (!number || !message) {
        console.log(`Data tidak valid: ${JSON.stringify(row)}`);
        continue;
      }

      await runQuery(
        "INSERT INTO messages (number, message, status) VALUES (?, ?, ?)",
        [number, message, "queued"]
      );

      console.log(
        `Data berhasil dimasukkan ke database: ${number} - ${message}`
      );
    }

    console.log("Semua data berhasil diproses.");
  } catch (error) {
    console.error("Gagal membaca file Excel:", error);
  }
};

// Fungsi bantuan untuk query SQLite
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

function parseText(input) {
  const parts = input.split(";");
  const imageUrl = parts[0].trim();
  const caption = parts[1] ? parts[1].trim() : "";
  return { imageUrl, caption };
}

const formatPhoneNumber = (number) => {
  if (!number) {
    console.error("Nomor tidak boleh kosong");
    return null;
  }
  let cleanedNumber = number.replace(/[^\d]/g, "");
  if (cleanedNumber.startsWith("0")) {
    cleanedNumber = "62" + cleanedNumber.slice(1);
  }
  if (cleanedNumber.startsWith("62") && number.startsWith("+")) {
    cleanedNumber = cleanedNumber;
  }
  if (!cleanedNumber.startsWith("62")) {
    console.error("Nomor tidak valid: harus diawali dengan 62");
    return null;
  }
  return cleanedNumber;
};

module.exports = {
  initWhatsApp,
  sendMessage,
  sendImage,
  retryFailedMessages,
  sendQueueMessages,
  readFromExcel,
};
