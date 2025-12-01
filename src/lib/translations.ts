export const languages = {
  en: 'English',
  es: 'Español',
  it: 'Italiano',
  th: 'ไทย',
  vi: 'Tiếng Việt',
  ja: '日本語',
  ko: '한국어',
  fr: 'Français',
  de: 'Deutsch',
  fa: 'فارسی',
  pt: 'Português',
  zh: '中文'
} as const;

export type LanguageCode = keyof typeof languages;

export const translations = {
  en: {
    nav: {
      discoverRecipes: 'Discover Recipes',
      socialFeed: 'Social Feed',
      myRecipes: 'My Recipes',
      addRecipe: 'Add Recipe',
      mealPlanner: 'Meal Planner',
      groceryList: 'Grocery List',
      cart: 'Cart',
      blog: 'Blog',
      subscription: 'Subscription',
      faq: 'FAQ',
      settings: 'Settings'
    },
    settings: {
      title: 'Settings',
      profile: 'Profile Settings',
      account: 'Account Settings',
      preferences: 'Preferences',
      language: 'Language',
      languageDescription: 'Select your preferred language',
      timezone: 'Timezone',
      timezoneDescription: 'Select your timezone for accurate time display',
      saveChanges: 'Save Changes',
      saving: 'Saving...',
      changesSaved: 'Settings saved successfully!',
      errorSaving: 'Failed to save settings'
    },
    common: {
      cancel: 'Cancel',
      save: 'Save',
      edit: 'Edit',
      delete: 'Delete',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      loading: 'Loading...',
      search: 'Search',
      filter: 'Filter'
    }
  },
  es: {
    nav: {
      discoverRecipes: 'Descubrir Recetas',
      socialFeed: 'Red Social',
      myRecipes: 'Mis Recetas',
      addRecipe: 'Agregar Receta',
      mealPlanner: 'Planificador de Comidas',
      groceryList: 'Lista de Compras',
      cart: 'Carrito',
      blog: 'Blog',
      subscription: 'Suscripción',
      faq: 'Preguntas Frecuentes',
      settings: 'Configuración'
    },
    settings: {
      title: 'Configuración',
      profile: 'Configuración del Perfil',
      account: 'Configuración de la Cuenta',
      preferences: 'Preferencias',
      language: 'Idioma',
      languageDescription: 'Selecciona tu idioma preferido',
      timezone: 'Zona Horaria',
      timezoneDescription: 'Selecciona tu zona horaria para una visualización precisa',
      saveChanges: 'Guardar Cambios',
      saving: 'Guardando...',
      changesSaved: '¡Configuración guardada correctamente!',
      errorSaving: 'Error al guardar la configuración'
    },
    common: {
      cancel: 'Cancelar',
      save: 'Guardar',
      edit: 'Editar',
      delete: 'Eliminar',
      close: 'Cerrar',
      back: 'Atrás',
      next: 'Siguiente',
      loading: 'Cargando...',
      search: 'Buscar',
      filter: 'Filtrar'
    }
  },
  it: {
    nav: {
      discoverRecipes: 'Scopri Ricette',
      socialFeed: 'Feed Sociale',
      myRecipes: 'Le Mie Ricette',
      addRecipe: 'Aggiungi Ricetta',
      mealPlanner: 'Pianificatore Pasti',
      groceryList: 'Lista della Spesa',
      cart: 'Carrello',
      blog: 'Blog',
      subscription: 'Abbonamento',
      faq: 'Domande Frequenti',
      settings: 'Impostazioni'
    },
    settings: {
      title: 'Impostazioni',
      profile: 'Impostazioni Profilo',
      account: 'Impostazioni Account',
      preferences: 'Preferenze',
      language: 'Lingua',
      languageDescription: 'Seleziona la tua lingua preferita',
      timezone: 'Fuso Orario',
      timezoneDescription: 'Seleziona il tuo fuso orario per una visualizzazione accurata',
      saveChanges: 'Salva Modifiche',
      saving: 'Salvataggio...',
      changesSaved: 'Impostazioni salvate con successo!',
      errorSaving: 'Impossibile salvare le impostazioni'
    },
    common: {
      cancel: 'Annulla',
      save: 'Salva',
      edit: 'Modifica',
      delete: 'Elimina',
      close: 'Chiudi',
      back: 'Indietro',
      next: 'Avanti',
      loading: 'Caricamento...',
      search: 'Cerca',
      filter: 'Filtra'
    }
  },
  th: {
    nav: {
      discoverRecipes: 'ค้นพบสูตรอาหาร',
      socialFeed: 'ฟีดโซเชียล',
      myRecipes: 'สูตรอาหารของฉัน',
      addRecipe: 'เพิ่มสูตรอาหาร',
      mealPlanner: 'วางแผนมื้ออาหาร',
      groceryList: 'รายการซื้อของ',
      cart: 'ตะกร้า',
      blog: 'บล็อก',
      subscription: 'การสมัครสมาชิก',
      faq: 'คำถามที่พบบ่อย',
      settings: 'การตั้งค่า'
    },
    settings: {
      title: 'การตั้งค่า',
      profile: 'การตั้งค่าโปรไฟล์',
      account: 'การตั้งค่าบัญชี',
      preferences: 'ความชอบ',
      language: 'ภาษา',
      languageDescription: 'เลือกภาษาที่คุณต้องการ',
      timezone: 'เขตเวลา',
      timezoneDescription: 'เลือกเขตเวลาของคุณเพื่อการแสดงเวลาที่แม่นยำ',
      saveChanges: 'บันทึกการเปลี่ยนแปลง',
      saving: 'กำลังบันทึก...',
      changesSaved: 'บันทึกการตั้งค่าสำเร็จ!',
      errorSaving: 'ไม่สามารถบันทึกการตั้งค่าได้'
    },
    common: {
      cancel: 'ยกเลิก',
      save: 'บันทึก',
      edit: 'แก้ไข',
      delete: 'ลบ',
      close: 'ปิด',
      back: 'กลับ',
      next: 'ถัดไป',
      loading: 'กำลังโหลด...',
      search: 'ค้นหา',
      filter: 'กรอง'
    }
  },
  vi: {
    nav: {
      discoverRecipes: 'Khám Phá Công Thức',
      socialFeed: 'Bảng Tin',
      myRecipes: 'Công Thức Của Tôi',
      addRecipe: 'Thêm Công Thức',
      mealPlanner: 'Lập Kế Hoạch Bữa Ăn',
      groceryList: 'Danh Sách Mua Sắm',
      cart: 'Giỏ Hàng',
      blog: 'Blog',
      subscription: 'Đăng Ký',
      faq: 'Câu Hỏi Thường Gặp',
      settings: 'Cài Đặt'
    },
    settings: {
      title: 'Cài Đặt',
      profile: 'Cài Đặt Hồ Sơ',
      account: 'Cài Đặt Tài Khoản',
      preferences: 'Tùy Chọn',
      language: 'Ngôn Ngữ',
      languageDescription: 'Chọn ngôn ngữ ưa thích của bạn',
      timezone: 'Múi Giờ',
      timezoneDescription: 'Chọn múi giờ của bạn để hiển thị thời gian chính xác',
      saveChanges: 'Lưu Thay Đổi',
      saving: 'Đang Lưu...',
      changesSaved: 'Đã lưu cài đặt thành công!',
      errorSaving: 'Không thể lưu cài đặt'
    },
    common: {
      cancel: 'Hủy',
      save: 'Lưu',
      edit: 'Chỉnh Sửa',
      delete: 'Xóa',
      close: 'Đóng',
      back: 'Quay Lại',
      next: 'Tiếp Theo',
      loading: 'Đang Tải...',
      search: 'Tìm Kiếm',
      filter: 'Lọc'
    }
  },
  ja: {
    nav: {
      discoverRecipes: 'レシピを探す',
      socialFeed: 'ソーシャルフィード',
      myRecipes: '私のレシピ',
      addRecipe: 'レシピを追加',
      mealPlanner: '食事プランナー',
      groceryList: '買い物リスト',
      cart: 'カート',
      blog: 'ブログ',
      subscription: 'サブスクリプション',
      faq: 'よくある質問',
      settings: '設定'
    },
    settings: {
      title: '設定',
      profile: 'プロフィール設定',
      account: 'アカウント設定',
      preferences: '環境設定',
      language: '言語',
      languageDescription: '使用言語を選択してください',
      timezone: 'タイムゾーン',
      timezoneDescription: '正確な時刻表示のためにタイムゾーンを選択してください',
      saveChanges: '変更を保存',
      saving: '保存中...',
      changesSaved: '設定が正常に保存されました！',
      errorSaving: '設定の保存に失敗しました'
    },
    common: {
      cancel: 'キャンセル',
      save: '保存',
      edit: '編集',
      delete: '削除',
      close: '閉じる',
      back: '戻る',
      next: '次へ',
      loading: '読み込み中...',
      search: '検索',
      filter: 'フィルター'
    }
  },
  ko: {
    nav: {
      discoverRecipes: '레시피 발견',
      socialFeed: '소셜 피드',
      myRecipes: '내 레시피',
      addRecipe: '레시피 추가',
      mealPlanner: '식사 계획',
      groceryList: '장보기 목록',
      cart: '장바구니',
      blog: '블로그',
      subscription: '구독',
      faq: '자주 묻는 질문',
      settings: '설정'
    },
    settings: {
      title: '설정',
      profile: '프로필 설정',
      account: '계정 설정',
      preferences: '환경설정',
      language: '언어',
      languageDescription: '선호하는 언어를 선택하세요',
      timezone: '시간대',
      timezoneDescription: '정확한 시간 표시를 위해 시간대를 선택하세요',
      saveChanges: '변경사항 저장',
      saving: '저장 중...',
      changesSaved: '설정이 성공적으로 저장되었습니다!',
      errorSaving: '설정 저장에 실패했습니다'
    },
    common: {
      cancel: '취소',
      save: '저장',
      edit: '편집',
      delete: '삭제',
      close: '닫기',
      back: '뒤로',
      next: '다음',
      loading: '로딩 중...',
      search: '검색',
      filter: '필터'
    }
  },
  fr: {
    nav: {
      discoverRecipes: 'Découvrir des Recettes',
      socialFeed: 'Fil Social',
      myRecipes: 'Mes Recettes',
      addRecipe: 'Ajouter une Recette',
      mealPlanner: 'Planificateur de Repas',
      groceryList: 'Liste de Courses',
      cart: 'Panier',
      blog: 'Blog',
      subscription: 'Abonnement',
      faq: 'FAQ',
      settings: 'Paramètres'
    },
    settings: {
      title: 'Paramètres',
      profile: 'Paramètres du Profil',
      account: 'Paramètres du Compte',
      preferences: 'Préférences',
      language: 'Langue',
      languageDescription: 'Sélectionnez votre langue préférée',
      timezone: 'Fuseau Horaire',
      timezoneDescription: 'Sélectionnez votre fuseau horaire pour un affichage précis',
      saveChanges: 'Enregistrer les Modifications',
      saving: 'Enregistrement...',
      changesSaved: 'Paramètres enregistrés avec succès!',
      errorSaving: 'Échec de l\'enregistrement des paramètres'
    },
    common: {
      cancel: 'Annuler',
      save: 'Enregistrer',
      edit: 'Modifier',
      delete: 'Supprimer',
      close: 'Fermer',
      back: 'Retour',
      next: 'Suivant',
      loading: 'Chargement...',
      search: 'Rechercher',
      filter: 'Filtrer'
    }
  },
  de: {
    nav: {
      discoverRecipes: 'Rezepte Entdecken',
      socialFeed: 'Social Feed',
      myRecipes: 'Meine Rezepte',
      addRecipe: 'Rezept Hinzufügen',
      mealPlanner: 'Essensplaner',
      groceryList: 'Einkaufsliste',
      cart: 'Warenkorb',
      blog: 'Blog',
      subscription: 'Abonnement',
      faq: 'Häufig Gestellte Fragen',
      settings: 'Einstellungen'
    },
    settings: {
      title: 'Einstellungen',
      profile: 'Profileinstellungen',
      account: 'Kontoeinstellungen',
      preferences: 'Präferenzen',
      language: 'Sprache',
      languageDescription: 'Wählen Sie Ihre bevorzugte Sprache',
      timezone: 'Zeitzone',
      timezoneDescription: 'Wählen Sie Ihre Zeitzone für eine genaue Zeitanzeige',
      saveChanges: 'Änderungen Speichern',
      saving: 'Wird Gespeichert...',
      changesSaved: 'Einstellungen erfolgreich gespeichert!',
      errorSaving: 'Fehler beim Speichern der Einstellungen'
    },
    common: {
      cancel: 'Abbrechen',
      save: 'Speichern',
      edit: 'Bearbeiten',
      delete: 'Löschen',
      close: 'Schließen',
      back: 'Zurück',
      next: 'Weiter',
      loading: 'Lädt...',
      search: 'Suchen',
      filter: 'Filtern'
    }
  },
  fa: {
    nav: {
      discoverRecipes: 'کشف دستور پخت',
      socialFeed: 'فید اجتماعی',
      myRecipes: 'دستورهای من',
      addRecipe: 'افزودن دستور پخت',
      mealPlanner: 'برنامه ریز غذا',
      groceryList: 'لیست خرید',
      cart: 'سبد خرید',
      blog: 'بلاگ',
      subscription: 'اشتراک',
      faq: 'سوالات متداول',
      settings: 'تنظیمات'
    },
    settings: {
      title: 'تنظیمات',
      profile: 'تنظیمات پروفایل',
      account: 'تنظیمات حساب',
      preferences: 'ترجیحات',
      language: 'زبان',
      languageDescription: 'زبان مورد نظر خود را انتخاب کنید',
      timezone: 'منطقه زمانی',
      timezoneDescription: 'منطقه زمانی خود را برای نمایش دقیق زمان انتخاب کنید',
      saveChanges: 'ذخیره تغییرات',
      saving: 'در حال ذخیره...',
      changesSaved: 'تنظیمات با موفقیت ذخیره شد!',
      errorSaving: 'خطا در ذخیره تنظیمات'
    },
    common: {
      cancel: 'لغو',
      save: 'ذخیره',
      edit: 'ویرایش',
      delete: 'حذف',
      close: 'بستن',
      back: 'بازگشت',
      next: 'بعدی',
      loading: 'در حال بارگذاری...',
      search: 'جستجو',
      filter: 'فیلتر'
    }
  },
  pt: {
    nav: {
      discoverRecipes: 'Descobrir Receitas',
      socialFeed: 'Feed Social',
      myRecipes: 'Minhas Receitas',
      addRecipe: 'Adicionar Receita',
      mealPlanner: 'Planejador de Refeições',
      groceryList: 'Lista de Compras',
      cart: 'Carrinho',
      blog: 'Blog',
      subscription: 'Assinatura',
      faq: 'Perguntas Frequentes',
      settings: 'Configurações'
    },
    settings: {
      title: 'Configurações',
      profile: 'Configurações do Perfil',
      account: 'Configurações da Conta',
      preferences: 'Preferências',
      language: 'Idioma',
      languageDescription: 'Selecione seu idioma preferido',
      timezone: 'Fuso Horário',
      timezoneDescription: 'Selecione seu fuso horário para exibição precisa',
      saveChanges: 'Salvar Alterações',
      saving: 'Salvando...',
      changesSaved: 'Configurações salvas com sucesso!',
      errorSaving: 'Falha ao salvar configurações'
    },
    common: {
      cancel: 'Cancelar',
      save: 'Salvar',
      edit: 'Editar',
      delete: 'Excluir',
      close: 'Fechar',
      back: 'Voltar',
      next: 'Próximo',
      loading: 'Carregando...',
      search: 'Pesquisar',
      filter: 'Filtrar'
    }
  },
  zh: {
    nav: {
      discoverRecipes: '发现食谱',
      socialFeed: '社交动态',
      myRecipes: '我的食谱',
      addRecipe: '添加食谱',
      mealPlanner: '餐食计划',
      groceryList: '购物清单',
      cart: '购物车',
      blog: '博客',
      subscription: '订阅',
      faq: '常见问题',
      settings: '设置'
    },
    settings: {
      title: '设置',
      profile: '个人资料设置',
      account: '账户设置',
      preferences: '偏好设置',
      language: '语言',
      languageDescription: '选择您的首选语言',
      timezone: '时区',
      timezoneDescription: '选择您的时区以准确显示时间',
      saveChanges: '保存更改',
      saving: '保存中...',
      changesSaved: '设置保存成功！',
      errorSaving: '保存设置失败'
    },
    common: {
      cancel: '取消',
      save: '保存',
      edit: '编辑',
      delete: '删除',
      close: '关闭',
      back: '返回',
      next: '下一步',
      loading: '加载中...',
      search: '搜索',
      filter: '筛选'
    }
  }
} as const;

export const getTranslation = (lang: LanguageCode) => {
  return translations[lang] || translations.en;
};
