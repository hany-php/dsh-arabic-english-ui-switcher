<div dir="rtl">

# مبدّل واجهة DSH: عربي ⇄ إنجليزي

### إضافتان مستقلتان لـ **DeepSeek Harness** تغيّران لغة الواجهة بين العربية والإنجليزية، وتقلبان اتجاهها بين RTL وLTR تلقائيًا — مع حفظ الاختيار وإمكانية الرجوع الفوري.

![Status](https://img.shields.io/badge/status-working%20prototype-2ea043)
![DSH](https://img.shields.io/badge/DeepSeek%20Harness-0.2.2--rc.1-1f6feb)
![License](https://img.shields.io/badge/license-MIT-blue)

</div>

## العربية

### الفكرة
DeepSeek Harness لا يوفّر لغة عربية ولا وضع RTL. هذا المشروع يضيف الاثنين كحزمتين مستقلتين تُثبَّتان في البروفايل عبر `plugin_manager` فقط، دون أي تعديل على `app.asar` أو بيانات الجلسات:

| الحزمة | الوظيفة |
|---|---|
| `@local/dsh-arabic-locale` | تسجّل «العربية» في كتالوج اللغات وتمدّ التطبيق بقواميس عربية عبر خدمة `ctx.locale` الرسمية. |
| `@local/dsh-rtl-layout` | تجعل اتجاه الواجهة يتبع اللغة النشطة تلقائيًا: العربية ← RTL، وغيرها ← LTR، مع إبقاء الأكواد والطرفية والرياضيات والمسارات والمعاينات على LTR. |

### كيف تعمل الترجمة
1. تُسجَّل العربية عبر `ctx.locale.addLanguage({ id: 'ar', label: 'العربية', fallback: 'en' })`.
2. يمسح نصف العميل **كل** مساحات الأسماء المسجّلة في `ctx.locale`، ويترجم كل نص إنجليزي معروف من جدول `English → Arabic` مدمج (جدول يدوي `AR_CORE` + جدول مولَّد `AR_PHASE3`)، ثم يسجّل النتيجة لـ `ar`.
3. أي نص غير مترجم يظهر بالإنجليزية تلقائيًا عبر سلسلة الـ fallback الرسمية — لا يمكن أن تنكسر الواجهة بسببه.
4. يحدث مسح إضافي بعد 120ms عند كل تغيير في اللغة، لتغطية الإضافات التي تُحمَّل متأخرة.

**تغطية المرحلة 3:** استُخرجت القواميس الإنجليزية الفعلية من `app.asar`
(‏2,936 نصًا فريدًا)، وتمت تغطية الحزم التي يشغّلها بروفايل `desktop` فعلًا
(‏2,077 نصًا): صار **1,997 نصًا مترجمًا**، ولم يتبقَّ سوى **80 رمزًا تقنيًا**
(أسماء أدوات، أوامر شرطة مائلة، وحدات، صيغ تواريخ، روابط) تُركت إنجليزية
بالتصميم. الحزم التجريبية غير المُحمَّلة تبقى إنجليزية حتى تفعيلها.
التفاصيل وخطوات إعادة التوليد في
[docs/INVENTORY.md](docs/INVENTORY.md).

### كيف يعمل الاتجاه
- يُشتق الاتجاه من اللغة النشطة: `ar / he / fa / ur` ← RTL، وما عداها ← LTR.
- يُحفظ الاختيار ضمن تفضيل اللغة نفسه، لذا يبقى بعد إعادة التشغيل.
- نحفظ قيمتي `dir` و`lang` الأصليتين ونعيدهما بدقة عند العودة للإنجليزية.
- كل تجاوزات CSS محصورة تحت `[dir="rtl"]` فلا تؤثر على وضع LTR إطلاقًا.

### التثبيت
من داخل DSH (وليس من الطرفية):
```
plugin_manager({ action: "install_bundle", target: "<مسار مجلد الحزمة>" })
```
لكل حزمة على حدة: `packages/dsh-arabic-locale` ثم `packages/dsh-rtl-layout`.
ثم **أعد تحميل الصفحة (Ctrl+R)** واختر العربية من الإعدادات ← عام ← اللغة.

### التحقق
1. `plugin_manager list_bundles` → صف مضاف و`overrides: []`، و`application: applied` بلا تحذيرات.
2. `cordis_inspect_query` (host, `Config.listConfigs`) → وجود `include:dsh-arabic-locale` و`include:dsh-rtl-layout`.
3. بصريًا: الإعدادات بالعربية، والواجهة منقلبة، والأكواد والطرفية سليمة.

### البنية
```
docs/                     الجرد والتدقيق والقرارات المعمارية
packages/dsh-arabic-locale/   حزمة اللغة (host فارغ + client يملك التسجيل)
packages/dsh-rtl-layout/      حزمة الاتجاه (host فارغ + client يملك القلب)
tools/                    أدوات قراءة app.asar + توليد القواميس + التغطية والتحقق
```

### الحالة والخطة
- **المرحلة 0** — مكتملة (جرد وتدقيق وقرارات).
- **المرحلة 1** — منفّذة: العربية ظاهرة وتُترجم الإعدادات والنماذج والإضافات وقائمة الأوامر وقائمة الجلسة.
- **المرحلة 2** — منفّذة: الاتجاه يتبع اللغة تلقائيًا، جزر LTR سليمة، صندوق الكتابة والقوائم والأعمدة ومقابض التوسيع مضبوطة.
- **المرحلة 3** — منفّذة ومثبّتة: تغطية كاملة للحزم المُحمَّلة (1,650 ترجمة جديدة)، مع أدوات استخراج/توليد/تحقق قابلة لإعادة التشغيل بعد أي تحديث لـ DSH، ومراجعة QA مستقلة.
- **المرحلة 4 (قادمة)** — توثيق نهائي، قائمة فحص بصرية من المستخدم، وإصدار موسوم.

### حدود معروفة
- الترجمة تغطي كل النصوص البشرية في الحزم التي يشغّلها البروفايل؛ تبقى الرموز التقنية إنجليزية بالتصميم، والحزم التجريبية غير المُحمَّلة تبقى إنجليزية حتى تفعيلها.
- قد تحتاج بعض العناصر ذات التموضع الفيزيائي (`left/right` ثابتة) ضبطًا يدويًا بعد الفحص البصري.
- لا يوجد تحكم بالمتصفح في بيئة التطوير، لذا الفحص البصري مسؤولية المستخدم.

---

## English

### What this is
DeepSeek Harness ships no Arabic UI and no RTL mode. This project adds both as **two independent bundles** installed into the DSH profile through `plugin_manager` only — no changes to `app.asar`, no changes to session data.

| Bundle | Purpose |
|---|---|
| `@local/dsh-arabic-locale` | Registers **العربية** in the language catalog and feeds Arabic dictionaries through the official `ctx.locale` service. |
| `@local/dsh-rtl-layout` | Mirrors the whole shell when the active language is RTL, while keeping code, terminal, math, paths and previews LTR. |

### How translation works
1. `ctx.locale.addLanguage({ id: 'ar', label: 'العربية', fallback: 'en' })` adds the language.
2. The client half scans every namespace registered in `ctx.locale`, maps English values through a bundled `English → Arabic` table (hand-curated `AR_CORE` + generated `AR_PHASE3`), and registers the result for `ar`.
3. Unknown strings fall back to English through the service's own chain, so the UI can never break from a missing translation.
4. A throttled re-scan (120 ms) on every locale revision covers plugins that activate later.

**Phase 3 coverage:** the actual English dictionaries were harvested from
`app.asar` (2,936 unique strings) and every bundle mounted by the `desktop`
profile is covered (2,077 strings): **1,997 translated**, leaving only **80
technical tokens** (tool names, slash commands, units, formats, URLs) English by
design. Unmounted experimental bundles stay English until enabled. The reusable
harvest → batch → validate → merge pipeline lives in `tools/` and is documented
in [docs/INVENTORY.md](docs/INVENTORY.md).

### How direction works
- Direction derives from the active locale (`ar/he/fa/ur` → RTL, everything else → LTR), so the persisted language preference also persists the direction.
- Original `dir`/`lang` attributes are captured and restored exactly when switching back.
- All CSS corrections are scoped to `[dir="rtl"]`, so LTR mode is untouched.

### Install
From inside DSH (not the shell):
```
plugin_manager({ action: "install_bundle", target: "<absolute package directory>" })
```
Install `packages/dsh-arabic-locale`, then `packages/dsh-rtl-layout`, then reload the page (Ctrl+R).

### Project layout
```
docs/       inventory, direction audit, architecture decisions
packages/   the two installable bundles
tools/      app.asar reader, locale harvest/coverage/batch/merge tools, offline client test
```

### Known limits
- Every human-readable string in the mounted bundles is translated; technical tokens stay English by design, and unmounted experimental bundles stay English until enabled.
- Some absolutely-positioned UI may need targeted overrides after visual review.
- No browser automation is available here, so visual verification is performed by the user.

### License
MIT © 2026 Hany Hassan
