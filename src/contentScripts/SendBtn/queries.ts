// queries.ts
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Msg } from "../../../shared/@types";

/** Вакансии: data.result.items[], total = data.result.total */
export function useVacanciesInfinite(props: { query?: string } = {}) {
  return useInfiniteQuery({
    queryKey: ["vacancies", props],
    initialPageParam: 0,
    staleTime: 0,
    queryFn: async ({ pageParam }) => {
      const res = await chrome.runtime.sendMessage<Msg>({
        type: "BITRIX_GET_VACANCIES",
        page: pageParam,
        query: props.query,
      });

      if (!res?.ok) throw new Error(res?.error ?? "Ошибка запроса");

      return res.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      const total = Number(
        allPages[0]?.result?.total ?? lastPage?.result?.total ?? 0,
      );
      const loaded = allPages.reduce(
        (acc, p) => acc + (p?.result?.items?.length ?? 0),
        0,
      );
      return loaded < total ? allPages.length : undefined; // следующая страница = индекс страниц
    },
  });
}

export function useRecruitersInfinite(props: { query?: string } = {}) {
  return useInfiniteQuery({
    queryKey: ["recruiters", props],
    initialPageParam: 0,
    staleTime: 0,
    queryFn: async ({ pageParam }) => {
      const res = await chrome.runtime.sendMessage<Msg>({
        type: "BITRIX_GET_RECRUITERS",
        page: pageParam,
        query: props.query,
      });

      if (!res?.ok) throw new Error(res?.error ?? "Ошибка запроса");

      return res.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      const total = Number(allPages[0]?.total ?? lastPage?.total ?? 0);
      const loaded = allPages.reduce(
        (acc, p) => acc + (p?.result?.length ?? 0),
        0,
      );
      return loaded < total ? allPages.length : undefined;
    },
  });
}
