import debounce from "lodash.debounce";
import { Form, Select, Alert, Spin, Button, notification } from "antd";
import { useVacanciesInfinite, useRecruitersInfinite } from "./queries";
import { mapVacancyOptions, mapRecruiterOptions } from "./mappers";
import { type UIEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { HhResumeResponse, Msg } from "../../../shared/@types";
import { getConfig } from "../../../shared/storage.ts";
import { createDealLink } from "../../../shared/utils.ts";

/** UI */
const PAGE_BOTTOM_GAP = 32;

/** Contact dynamic field labels */
const CONTACT_ADDRESS_FIELD_LABEL = "Адрес";
const CONTACT_SB_FIELD_LABEL = "Блок СБ";
const CONTACT_HH_ID_FIELD_LABEL = "ID пользователя HH";

/** Deal dynamic field labels */
const DEAL_DYNAMIC_FULL_NAME_FILTER_LABEL = "ФИО";
const DEAL_DYNAMIC_BIRTH_DATE_FILTER_LABEL = "Дата рождения";
const DEAL_DYNAMIC_PHONE_FILTER_LABEL = "Телефон";
const DEAL_DYNAMIC_EMAIL_FILTER_LABEL = "Email";
const DEAL_DYNAMIC_ADDRESS_FILTER_LABEL = "Адрес";
const DEAL_DYNAMIC_VACANCY_FILTER_LABEL = "Вакансия";
const DEAL_DYNAMIC_RESUME_LINK_FILTER_LABEL = "Ссылка на резюме";
const DEAL_DYNAMIC_HH_REAL_ID_FILTER_LABEL = "ID пользователя HH";
const DEAL_DYNAMIC_HH_RESUME_ID_FILTER_LABEL = "ID резюме";
const DEAL_DYNAMIC_RECRUTER_FILTER_LABEL = "Рекрутер";
const DEAL_DYNAMIC_RESUME_FILE_FILTER_LABEL = "Файл резюме";

/** ===== Utils / helpers (без изменения бизнес-логики) ===== */

type ChromeOk<T> = { data: T; ok: true };
type ChromeFail = { ok: false; error?: string; data?: any };
type ChromeResp<T> = ChromeOk<T> | ChromeFail;

async function request<T = any>(msg: Msg): Promise<ChromeResp<T>> {
  // единая точка вызова chrome.runtime.sendMessage с типами
  return chrome.runtime.sendMessage<Msg, ChromeResp<T>>(msg);
}

function ensureOk<T>(resp: ChromeResp<T>, errMsg: string): ChromeOk<T> {
  if (!resp?.ok)
    throw new Error(
      `${errMsg}${resp && "error" in resp && resp.error ? ` – ${resp.error}` : ""}`,
    );

  return resp as ChromeOk<T>;
}

const isBlockedBySB = (value: unknown) =>
  value === "1" || value === 1 || value === "Y";

const joinFullName = (
  last?: string | null,
  first?: string | null,
  middle?: string | null,
) => `${last || ""} ${first || ""} ${middle || ""}`.trim();

type DynamicFieldEntry = [string, any];

function pickDynamicEntriesByLabel(
  fields: Record<string, any>,
  labels: string[],
): Array<{ key: string; value: any; filterLabel: string; title?: string }> {
  return Object.entries(fields)
    .filter(
      ([, field]) =>
        field?.isDynamic === true && labels.includes(field?.filterLabel),
    )
    .map(([key, field]) => ({
      key,
      value: field,
      filterLabel: field.filterLabel,
      title: field.title,
    }));
}

function getNearBottomHandler(
  hasNext?: boolean,
  fetching?: boolean,
  fetchMore?: () => void,
) {
  return (e: UIEvent<HTMLDivElement>) => {
    const t = e.currentTarget;
    const nearBottom =
      t.scrollTop + t.clientHeight >= t.scrollHeight - PAGE_BOTTOM_GAP;
    if (nearBottom && hasNext && !fetching) fetchMore?.();
  };
}

/** ===== Основной компонент ===== */

export function ModalForm() {
  const [form] = Form.useForm();
  const [api, notifyContext] = notification.useNotification();

  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [recQuery, setRecQuery] = useState("");
  const [vacQuery, setVacQuery] = useState("");

  /** Стабильные debounced-сеттеры + отмена при размонтировании */
  const debouncedReqQuery = useMemo(() => debounce(setRecQuery, 300), []);
  const debouncedVacQuery = useMemo(() => debounce(setVacQuery, 300), []);
  useEffect(() => {
    return () => {
      debouncedReqQuery.cancel();
      debouncedVacQuery.cancel();
    };
  }, [debouncedReqQuery, debouncedVacQuery]);

  /** Инфинити-хуки */
  const vac = useVacanciesInfinite({ query: vacQuery });
  const rec = useRecruitersInfinite({ query: recQuery });

  /** Опции селектов (мемо, чтобы не пересчитывать лишний раз) */
  const vacancyOptions = useMemo(
    () => mapVacancyOptions(vac.data?.pages ?? []),
    [vac.data?.pages],
  );
  const recruiterOptions = useMemo(
    () => mapRecruiterOptions(rec.data?.pages ?? []),
    [rec.data?.pages],
  );

  /** Общая фабрика он-скролла (useCallback для стабильности) */
  const onVacScroll = useCallback(
    getNearBottomHandler(vac.hasNextPage, vac.isFetchingNextPage, () =>
      vac.fetchNextPage(),
    ),
    [vac.hasNextPage, vac.isFetchingNextPage, vac.fetchNextPage],
  );
  const onRecScroll = useCallback(
    getNearBottomHandler(rec.hasNextPage, rec.isFetchingNextPage, () =>
      rec.fetchNextPage(),
    ),
    [rec.hasNextPage, rec.isFetchingNextPage, rec.fetchNextPage],
  );

  /** ====== Запросы HH/B24 (как есть, только компактнее через helpers) ====== */

  const getResumeFileBase64 = async (resumeDownloadUrl: string) => {
    const fileResp = await request<string>({
      type: "HH_GET_RESUME_FILE_BY_URL",
      fileUrl: resumeDownloadUrl,
    });
    return ensureOk(fileResp, "Не удалось выгрузить файл резюме").data;
  };

  const getPersonResume = async (resumeId: string) => {
    const resp = await request<HhResumeResponse>({
      type: "HH_GET_PERSON_RESUME",
      resumeId,
    });

    return ensureOk(resp, "Ошибка при получении резюме").data;
  };

  const getContactFields = async () => {
    const resp = await request<{ result: Record<string, any> }>({
      type: "BITRIX_GET_CONTACT_FIELDS",
    });
    return ensureOk(resp, "Ошибка при получении полей контакта").data.result;
  };

  const getCrmStatusList = async () => {
    const resp = await request<{ result: any[] }>({
      type: "BITRIX_GET_CRM_STATUS_LIST",
    });
    return ensureOk(resp, "Ошибка при получении списка статусов").data.result;
  };

  const getCrmDealFields = async () => {
    const resp = await request<{ result: Record<string, any> }>({
      type: "BITRIX_GET_CRM_DEAL_FIELDS",
    });
    return ensureOk(
      resp,
      "Не удалось получить список полей для создания сделки",
    ).data.result;
  };

  const getContactByHhId = async (key: string, value: string | number) => {
    const resp = await request<{ result?: any[] }>({
      type: "BITRIX_GET_CONTACT_BY_HH_ID",
      contactIdKey: key,
      contactIdValue: String(value),
    });
    return ensureOk(resp, "Не удалось проверить наличие контакта в Bitrix24")
      .data.result?.[0];
  };

  const getDealsByContact = async (contactId: string | number) => {
    const resp = await request<{ result: any[] }>({
      type: "BITRIX_GET_DEAL_LIST",
      filter: { CONTACT_ID: contactId },
    });
    return ensureOk(resp, "Ошибка при нахождении сделок контакта").data.result;
  };

  const addContact = async (fields: Record<string, any>) => {
    const resp = await request<{ result: number }>({
      type: "BITRIX_ADD_CONTACT",
      fields,
    });

    return ensureOk(resp, "Не удалось создать контакт").data;
  };

  /** ====== Сборка полей сделки (логика 1:1) ====== */
  const buildDealFields = ({
    crmFields,
    resumeData,
    formValues,
    contactId,
  }: {
    crmFields: Record<string, any>;
    resumeData: HhResumeResponse;
    formValues: { vacancy: string; recruiter: string; resumeBase64: string };
    contactId: string;
  }) => {
    const {
      id: apiResumeId,
      birth_date,
      area,
      real_id,
      alternate_url,
      last_name,
      first_name,
      middle_name,
      contact,
    } = resumeData;
    const { vacancy, recruiter, resumeBase64 } = formValues;

    const phone = contact.find((i) => i.kind === "phone");
    const email = contact.find((i) => i.kind === "email");
    const fullName = joinFullName(last_name, first_name, middle_name);

    const dynamicCrmEntries: DynamicFieldEntry[] = Object.entries(
      crmFields,
    ).filter(([, field]) => field?.isDynamic === true);

    const fieldValueByLabel: Record<string, any> = {
      [DEAL_DYNAMIC_FULL_NAME_FILTER_LABEL]: fullName,
      [DEAL_DYNAMIC_BIRTH_DATE_FILTER_LABEL]: birth_date,
      [DEAL_DYNAMIC_PHONE_FILTER_LABEL]: phone?.contact_value || "",
      [DEAL_DYNAMIC_EMAIL_FILTER_LABEL]: email?.contact_value || "",
      [DEAL_DYNAMIC_ADDRESS_FILTER_LABEL]: area?.name || "",
      [DEAL_DYNAMIC_VACANCY_FILTER_LABEL]: vacancy,
      [DEAL_DYNAMIC_RESUME_LINK_FILTER_LABEL]: alternate_url,
      [DEAL_DYNAMIC_HH_REAL_ID_FILTER_LABEL]: real_id,
      [DEAL_DYNAMIC_HH_RESUME_ID_FILTER_LABEL]: apiResumeId,
      [DEAL_DYNAMIC_RECRUTER_FILTER_LABEL]: recruiter,
      [DEAL_DYNAMIC_RESUME_FILE_FILTER_LABEL]: {
        fileData: [`${fullName}.pdf`, resumeBase64],
      },
    };

    const dealFormFields = dynamicCrmEntries.reduce<Record<string, any>>(
      (acc, [key, field]) => {
        const label = field?.filterLabel as string | undefined;
        if (!label) return acc;
        if (label in fieldValueByLabel) acc[key] = fieldValueByLabel[label];
        return acc;
      },
      {},
    );

    dealFormFields.CONTACT_IDS = [contactId];
    return dealFormFields;
  };

  /** ====== Создание сделки (с сохранением поведения и сообщений) ====== */
  const createDeal = async ({
    crmFields,
    resumeData,
    formValues,
    contactId,
  }: {
    crmFields: Record<string, any>;
    resumeData: HhResumeResponse;
    formValues: { vacancy: string; recruiter: string; resumeBase64: string };
    contactId: string;
  }) => {
    const dealFormFields = buildDealFields({
      crmFields,
      resumeData,
      formValues,
      contactId,
    });
    const { B24_BASE_URL, B24_RESUME_CATEGORY_ID } = await getConfig();

    if (!B24_RESUME_CATEGORY_ID || !B24_BASE_URL)
      throw new Error("Вы не передали ID воронки в настройках");

    dealFormFields.CATEGORY_ID = Number(B24_RESUME_CATEGORY_ID);

    const addDealResp = await request<{ result: string }>({
      type: "BITRIX_ADD_DEAL",
      fields: dealFormFields,
    });

    const dealId = ensureOk(addDealResp, "Не удалось создать сделку").data
      .result;

    const dealUrl = await createDealLink(dealId);

    setSuccess(
      `Сделка успшено создана. Ссылка на сделку – <a rel="noreferrer nofollow noopener" href=${dealUrl} target="_blank">${dealUrl}</a>`,
    );
  };

  /** ====== Сабмит формы (не меняет логику, только выпрямляет код) ====== */
  const onSubmit = async (values: { recruiter: string; vacancy: string }) => {
    const { recruiter, vacancy } = values;

    try {
      setErr(null);
      setSuccess(null);
      setIsLoading(true);

      const resumeId =
        location.pathname.match(/\/resume\/([^/]+)/)?.[1] ?? null;
      if (!resumeId) throw new Error("Не удалось получить ID страницы");

      const resume = await getPersonResume(resumeId);

      const contactFields = await getContactFields();
      const dynamicContactFields = pickDynamicEntriesByLabel(contactFields, [
        CONTACT_ADDRESS_FIELD_LABEL,
        CONTACT_SB_FIELD_LABEL,
        CONTACT_HH_ID_FIELD_LABEL,
      ]);

      const addressField = dynamicContactFields.find(
        (d) => d.filterLabel === CONTACT_ADDRESS_FIELD_LABEL,
      );
      const sbField = dynamicContactFields.find(
        (d) => d.filterLabel === CONTACT_SB_FIELD_LABEL,
      );
      const hhIdField = dynamicContactFields.find(
        (d) => d.filterLabel === CONTACT_HH_ID_FIELD_LABEL,
      );

      if (!hhIdField || !sbField || !addressField) {
        throw new Error(
          "Не удалось получить хотя бы одно из полей контакта - hhIdField, sbField,addressField",
        );
      }

      const {
        last_name,
        middle_name,
        first_name,
        birth_date,
        contact = [],
        area,
        real_id,
        download: {
          pdf: { url: resumeDownloadUrl },
        },
      } = resume;

      /** Проверяем существование контакта по HH ID */
      const existsContact = await getContactByHhId(hhIdField.key, real_id);

      if (existsContact) {
        if (!sbField?.key)
          throw new Error(
            "Не найден ключ для поиска поля СБ (Службы безопасности)",
          );

        const sbFieldValue = existsContact[sbField.key];

        if (isBlockedBySB(sbFieldValue))
          throw new Error("Кандидат заблокирован СБ");

        /** Поля сделок + ключ поля Вакансия */
        const crmDealFields = await getCrmDealFields();
        const dynamicVacancyEntry = Object.entries(crmDealFields).find(
          ([, field]) =>
            field?.isDynamic === true &&
            field?.filterLabel === DEAL_DYNAMIC_VACANCY_FILTER_LABEL,
        );

        if (!dynamicVacancyEntry)
          throw new Error("Не удалось найти поле Вакансия в сделках");

        const dynamicVacancyNameKey = dynamicVacancyEntry[0];

        /** Проверяем существующие сделки по контакту и совпадение вакансии */
        const contactDeals = await getDealsByContact(existsContact.ID);
        const foundedDeal = contactDeals.find(
          (d: any) => d?.[dynamicVacancyNameKey]?.trim() === vacancy.trim(),
        );

        if (foundedDeal) {
          const dealLink = await createDealLink(foundedDeal.ID);
          throw new Error(
            `Кандидат уже откликался на вакансию. Ссылка на вакансию – <a rel="noreferrer nofollow noopener" href=${dealLink} target="_blank">${dealLink}</a>`,
          );
        }

        /** Скачиваем резюме и создаём сделку */
        const resumeBase64 = await getResumeFileBase64(resumeDownloadUrl);

        await createDeal({
          contactId: existsContact.ID,
          formValues: { resumeBase64, vacancy, recruiter },
          resumeData: resume,
          crmFields: crmDealFields,
        });
      } else {
        /** Если контакта нет — создаём */
        const crmStatuses = await getCrmStatusList();
        const phone = contact.find((i) => i.kind === "phone");
        const email = contact.find((i) => i.kind === "email");

        const typeCandidate = crmStatuses.find(
          (i: any) => i.NAME.trim() === "Соискатель",
        );

        const TYPE_ID =
          typeCandidate?.STATUS_ID ?? crmStatuses?.[0]?.STATUS_ID ?? undefined;

        const contactToCreate = {
          NAME: first_name || "",
          SECOND_NAME: middle_name || "",
          LAST_NAME: last_name || "",
          BIRTHDATE: birth_date || "",
          PHONE: [{ VALUE: phone?.contact_value || "", VALUE_TYPE: "MOBILE" }],
          EMAIL: [{ VALUE: email?.contact_value || "", VALUE_TYPE: "WORK" }],
          ...(TYPE_ID ? { TYPE_ID } : {}),
          ...(addressField ? { [addressField.key]: area?.name || "" } : {}),
          ...(hhIdField ? { [hhIdField.key]: real_id } : {}),
          ...(sbField ? { [sbField.key]: "N" } : {}),
        };

        const createdContactId = await addContact(contactToCreate);

        const resumeBase64 = await getResumeFileBase64(resumeDownloadUrl);
        const crmDealFields = await getCrmDealFields();

        await createDeal({
          contactId: String(createdContactId.result),
          formValues: { resumeBase64, vacancy, recruiter },
          resumeData: resume,
          crmFields: crmDealFields,
        });
      }

      api.success({ message: "Успешно отправлено в B24", placement: "top" });
      form.resetFields();
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
    } finally {
      setIsLoading(false);
    }
  };

  /** ====== UI ====== */
  return (
    <Form
      style={{ display: "flex", flexDirection: "column" }}
      form={form}
      layout="vertical"
      initialValues={{ vacancy: undefined, recruiter: undefined }}
      onFinish={onSubmit}
      disabled={isLoading}
    >
      {success && (
        <Alert
          type="success"
          message={<div dangerouslySetInnerHTML={{ __html: success }} />}
          showIcon
        />
      )}
      {err && (
        <Alert
          type="error"
          message={<div dangerouslySetInnerHTML={{ __html: String(err) }} />}
          showIcon
        />
      )}
      {vac.error && <Alert type="error" message={String(vac.error)} showIcon />}
      {rec.error && <Alert type="error" message={String(rec.error)} showIcon />}

      <Form.Item
        label="Вакансия"
        name="vacancy"
        rules={[{ required: true, message: "Выберите вакансию" }]}
        validateTrigger={["onChange", "onBlur"]}
      >
        <Select
          showSearch
          allowClear
          filterOption={false}
          onSearch={debouncedVacQuery}
          placeholder="Выберите вакансию"
          options={vacancyOptions}
          loading={vac.isFetching || vac.isFetchingNextPage}
          onPopupScroll={onVacScroll}
          notFoundContent={vac.isFetching ? <Spin size="small" /> : undefined}
          popupRender={(menu) => (
            <div>
              {menu}
              {vac.hasNextPage && (
                <div style={{ padding: 8, textAlign: "center" }}>
                  {vac.isFetchingNextPage ? (
                    <Spin size="small" />
                  ) : (
                    "Прокрутите ниже для загрузки ещё"
                  )}
                </div>
              )}
            </div>
          )}
        />
      </Form.Item>

      <Form.Item
        label="Рекрутер"
        name="recruiter"
        rules={[{ required: true, message: "Выберите рекрутера" }]}
        validateTrigger={["onChange", "onBlur"]}
      >
        <Select
          showSearch
          allowClear
          onSearch={debouncedReqQuery}
          filterOption={false}
          placeholder="Выберите рекрутера"
          options={recruiterOptions}
          loading={rec.isFetching || rec.isFetchingNextPage}
          onPopupScroll={onRecScroll}
          notFoundContent={rec.isFetching ? <Spin size="small" /> : undefined}
          popupRender={(menu) => (
            <div>
              {menu}
              {rec.hasNextPage && (
                <div style={{ padding: 8, textAlign: "center" }}>
                  {rec.isFetchingNextPage ? (
                    <Spin size="small" />
                  ) : (
                    "Прокрутите ниже для загрузки ещё"
                  )}
                </div>
              )}
            </div>
          )}
        />
      </Form.Item>

      <Form.Item style={{ marginTop: 24 }}>
        <Button
          loading={isLoading}
          type="primary"
          htmlType="submit"
          size="large"
        >
          Отправить
        </Button>
      </Form.Item>

      {notifyContext}
    </Form>
  );
}
