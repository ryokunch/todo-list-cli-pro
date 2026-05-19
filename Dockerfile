# 1. Gunakan base image Node.js versi LTS yang ringan
FROM node:20-alpine

# 2. Tentukan folder kerja di dalam container
WORKDIR /app

# 3. Salin file package.json dan package-lock.json terlebih dahulu
COPY package*.json ./

# 4. Install dependensi (inquirer, dll) di dalam container
RUN npm install

# 5. Salin seluruh kode aplikasi ke dalam container
COPY . .

# 6. Jalankan aplikasi menggunakan node
CMD ["node", "app.js"]