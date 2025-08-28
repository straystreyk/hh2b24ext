import { useEffect, useRef, useState } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  Space,
  Typography,
  Alert,
  Popconfirm,
  notification,
} from "antd";
import {
  getConfig,
  setConfig,
  resetConfig,
  type Config,
} from "../../../../shared/storage";

const { Title } = Typography;

const SettingsPage = () => {
  const [api, contextHolder] = notification.useNotification();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // храним "актуальные" значения из storage, чтобы понимать, есть ли несохранённые изменения
  const storedRef = useRef<Config | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const cfg = await getConfig();
        const { ...rest } = cfg || {};
        storedRef.current = rest;
        form.setFieldsValue(rest);
      } catch (e: any) {
        setError(e?.message || "Не удалось загрузить настройки");
      } finally {
        setLoading(false);
      }
    })();
  }, [form]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const values = (await form.validateFields()) as Config;
      await setConfig(values);
      // обновляем локальный "storage snapshot"
      storedRef.current = { ...(storedRef.current as Config), ...values };
      form.setFieldsValue(storedRef.current);
      api.success({ message: "Настройки сохранены" });
    } catch (e: any) {
      if (e?.errorFields) {
        api.warning({ message: "Проверьте правильность полей" });
      } else {
        api.error({
          message: e?.message || "Не удалось сохранить настройки",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    try {
      setResetting(true);
      await resetConfig();
      const { ...rest } = await getConfig();
      storedRef.current = rest;
      form.setFieldsValue(rest);
      api.success({
        message: "Настройки сброшены до дефолтных",
      });
    } catch (e: any) {
      api.error({
        message: e?.message || "Не удалось сбросить настройки",
      });
    } finally {
      setResetting(false);
    }
  };

  const handleRevertChanges = () => {
    if (!storedRef.current) return;
    form.setFieldsValue(storedRef.current);
    api.info({ message: "Изменения отменены" });
  };

  return (
    <Card
      title={
        <Title level={4} style={{ margin: 0 }}>
          Настройки интеграции
        </Title>
      }
      style={{ maxWidth: 720, margin: "0 auto" }}
    >
      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      {contextHolder}
      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        disabled={loading}
      >
        <Space direction="vertical" size={16} style={{ display: "flex" }}>
          <Card type="inner" title="HeadHunter">
            <Form.Item
              label="HH Client ID"
              name="HH_CLIENT_ID"
              rules={[{ required: true, message: "Укажите Client ID" }]}
            >
              <Input allowClear placeholder="L3OACR..." />
            </Form.Item>

            <Form.Item
              label="HH Client Secret"
              name="HH_CLIENT_SECRET"
              rules={[{ required: true, message: "Укажите Client Secret" }]}
            >
              <Input.Password allowClear placeholder="SFAV3F..." />
            </Form.Item>
            <Form.Item
              label="Employer ID"
              name="HH_EMPLOYER_ID"
              rules={[
                { required: true, message: "Укажите Employer ID" },
                { pattern: /^\d+$/, message: "Только цифры" },
              ]}
            >
              <Input allowClear placeholder="Напр.: 11423812" />
            </Form.Item>
          </Card>
          <Card type="inner" title="Bitrix24">
            <Form.Item
              label="Bitrix webhookURL"
              name="B24_BASE_URL"
              rules={[{ required: true, message: "Укажите webhookURL" }]}
            >
              <Input
                allowClear
                placeholder="Напр.: https://bitrix-new.informatic.ru/rest/1/grjlklajmgaay7o1"
              />
            </Form.Item>
            <Form.Item
              label="entityTypeID списка вакансий (ID списка в смарт-процессах)"
              name="B24_VACANCIES_ENTITY_TYPE_ID"
              rules={[
                { required: true, message: "Укажите entityTypeID" },
                { pattern: /^\d+$/, message: "Только цифры" },
              ]}
            >
              <Input allowClear placeholder="Напр.: 1038" />
            </Form.Item>
            <Form.Item
              label="Идентификатор категории с рекрутерами (Bitrix DEPARTMENT)"
              name="B24_RECRUITERS_DEPARTMENT"
              rules={[
                { required: true, message: "Укажите DEPARTMENT" },
                { pattern: /^\d+$/, message: "Только цифры" },
              ]}
            >
              <Input allowClear placeholder="Напр.: 1038" />
            </Form.Item>
            <Form.Item
              label="Идентификатор воронки для выгрузки резюме"
              name="B24_RESUME_CATEGORY_ID"
              rules={[
                { required: true, message: "Укажите ID воронки" },
                { pattern: /^\d+$/, message: "Только цифры" },
              ]}
            >
              <Input allowClear placeholder="Напр.: 3" />
            </Form.Item>
          </Card>
          <Space
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 8,
            }}
          >
            <Space>
              <Button
                onClick={handleRevertChanges}
                disabled={saving || resetting}
              >
                Отменить изменения
              </Button>
              <Popconfirm
                title="Сбросить настройки к дефолтным?"
                okText="Да"
                cancelText="Нет"
                onConfirm={handleResetToDefaults}
                disabled={saving || resetting}
              >
                <Button danger loading={resetting}>
                  Сбросить к дефолтам
                </Button>
              </Popconfirm>
            </Space>

            <Button type="primary" onClick={handleSave} loading={saving}>
              Сохранить
            </Button>
          </Space>
        </Space>
      </Form>
    </Card>
  );
};

export default SettingsPage;
