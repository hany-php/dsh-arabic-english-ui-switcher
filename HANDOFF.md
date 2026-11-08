<div dir="rtl">

# HANDOFF — حالة المشروع ونقطة الاستئناف

**آخر تحديث:** 2026-11-08 18:05 (Africa/Cairo)
**المستودع:** https://github.com/hany-php/dsh-arabic-english-ui-switcher
**آخر commit:** `7b2d7d5` (المرحلة 3: الترجمة والأدوات والتوثيق)

---

## 1) الحالة باختصار

| المرحلة | الحالة |
|---|---|
| 0 — استكشاف وتصميم | ✅ مكتملة (`docs/INVENTORY.md`, `docs/AUDIT.md`, `docs/DECISIONS.md`) |
| 1 — حزمة اللغة العربية | ✅ منفّذة ومثبّتة |
| 2 — وضع RTL والتخطيط | ✅ منفّذة ومثبّتة ومُختبرة بصريًا من المستخدم |
| 3 — توسيع الترجمة | ✅ منفّذة ومثبّتة (تنتظر تحقق المستخدم البصري) |
| 4 — التوثيق والإصدار | ⏳ التالية |

الحزمتان مثبّتتان في البروفايل `desktop` عبر `plugin_manager` فقط. تغييرات
المرحلة 3 في `packages/dsh-arabic-locale/client.js` مثبّتة، وتحتاج **Ctrl+R**
في الصفحة لتظهر.

---

## 2) ما أُنجز في المرحلة 3

### أ) أدوات جديدة قابلة لإعادة التشغيل (كلها في `tools/`)

| الأداة | الدور |
|---|---|
| `asar-util.cjs` | قراءة `app.asar` للقراءة فقط (list/read/grep) عبر تحليل ترويسة الأرشيف، دون تحميل 300MB في ذاكرة واحدة |
| `extract-locale-corpus.cjs` | استخراج **كل** قاموس إنجليزي مدمج (`const en = {…}`) من حزم العميل → `locale-en-corpus.json` + `locale-dicts-all.json` |
| `loaded-bundles.cjs` | تحديد حزم العميل التي يشغّلها البروفايل فعلًا من ملفات `cordis.patch.yml` للحزم المفعّلة |
| `ar-keys.cjs` | قراءة مفاتيح `AR_CORE` + `AR_PHASE3` بقاعدة البحث نفسها وقت التشغيل |
| `locale-coverage.cjs` | تقرير التغطية (الحزم المُحمَّلة افتراضيًا، و`--all` لكل الحزم) |
| `locale-batch.cjs` | تقسيم النصوص الناقصة إلى دفعات متوازنة حسب المجال |
| `check-translation-part.cjs` | التحقق الآلي من دفعة مترجمة (الرموز البديلة، المسافات، BOM/المحارف الصفرية) |
| `apply-translations.cjs` | توليد كتلة `AR_PHASE3` داخل `client.js` بين علامتي `PHASE3-AR` |
| `test-locale-client.cjs` | اختبار تكامل بلا متصفح: يحمّل `client.js` الحقيقي مقابل خدمة locale وهمية ويتحقق من التسجيل والمسح والـ fallback |

### ب) الأرقام

- القواميس المستخرجة من `app.asar` (DSH 0.2.2-rc.1): **85 حزمة عميل مفحوصة، 62 فيها قواميس، 2,936 نصًا فريدًا**.
- الحزم التي يشغّلها البروفايل: **52 حزمة، 2,077 نصًا فريدًا**.
- الترجمة الجديدة في المرحلة 3: **1,650 مدخلًا** (من 1,697 في الدفعات؛ 47 صيغة تقنية بقيت كما هي).
- إجمالي مفاتيح الجدول الآن: **2,025** (375 في `AR_CORE` + 1,650 في `AR_PHASE3`).
- التغطية في الحزم المُحمَّلة: **1,997 / 2,077** — والمتبقي **80 رمزًا تقنيًا فقط** (أسماء أدوات، أوامر `/...`، وحدات مثل `ms`/`px`، صيغ تواريخ، روابط، أسماء بروتوكولات) تُركت إنجليزية بالتصميم. التفاصيل في `docs/INVENTORY.md` §5.
- الحزم التجريبية غير المُحمَّلة (10 حزم، 859 نصًا) تُركت إنجليزية حتى تفعيلها.

### ج) البنية الجديدة للجدول

```
AR_CORE    (يدوي، مراجَع)  +  AR_PHASE3 (مولَّد من القواميس)
                ↓ Object.assign
                AR  ← يستخدمه translateAllNamespaces
```

لا تُحرَّر `AR_PHASE3` يدويًا؛ عدّل الدفعات في `.work/` ثم أعد
`tools/apply-translations.cjs`. تصحيح نص مفرد يذهب إلى `AR_CORE`.

### د) ضمان الجودة

- ستة وكلاء ترجمة متوازين (6 دفعات بحسب المجال) + مدقق آلي لكل دفعة.
- مراجع QA مستقل راجع **كل** الـ1,650 مدخلًا: 23 ملاحظة (1 عالية، 4 متوسطة،
  18 منخفضة) — أبرزها «compress» المترجمة «اضغطها» في رسالة خطأ صورة. **أُصلحت
  كلها** قبل الدمج النهائي.
- `tools/test-locale-client.cjs`: ALL CHECKS PASSED.
- لا تغييرات CSS في هذه المرحلة؛ جدول تجاوزات §9 في `AGENTS.md` لم يتغيّر.

---

## 3) التثبيت والتحقق (المرحلة 3، 2026-11-08)

| الخطوة | النتيجة |
|---|---|
| `remove_bundle` ثم `install_bundle` لـ `@local/dsh-arabic-locale` | `application: applied`, `warnings: []` |
| `list_bundles` | الصف موجود: `enabled: true`, `rows: [include:dsh-arabic-locale]`, `overrides: []` |
| `cordis_inspect_query` (host `Config.listConfigs`, name `@local/dsh-arabic-locale`) | `include:dsh-arabic-locale` موجود (`status: absent` لأن الحزمة بلا Config schema) |
| `node --check` | يمرّ لكل `index.js` / `client.js` في الحزمتين |
| `tools/locale-coverage.cjs` | 1,997 / 2,077 |
| `tools/test-locale-client.cjs` | ALL CHECKS PASSED |
| **تحقق المستخدم البصري** | ⏳ مطلوب: Ctrl+R ثم فحص الشاشات |

> لم يُطلب `remove/install` لحزمة `dsh-rtl-layout` لأن ملفاتها لم تتغيّر في هذه المرحلة.

---

## 4) كيف تعيد التغطية بعد تحديث DSH

```powershell
$node = 'C:\Users\hany_\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
& $node tools/extract-locale-corpus.cjs      # القواميس الجديدة
& $node tools/locale-coverage.cjs            # ما ينقص
& $node tools/locale-batch.cjs               # دفعات الترجمة في .work/
# ترجم .work/part-N.json → .work/out-N.json ثم دقّق كل زوج:
& $node tools/check-translation-part.cjs .work/part-1.json .work/out-1.json
& $node tools/apply-translations.cjs         # توليد AR_PHASE3
& $node --check packages/dsh-arabic-locale/client.js
& $node tools/test-locale-client.cjs
```

ثم أعد تثبيت الحزمة عبر `plugin_manager` (remove ثم install) واطلب Ctrl+R.

---

## 5) الحدود المعروفة (ليست أخطاء)

1. **شريط القوائم العلوي** (`Edit` / `Application` وUndo/Redo/Cut/Copy) قائمة Electron أصلية — خارج نطاق أي إضافة عميل.
2. **وضع الشاشة الكاملة للشريط الجانبي** يغطي منطقة المحتوى — سلوك DSH الأصلي؛ الخروج بـ ⤡ أو `Ctrl+Alt+Enter`.
3. **الرموز التقنية** المذكورة في §2-ب تبقى إنجليزية بالتصميم (أسماء أدوات، أوامر، وحدات، صيغ).
4. **الحزم التجريبية غير المُحمَّلة** تبقى إنجليزية حتى يُفعّلها المستخدم.
5. **محتوى المحادثات وعناوين الجلسات ووصف الإضافات** بيانات لا مفاتيح واجهة — خارج النطاق.
6. لا يوجد تحكم بالمتصفح في هذه البيئة؛ التحقق البصري مسؤولية المستخدم.

---

## 6) الخطوة التالية (المرحلة 4)

1. **قائمة فحص بصرية** يجرّبها المستخدم على شاشات: الشات، تفاصيل العمل، بطاقات الأدوات، الإعدادات (كل التبويبات)، مدير الإضافات، الشريط الجانبي، الطرفية، معاينات المستندات.
2. تسجيل أي نص إنجليزي متبقٍ أو انحراف RTL — **بالقياس** (`getBoundingClientRect` / `elementFromPoint` / computed styles) قبل أي تجاوز CSS؛ ومراجعة جدول §9 في `AGENTS.md`.
3. لقطات شاشة حديثة في README (العربية + RTL).
4. وسم الإصدار (`v0.3.0`) وتحديث `package.json` إن لزم.
5. تحديث `HANDOFF.md` و`docs/INVENTORY.md` بعد أي تغيير.

---

## 7) كيف تبدأ جلسة جديدة

1. افتح Session جديدة على مجلد المشروع.
2. الصق: «اقرأ AGENTS.md ثم HANDOFF.md ثم docs/DECISIONS.md، ثم تابع من قسم الخطوة التالية».
3. أي تعديل بصري: اتبع `AGENTS.md` §8–§9 — **لا تجاوز أعمدة أساسية، وقِس قبل التعديل**.
4. أي تعديل على الترجمة: استخدم خط أنابيب `tools/` أعلاه، ولا تُحرّر `AR_PHASE3` يدويًا.
5. بعد أي تعديل: `remove_bundle` ثم `install_bundle`، ثم اطلب من المستخدم **Ctrl+R**.

</div>
