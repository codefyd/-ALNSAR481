# المرحلة الرابعة — نسخة نظيفة لربط الواجهة مع Supabase

هذه الحزمة نظيفة ومقصودة للمرحلة الحالية فقط. لا تحتوي على ملفات Google Apps Script ولا صفحات النظام القديم.

## الملفات الموجودة

- `index.html`  
  صفحة افتتاحية بسيطة توجه إلى بوابة العاملين.

- `staff-v2.html`  
  بوابة العاملين الجديدة المرتبطة بـ Supabase Auth والصلاحيات.

- `config.example.js`  
  انسخه باسم `config.js` وضع فيه بيانات Supabase.

- `assets/js/supabase-core.js`  
  طبقة الربط مع Supabase: تسجيل الدخول، قراءة الحساب، قراءة الدور، فحص الصلاحيات.

- `assets/css/app.css`  
  تنسيق الواجهة الجديدة.

- `alnsar_phase4_auth_quick_setup.sql`  
  ملف مساعد لإنشاء profiles للحسابات الموجودة وتعيين أول مدير.

## خطوات التشغيل

1. انسخ الملف:

```text
config.example.js
```

ثم غيّر اسمه إلى:

```text
config.js
```

2. ضع بيانات Supabase داخل `config.js`:

```js
window.ALNSAR_SUPABASE = {
  url: 'https://YOUR-PROJECT.supabase.co',
  anonKey: 'YOUR-SUPABASE-ANON-KEY'
};
```

تجد القيم من:

```text
Supabase Dashboard > Project Settings > API
```

3. أنشئ مستخدمًا من:

```text
Authentication > Users > Add user
```

4. نفذ ملف:

```text
alnsar_phase4_auth_quick_setup.sql
```

مع تعديل البريد في سطر:

```sql
where email = 'ضع_بريدك_هنا'
```

5. افتح:

```text
staff-v2.html
```

وسجل الدخول.

## ماذا يعني نجاح المرحلة؟

نجاح المرحلة يعني ظهور:

- اسم المستخدم.
- البريد.
- الدور.
- ملخص الأعداد حسب الصلاحية.
- فحص الصلاحيات.
- الحلق المسندة إن وجدت.

بعدها نبدأ ببناء صفحة الحلق وربط العاملين.
