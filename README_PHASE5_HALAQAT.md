# المرحلة الخامسة — الحلق وربط العاملين

هذه النسخة تضيف صفحة فعلية لإدارة الحلق وربط العاملين على جداول Supabase التي تم إنشاؤها في المراحل السابقة.

## الملفات الجديدة أو المعدلة

- `halaqat.html`
  صفحة إدارة الحلق وربط العاملين.

- `assets/js/halaqat-page.js`
  منطق الصفحة: قراءة الحلق، قراءة العاملين، إنشاء حلقة، تعديل حلقة، أرشفة حلقة، إضافة ربط، إيقاف ربط.

- `assets/css/app.css`
  أضيفت تنسيقات نماذج وجداول الصفحة.

- `staff-v2.html`
  أضيف رابط مباشر لصفحة الحلق وربط العاملين.

- `index.html`
  أضيف رابط مباشر للصفحة.

## ملاحظات مهمة

1. إنشاء حساب عامل جديد لا يتم من هذه الصفحة، بل من:

```text
Supabase > Authentication > Users > Add user
```

2. بعد إنشاء المستخدم، تأكد أن له سجل في `profiles` وأن له دورًا مناسبًا.

3. المدير يستطيع إنشاء الحلق والربط بسبب صلاحية `system.full_access`.

4. إذا ظهرت قائمة العاملين فارغة، نفذ أمر مزامنة profiles للحسابات الموجودة:

```sql
insert into public.profiles (id, full_name, phone)
select
  id,
  coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email),
  raw_user_meta_data->>'phone'
from auth.users
on conflict (id) do nothing;
```

5. لتعيين دور لمستخدم، غيّر البريد والدور:

```sql
update public.profiles
set role_id = (select id from public.roles where code = 'teacher'),
    full_name = coalesce(full_name, 'اسم العامل'),
    is_active = true
where id = (
  select id from auth.users
  where email = 'user@example.com'
);
```

## طريقة الاستخدام

1. افتح `staff-v2.html` وسجل الدخول.
2. افتح `halaqat.html` من الرابط الجانبي أو من الصفحة الرئيسية.
3. أضف الحلق.
4. أضف العاملين من Supabase Authentication إذا لم يكونوا موجودين.
5. اربط العامل بالحلقة من تبويب "ربط العاملين".
