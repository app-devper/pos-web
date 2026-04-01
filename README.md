# POS Pharma

ระบบ Point of Sale สำหรับร้านขายยา รองรับการขายสินค้า จัดการสต็อก จัดการผู้ใช้ และรายงานทางเภสัชกรรม/กฎหมายยา

## ภาพรวม

- **Frontend**: Next.js App Router
- **UI**: Tailwind CSS + shadcn/ui
- **API**: เชื่อมต่อ POS API และ UM API ผ่าน `axios`
- **Deployment**: Firebase Hosting

## ความสามารถหลัก

- **ล็อกอินผู้ใช้งาน** และจัดการ session
- **จัดการสินค้า** พร้อมหน่วยนับ, barcode, SKU, ราคา และข้อมูลยา
- **ขายสินค้า** และดูประวัติการขาย
- **จัดการสต็อก** รับสินค้า, lot, วันหมดอายุ, การโอนย้าย
- **รายงานร้านยา** สำหรับ KHY9 - KHY13
- **จัดการผู้ใช้งาน** และสิทธิ์การเข้าถึง

## สิ่งที่ต้องมี

- Node.js 18+
- npm
- Firebase CLI (`npm install -g firebase-tools`)
- URL ของ UM API สำหรับใช้งานในเครื่องหรือ staging

## การตั้งค่า Environment

สร้างไฟล์ `.env.local` ที่ root ของโปรเจกต์:

```bash
NEXT_PUBLIC_UM_API_URL=https://your-um-api-domain/api/um/v1
```

> หมายเหตุ: ค่า `pos_api_host` และ token จะถูกเก็บใน browser หลังล็อกอินสำเร็จ

## ติดตั้งและรันโปรเจกต์

```bash
npm install
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

## Scripts ที่ใช้บ่อย

| Script | คำอธิบาย |
| --- | --- |
| `npm run dev` | รัน development server |
| `npm run build` | build สำหรับ production |
| `npm run start` | รัน production server หลัง build |
| `npm run lint` | ตรวจสอบ code ด้วย ESLint |

## โครงสร้างโปรเจกต์แบบย่อ

```text
pos-web/
├── app/
│   ├── (dashboard)/
│   │   ├── products/
│   │   ├── sale/
│   │   ├── orders/
│   │   └── reports/
│   ├── login/
│   └── layout.tsx
├── components/
├── lib/
│   ├── api/
│   ├── auth.ts
│   └── um-api.ts
├── types/
├── public/
├── firebase.json
└── .firebaserc
```

## Firebase Deployment

โปรเจกต์นี้ deploy ไปที่ Firebase Hosting site: **`pos-pharm`**

### ครั้งแรกที่ใช้งาน

```bash
firebase login
firebase use pos-pharm
```

### ขั้นตอน deploy

```bash
# 1. build โปรเจกต์
npm run build

# 2. deploy ไป Firebase Hosting
firebase deploy --only hosting:pos-pharm
```

### ไฟล์ที่เกี่ยวข้องกับการ deploy

- `firebase.json` — กำหนด hosting site และ public directory
- `.firebaserc` — กำหนด Firebase project default

### Hosting URL

https://pos-pharm.web.app

## หมายเหตุ

- โปรเจกต์นี้ build เป็น static export สำหรับ Firebase Hosting
- หากเปลี่ยนชื่อ site หรือ project ให้แก้ `firebase.json` และ `.firebaserc` ให้ตรงกัน
