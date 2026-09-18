# ตารางคะแนนกลางในเกม (ไม่ใช้ Google Sheet)

ไฟล์ `Leaderboard_NoSheet.gs` เป็น Google Apps Script Web App แบบ standalone ที่เก็บเฉพาะ 20 อันดับสูงสุดใน Script Properties ของโปรเจกต์ ไม่อ่านหรือเขียน Google Sheet

1. สร้าง Apps Script โปรเจกต์ใหม่ที่ `script.google.com` แล้ววางเนื้อหาจาก `Leaderboard_NoSheet.gs` ในไฟล์โค้ด กด Save
2. เลือก **Deploy → New deployment → Web app** ตั้ง **Execute as: Me** และ **Who has access: Anyone** จากนั้นอนุญาตสิทธิ์ที่ Google ขอ
3. คัดลอก Web App URL ที่ลงท้าย `/exec` ไปแทน `PASTE_APPS_SCRIPT_EXEC_URL_HERE` ใน `index.html` หนึ่งจุด แล้วอัปโหลด `index.html` ไปยัง GitHub Pages

ระบบเก็บคะแนนสูงสุดต่อคู่ชื่อผู้เล่นกับโรงงาน และกรณีคะแนนเท่ากันให้เวลาที่ใช้เล่นน้อยกว่าอยู่สูงกว่า การส่งคะแนนแต่ละครั้งจะมีรหัสเฉพาะเพื่อยืนยันการรับข้อมูล เว็บแอปเปิดรับคะแนนจากอินเทอร์เน็ตเพื่อให้ทุกคนเล่นได้ จึงไม่ใช่ระบบป้องกันการส่งคะแนนปลอม

Script Properties มีขีดจำกัดการเก็บข้อมูล แต่การเก็บเฉพาะ 20 อันดับและรหัสการส่งล่าสุด 100 รายการทำให้ข้อมูลคงที่ ไม่เพิ่มขึ้นตามจำนวนครั้งที่เล่น
