import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ConfigProvider,
  App as AntdApp,
  Layout,
  Menu,
  Button,
  Spin,
  Alert,
  Space,
  Tooltip,
  Typography,
} from "antd";
import {
  HomeOutlined,
  SettingOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import MainPage from "./pages/Main";
import SettingsPage from "./pages/Settings";
import { clearToken } from "../../../shared/storage.ts";
import { useGetMe } from "./queires.ts";

// Навигационная шапка на antd Menu
function TopNav() {
  const { data: { data } = {} } = useGetMe({ enabled: false });

  const name = (data?.last_name || "") + " " + (data?.first_name || "");
  const email = data?.email || "";

  const location = useLocation();
  const navigate = useNavigate();
  // определяем активный ключ по текущему пути
  const selected = location.pathname === "/settings" ? "/settings" : "/";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        paddingInline: 8,
      }}
    >
      <Menu
        mode="horizontal"
        selectedKeys={[selected]}
        onClick={({ key }) => navigate(String(key))}
        items={[
          { key: "/", icon: <HomeOutlined />, label: "Главная" },
          { key: "/settings", icon: <SettingOutlined />, label: "Настройки" },
        ]}
        style={{ borderBottom: 0, flex: 1 }}
      />

      <Space size="small" align="center">
        <Tooltip title={email}>
          <Typography.Text style={{ fontSize: 12, fontWeight: 500 }}>
            {name}
          </Typography.Text>
        </Tooltip>
        <Button
          type="text"
          onClick={() => {
            clearToken().then(() => chrome.runtime.reload());
          }}
          icon={<LogoutOutlined />}
        >
          Выйти
        </Button>
      </Space>
    </div>
  );
}

const AppPopup = () => {
  const { isLoading, error } = useGetMe();

  if (isLoading)
    return (
      <Spin size="large" tip="Пытаемся получить пользователя…" fullscreen />
    );

  if (error)
    return <Alert type="error" message="Не удалось получить пользователя" />;

  return (
    <HashRouter>
      <ConfigProvider
        theme={{
          token: {
            borderRadius: 8,
          },
          components: {
            Menu: { itemBorderRadius: 4 },
            Layout: { headerHeight: 48 },
          },
        }}
      >
        <AntdApp>
          <Layout style={{ width: 550, background: "transparent" }}>
            <Layout.Header
              style={{
                background: "#fff",
                position: "sticky",
                top: 0,
                zIndex: 10,
                padding: 0,
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <TopNav />
            </Layout.Header>

            <Layout.Content style={{ padding: 12 }}>
              <Routes>
                <Route path="/" element={<MainPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                {/* на случай неизвестного пути */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout.Content>
          </Layout>
        </AntdApp>
      </ConfigProvider>
    </HashRouter>
  );
};

export default AppPopup;
