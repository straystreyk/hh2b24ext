import { useCallback, useEffect, useMemo, useState } from "react";
import type { HHEmployerInfoOk, Msg } from "../../../../shared/@types";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Divider,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
  Skeleton,
} from "antd";
import {
  ReloadOutlined,
  LinkOutlined,
  HomeOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";

const { Title, Text, Link } = Typography;

type Resp = { data?: HHEmployerInfoOk; error?: string };

const labelStyle: React.CSSProperties = {
  color: "rgba(0,0,0,.45)",
  minWidth: 120,
  flex: "0 0 120px",
};

const valueStyle: React.CSSProperties = {
  minWidth: 0,
  flex: "1 1 auto",
  fontWeight: 500,
  wordBreak: "break-word",
  whiteSpace: "normal",
};

function FieldRow({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <Text style={labelStyle}>{label}</Text>
      <div style={valueStyle}>{children}</div>
    </div>
  );
}

const MainPage = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<HHEmployerInfoOk | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    chrome.runtime.sendMessage<Msg>(
      { type: "HH_GET_MY_EMPLOYER_INFO" },
      (res: Resp) => {
        if (res?.data) {
          setData(res.data);
        } else {
          setData(null);
          setError(
            res?.error || "Не удалось получить данные. Проверьте токен HH.",
          );
        }
        setLoading(false);
      },
    );
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const logoSrc = useMemo(
    () => data?.logo_urls?.["240"] || data?.logo_urls?.original || undefined,
    [data],
  );

  // Скелетон до первой загрузки
  if (loading && !data) {
    return (
      <Card>
        <Space align="start" size={16} wrap>
          <Skeleton.Avatar active size={48} shape="square" />
          <div style={{ flex: 1, minWidth: 160 }}>
            <Skeleton active title paragraph={{ rows: 1, width: ["80%"] }} />
          </div>
        </Space>
        <Divider />
        <Row gutter={[12, 12]}>
          <Col span={12}>
            <Skeleton.Button active block />
          </Col>
          <Col span={12}>
            <Skeleton.Button active block />
          </Col>
        </Row>
        <Divider />
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
    );
  }

  if (!data) {
    return (
      <Alert
        type="error"
        showIcon
        message="Не удалось получить данные о компании"
        description={error}
        action={
          <Button size="small" onClick={fetchData} icon={<ReloadOutlined />}>
            Повторить
          </Button>
        }
      />
    );
  }

  return (
    <Card
      styles={{
        header: { paddingTop: 12, paddingBottom: 12 },
        body: { paddingTop: 16 },
      }}
      title={
        <Space size={12} align="center" wrap>
          {logoSrc ? (
            <Avatar shape="square" size={48} src={logoSrc} />
          ) : (
            <Avatar shape="square" size={48}>
              {data.name?.[0]?.toUpperCase() ?? "?"}
            </Avatar>
          )}
          <Title level={5} style={{ margin: 0 }}>
            {data.name}
          </Title>
          <Space size={8} wrap>
            {data.type && <Tag>{data.type}</Tag>}
            {data.trusted && (
              <Tag icon={<SafetyCertificateOutlined />} color="blue">
                trusted
              </Tag>
            )}
          </Space>
        </Space>
      }
      extra={
        <Button
          size="small"
          icon={<ReloadOutlined />}
          onClick={fetchData}
          loading={loading}
        >
          Обновить
        </Button>
      }
    >
      {/* верхняя панель со статистикой */}
      <Row gutter={[12, 12]}>
        <Col xs={12}>
          <Statistic
            title="Открытые вакансии"
            value={data.open_vacancies ?? 0}
          />
        </Col>
        <Col xs={12}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Text type="secondary" style={{ marginBottom: 4 }}>
              ID компании
            </Text>
            <Text copyable style={{ fontWeight: 500 }}>
              {data.id}
            </Text>
          </div>
        </Col>
      </Row>

      <Divider />

      {/* блок «лейбл слева — значение справа», с переносами */}
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        {data.site_url && (
          <FieldRow label="Сайт">
            <Link href={data.site_url} target="_blank">
              <Space size={6} wrap>
                <HomeOutlined />
                <span>{data.site_url}</span>
              </Space>
            </Link>
          </FieldRow>
        )}

        {data.alternate_url && (
          <FieldRow label="Страница на HH">
            <Link href={data.alternate_url} target="_blank">
              <Space size={6} wrap>
                <LinkOutlined />
                <span>{data.alternate_url}</span>
              </Space>
            </Link>
          </FieldRow>
        )}

        {"area" in data && (data as any).area?.name && (
          <FieldRow label="Регион">
            <span>{(data as any).area.name}</span>
          </FieldRow>
        )}
      </Space>
    </Card>
  );
};

export default MainPage;
