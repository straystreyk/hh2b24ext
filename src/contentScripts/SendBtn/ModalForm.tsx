import debounce from "lodash.debounce";
import { Form, Select, Alert, Spin, Button, notification } from "antd";
import { useVacanciesInfinite, useRecruitersInfinite } from "./queries";
import { mapVacancyOptions, mapRecruiterOptions } from "./mappers";
import { type UIEvent, useMemo, useState } from "react";
import type { HhResumeResponse, Msg } from "../../../shared/@types";
import { getConfig } from "../../../shared/storage.ts";
import { createDealLink } from "../../../shared/utils.ts";

const PAGE_BOTTOM_GAP = 32;
const CONTACT_ADDRESS_FIELD_LABEL = "Адрес";
const CONTACT_SB_FIELD_LABEL = "Блок СБ";
const CONTACT_HH_ID_FIELD_LABEL = "ID пользователя HH";

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

export function ModalForm() {
  const [form] = Form.useForm();
  const [api, notifyContext] = notification.useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [recQuery, setRecQuery] = useState("");
  const [vacQuery, setVacQuery] = useState("");

  const debouncedReqQuery = useMemo(() => debounce(setRecQuery, 300), []);
  const debouncedVacQuery = useMemo(() => debounce(setVacQuery, 300), []);

  const vac = useVacanciesInfinite({ query: vacQuery });
  const rec = useRecruitersInfinite({ query: recQuery });

  const vacancyOptions = mapVacancyOptions(vac.data?.pages ?? []);
  const recruiterOptions = mapRecruiterOptions(rec.data?.pages ?? []);

  const onScrollFactory =
    (hasNext?: boolean, fetching?: boolean, fetchMore?: () => void) =>
    (e: UIEvent<HTMLDivElement>) => {
      const t = e.currentTarget;
      const nearBottom =
        t.scrollTop + t.clientHeight >= t.scrollHeight - PAGE_BOTTOM_GAP;
      if (nearBottom && hasNext && !fetching) fetchMore?.();
    };

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

    const dynamicCrmFields = Object.entries(crmFields).filter(
      ([_, field]) => field.isDynamic === true,
    );

    const phone = contact.find((i) => i.kind === "phone");
    const email = contact.find((i) => i.kind === "email");

    const fullName = (
      (last_name || "") +
      " " +
      (first_name || "") +
      " " +
      (middle_name || "")
    ).trim();

    // формируем поля для создания сделки
    const dealFormFields: Record<string, any> = dynamicCrmFields.reduce(
      (prev, next) => {
        const key = next[0];
        const values = next[1];

        if (values.filterLabel === DEAL_DYNAMIC_FULL_NAME_FILTER_LABEL)
          return {
            ...prev,
            [key]: fullName,
          };

        if (values.filterLabel === DEAL_DYNAMIC_BIRTH_DATE_FILTER_LABEL)
          return { ...prev, [key]: birth_date };

        if (values.filterLabel === DEAL_DYNAMIC_PHONE_FILTER_LABEL)
          return { ...prev, [key]: phone?.contact_value || "" };

        if (values.filterLabel === DEAL_DYNAMIC_EMAIL_FILTER_LABEL)
          return { ...prev, [key]: email?.contact_value || "" };

        if (values.filterLabel === DEAL_DYNAMIC_ADDRESS_FILTER_LABEL)
          return { ...prev, [key]: area?.name || "" };

        if (values.filterLabel === DEAL_DYNAMIC_VACANCY_FILTER_LABEL)
          return { ...prev, [key]: vacancy };

        if (values.filterLabel === DEAL_DYNAMIC_RESUME_LINK_FILTER_LABEL)
          return { ...prev, [key]: alternate_url };

        if (values.filterLabel === DEAL_DYNAMIC_HH_REAL_ID_FILTER_LABEL)
          return { ...prev, [key]: real_id };

        if (values.filterLabel === DEAL_DYNAMIC_HH_RESUME_ID_FILTER_LABEL)
          return { ...prev, [key]: apiResumeId };

        if (values.filterLabel === DEAL_DYNAMIC_RECRUTER_FILTER_LABEL)
          return { ...prev, [key]: recruiter };

        if (values.filterLabel === DEAL_DYNAMIC_RESUME_FILE_FILTER_LABEL)
          return {
            ...prev,
            [key]: { fileData: [`${fullName}.pdf`, resumeBase64] },
          };

        return prev;
      },
      {},
    );

    const { B24_BASE_URL, B24_RESUME_CATEGORY_ID } = await getConfig();

    if (!B24_RESUME_CATEGORY_ID || !B24_BASE_URL)
      return setErr("Вы не передали ID воронки в настройках");

    dealFormFields.CATEGORY_ID = Number(B24_RESUME_CATEGORY_ID);
    dealFormFields.CONTACT_IDS = [contactId];
    const data = await chrome.runtime.sendMessage<Msg>({
      type: "BITRIX_ADD_DEAL",
      fields: dealFormFields,
    });

    const dealUrl = await createDealLink(data.data.result);
    setSuccess(
      `Сделка успшено создана. Ссылка на сделку – <a rel="noreferrer nofollow noopener" href=${dealUrl} target="_blank">${dealUrl}</a>`,
    );
  };

  const getResume = async (resumeDownloadUrl: string) => {
    // скачиваем резюме пользователя
    const hhBase64File = await chrome.runtime.sendMessage<Msg>({
      type: "HH_GET_RESUME_FILE_BY_URL",
      fileUrl: resumeDownloadUrl,
    });

    return hhBase64File;
  };

  const onSubmit = async (values: { recruiter: string; vacancy: string }) => {
    const { recruiter, vacancy } = values;

    try {
      setErr(null);
      setSuccess(null);
      setIsLoading(true);

      const resumeId =
        location.pathname.match(/\/resume\/([^/]+)/)?.[1] ?? null;

      if (!resumeId) return setErr("Не удалось получить ID страницы");

      const data = await chrome.runtime.sendMessage<
        Msg,
        { data: HhResumeResponse; ok: boolean; error?: string }
      >({
        type: "HH_GET_PERSON_RESUME",
        resumeId,
      });

      if (!data?.ok)
        return setErr(`Ошибка при получении резюме – ${data?.error}`);

      // получаем доп поля
      const contactFields = await chrome.runtime.sendMessage<
        Msg,
        { data: { result: Record<string, any> }; ok: boolean; error?: string }
      >({
        type: "BITRIX_GET_CONTACT_FIELDS",
      });

      if (!contactFields?.ok)
        return setErr(
          `Ошибка при получении полей контакта – ${contactFields?.error}`,
        );

      // Получаем ключи и значения динамических полей с нужными filterLabel
      const dynamicContactFields = Object.entries(contactFields.data.result)
        .filter(
          ([_, field]) =>
            field.isDynamic === true &&
            (field.filterLabel === CONTACT_ADDRESS_FIELD_LABEL ||
              field.filterLabel === CONTACT_SB_FIELD_LABEL ||
              field.filterLabel === CONTACT_HH_ID_FIELD_LABEL),
        )
        .map(([key, field]) => ({
          key: key,
          value: field,
          filterLabel: field.filterLabel,
          title: field.title,
        }));

      const addressField = dynamicContactFields.find(
        (d) => d.filterLabel === CONTACT_ADDRESS_FIELD_LABEL,
      );
      const sbField = dynamicContactFields.find(
        (d) => d.filterLabel === CONTACT_SB_FIELD_LABEL,
      );
      const hhIdField = dynamicContactFields.find(
        (d) => d.filterLabel === CONTACT_HH_ID_FIELD_LABEL,
      );

      if (!hhIdField || !sbField || !addressField)
        return setErr(
          "Не удалось получить хотя бы одно из полей контакта - hhIdField, sbField,addressField",
        );

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
      } = data.data;

      const contactExistsResponse = await chrome.runtime.sendMessage<Msg>({
        type: "BITRIX_GET_CONTACT_BY_HH_ID",
        contactIdKey: hhIdField.key,
        contactIdValue: real_id,
      });

      if (!contactExistsResponse.ok)
        return setErr("Не удалось проверить наличие контакта в Bitrix24");

      const existsContact = contactExistsResponse.data?.result?.[0];

      if (!!existsContact) {
        // START если контакт есть уже в битриксе

        if (!sbField?.key)
          return setErr(
            "Не найден ключ для поиска поля СБ (Службы безопасности)",
          );

        const sbFieldValue = existsContact[sbField.key];

        if (
          sbFieldValue === "1" ||
          sbFieldValue === 1 ||
          sbFieldValue === "Y"
        ) {
          return setErr("Кандидат заблокирован СБ");
        }

        // получаем поля сделок
        const crmFieldsResponse = await chrome.runtime.sendMessage<
          Msg,
          { data: { result: Record<string, any> }; ok: boolean; error?: string }
        >({
          type: "BITRIX_GET_CRM_DEAL_FIELDS",
        });

        const dymanicVacancyName = Object.entries(
          crmFieldsResponse.data.result,
        ).filter(
          ([_, field]) =>
            field.isDynamic === true &&
            field.filterLabel === DEAL_DYNAMIC_VACANCY_FILTER_LABEL,
        );

        if (!dymanicVacancyName)
          return setErr("Не удалось найти поле Вакансия в сделках");

        const dynamicVacancyNameKey = dymanicVacancyName[0][0];

        const contactDealResponse = await chrome.runtime.sendMessage<Msg>({
          type: "BITRIX_GET_DEAL_LIST",
          filter: {
            CONTACT_ID: existsContact.ID,
          },
        });

        if (!contactDealResponse.ok)
          return setErr("Ошибка при нахождении сделок контакта");

        const foundedDeal = contactDealResponse.data?.result?.find((i: any) => {
          return (
            i[dynamicVacancyNameKey] &&
            i[dynamicVacancyNameKey].trim() === vacancy.trim()
          );
        });

        if (!!foundedDeal) {
          const dealLink = await createDealLink(foundedDeal.ID);

          return setErr(
            `Кандидат уже откликался на вакансию. – <a rel="noreferrer nofollow noopener" href=${dealLink} target="_blank">${dealLink}</a>`,
          );
        }

        // скачиваем резюме пользователя
        const hhBase64File = await getResume(resumeDownloadUrl);

        if (!hhBase64File?.ok)
          return setErr("Не удалось выгрузить файл резюме");

        // скаченное резюме в формате base64
        const resumeBase64 = hhBase64File.data;

        await createDeal({
          contactId: existsContact.ID,
          formValues: { resumeBase64, vacancy, recruiter },
          resumeData: data.data,
          crmFields: crmFieldsResponse.data.result,
        });
        // END!!
      } else {
        // если контакта нет создаем его
        // получаем доп поля
        const crmContactStatusesList = await chrome.runtime.sendMessage<Msg>({
          type: "BITRIX_GET_CRM_STATUS_LIST",
        });

        if (!crmContactStatusesList?.ok)
          return setErr(
            `Ошибка при получении списка статусов – ${crmContactStatusesList?.error}`,
          );

        const phone = contact.find((i) => i.kind === "phone");
        const email = contact.find((i) => i.kind === "email");

        const findedType = crmContactStatusesList.data.result.find(
          (i: any) => i.NAME === "Соискатель",
        );

        const TYPE_ID = findedType
          ? findedType.STATUS_ID
          : crmContactStatusesList.data.result?.[0]?.STATUS_ID || undefined;

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

        // создаем контакт
        const createdContactResponse = await chrome.runtime.sendMessage<Msg>({
          type: "BITRIX_ADD_CONTACT",
          fields: contactToCreate,
        });

        if (!createdContactResponse?.ok)
          return setErr("Не удалось создать контакт");

        // id новосоздонного контакта
        const createdContactId = createdContactResponse.data.result;

        // скачиваем резюме пользователя
        const hhBase64File = await getResume(resumeDownloadUrl);

        if (!hhBase64File?.ok)
          return setErr("Не удалось выгрузить файл резюме");

        // скаченное резюме в формате base64
        const resumeBase64 = hhBase64File.data;

        // получаем поля для создания сделки
        const crmFieldsResponse = await chrome.runtime.sendMessage<
          Msg,
          { data: { result: Record<string, any> }; ok: boolean; error?: string }
        >({
          type: "BITRIX_GET_CRM_DEAL_FIELDS",
        });

        if (!crmFieldsResponse.ok)
          return setErr("Не удалось получить список полей для создания сделки");

        await createDeal({
          contactId: createdContactId,
          formValues: { resumeBase64, vacancy, recruiter },
          resumeData: data.data,
          crmFields: crmFieldsResponse.data.result,
        });
      }

      api.success({ message: "Успешно отправлено в B24", placement: "top" });
      form.resetFields();
    } catch (e) {
      setErr(String(e));
    } finally {
      setIsLoading(false);
    }
  };

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
          onPopupScroll={onScrollFactory(
            vac.hasNextPage,
            vac.isFetchingNextPage,
            () => vac.fetchNextPage(),
          )}
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
          onPopupScroll={onScrollFactory(
            rec.hasNextPage,
            rec.isFetchingNextPage,
            () => rec.fetchNextPage(),
          )}
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
