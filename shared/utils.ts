import { getConfig } from "./storage";

export async function arrayBufferToBase64(
  ab: ArrayBuffer,
  mime: string = "application/pdf",
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    try {
      const blob = new Blob([ab], { type: mime });
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("Unexpected FileReader result type"));
          return;
        }
        // берём часть после "data:<mime>;base64,"
        const base64 = result.split(",")[1] ?? "";
        resolve(base64);
      };

      reader.onerror = () =>
        reject(reader.error ?? new Error("FileReader error"));
      reader.readAsDataURL(blob);
    } catch (err) {
      reject(err);
    }
  });
}

export const createDealLink = async (id: string) => {
  const { B24_BASE_URL } = await getConfig();

  const url = new URL(B24_BASE_URL).origin + `/crm/deal/details/${id}/`;

  return url;
};
