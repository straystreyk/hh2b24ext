export type Msg =
  | {
      type: "HH_GET_PERSON_RESUME";
      resumeId: string;
    }
  | {
      type: "HH_GET_MY_EMPLOYER_INFO";
    }
  | {
      type: "HH_GET_ME";
    }
  | {
      type: "HH_GET_RESUME_FILE_BY_URL";
      fileUrl: string;
    }
  | {
      type: "HH_GET_PERSON_PHOTO_BY_URL";
      fileUrl: string;
    }
  | {
      type: "BITRIX_GET_VACANCIES";
      page: number;
      query?: string;
    }
  | {
      type: "BITRIX_GET_CONTACT_FIELDS";
    }
  | {
      type: "BITRIX_GET_CRM_STATUS_LIST";
    }
  | {
      type: "BITRIX_GET_CRM_DEAL_FIELDS";
    }
  | {
      type: "BITRIX_GET_DEAL_LIST";
      filter: Record<string, any>;
    }
  | {
      type: "BITRIX_GET_CONTACT_BY_HH_ID";
      contactIdKey: string;
      contactIdValue: string;
    }
  | {
      type: "BITRIX_ADD_CONTACT";
      fields: Record<string, any>;
    }
  | {
      type: "BITRIX_ADD_DEAL";
      fields: Record<string, any>;
    }
  | {
      type: "BITRIX_GET_RECRUITERS";
      page: number;
      query?: string;
    };

export type HHEmployerInfoOk = {
  /** Идентификатор работодателя */
  id: string;
  /** Название компании */
  name: string;

  /** API-ссылка на детальное описание работодателя */
  url: string;
  /** Публичная ссылка на страницу работодателя на hh.ru */
  alternate_url: string;

  /** Логотипы разных размеров; может быть null, если логотип не загружен */
  logo_urls: {
    /** ~90px по меньшей стороне */
    "90"?: string;
    /** ~240px по меньшей стороне */
    "240"?: string;
    /** Оригинальный файл (может быть большим) */
    original?: string;
  } | null;

  /** Ссылка на поисковую выдачу всех вакансий компании */
  vacancies_url?: string;
  /** Кол-во открытых вакансий у работодателя */
  open_vacancies?: number;

  /** Тип компании (ключ из /dictionaries -> employer_type, напр. "company", "agency" и т.п.) */
  type?: string;

  /** Признак «доверенный работодатель» */
  trusted?: boolean;

  /** Веб-сайт компании (если указан) */
  site_url?: string | null;
};

// ===== Базовые вспомогательные типы =====
type ISODateString = string; // 'YYYY-MM-DD'
type ISODateTimeString = string; // ISO8601
type Nullable<T> = T | null;

export interface HhId {
  id: string;
}

export interface HhDict extends HhId {
  name: string;
}

export interface HhDictUrl extends HhDict {
  url: string;
}

export interface HhLink {
  url: string;
}

// Иногда API возвращает "null-объект" (поля = null) или просто null
export type HhNullObject = { id: null; name?: null; url?: null } | null;

// ===== Узкоспециализированные словари =====
export interface HhLanguageLevel extends HhDict {} // { id:'c1'|'native'|..., name:string }
export interface HhDriverLicense extends HhId {
  name?: string;
} // { id:'A'|'B'|..., name?:string }
export interface HhTag extends HhId {} // Тег как объект с id

export interface HhPhoto {
  small?: string;
  medium?: string;
}

// ===== Образование =====
export interface HhEducationPrimary {
  name?: string | null; // ВУЗ/учреждение
  organization?: string | null; // Факультет/подразделение
  result?: string | null; // Степень/специальность
  year?: number | null;
}
export interface HhEducationAdditional {
  name?: string | null;
  organization?: string | null;
  result?: string | null;
  year?: number | null;
}
export interface HhEducation {
  level?: Nullable<HhDict>; // уровень образования
  primary?: HhEducationPrimary[]; // основное образование
  additional?: HhEducationAdditional[]; // доп. образование, курсы
}

// ===== Сертификаты / портфолио / рекомендации =====
export interface HhCertificate {
  title?: string | null;
  url?: string | null;
  achieved_at?: ISODateString | null;
  owner?: string | null;
  // API может расширяться:
  [key: string]: unknown;
}

export interface HhPortfolioItem {
  url: string;
  title?: string | null;
  description?: string | null;
  // иногда встречаются дополнительные поля
  [key: string]: unknown;
}

export interface HhRecommendation {
  name?: string | null;
  position?: string | null;
  organization?: string | null;
  contact?: string | null;
}

// ===== Контакты =====
export interface HhContact {
  type: HhDict; // { id:'phone'|'email'|..., name:string }
  value?: string | null; // может быть скрыт/замаскирован
  preferred?: boolean;
  contact_value: string | null;
  // доп. поля (например, comments) возможны
  [key: string]: unknown;
}

// ===== Опыт =====
export interface HhExperienceItem {
  company?: string | null;
  area?: Nullable<HhDictUrl>;
  position?: string | null;
  start?: string; // 'YYYY-MM' или ISO-дата
  end?: string | null; // null для текущего места
  description?: string | null; // возможен HTML
  industries?: HhDict[]; // отрасли компании
  employer?: { id?: string; name?: string } | null; // если связан с базой hh
  // API может добавлять поля:
  [key: string]: unknown;
}
export interface HhTotalExperience {
  months: number;
}

// ===== Переезд / форматы / графики =====
export interface HhRelocation {
  type?: Nullable<HhDict>; // { id:'possible'|'ready'|'no', name:string }
  areas?: HhDictUrl[]; // желаемые регионы
}
export type HhEmploymentForm = HhDict; // типы занятости
export type HhWorkFormat = HhDict; // форматы работы (офис/удалёнка/гибрид)
export type HhSchedule = HhDict; // графики работы

// ===== Загрузка резюме =====
export interface HhResumeDownload {
  pdf: { url: string };
}

// ===== Владелец резюме / действия / сервисы =====
export interface HhResumeOwner {
  id?: string;
  // частые поля (не гарантированы API):
  name?: string;
  url?: string;
  alternate_url?: string;
  has_photo?: boolean;
  [key: string]: unknown;
}

export interface HhPaidService {
  // структура сервиса отличается по типам, поэтому оставляем универсально:
  id?: string;
  name?: string;
  active?: boolean;
  expires_at?: ISODateTimeString;
  [key: string]: unknown;
}

export interface HhResumeActions {
  // часто это набор ссылок/флагов на доступные действия
  [action: string]: unknown;
}

// ===== Метро =====
export interface HhMetro {
  id: string;
  name: string;
  line?: HhDict;
  // иногда приходит цвет линии, координаты и т.п.
  [key: string]: unknown;
}

// ===== Статус поиска работы / история переговоров =====
export interface HhJobSearchStatus extends HhDict {
  changed_at: ISODateTimeString;
}
export interface HhNegotiationsHistory {
  // краткая агрегированная статистика
  [key: string]: unknown;
}

// ===== Основной ответ =====
export interface HhResumeResponse {
  // required
  alternate_url: string;
  id: string;
  title: string | null;

  certificate: HhCertificate[]; // required (>=0)
  created_at: ISODateTimeString; // required
  download: HhResumeDownload; // required
  education: HhEducation; // required
  hidden_fields: HhDict[]; // required (>=0)
  real_id: string; // required
  updated_at: ISODateTimeString; // required
  experience: HhExperienceItem[]; // required (>=0)
  business_trip_readiness: HhDict; // required
  citizenship: HhDictUrl[]; // required
  contact: HhContact[]; // required
  driver_license_types: HhDriverLicense[]; // required
  employments: HhDict[]; // required
  language: Array<{
    name: string;
    level: HhLanguageLevel;
    id?: string; // некоторым ответам встречается код языка
  }>; // required
  paid_services: HhPaidService[]; // required
  recommendation: HhRecommendation[]; // required
  relocation: HhRelocation; // required
  resume_locale: HhDict; // required
  schedules: HhSchedule[]; // required
  site: Array<{
    // required
    type?: HhDict; // тип профиля (github, behance, и т.п.)
    url: string;
    title?: string | null;
    [key: string]: unknown;
  }>;
  skill_set: string[]; // required
  travel_time: HhDict; // required
  work_ticket: HhDictUrl[]; // required
  actions: HhResumeActions; // required
  favorited: boolean; // required
  owner: HhResumeOwner; // required
  portfolio: HhPortfolioItem[]; // required

  // optional (могут отсутствовать; если приходят — типы ниже)
  employment_form?: HhEmploymentForm[]; // список типов занятости
  work_format?: HhWorkFormat[]; // форматы работы
  age?: number | null;
  area?: Nullable<HhDictUrl> | HhNullObject; // город
  can_view_full_info?: boolean | null;
  first_name?: string | null;
  gender?: Nullable<HhDict> | HhNullObject;
  last_name?: string | null;
  marked?: boolean; // default false на стороне API
  middle_name?: string | null;
  platform?: { id: string }; // источник размещения
  salary?: Nullable<{
    amount: number;
    currency: string; // 'RUR' | 'USD' | ...
    gross?: boolean;
  }>;
  total_experience?: Nullable<HhTotalExperience>;
  birth_date?: ISODateString | null;
  creds?:
    | HhNullObject
    | {
        // "креды" (вопросы/ответы) — структура может различаться
        [key: string]: unknown;
      };
  employment?: HhDict; // Deprecated
  has_vehicle?: boolean | null;
  metro?: Nullable<HhMetro>;
  professional_roles?: HhDict[] | null;
  tags?: HhTag[];
  view_without_contacts_reason?: string | null;
  contacts_open_until_date?: ISODateString | null;
  job_search_status?: HhJobSearchStatus; // требует with_job_search_status=true
  negotiations_history?: HhNegotiationsHistory;
  photo?: Nullable<HhPhoto>;
  schedule?: HhDict; // Deprecated

  // запасной «ловец» будущих полей
  [key: string]: unknown;
}
