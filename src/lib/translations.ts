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
