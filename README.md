Sistem yang digunakan:

    - Node
    - Express
    - Venom bot (Whatsapp engine)
    - Sql lite

1. Persiapan

    Untuk Pemasangan pastikan di komputer terinstall nodejs
    untuk pemasangan dapat kunjungi situs https://nodejs.org/en
    di windows bisa dengan link https://nodejs.org/dist/v22.12.0/node-v22.12.0-x64.msi
    dan di linux bisa dengan link https://nodejs.org/dist/v22.12.0/nod.12.0-linux-x64.tar.gz

2. Simpan Folder ini di tempat yang mudah di akses misalnya di C:\ sehingga menjadi C:\wa-gateway
3. Buka terminal atau command prompt di folder C:\wa-gateway
4. Ketikkan perintah npm install untuk menginstall semua dependensi yang dibutuh
5. Setelah selesai, ketikkan perintah npm start untuk menjalankan aplikasi
6. tunggu aplikasi berjalan nanti akan muncul qr code untuk di koneksikan dengan whatsapp anda

7. Setelah QR code muncul, buka aplikasi WhatsApp di ponsel Anda silahkan tautkan perangkat.

Alur aplikasi :

anda bisa mengirim menggunakan aplikasi ini sebagai whatsapp gateway melalui API misalnya melalui aplikasi anda dengan endpoin
http://localhost:5000/send untuk pengiriman pesan dengan payload number dan message 
contohnya
{
    "number": "6281234567890",
    "message": "Halo, apa kabar?"
}
atau ke http://localhost:5000/send-image/ 
{
    "number": "6281234567890",
    "imageUrl": "https://awsimages.detik.net.id/community/media/visual/2017/12/06/6414c1ae-fcd1-49a6-8316-4a71c29f93ff_43.jpg?w=600&q=90",
    "caption": "monyet ganteng"
}

atau yang paling mudah adalah dengan menambahkan no hp dan pesan pada file data.xlsx yang sudah disediakan.

Normalnya file excel ini akan di eksekusi setiap jam 8 pagi. tapi anda dapat mengubahnya dengan mengedit file index.js pada baris 115

setiap kali anda merubah file index.js sebaiknya lalukan restart aplikasi dengan CTRL + C lalu ketik lagi node index.js

Untuk melihat riwayat pesan bisa dengan mengakses http://localhost:5000/messages/

Untuk pemasangan di docker:
1. Pastikan di komputer terinstall docker dan docker-compose
2. Buka terminal atau command prompt di folder C:\wa-gateway
3. Ketikkan perintah docker-compose up -d untuk menjalankan aplikasi

Perhatian:  Setiap pesan akan dikirim dengan jeda 10 detik dari 1 pesan ke pesan berikutnya hal ini untuk mengindari no whatsapp diblokir.
            Untuk penyesuaian jeda waktu pengiriman bisa di ubah di baris 108 pada file index.js.

Jika aplikasi ini bermanfaat silahkan beri donasi melalui link ini. 
https://saweria.co/budi665 atau https://teer.id/joko_budiyanto

Agar lebih bersemangat lagi untuk membuat yang selanjutnya.

Saya ucapkan juga terima kasih kepada
- Ryan Dahl dan juga Tim yang terus mengembangkan Nodejs
- Tim pengembang Express Js
- Tim pengembang Sql lite
- Tim pengembang Venom Bot
- Terutama kepada Whatsapp. Silahkan Gunakan WhatsApp API resmi untuk service yang lebih baik.
- Dan Deepseek Ai yang membantu saya.
