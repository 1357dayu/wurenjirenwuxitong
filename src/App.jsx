import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

// 页面组件路由级代码分割：按需加载，避免 three / exceljs / gsap 进入首屏主包
const Dashboard = lazy(() => import('./pages/Dashboard'));
const TaskList = lazy(() => import('./pages/TaskList'));
const TaskForm = lazy(() => import('./pages/TaskForm'));
const TaskDetail = lazy(() => import('./pages/TaskDetail'));
const DataExport = lazy(() => import('./pages/DataExport'));

// 加载占位：全屏居中 + 复用 index.css 已有的 .loader 旋转圈
function PageLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <span className="loader" />
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          {/* 列表页三个子路由：全部 / 复扫 / 通扫；静态段 /tasks/rescan、/tasks/general 优先于 /tasks/:id */}
          <Route path="/tasks" element={<TaskList key="all" type="all" />} />
          <Route path="/tasks/rescan" element={<TaskList key="rescan" type="rescan" />} />
          <Route path="/tasks/general" element={<TaskList key="general" type="general" />} />
          <Route path="/tasks/new" element={<TaskForm />} />
          <Route path="/tasks/:id/edit" element={<TaskForm />} />
          <Route path="/tasks/:id" element={<TaskDetail />} />
          <Route path="/export" element={<DataExport />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
