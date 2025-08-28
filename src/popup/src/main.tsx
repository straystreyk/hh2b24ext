import ReactDOM from "react-dom/client";
import AppPopup from "./AppPopup.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const rootEl = document.getElementById("root")!;
const root = ReactDOM.createRoot(rootEl);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

root.render(
  <QueryClientProvider client={queryClient}>
    <AppPopup />
  </QueryClientProvider>,
);
