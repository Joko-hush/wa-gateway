/** @format */

const Queue = require("bull");
const { sendMessage } = require("./whatsappClient");

const messageQueue = new Queue("messages");

messageQueue.process(async (job) => {
  const { number, message } = job.data;

  console.log(`Memproses pesan ke: ${number} dengan pesan: "${message}"`);

  try {
    const result = await sendMessage(number, message);

    if (result.success) {
      console.log(`Pesan ke ${number} berhasil dikirim`);
    } else {
      console.log(`Pesan ke ${number} gagal dikirim:`, result.error?.message);
    }
  } catch (error) {
    console.error(`Gagal memproses pesan ke ${number}:`, error);
  }
});

const addToQueue = async (number, message) => {
  console.log(`Menambahkan pesan ke antrean: ${number}`);
  try {
    await messageQueue.add({ number, message });
  } catch (error) {
    console.error("Gagal menambahkan pesan ke antrean:", error);
  }
};

module.exports = { messageQueue, addToQueue };
