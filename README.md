# Ticket Report

เว็บแอปสำหรับบันทึก ticket งาน และดูสรุปงานที่ทำในแต่ละวัน

## ฟีเจอร์

- **Dashboard แบบ Kanban ที่คลิกได้**: การ์ด ticket แยกตามสถานะ Open / In Progress / **On Hold** / Done, คลิกการ์ดเพื่อดู/แก้ไขรายละเอียด, กดปุ่มลูกศรเพื่อเลื่อนสถานะเร็วๆ, กดปุ่ม "‖ พัก" เพื่อพักงาน (กรณีรอช่าง) และ "▶ กลับมาทำ" เพื่อกลับมาทำต่อ, กด stat card ด้านบนเพื่อกรองดูเฉพาะสถานะ
- เพิ่ม / แก้ไข / ลบ ticket ผ่านฟอร์มบนเว็บ, ปุ่ม "+ เพิ่ม Ticket" อยู่บน Dashboard ด้วย
- **แชทในตัว ticket**: ช่องแชทสำหรับบันทึกความคืบหน้า/งานเพิ่มเติมของแต่ละ ticket แบบข้อความ (แสดงเป็นบับเบิลแชทเรียงตามเวลา)
- **แนบรูปภาพ** ในแต่ละ ticket (ปุ่ม "+ รูป" หรือวางรูปสกรีนช็อตด้วย Ctrl+V ในหน้าต่างรายละเอียด ticket ได้เลย) — คลิกรูปเพื่อดูแบบเต็มจอในหน้าเดิม ไม่เปิดแท็บใหม่
- **แก้ไขวันที่สร้าง ticket ได้** ในหน้าต่างรายละเอียด (เผื่อกรณีต้องย้อนหลัง/แก้ไขวันที่ให้ตรง)
- **บันทึกอัตโนมัติ (Auto-save)**: ในหน้าต่างรายละเอียด ticket ไม่ต้องกดปุ่ม "บันทึก" อีกแล้ว — เปลี่ยน Status/Priority/วันที่ จะเซฟทันที ส่วนช่องข้อความ (ชื่อ/ผู้รับผิดชอบ/รายละเอียด) จะเซฟทันทีที่คลิกออกจากช่อง (เช่น ตอนจะปิดหน้าต่างเพื่อไปดู ticket อื่น) มีตัวขึ้น "✓ บันทึกแล้ว" ให้เห็นชัดเจน
- นำเข้า ticket จากไฟล์ CSV (ดูตัวอย่างที่ `data/sample-tickets.csv`)
- หน้าสรุปรายวัน: ticket ที่สร้างใหม่, ticket ที่ปิดแล้ว, บันทึกงานที่ทำ, และภาพรวมสถานะทั้งหมด
  - มีกล่อง **"📋 สรุปสำหรับแจ้งในไลน์"** สร้างข้อความสรุปแบบมีเลขข้อ + เวลาที่เปิด ticket + สภาพอากาศ ณ ตอนนั้น (ถ้ามี) + รายละเอียดที่ทำ (ดึงจากบันทึกแชทของแต่ละ ticket ที่มีความเคลื่อนไหววันนั้น) พร้อมปุ่มคัดลอกไปวางในกลุ่มไลน์ได้ทันที ไม่ต้องพิมพ์สรุปเองทุกวัน
- **หน้าสรุปตามสาขา**: สรุป ticket ที่มีความเคลื่อนไหวของวันที่เลือก แยกเป็นการ์ดตามบริษัท/สาขา แต่ละการ์ดมีข้อความสรุปพร้อมคัดลอกของสาขานั้นแยกต่างหาก เหมาะเวลาต้องแจ้งลูกค้าแต่ละสาขาแยกกัน
- **แจ้งเตือนงานค้าง**: แบนเนอร์แจ้งเตือนอัตโนมัติเมื่อมี ticket ที่ยังไม่ปิดและไม่มีความเคลื่อนไหวเกิน 2 วัน
- **หน้า AnyDesk Directory**: ค้นหา ID AnyDesk (Admin/Entry/Exit) ของแต่ละสาขาได้ในที่เดียว ไม่ต้องเปิดไฟล์ Excel แยก (seed ข้อมูลเริ่มต้นจาก `data/anydesk-directory.json`) พร้อม**เพิ่ม/แก้ไข/ลบสาขาและอุปกรณ์ได้ในหน้าเว็บ** และแท็กสี **"โปรแกรม"** (AnyDesk / PSS GO) บอกว่าสาขานั้นต้องเปิดโปรแกรมอะไรเพื่อรีโมทเข้า
- **ฟิลด์บริษัท/สาขา** ตอนเปิด ticket ใหม่ — พิมพ์แล้วมี autocomplete ให้เลือกจากทั้งรายชื่อสาขาใน AnyDesk Directory และชื่อบริษัทที่เคยพิมพ์ไว้ในบริษัทอื่น (พิมพ์ชื่อใหม่ครั้งเดียว ครั้งต่อไปจะขึ้นให้เลือกอัตโนมัติ) แสดงเป็นแท็กสีม่วงบนการ์ด Dashboard ด้วย
- **เช็คสภาพอากาศตอนเปิด ticket อัตโนมัติ**: ถ้าชื่อบริษัท/สาขาเป็นรูปแบบ "โรบินสัน ＜ที่ตั้ง＞" (เช่น "โรบินสัน ถลาง") ระบบจะตัดคำหลัง "โรบินสัน"/"Robinson" ไปค้นหาสภาพอากาศ (ผ่าน Open-Meteo ไม่ต้องมี API key) แล้วบันทึกเป็นประวัติไว้ในหน้าต่างรายละเอียด ticket — เป็นแบบ best-effort ไม่ต้องเป๊ะ ถ้าหาไม่เจอหรือเน็ตขัดข้องก็แค่ไม่แสดงผล ไม่กระทบการสร้าง ticket
  - ปุ่ม **"+ เพิ่ม Ticket"** มีช่อง **"วันที่/เวลาเหตุการณ์"** ให้เลือกได้ ถ้าไม่ระบุจะใช้เวลาปัจจุบัน ถ้าระบุ (เช่น กรอกย้อนหลังตอนแจ้งเหตุที่เกิดไปแล้ว) ระบบจะดึงสภาพอากาศของวันที่/เวลานั้นมาบันทึกให้แทน รองรับทั้งวันที่ในอดีตและอนาคต
  - ชื่อสาขาบางชื่อเป็นถนน/ย่านไม่ใช่อำเภอ/จังหวัด (เช่น "ราชพฤกษ์") ทำให้ระบบหาที่ตั้งอัตโนมัติไม่เจอ — แก้ไขได้ที่หน้า **AnyDesk Directory** → แก้ไขสาขา → ใส่ **"คำค้นหาสภาพอากาศ"** เอง (เช่น ชื่ออำเภอ/จังหวัดที่ถูกต้อง) เพื่อ override การตัดคำอัตโนมัติเฉพาะสาขานั้น
- **การ์ด Dashboard แสดงรูปภาพ**: ถ้า ticket มีรูปแนบ รูปแรกจะขึ้นเป็นภาพหน้าปกบนการ์ด คลิกดูแบบเต็มได้เลยโดยไม่ต้องเปิดหน้าต่างรายละเอียด
- **Knowledge Base**: บันทึกปัญหาที่เคยเจอและวิธีแก้ไว้เป็นบทความ ค้นหาได้ และในหน้าต่างรายละเอียด ticket มีปุ่ม "ค้นหาคำแนะนำ" ที่จะจับคู่คำในหัวข้อ/รายละเอียด ticket กับบทความที่ใกล้เคียงให้อัตโนมัติ — ถ้าตั้งค่า environment variable `ANTHROPIC_API_KEY` ไว้ ระบบจะเรียก Claude ให้ช่วยสรุปคำแนะนำเป็นภาษาที่อ่านง่ายด้วย (ถ้าไม่ตั้งค่าไว้ก็ยังใช้งานได้ปกติ แค่แสดงเฉพาะบทความที่ใกล้เคียง)
- **สร้าง ticket จากกลุ่ม LINE**: เชิญ LINE Official Account เข้ากลุ่มลูกค้า แท็กชื่อบอทแล้วพิมพ์ปัญหาต่อท้าย ระบบจะสร้าง ticket ให้อัตโนมัติ พร้อมดึงชื่อกลุ่มมาใส่เป็นบริษัท/สาขา และตอบกลับในแชทพร้อมเลข ticket (ดูวิธีตั้งค่าด้านล่าง)
- **แจ้งเตือนลง Discord**: ส่งข้อความเข้าช่อง Discord อัตโนมัติทุกครั้งที่มี ticket ใหม่ (ทั้งจากเว็บและจากกลุ่ม LINE) และส่งสรุปงานประจำวันอัตโนมัติทุกวันตามเวลาที่ตั้งไว้ พร้อมปุ่ม **"ส่งไป Discord"** ในหน้าสรุปรายวันสำหรับกดส่งเองได้ทันที (ดูวิธีตั้งค่าด้านล่าง)

## เริ่มต้นใช้งาน

ต้องใช้ **Node.js เวอร์ชัน 22.5 ขึ้นไป** (ใช้ฐานข้อมูล SQLite ในตัวของ Node เอง ผ่าน `node:sqlite`
ไม่ต้องติดตั้ง native module หรือ Visual Studio Build Tools ใดๆ)

```bash
npm install
npm start
```

ตอนรันจะมี warning `ExperimentalWarning: SQLite is an experimental feature` ขึ้นมา ถือเป็นเรื่องปกติ ไม่ใช่ error

จากนั้นเปิดเบราว์เซอร์ไปที่ `http://localhost:3000`

ข้อมูลถูกเก็บในไฟล์ SQLite ที่ `data/tickets.db` (สร้างอัตโนมัติเมื่อรันครั้งแรก)

## รูปแบบไฟล์ CSV สำหรับนำเข้า

```csv
title,description,assignee,company,status,priority
แก้บั๊ก X,รายละเอียด,ชื่อผู้รับผิดชอบ,โรบินสัน ถลาง,open,medium
```

- `status`: `open`, `in-progress`, `on-hold`, `done`
- `priority`: `low`, `medium`, `high`, `urgent`

## API หลัก

| Method | Path | คำอธิบาย |
| --- | --- | --- |
| GET | `/api/tickets` | รายการ ticket ทั้งหมด (filter ด้วย `?status=`) |
| GET | `/api/tickets/meta/companies` | รายชื่อบริษัท/สาขาที่เคยใช้ในทุก ticket (สำหรับ autocomplete) |
| POST | `/api/tickets` | สร้าง ticket ใหม่ |
| GET | `/api/tickets/:id` | ดูรายละเอียด ticket พร้อม note |
| PUT | `/api/tickets/:id` | แก้ไข ticket |
| DELETE | `/api/tickets/:id` | ลบ ticket |
| POST | `/api/tickets/:id/notes` | เพิ่มบันทึกงานที่ทำสำหรับ ticket |
| POST | `/api/tickets/:id/attachments` | แนบรูปภาพให้ ticket (multipart field: `image`) |
| DELETE | `/api/tickets/:id/attachments/:attachmentId` | ลบรูปที่แนบไว้ |
| POST | `/api/tickets/import` | นำเข้า ticket จากไฟล์ CSV (multipart field: `file`) |
| GET | `/api/summary/daily?date=YYYY-MM-DD` | สรุปงานประจำวัน |
| GET | `/api/summary/pending?staleDays=2` | รายการ ticket ที่ค้าง (ยังไม่ปิด และไม่มีความเคลื่อนไหวเกิน `staleDays` วัน) |
| GET | `/api/anydesk?q=` | รายการสาขา + ID AnyDesk + โปรแกรม (ค้นหาด้วย `q`) |
| POST | `/api/anydesk` | เพิ่มสาขาใหม่ (`name`, `program`, `note`) |
| PUT | `/api/anydesk/:id` | แก้ไขชื่อ/หมายเหตุ/โปรแกรมของสาขา |
| DELETE | `/api/anydesk/:id` | ลบสาขา |
| POST | `/api/anydesk/:id/devices` | เพิ่มอุปกรณ์ AnyDesk ให้สาขา |
| PUT | `/api/anydesk/devices/:deviceId` | แก้ไขชื่อ/ID อุปกรณ์ |
| DELETE | `/api/anydesk/devices/:deviceId` | ลบอุปกรณ์ AnyDesk |
| GET | `/api/kb?q=` | รายการบทความ Knowledge Base (ค้นหาด้วย `q`) |
| POST | `/api/kb` | เพิ่มบทความใหม่ (`title`, `problem`, `solution`, `tags`) |
| PUT | `/api/kb/:id` | แก้ไขบทความ |
| DELETE | `/api/kb/:id` | ลบบทความ |
| POST | `/api/kb/recommend` | หาคำแนะนำจาก `title`/`description` — จับคู่คำกับ Knowledge Base และเรียก Claude API (ถ้าตั้งค่า `ANTHROPIC_API_KEY`) เพื่อสรุปคำแนะนำ |
| POST | `/webhook/line` | Webhook รับข้อความจาก LINE Messaging API (ดูวิธีตั้งค่าด้านล่าง) |
| GET | `/api/discord/status` | เช็คว่าตั้งค่า webhook สำหรับสรุปงานประจำวันไว้หรือยัง (ให้ frontend โชว์/ซ่อนปุ่ม "ส่งไป Discord") |
| POST | `/api/discord/send` | ส่งสรุปงานประจำวัน (`date` ไม่ระบุ = วันนี้) เข้า Discord ทันที |

### เปิดใช้สร้าง ticket จากกลุ่ม LINE (ไม่บังคับ)

**1. สร้าง LINE Official Account + เปิด Messaging API**
- ไปที่ [LINE Developers Console](https://developers.line.biz/console/) → สร้าง Provider และ Channel แบบ "Messaging API" (ฟรี)
- ในหน้า Channel → แท็บ "Messaging API" เก็บค่า 2 ตัว:
  - **Channel secret** (อยู่ในแท็บ "Basic settings")
  - **Channel access token** (กด "Issue" ในแท็บ "Messaging API" เพื่อออก long-lived token)
- ในแท็บ "Messaging API" เปิดสวิตช์ **"Allow bot to join group chats"** (ปกติปิดอยู่โดย default)
- ปิด "Auto-reply messages" และ "Greeting messages" ที่เป็นค่าเริ่มต้นของ LINE (ไม่งั้นจะชนกับข้อความตอบกลับของเรา)

**2. ตั้งค่า environment variable แล้วรันเซิร์ฟเวอร์**
```bash
# Windows (Command Prompt)
set LINE_CHANNEL_SECRET=your-channel-secret
set LINE_CHANNEL_ACCESS_TOKEN=your-channel-access-token
npm start

# Windows (PowerShell)
$env:LINE_CHANNEL_SECRET="your-channel-secret"
$env:LINE_CHANNEL_ACCESS_TOKEN="your-channel-access-token"
npm start
```

**3. ทำให้ webhook เข้าถึงได้จากอินเทอร์เน็ต**

LINE ต้องส่ง webhook มาที่ URL แบบ `https://` ที่เข้าถึงได้จริง เซิร์ฟเวอร์ที่รันแค่ `localhost` เข้าถึงไม่ได้ ต้องเลือกอย่างใดอย่างหนึ่ง:
- **ทดสอบชั่วคราว**: ใช้ [ngrok](https://ngrok.com/) รัน `ngrok http 3000` จะได้ URL แบบ `https://xxxx.ngrok-free.app` มาใช้ชั่วคราว
- **ใช้งานจริง**: deploy แอปนี้ขึ้นเซิร์ฟเวอร์/VPS ที่มี HTTPS

เอา URL ที่ได้ไปตั้งใน LINE Developers Console → แท็บ "Messaging API" → **Webhook URL** = `https://<your-domain>/webhook/line` แล้วกด "Verify" ให้ขึ้นสำเร็จ

**4. เชิญบอทเข้ากลุ่มลูกค้า**

สแกน QR code ของ OA (อยู่ในแท็บ "Messaging API") เพื่อเพิ่มเป็นเพื่อน แล้วเชิญเข้ากลุ่มไลน์ที่มีลูกค้าเหมือนเชิญเพื่อนทั่วไป

**5. ใช้งาน**

ในกลุ่ม พิมพ์แท็กชื่อบอท (เลือกจากที่ LINE ขึ้นให้อัตโนมัติตอนพิมพ์ `@`) ตามด้วยปัญหา เช่น:
```
@ชื่อบอทของคุณ เครื่องพิมพ์เสีย ไฟไม่ติดเลย
```
บอทจะสร้าง ticket ให้ทันที ตั้งชื่อกลุ่ม LINE เป็นบริษัท/สาขาอัตโนมัติ (ถ้าดึงชื่อได้) บันทึกชื่อผู้แจ้งไว้ในแชทของ ticket และตอบกลับในกลุ่มพร้อมเลข ticket เช่น "รับเรื่องแล้วครับ ✅ Ticket #12: เครื่องพิมพ์เสีย ไฟไม่ติดเลย"

ข้อความในกลุ่มที่ไม่ได้แท็กบอทจะถูกละเว้น ไม่กลายเป็น ticket

### เปิดใช้ AI ช่วยแนะนำใน Knowledge Base (ไม่บังคับ)

ตั้งค่า environment variable ก่อนรัน `npm start`:

```bash
# Windows (Command Prompt)
set ANTHROPIC_API_KEY=your-api-key-here
npm start

# Windows (PowerShell)
$env:ANTHROPIC_API_KEY="your-api-key-here"
npm start
```

ถ้าไม่ตั้งค่าไว้ ปุ่ม "ค้นหาคำแนะนำ" จะยังทำงานได้ปกติ แค่แสดงเฉพาะบทความที่ใกล้เคียงจาก Knowledge Base โดยไม่มีสรุปจาก AI

### เปิดใช้แจ้งเตือนลง Discord (ไม่บังคับ)

รองรับแยกช่อง Discord กันได้ — เช่น ช่อง `#newtickets` รับแจ้งเตือน ticket ใหม่ และช่อง `#daily-summary` รับสรุปงานประจำวัน แยกกันคนละ Webhook

**1. สร้าง Webhook ใน Discord (ทำซ้ำ 2 รอบ ถ้าจะแยกช่อง)**
- เปิด **การตั้งค่าช่อง (Edit Channel)** ของช่องที่ต้องการรับแจ้งเตือน → แท็บ **Integrations** → **Webhooks** → **New Webhook**
- ตั้งชื่อ (เช่น "Ticket Bot") แล้วกด **Copy Webhook URL**
- ทำซ้ำอีกครั้งกับอีกช่องหนึ่ง ถ้าต้องการแยก ticket ใหม่ กับ สรุปประจำวัน คนละช่อง

**2. ตั้งค่า environment variable แล้วรันเซิร์ฟเวอร์**

ถ้าจะแยกช่องกัน:
```bash
# Windows (Command Prompt)
set DISCORD_NEW_TICKET_WEBHOOK_URL=https://discord.com/api/webhooks/xxxxx/yyyyy
set DISCORD_DAILY_SUMMARY_WEBHOOK_URL=https://discord.com/api/webhooks/aaaaa/bbbbb
set DISCORD_DAILY_SUMMARY_TIME=18:00
npm start

# Windows (PowerShell)
$env:DISCORD_NEW_TICKET_WEBHOOK_URL="https://discord.com/api/webhooks/xxxxx/yyyyy"
$env:DISCORD_DAILY_SUMMARY_WEBHOOK_URL="https://discord.com/api/webhooks/aaaaa/bbbbb"
$env:DISCORD_DAILY_SUMMARY_TIME="18:00"
npm start
```

ถ้าจะใช้ช่องเดียวสำหรับทั้งสองอย่าง ตั้งแค่ `DISCORD_WEBHOOK_URL` ตัวเดียวพอ:
```bash
set DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxxxx/yyyyy
npm start
```

- `DISCORD_NEW_TICKET_WEBHOOK_URL`: webhook สำหรับแจ้งเตือน ticket ใหม่ ถ้าไม่ตั้งจะ fallback ไปใช้ `DISCORD_WEBHOOK_URL`
- `DISCORD_DAILY_SUMMARY_WEBHOOK_URL`: webhook สำหรับสรุปงานประจำวัน ถ้าไม่ตั้งจะ fallback ไปใช้ `DISCORD_WEBHOOK_URL`
- `DISCORD_WEBHOOK_URL`: webhook ตัวกลาง ใช้เมื่อไม่ได้แยก webhook ของสองอย่างข้างบนไว้ — ถ้าไม่ตั้งค่าอะไรเลยสักตัว ระบบจะไม่ส่งอะไรเข้า Discord เลย (ฟีเจอร์อื่นทำงานปกติ) และปุ่ม "ส่งไป Discord" จะไม่แสดงในหน้าเว็บ
- `DISCORD_DAILY_SUMMARY_TIME`: เวลาที่จะส่งสรุปงานประจำวันอัตโนมัติ รูปแบบ 24 ชั่วโมง `HH:MM` (ไม่ระบุ = ค่าเริ่มต้น `18:00`) ระบบเช็คทุก 1 นาที เมื่อถึงเวลาที่ตั้งไว้และยังไม่เคยส่งของวันนั้นจะส่งให้อัตโนมัติ 1 ครั้ง ต่อให้รีสตาร์ทเซิร์ฟเวอร์ก็จะไม่ส่งซ้ำ (จำวันที่ส่งล่าสุดไว้ในฐานข้อมูล)

**3. ใช้งาน**
- ทุกครั้งที่มี ticket ใหม่ (จากเว็บหรือจากกลุ่ม LINE) จะมีข้อความแจ้งเตือนเข้าช่อง Discord ที่ตั้งไว้สำหรับ ticket ใหม่ทันทีอัตโนมัติ
- ทุกวันเวลาที่ตั้งไว้จะมีสรุปงานประจำวันส่งเข้าช่อง Discord ที่ตั้งไว้สำหรับสรุปงานอัตโนมัติ (ข้อความเดียวกับที่โชว์ในกล่อง "📋 สรุปสำหรับแจ้งในไลน์")
- ถ้าอยากส่งสรุปตอนนี้เลยไม่ต้องรอถึงเวลา กดปุ่ม **"ส่งไป Discord"** ในหน้าสรุปรายวันได้ทุกเมื่อ (ปุ่มนี้จะแสดงก็ต่อเมื่อตั้งค่า webhook สำหรับสรุปงานไว้แล้ว)
