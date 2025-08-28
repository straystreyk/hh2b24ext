import {
  type UndefinedInitialDataOptions,
  useQuery,
} from "@tanstack/react-query";
import type { Msg } from "../../../shared/@types";

const useGetMe = (
  opts?: Omit<
    UndefinedInitialDataOptions<any, Error, any, string[]>,
    "queryFn" | "queryKey"
  >,
) => {
  const result = useQuery({
    ...opts,
    queryKey: ["hh-get-me"],
    queryFn: async () => {
      const response = await chrome.runtime.sendMessage<Msg>({
        type: "HH_GET_ME",
      });

      return response;
    },
  });

  return result;
};

export { useGetMe };
