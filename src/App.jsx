import { lazy, Suspense, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import PasswordGate, { isUnlocked } from './components/PasswordGate';
import RobotPortal from './components/RobotPortal';
import PerfModeToggle from './components/PerfModeToggle';
import { isPerfMode, setPerfModeStore } from './lib/perfMode';

// 页面组件路由级代码分割：按需加载，避免 three / exceljs / gsap 进入首屏主包
const Dashboard = lazy(() => import('./pages/Dashboard'));
const TaskList = lazy(() => import('./pages/TaskList'));
const TaskForm = lazy(() => import('./pages/TaskForm'));
const TaskDetail = lazy(() => import('./pages/TaskDetail'));
const DataExport = lazy(() => import('./pages/DataExport'));
const Statistics = lazy(() => import('./pages/Statistics'));

// 加载占位：全屏居中 + 复用 index.css 已有的 .loader 旋转圈
function PageLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <span className="loader" />
    </div>
  );
}

export default function App() {
  // 进入密码锁：未通过验证前不渲染任何业务内容
  // sessionStorage 记忆状态，刷新不重新输（关闭浏览器标签页后失效）
  const [unlocked, setUnlocked] = useState(isUnlocked());
  // 性能模式：localStorage 记忆用户选择，默认根据设备硬件自动判断
  const [perfMode, setPerfMode] = useState(isPerfMode());
  const location = useLocation();

  const togglePerf = () => {
    const next = !perfMode;
    setPerfMode(next);
    setPerfModeStore(next);
  };

  // 机器人 portal 状态：
  // - 性能模式：完全不渲染 RobotPortal
  // - 未解锁：密码界面右侧
  // - 已解锁 + 首页：Hero 右侧
  // - 已解锁 + 其他页面：隐藏
  const robotState = perfMode
    ? null
    : !unlocked
      ? 'lock'
      : location.pathname === '/'
        ? 'home'
        : 'hidden';

  if (!unlocked) {
    return (
      <>
        <PasswordGate onUnlock={() => setUnlocked(true)} />
        {!perfMode && <RobotPortal state={robotState} />}
        <PerfModeToggle perfMode={perfMode} onToggle={togglePerf} />
      </>
    );
  }

  return (
    <>
      {!perfMode && <RobotPortal state={robotState} />}
      <Layout perfMode={perfMode}>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<Dashboard perfMode={perfMode} />} />
            {/* 列表页三个子路由：全部 / 复扫 / 通扫；静态段 /tasks/rescan、/tasks/general 优先于 /tasks/:id */}
            <Route path="/tasks" element={<TaskList key="all" type="all" />} />
            <Route path="/tasks/rescan" element={<TaskList key="rescan" type="rescan" />} />
            <Route path="/tasks/general" element={<TaskList key="general" type="general" />} />
            <Route path="/tasks/new" element={<TaskForm />} />
            <Route path="/tasks/:id/edit" element={<TaskForm />} />
            <Route path="/tasks/:id" element={<TaskDetail />} />
            <Route path="/stats" element={<Statistics />} />
            <Route path="/export" element={<DataExport />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
      <PerfModeToggle perfMode={perfMode} onToggle={togglePerf} />
    </>
  );
}
