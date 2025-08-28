import { useState } from "react";
import { ModalForm } from "./ModalForm.tsx";
import { Button, Modal } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const [open, setOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <Modal
        centered
        destroyOnHidden
        title="Отправка в B24"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
      >
        <ModalForm />
      </Modal>
      <Button
        type="primary"
        className="__hh_to_b24_ext__send-btn"
        onClick={() => setOpen(true)}
      >
        Добавить Кандидата в B24
      </Button>
    </QueryClientProvider>
  );
}

export default App;
