import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTask, updateTask, deleteTask } from '../lib/storage';
import { STATUSES, isOverdue, todayStr } from '../lib/constants';
import StatusBadge from '../components/StatusBadge';
import BackButton from '../components/BackButton';
import ConfirmModal from '../components/ConfirmModal';

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [rescanResult, setRescanResult] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [savedTip, setSavedTip] = useState('');
  // 待确认弹窗配置：{ title, message, confirmText, danger, action }，null 表示不显示
  const [confirm, setConfirm] = useState(null);

  const load = () => {
    const t = getTask(id);
    if (!t) { navigate('/tasks'); return; }
    setTask(t);
    setRescanResult(t.rescanResult || '');
    setConclusion(t.conclusion || '');
  };
  useEffect(() => { load(); }, [id, navigate]);

  if (!task) return null;
  const overdue = isOverdue(task);

  const flashTip = msg => { setSavedTip(msg); setTimeout(() => setSavedTip(''), 1800); };

  // 实际执行状态切换（原 changeStatus 逻辑）
  const doChangeStatus = newStatus => {
    const patch = { status: newStatus };
    // 进入“已完成”：无结束时间时自动补全，且扫描次数加一
    if (newStatus === '已完成') {
      if (!task.actualDate) patch.actualDate = todayStr();
      patch.scanCount = (task.scanCount || 0) + 1;
    }
    const updated = updateTask(id, patch);
    setTask(updated);
    flashTip(`状态已更新为「${newStatus}」`);
  };

  const closeConfirm = () => setConfirm(null);
  const handleConfirm = () => {
    const action = confirm?.action;
    setConfirm(null);
    action?.();
  };

  // 状态流转约束：回退需二次确认；缺扫描结果/闭环结论时提示后再继续
  const changeStatus = newStatus => {
    const targetIdx = STATUSES.indexOf(newStatus);
    // 目标状态序号小于当前状态序号 = 回退操作，需二次确认
    if (targetIdx > -1 && targetIdx < STATUSES.indexOf(task.status)) {
      setConfirm({
        title: '回退状态',
        message: `正在将状态从「${task.status}」回退到「${newStatus}」，确定要回退吗？`,
        confirmText: '确定回退',
        danger: true,
        action: () => doChangeStatus(newStatus)
      });
      return;
    }
    // 目标为「已完成」但未填写扫描结果时提示
    if (newStatus === '已完成' && !rescanResult.trim()) {
      setConfirm({
        title: '标记为已完成',
        message: '尚未填写扫描结果，仍要标记为已完成吗？',
        confirmText: '仍要标记',
        action: () => doChangeStatus(newStatus)
      });
      return;
    }
    // 目标为「已闭环」但未填写闭环结论时提示
    if (newStatus === '已闭环' && !conclusion.trim()) {
      setConfirm({
        title: '闭环任务',
        message: '尚未填写闭环结论，仍要闭环吗？',
        confirmText: '仍要闭环',
        action: () => doChangeStatus(newStatus)
      });
      return;
    }
    doChangeStatus(newStatus);
  };

  const saveResult = () => {
    const updated = updateTask(id, { rescanResult, conclusion });
    setTask(updated);
    flashTip('扫描结果与闭环结论已保存');
  };

  const handleDelete = () => {
    setConfirm({
      title: '删除任务',
      message: `确定删除任务 ${task.taskNo} 吗？删除后不可恢复。`,
      confirmText: '删除',
      danger: true,
      action: () => {
        deleteTask(id);
        navigate('/tasks');
      }
    });
  };

  const curIdx = STATUSES.indexOf(task.status);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <BackButton onClick={() => navigate(-1)} />
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-semibold text-white">{task.lineName}</h2>
              <StatusBadge status={task.status} overdue={overdue} />
            </div>
            <p className="text-sm text-white/45 mt-0.5 font-mono">{task.taskNo} · {task.towerRange}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/tasks/${id}/edit`)} className="rounded-xl px-3.5 py-2 text-sm text-white/70 border border-line hover:bg-white/5">编辑</button>
          <button onClick={handleDelete} className="rounded-xl px-3.5 py-2 text-sm text-red-300/80 border border-red-500/30 hover:bg-red-500/10">删除</button>
        </div>
      </div>

      {savedTip && (
        <div className="rounded-xl border border-brand/50 bg-brand/15 text-brand text-sm px-4 py-2.5">✓ {savedTip}</div>
      )}

      {/* 状态流转 */}
      <div className="rounded-2xl glass p-5">
        <h3 className="text-sm font-semibold text-white mb-4">状态流转</h3>
        <div className="flex items-center gap-1 flex-wrap mb-4">
          {STATUSES.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                  i <= curIdx
                    ? 'bg-brand/20 border-brand/50 text-white'
                    : 'bg-bg-raised border-line text-white/40'
                }`}
              >
                {s}
              </div>
              {i < STATUSES.length - 1 && (
                <span className={`mx-1 ${i < curIdx ? 'text-brand' : 'text-white/25'}`}>→</span>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-white/50">快速修改状态：</span>
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              disabled={s === task.status}
              className={`rounded-lg px-3 py-1.5 text-xs border transition ${
                s === task.status
                  ? 'bg-brand text-white border-brand cursor-default'
                  : 'border-line text-white/65 hover:bg-white/5 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-white/35 mt-3">
          提示：「已完成」≠「已闭环」。飞手完成扫描仅代表现场任务完成，管理员确认结果有效后才算真正闭环。
        </p>
      </div>

      {/* 基础信息 */}
      <div className="rounded-2xl glass p-5">
        <h3 className="text-sm font-semibold text-white mb-4">基础信息</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <Info label="任务编号" value={task.taskNo} mono />
          <Info label="任务类型" value={task.taskType ? `${task.taskType}任务` : '—'} />
          <Info label="线路名称" value={task.lineName} />
          <Info label="杆塔 / 区段" value={task.towerRange} />
          <Info label="责任飞手" value={task.pilot || '—'} />
          <Info label="协助飞手" value={task.pilot2 || '—'} />
          <Info label="司机" value={task.driver || '—'} />
          <Info label="开始时间" value={task.planDate || '—'} danger={overdue} />
          <Info label="结束时间" value={task.actualDate || '—'} />
          <Info label="扫描次数" value={(task.scanCount || 0) > 0 ? `已扫描 ${task.scanCount} 次` : '尚未扫描'} />
          {task.remark && (
            <div className="sm:col-span-2">
              <Info label="备注" value={task.remark} block />
            </div>
          )}
          <Info label="创建时间" value={task.createdAt} />
          <Info label="更新时间" value={task.updatedAt} />
        </dl>
      </div>

      {/* 扫描结果与闭环结论 */}
      <div className="rounded-2xl glass p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">扫描结果与闭环结论</h3>
        <div className="space-y-1.5">
          <label className="block text-xs text-white/55">扫描结果（飞手填写）</label>
          <textarea rows={3} className="input-dark w-full resize-y" value={rescanResult} onChange={e => setRescanResult(e.target.value)} placeholder="填写现场扫描结果" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs text-white/55">闭环结论（管理员确认）</label>
          <textarea rows={3} className="input-dark w-full resize-y" value={conclusion} onChange={e => setConclusion(e.target.value)} placeholder="填写闭环结论" />
        </div>
        <div className="flex justify-end">
          <button onClick={saveResult} className="glass-btn rounded-xl px-5 py-2 text-sm font-medium">
            保存结果
          </button>
        </div>
      </div>

      {/* 通用确认弹窗：状态回退 / 缺结果完成 / 缺结论闭环 / 删除 */}
      <ConfirmModal
        open={Boolean(confirm)}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        confirmText={confirm?.confirmText}
        danger={Boolean(confirm?.danger)}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}

function Info({ label, value, mono, danger, block }) {
  return (
    <div>
      <dt className="text-xs text-white/45 mb-1">{label}</dt>
      <dd
        className={`text-sm ${mono ? 'font-mono' : ''} ${block ? 'leading-relaxed' : ''}`}
        style={{ color: danger ? '#ff8a8a' : 'rgba(255,255,255,0.9)' }}
      >
        {value}
      </dd>
    </div>
  );
}
