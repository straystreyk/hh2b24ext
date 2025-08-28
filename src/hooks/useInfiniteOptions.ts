import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type Option = { label: string; value: string };

export type LoaderResult = {
  options: Option[];
  hasMore: boolean; // есть ли следующая страница
};

export type Loader = (page: number) => Promise<LoaderResult>;

export function useInfiniteOptions(loader: Loader) {
  const [options, setOptions] = useState<Option[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [err, setErr] = useState<string>();
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingRef = useRef(false);

  const loadPage = useCallback(
    async (nextPage: number, isFirst = false) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      isFirst ? setIsInitialLoading(true) : setIsLoadingMore(true);
      setErr(undefined);

      try {
        const { options: newOptions, hasMore } = await loader(nextPage);
        setOptions((prev) => (isFirst ? newOptions : [...prev, ...newOptions]));
        setPage(nextPage);
        setHasMore(hasMore);
      } catch (e: any) {
        setErr(String(e));
      } finally {
        isFirst ? setIsInitialLoading(false) : setIsLoadingMore(false);
        loadingRef.current = false;
      }
    },
    [loader],
  );

  useEffect(() => {
    loadPage(0, true);
  }, [loadPage]);

  const handlePopupScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const nearBottom =
        target.scrollTop + target.clientHeight >= target.scrollHeight - 32;
      if (nearBottom && hasMore && !isLoadingMore && !isInitialLoading) {
        loadPage(page + 1);
      }
    },
    [hasMore, isLoadingMore, isInitialLoading, loadPage, page],
  );

  const isLoadingAny = useMemo(
    () => isInitialLoading || isLoadingMore,
    [isInitialLoading, isLoadingMore],
  );

  return {
    options,
    page,
    hasMore,
    err,
    isInitialLoading,
    isLoadingMore,
    isLoadingAny,
    loadPage,
    handlePopupScroll,
    reload: () => loadPage(0, true),
  };
}
