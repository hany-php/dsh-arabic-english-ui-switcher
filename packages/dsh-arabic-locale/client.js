/**
 * Client half of the Arabic locale bundle.
 *
 * Registers the `ar` language in the shared catalog, then contributes Arabic
 * dictionaries to every locale namespace the app has registered.
 *
 * Strategy: the official `ctx.locale` service keeps its dictionaries in a
 * `dicts` map (namespace -> locale -> {key: text}). For each namespace we look
 * at its English dictionary, translate any value we know from `AR` below, and
 * register the result for `ar`. Strings we do not know stay English through the
 * service's own fallback chain, so the UI can never break because of a gap.
 *
 * Module id MUST equal the package name.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-arabic-locale',
  factory(require) {
    /**
     * English source text -> Arabic. Keyed by the English value (not the
     * dictionary key) so one entry serves every namespace that shows it.
     * Placeholders such as {version} are preserved verbatim.
     */
    const AR = {
      // --- shared / common -------------------------------------------------
      OK: 'موافق',
      Cancel: 'إلغاء',
      Close: 'إغلاق',
      Copy: 'نسخ',
      Copied: 'تم النسخ',
      'Copy failed': 'فشل النسخ',
      Retry: 'إعادة المحاولة',
      Loading: 'جارٍ التحميل',
      'Loading…': 'جارٍ التحميل…',
      'Failed to load': 'تعذّر التحميل',
      Submit: 'إرسال',
      Next: 'التالي',
      Previous: 'السابق',
      Skip: 'تخطٍّ',
      Delete: 'حذف',
      Edit: 'تعديل',
      Save: 'حفظ',
      Search: 'بحث',
      More: 'المزيد',
      Collapse: 'طيّ',
      'Collapse all': 'طيّ الكل',
      Expand: 'توسيع',
      Back: 'رجوع',
      Add: 'إضافة',
      All: 'الكل',
      Accepted: 'مقبول',
      Approve: 'موافقة',
      Approved: 'تمت الموافقة',
      Answer: 'إجابة',
      Archive: 'أرشفة',
      'Archive session': 'أرشفة الجلسة',
      Archived: 'مؤرشفة',
      Discard: 'تجاهل',
      Download: 'تنزيل',
      Help: 'مساعدة',
      History: 'السجل',
      New: 'جديد',
      Open: 'فتح',
      Remove: 'إزالة',
      Rename: 'إعادة تسمية',
      Reset: 'إعادة تعيين',
      Select: 'تحديد',
      Send: 'إرسال',
      'Show more': 'عرض المزيد',
      'Show less': 'عرض أقل',
      Stop: 'إيقاف',
      'Try again': 'حاول مرة أخرى',
      Done: 'تم',
      Default: 'افتراضي',
      Custom: 'مخصّص',
      'No output': 'لا مخرجات',
      Settings: 'الإعدادات',
      'Open settings': 'فتح الإعدادات',
      Account: 'الحساب',
      Models: 'النماذج',
      General: 'عام',
      Plugins: 'الإضافات',
      'Built-in plugins': 'الإضافات المدمجة',
      'Agent presets': 'الإعدادات المسبقة للوكيل',
      'DeepSeek Account': 'حساب DeepSeek',
      Language: 'اللغة',
      'Keyboard shortcuts': 'اختصارات لوحة المفاتيح',
      'Edit shortcuts': 'تعديل الاختصارات',
      'View and edit available shortcuts and input actions':
        'عرض وتعديل الاختصارات المتاحة وإجراءات الإدخال',
      'Search shortcuts': 'بحث في الاختصارات',
      'Close keyboard shortcuts': 'إغلاق اختصارات لوحة المفاتيح',
      'Open keyboard shortcuts': 'فتح اختصارات لوحة المفاتيح',
      Application: 'التطبيق',
      'Message input': 'إدخال الرسائل',
      'Menus and dialogs': 'القوائم والحوارات',
      'Approval area': 'منطقة الموافقة',
      'No shortcut': 'بلا اختصار',
      'No matching shortcuts': 'لا توجد اختصارات مطابقة',
      'Move menu selection': 'نقل تحديد القائمة',
      'Select menu item': 'تحديد عنصر القائمة',
      'Close menu or top dialog': 'إغلاق القائمة أو الحوار الأعلى',
      'Default bindings are active.': 'الاختصارات الافتراضية نشطة.',
      'Clear search': 'مسح البحث',
      'Press a shortcut': 'اضغط اختصارًا',
      'This key is not supported.': 'هذا المفتاح غير مدعوم.',
      Modified: 'معدّل',
      'Retry save': 'إعادة محاولة الحفظ',
      'Restore default': 'استعادة الافتراضي',
      'Restore all defaults': 'استعادة كل الافتراضيات',
      'Restore all default shortcuts?': 'استعادة كل الاختصارات الافتراضية؟',
      'Default shortcuts restored': 'تمت استعادة الاختصارات الافتراضية',

      // --- settings shell ---------------------------------------------------
      'Open configuration file': 'فتح ملف الإعدادات',
      'Could not open configuration file': 'تعذّر فتح ملف الإعدادات',
      'Current version: {version}': 'الإصدار الحالي: {version}',
      'Show coding view': 'إظهار عرض البرمجة',
      'Could not save. Please try again.': 'تعذّر الحفظ. حاول مرة أخرى.',
      'Shows trajectory, code diffs, and all Agent presets':
        'يعرض المسار وفروقات الكود وكل الإعدادات المسبقة للوكيل',
      Disconnected: 'غير متصل',
      Reconnecting: 'جارٍ إعادة الاتصال',
      Connected: 'متصل',
      'Disconnected, reconnect now': 'غير متصل، أعد الاتصال الآن',
      'Reconnecting, reconnect now': 'جارٍ إعادة الاتصال، أعد الاتصال الآن',
      'Service version changed': 'تغيّر إصدار الخدمة',
      Service: 'الخدمة',
      Page: 'الصفحة',
      Unknown: 'غير معروف',
      'Reload to load the new version': 'أعد التحميل لتحميل الإصدار الجديد',
      'Not now': 'ليس الآن',
      Update: 'تحديث',
      'Install and Restart': 'تثبيت وإعادة التشغيل',
      'Retry update': 'إعادة محاولة التحديث',

      // --- appearance -------------------------------------------------------
      Appearance: 'المظهر',
      Light: 'فاتح',
      Dark: 'داكن',
      System: 'النظام',
      'Font size': 'حجم الخط',
      'Only affects conversation content': 'يؤثر على محتوى المحادثة فقط',
      'Increase font size': 'تكبير الخط',
      'Decrease font size': 'تصغير الخط',
      'Code font size': 'حجم خط الكود',
      'Used for code blocks, inline code, and tool output':
        'يُستخدم لكتل الكود والكود المضمّن ومخرجات الأدوات',
      'Increase code font size': 'تكبير خط الكود',
      'Decrease code font size': 'تصغير خط الكود',
      'Terminal font size': 'حجم خط الطرفية',
      'Used for the sidebar terminal': 'يُستخدم لطرفية الشريط الجانبي',
      'Increase terminal font size': 'تكبير خط الطرفية',
      'Decrease terminal font size': 'تصغير خط الطرفية',
      'Text font': 'خط النصوص',
      'Code font': 'خط الكود',
      'Terminal font': 'خط الطرفية',
      'More font settings': 'المزيد من إعدادات الخط',

      // --- permission -------------------------------------------------------
      Permission: 'الصلاحيات',
      'Choose the default permission mode for new sessions':
        'اختر وضع الصلاحيات الافتراضي للجلسات الجديدة',
      Unavailable: 'غير متاح',
      'Read Only': 'قراءة فقط',
      'Workspace Write': 'كتابة في مساحة العمل',
      'Full access': 'وصول كامل',
      'Enable Full access?': 'تفعيل الوصول الكامل؟',
      'I understand the risks and want to continue': 'أتفهم المخاطر وأريد المتابعة',
      'Enable Full access': 'تفعيل الوصول الكامل',

      // --- chat / work details ---------------------------------------------
      Chat: 'المحادثة',
      'Work details': 'تفاصيل العمل',
      'Choose how much detail to show for tool calls':
        'اختر مقدار التفاصيل المعروضة لاستدعاءات الأدوات',
      'When to Collapse Work Details': 'وقت طيّ تفاصيل العمل',
      'Choose when to automatically collapse work details':
        'اختر متى تُطوى تفاصيل العمل تلقائيًا',
      'On completion': 'عند الاكتمال',
      'On next message': 'عند الرسالة التالية',
      'Replies After Collapse': 'الردود بعد الطيّ',
      'Choose which assistant replies stay visible when work details collapse':
        'اختر أي ردود للمساعد تبقى ظاهرة عند طيّ تفاصيل العمل',
      'All replies': 'كل الردود',
      'Final answer only': 'الإجابة النهائية فقط',
      Compact: 'مضغوط',
      Standard: 'قياسي',
      Detailed: 'تفصيلي',
      Verbose: 'مطوّل',
      'Performance & usage': 'الأداء والاستخدام',
      'Choose how much performance and usage information to show':
        'اختر مقدار معلومات الأداء والاستخدام المعروضة',
      'Open chat links in': 'فتح روابط المحادثة في',
      'Choose where to open web links': 'اختر مكان فتح روابط الويب',
      'In-App Sidebar': 'الشريط الجانبي داخل التطبيق',
      'Default Browser': 'المتصفح الافتراضي',
      'Back to bottom': 'العودة إلى الأسفل',
      'Load earlier': 'تحميل الأقدم',
      'Deep diving': 'تعمّق',
      'Session statistics': 'إحصاءات الجلسة',
      'Token usage': 'استخدام الرموز',
      'LLM time': 'زمن النموذج',
      'Tool time': 'زمن الأدوات',
      'Turn usage': 'استخدام الدور',
      'Context compacted': 'تم ضغط السياق',
      'View full image': 'عرض الصورة كاملة',
      'Image preview': 'معاينة الصورة',
      'Close image preview': 'إغلاق معاينة الصورة',
      'Image preview unavailable': 'معاينة الصورة غير متاحة',
      'System prompt': 'موجّه النظام',
      'Context injection': 'حقن السياق',
      'Session recall': 'استدعاء الجلسة',
      Blocked: 'محظور',
      Completed: 'اكتمل',
      Failed: 'فشل',
      Stopped: 'متوقف',
      Think: 'تفكير',
      Running: 'يعمل',
      'Command failed': 'فشل الأمر',
      'Command': 'أمر',
      'API key is invalid': 'مفتاح API غير صالح',
      'Task stopped': 'أُوقفت المهمة',
      'This turn failed': 'فشل هذا الدور',
      'Output token limit reached': 'تم بلوغ حد رموز المخرجات',
      'Cache hit': 'إصابة الذاكرة المؤقتة',
      'Cached input': 'إدخال مخزّن',
      'Uncached input': 'إدخال غير مخزّن',
      'Cache write': 'كتابة في الذاكرة المؤقتة',
      Output: 'المخرجات',
      'Provider / model': 'المزوّد / النموذج',
      'Retrying model request': 'إعادة محاولة طلب النموذج',

      // step process
      'Analyzing the request': 'تحليل الطلب',
      'Reading files': 'قراءة الملفات',
      'Reading images': 'قراءة الصور',
      'Writing files': 'كتابة الملفات',
      'Searching code': 'البحث في الكود',
      'Editing files': 'تعديل الملفات',
      'Running commands': 'تنفيذ الأوامر',
      'Running code': 'تشغيل الكود',
      'Searching the web': 'البحث في الويب',
      'Visiting web pages': 'زيارة صفحات الويب',
      'Coordinating subagents': 'تنسيق الوكلاء الفرعيين',
      'Updating the plan': 'تحديث الخطة',
      'Waiting for your action': 'بانتظار إجراء منك',
      'Calling tools': 'استدعاء الأدوات',
      'Preparing to read files': 'التحضير لقراءة الملفات',
      'Preparing to read images': 'التحضير لقراءة الصور',
      'Preparing to write files': 'التحضير لكتابة الملفات',
      'Preparing to search code': 'التحضير للبحث في الكود',
      'Preparing to edit files': 'التحضير لتعديل الملفات',
      'Preparing to run commands': 'التحضير لتنفيذ الأوامر',
      'Preparing to run code': 'التحضير لتشغيل الكود',
      'Preparing to search the web': 'التحضير للبحث في الويب',
      'Preparing to visit web pages': 'التحضير لزيارة صفحات الويب',
      'Preparing to coordinate subagents': 'التحضير لتنسيق الوكلاء الفرعيين',
      'Preparing to update the plan': 'التحضير لتحديث الخطة',
      'Preparing questions': 'التحضير للأسئلة',
      'Preparing tool calls': 'التحضير لاستدعاءات الأدوات',
      'Analysis completed': 'اكتمل التحليل',
      'Read files': 'قُرئت الملفات',
      'Read images': 'قُرئت الصور',
      'Wrote files': 'كُتبت الملفات',
      'Searched code': 'تم البحث في الكود',
      'Edited files': 'عُدّلت الملفات',
      'Ran commands': 'نُفّذت الأوامر',
      'Ran code': 'شُغّل الكود',
      'Searched the web': 'تم البحث في الويب',
      'Visited web pages': 'تمت زيارة صفحات الويب',
      'Coordinated subagents': 'تم تنسيق الوكلاء الفرعيين',
      'Updated the plan': 'حُدّثت الخطة',
      'Asked questions': 'طُرحت الأسئلة',
      'Called tools': 'استُدعيت الأدوات',

      // --- models / account -------------------------------------------------
      'Add model provider': 'إضافة مزوّد نماذج',
      'API key': 'مفتاح API',
      'API key configured': 'مفتاح API مُهيّأ',
      'API key missing': 'مفتاح API مفقود',
      'Signed in': 'مسجّل الدخول',
      Provider: 'المزوّد',
      Apply: 'تطبيق',
      'Base URL': 'عنوان URL الأساسي',
      Model: 'النموذج',
      'Model ID': 'معرّف النموذج',
      'Display name': 'الاسم المعروض',
      'Context window': 'نافذة السياق',
      'Max output tokens': 'أقصى عدد رموز للمخرجات',
      'Show secret': 'إظهار السر',
      'Hide secret': 'إخفاء السر',
      'Enter your API key': 'أدخل مفتاح API',
      'Reasoning levels': 'مستويات التفكير',
      Level: 'المستوى',
      'Add model': 'إضافة نموذج',
      'Add level': 'إضافة مستوى',
      'Delete level': 'حذف المستوى',
      Text: 'نص',
      Image: 'صورة',
      'Fetch available models': 'جلب النماذج المتاحة',
      'Search models': 'بحث في النماذج',
      'Select all': 'تحديد الكل',
      'Deselect all': 'إلغاء تحديد الكل',
      Continue: 'متابعة',
      'Choose models': 'اختيار النماذج',
      'Update list': 'تحديث القائمة',
      Create: 'إنشاء',
      'Create provider': 'إنشاء مزوّد',
      'Restore defaults': 'استعادة الافتراضيات',

      // --- plugins ----------------------------------------------------------
      'Install, enable, and configure plugins': 'تثبيت الإضافات وتفعيلها وتهيئتها',
      'About plugins': 'حول الإضافات',
      Refresh: 'تحديث',
      'No plugins are installed yet.': 'لا توجد إضافات مثبّتة بعد.',
      'Add plugin': 'إضافة إضافة',
      'Install a third-party plugin': 'تثبيت إضافة طرف ثالث',
      'Installed plugins': 'الإضافات المثبّتة',
      'Built-in plugin settings': 'إعدادات الإضافات المدمجة',
      'Experimental plugins': 'إضافات تجريبية',
      Installed: 'مثبّتة',
      Problem: 'مشكلة',
      Experimental: 'تجريبية',
      Components: 'المكوّنات',
      Source: 'المصدر',
      'Code source': 'مصدر الكود',
      'Current version': 'الإصدار الحالي',
      Uninstall: 'إلغاء التثبيت',
      Install: 'تثبيت',
      'Update available': 'يتوفر تحديث',
      'Not installed': 'غير مثبّتة',
      'Built in': 'مدمجة',
      Details: 'التفاصيل',
      'Back to plugins': 'رجوع إلى الإضافات',
      Off: 'متوقف',
      Reason: 'السبب',
      Versions: 'الإصدارات',
      'Check again': 'إعادة الفحص',
      'Up to date': 'محدّث',
      'Enable now': 'تفعيل الآن',
      'Cancel install': 'إلغاء التثبيت',
      'Not running': 'لا يعمل',
      Unloading: 'جارٍ الإلغاء',
      'Waiting for dependencies': 'بانتظار التبعيات',
      Registry: 'المستودع',
      'Default registry': 'المستودع الافتراضي',
      'Registry': 'المستودع',
      'Installation cancelled': 'أُلغي التثبيت',

      // --- workspace / sessions --------------------------------------------
      Workspace: 'مساحة العمل',
      'New workspace': 'مساحة عمل جديدة',
      'Add workspace': 'إضافة مساحة عمل',
      'Choose workspace': 'اختيار مساحة العمل',
      'Working directory': 'دليل العمل',
      Session: 'الجلسة',
      Sessions: 'الجلسات',
      'New session': 'جلسة جديدة',
      'New Session': 'جلسة جديدة',
      'Default workspace': 'مساحة العمل الافتراضية',
      'Search sessions': 'بحث في الجلسات',
      'Delete workspace': 'حذف مساحة العمل',
      'Confirmed': 'مؤكّد',
      Confirmation: 'تأكيد',

      // --- sidebar / workspace browser -------------------------------------
      Workspaces: 'مساحات العمل',
      'Automation tasks': 'مهام الأتمتة',
      'Creator mode': 'وضع الإنشاء',
      Ungrouped: 'غير مجمّعة',
      'Show {count} more sessions': 'عرض {count} جلسة أخرى',
      'Show {count} more session': 'عرض {count} جلسة أخرى',
      'Show {count} more': 'عرض {count} المزيد',
      'New session': 'جلسة جديدة',
      Preview: 'معاينة',
      Search: 'بحث',
      'Search sessions': 'بحث في الجلسات',

      // --- account card -----------------------------------------------------
      'Signed in to DeepSeek': 'مسجّل الدخول إلى DeepSeek',
      'More account information': 'مزيد من معلومات الحساب',
      'Account details are not available yet.': 'تفاصيل الحساب غير متاحة بعد.',
      'Topped-up balance': 'الرصيد المشحون',
      'Granted balance': 'الرصيد الممنوح',
      'Top up': 'شحن',
      'View usage': 'عرض الاستخدام',

      // --- composer and reasoning ------------------------------------------
      'Describe what you want to build, / commands, @ files or sessions':
        'صف ما تريد بناءه، أو استخدم / للأوامر و@ للملفات أو الجلسات',
      'Send behavior while busy': 'سلوك الإرسال أثناء الانشغال',
      'What Enter and the Send button do while the agent is running; Cmd/Ctrl+Enter uses the other behavior':
        'ما يفعله مفتاح Enter وزر الإرسال أثناء تشغيل الوكيل؛ وCmd/Ctrl+Enter يستخدم السلوك الآخر',
      Queue: 'قائمة الانتظار',
      Steer: 'توجيه',
      High: 'عالي',
      Medium: 'متوسط',
      Low: 'منخفض',
      Off: 'متوقف',

      // --- privacy / misc ---------------------------------------------------
      'Upload Session Log when using the official model API':
        'رفع سجل الجلسة عند استخدام واجهة النموذج الرسمية',
      'Help improve DeepSeek models and products': 'ساعد في تحسين نماذج ومنتجات DeepSeek',
      'Version {version}': 'الإصدار {version}',
      'Current version: {version}': 'الإصدار الحالي: {version}',

      // --- command menu (slash / plus) --------------------------------------
      Commands: 'الأوامر',
      Goal: 'الهدف',
      Plan: 'الخطة',
      Feedback: 'الملاحظات',
      Export: 'تصدير',
      File: 'ملف',
      'Set or view the goal for a long-running task':
        'حدّد هدفًا لمهمة طويلة أو اعرض الهدف الحالي',
      'Enter or leave plan mode': 'الدخول إلى وضع الخطة أو الخروج منه',
      'Record feedback about this session': 'تسجيل ملاحظات حول هذه الجلسة',
      'Compact older conversation history': 'ضغط سجل المحادثة الأقدم',
      'Switch the permission preset (sandbox mode + approval policy)':
        'تبديل إعداد الصلاحيات المسبق (وضع العزل + سياسة الموافقة)',
      'Select the model for this conversation': 'اختيار النموذج لهذه المحادثة',
      'Download this Session log as a ZIP archive':
        'تنزيل سجل هذه الجلسة كأرشيف ZIP',
      'Message or run a task, / commands, @ files or sessions':
        'اكتب رسالة أو نفّذ مهمة، أو / للأوامر و@ للملفات أو الجلسات',
      'No matching commands': 'لا توجد أوامر مطابقة',
      'Search commands': 'بحث في الأوامر',
      'Filter options': 'تصفية الخيارات',
      'No options': 'لا توجد خيارات',
      Applying: 'جارٍ التطبيق',
      '/{command} options': 'خيارات /{command}',
      '/{command} matches': 'مطابقات /{command}',
      '/{command} does not accept attachments; remove them first':
        '/{command} لا يقبل المرفقات؛ أزلها أولًا',
    };

    /** Minimal explicit dictionary used only when the runtime scan is unavailable. */
    const FALLBACK_COMMON = {
      ok: 'موافق',
      cancel: 'إلغاء',
      close: 'إغلاق',
      copy: 'نسخ',
      copied: 'تم النسخ',
      retry: 'إعادة المحاولة',
      loading: 'جارٍ التحميل…',
      'load.failed': 'تعذّر التحميل',
      submit: 'إرسال',
      submitting: 'جارٍ الإرسال…',
      next: 'التالي',
      previous: 'السابق',
      skip: 'تخطٍّ',
      delete: 'حذف',
      edit: 'تعديل',
      save: 'حفظ',
      search: 'بحث',
      more: 'المزيد',
      collapse: 'طيّ',
      expand: 'توسيع',
      back: 'رجوع',
      unknown: 'غير معروف',
      none: 'لا شيء',
      truncated: 'مقتطع',
    };

    /**
     * Translate every known English string in every registered namespace and
     * register the result for `ar`. Namespaces that already have an `ar`
     * dictionary are left alone, so repeated scans are harmless.
     * @param ctx - client context carrying the locale service.
     * @returns number of namespaces that received a dictionary.
     */
    function translateAllNamespaces(ctx) {
      const dicts = ctx.locale && ctx.locale.dicts;
      if (!(dicts instanceof Map)) return 0;
      let touched = 0;
      for (const [ns, locales] of dicts) {
        try {
          if (!locales || typeof locales.get !== 'function') continue;
          if (locales.has('ar')) continue;
          const en = locales.get('en');
          if (!en) continue;
          const ar = {};
          for (const key of Object.keys(en)) {
            const arabic = AR[en[key]];
            if (typeof arabic === 'string') ar[key] = arabic;
          }
          if (Object.keys(ar).length === 0) continue;
          ctx.locale.register(ns, 'ar', ar);
          touched += 1;
        } catch (error) {
          console.warn('[dsh-arabic-locale] namespace skipped:', String(ns), error);
        }
      }
      return touched;
    }

    return {
      inject: ['locale'],
      apply(ctx) {
        // 1. Make Arabic selectable. Already-registered is harmless.
        try {
          ctx.locale.addLanguage({ id: 'ar', label: 'العربية', fallback: 'en' });
        } catch (error) {
          if (!/already registered|occupied/i.test(String(error && error.message))) {
            console.warn('[dsh-arabic-locale] addLanguage failed:', error);
          }
        }

        // 2. Contribute dictionaries for every namespace already registered.
        const touched = translateAllNamespaces(ctx);
        if (touched === 0) {
          // Runtime scan unavailable: still ship the core vocabulary.
          try {
            ctx.locale.register('common', 'ar', FALLBACK_COMMON);
          } catch (error) {
            console.warn('[dsh-arabic-locale] fallback register failed:', error);
          }
        }

        // 3. Late registrations (other plugins activating after us) are covered
        //    by a throttled re-scan on every locale revision change.
        let pending = null;
        const schedule = () => {
          if (pending !== null) return;
          pending = setTimeout(() => {
            pending = null;
            translateAllNamespaces(ctx);
          }, 120);
        };
        ctx.effect(() => {
          const unsubscribe = ctx.locale.subscribe(schedule);
          return () => {
            unsubscribe();
            if (pending !== null) {
              clearTimeout(pending);
              pending = null;
            }
          };
        });
      },
    };
  },
});
