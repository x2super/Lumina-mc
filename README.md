# Lumina Launcher 🌿

> Minecraft Java Edition Launcher สำหรับ Windows พร้อม UI ภาษาไทย ดีไซน์ Modern Light และระบบตรวจจับปัญหาอัจฉริยะ

[![GitHub Release](https://img.shields.io/github/v/release/x2super/Lumina-mc?color=22c55e&style=flat-square)](https://github.com/x2super/Lumina-mc/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-blue?style=flat-square)](https://github.com/x2super/Lumina-mc/releases/latest)

---

## 📥 ดาวน์โหลดตัวติดตั้ง (Installer)

สามารถดาวน์โหลดไฟล์ติดตั้งเวอร์ชันล่าสุดได้ที่:

👉 **[ดาวน์โหลด Lumina.Launcher.Setup.1.0.0.exe](https://github.com/x2super/Lumina-mc/releases/download/v1.0.0/Lumina.Launcher.Setup.1.0.0.exe)** หรือดูที่หน้า **[Releases](https://github.com/x2super/Lumina-mc/releases)**

---

## ✨ ฟีเจอร์หลัก

* 🎨 **Modern Clean UI**: ธีมสว่างโทนขาวสบายตา สไตล์มินิมอล พร้อมโลโก้ Lumina และอนิเมชันนุ่มนวล
* ⚡ **Local Mode (ไม่ต้องล็อกอิน)**: เล่น Singleplayer, LAN หรือเซิร์ฟเวอร์ออฟไลน์ได้ทันทีเพียงตั้งชื่อ
* 🔑 **Microsoft Account Support**: ล็อกอินบัญชีแท้เพื่อเข้าเล่นเซิร์ฟเวอร์ออนไลน์ (เช่น Hypixel) ได้อย่างไร้รอยต่อ
* 🛡️ **Smart Error Detection**: มีระบบดักจับและวิเคราะห์ Error อัตโนมัติ (เช่น Java version ไม่รองรับ, RAM ไม่พอ, ไดรเวอร์การ์ดจอ) พร้อมกล่องคำแนะนำวิธีแก้ไข
* 🧩 **Mod & Loader Manager**: รองรับ OptiFine, Forge, Fabric, Mods, Resource Packs และ Shaders
* ⚙️ **Custom Settings**: ปรับแต่งค่า RAM, Java Path, ความละเอียดหน้าจอเกมได้อย่างอิสระ

---

## 🛠️ สำหรับนักพัฒนา (Development)

```powershell
# ติดตั้ง dependencies
npm install

# รันโหมดทดสอบ
npm start

# บิลด์เป็นไฟล์ติดตั้ง Windows Installer (.exe)
npm run dist
```

---

## 📋 ความต้องการของระบบ

* **ระบบปฏิบัติการ:** Windows 10 / 11 (64-bit)
* **Java Runtime:** Java 21 (สำหรับ Minecraft 1.20.5+) หรือ Java ที่ตรงกับเวอร์ชันเกมที่ต้องการเล่น
* **Node.js:** v20 ขึ้นไป (สำหรับการพัฒนา/รันจาก Source code)
