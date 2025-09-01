import { Msg } from "../shared/@types";
import { getConfig } from "../shared/storage";
import { hh } from "./hh";
import { bitrix } from "./bitrix";
import { arrayBufferToBase64 } from "../shared/utils";
import { extension } from "mime-types";

const PAGE_SIZE = 50;

chrome.runtime.onMessage.addListener((msg: Msg, _sender, sendResponse) => {
  (async () => {
    const cfg = await getConfig();

    if (msg?.type === "HH_GET_PERSON_RESUME") {
      const { data } = await hh.get(`/resumes/${msg.resumeId}`);

      sendResponse({
        ok: true,
        data,
      });
    }

    if (msg?.type === "HH_GET_MY_EMPLOYER_INFO") {
      const { data } = await hh.get(`/employers/${cfg.HH_EMPLOYER_ID}`);
      sendResponse({
        ok: true,
        data,
      });
    }

    if (msg?.type === "HH_GET_ME") {
      const { data } = await hh.get(`/me`);

      sendResponse({
        ok: true,
        data,
      });
    }

    if (msg?.type === "HH_GET_RESUME_FILE_BY_URL") {
      const { data } = await hh.get(msg.fileUrl, {
        responseType: "arraybuffer",
      });

      const base64 = await arrayBufferToBase64(data);

      sendResponse({ ok: true, data: base64 });
    }

    if (msg?.type === "HH_GET_PERSON_PHOTO_BY_URL") {
      try {
        // обрабатываем 404 ошибку так как может не быть фото
        const { data, headers } = await hh.get(msg.fileUrl, {
          responseType: "arraybuffer",
        });

        const mime = headers["content-type"]?.split(";")[0] || undefined;
        let ext = undefined;
        if (mime) {
          ext = extension(mime) || undefined;
        }
        const base64 = await arrayBufferToBase64(data, mime);

        sendResponse({ ok: true, data: { base64, ext } });
      } catch (e) {
        sendResponse({ ok: true, data: null });
      }
    }

    if (msg?.type === "BITRIX_GET_CONTACT_FIELDS") {
      const { data } = await bitrix.post(`/crm.contact.fields`);
      sendResponse({ ok: true, data });
    }

    if (msg?.type === "BITRIX_GET_CRM_STATUS_LIST") {
      const { data } = await bitrix.post(`/crm.status.list`, {
        filter: {
          ENTITY_ID: "CONTACT_TYPE",
        },
      });
      sendResponse({ ok: true, data });
    }

    if (msg?.type === "BITRIX_GET_CONTACT_BY_HH_ID") {
      const { data } = await bitrix.post(`/crm.contact.list`, {
        filter: {
          [msg.contactIdKey]: msg.contactIdValue,
        },
        select: ["*", "UF_*"],
      });

      sendResponse({ ok: true, data });
    }

    if (msg?.type === "BITRIX_GET_CRM_DEAL_FIELDS") {
      const { data } = await bitrix.post(`/crm.deal.fields`);
      sendResponse({ ok: true, data });
    }

    if (msg?.type === "BITRIX_GET_DEAL_LIST") {
      const { data } = await bitrix.post(`/crm.deal.list`, {
        filter: msg.filter,
        select: ["UF_*"],
      });

      sendResponse({ ok: true, data });
    }

    if (msg?.type === "BITRIX_ADD_DEAL") {
      const { data } = await bitrix.post(`/crm.deal.add`, {
        FIELDS: msg.fields,
      });

      sendResponse({ ok: true, data });
    }

    if (msg?.type === "BITRIX_ADD_CONTACT") {
      const { data } = await bitrix.post(`/crm.contact.add`, {
        FIELDS: msg.fields,
      });

      sendResponse({ ok: true, data });
    }

    if (msg?.type === "BITRIX_GET_VACANCIES") {
      const query = msg?.query;
      const { data } = await bitrix.post(`/crm.item.list`, {
        entityTypeId: cfg.B24_VACANCIES_ENTITY_TYPE_ID,
        select: ["id", "title"],
        start: msg.page * PAGE_SIZE,
        ...(query ? { filter: { title: "%" + query + "%" } } : {}),
      });
      sendResponse({ ok: true, data });
    }

    if (msg?.type === "BITRIX_GET_RECRUITERS") {
      const query = msg?.query;
      const { data } = await bitrix.get(`/user.get`, {
        params: {
          UF_DEPARTMENT: cfg.B24_RECRUITERS_DEPARTMENT,
          start: msg.page * PAGE_SIZE,
          SORT: "NAME",
          ORDER: "ASC",
          ACTIVE: true,
          ...(query ? { NAME_SEARCH: "%" + query + "%" } : {}),
        },
      });
      sendResponse({ ok: true, data });
    }

    sendResponse({ ok: false, error: "unknown_command" });
  })().catch((err) => {
    console.log(err);
    return sendResponse({ ok: false, error: String(err) });
  });

  return true; // async
});
