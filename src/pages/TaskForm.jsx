import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createTask, getTask, updateTask, loadTasks, genTaskNo } from '../lib/storage';
import { STATUSES, TASK_TYPES } from '../lib/constants';
import { searchLines, findLinesByName, normalizeLineName } from '../lib/lineDictionary';
import { searchPilots } from '../lib/pilotDictionary';
import BackButton from '../components/BackButton';
import AutoComplete from '../components/AutoComplete';

const empty = {
  taskNo: '',
  taskType: '复扫', // 任务类型：复扫 / 通扫，默认复扫
  lineName: '',
  towerRange: '',
  pilot: '',
  pilot2: '',
  driver: '', // 司机：可选，连续录入时保留
  planDate: '',
  actualDate: '',
  status: '待复扫',
  rescanResult: '',
  conclusion: '',
  remark: ''
};

export default function TaskForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [previewNo, setPreviewNo] = useState('');
  const [created, setCreated] = useState(null); // 刚创建的任务 {taskNo, id}

  useEffect(() => {
    if (isEdit) {
      const t = getTask(id);
      if (t) setForm({ ...empty, ...t });
      else navigate('/tasks');
    } else {
      setPreviewNo(genTaskNo(loadTasks()));
    }
  }, [id, isEdit, navigate]);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: undefined }));
  };

  // 当前线路在字典中的可选区段（同一线路可能被多个保线站分段维护）
  const lineOptions = form.lineName ? findLinesByName(form.lineName) : [];
  const towerHint = lineOptions.length > 1
    ? `该线路有 ${lineOptions.length} 个区段可选：${lineOptions.map(o => `${o.towerRange}（${o.station}）`).join('、')}`
    : lineOptions.length === 1
      ? `字典参考：${lineOptions[0].towerRange}（${lineOptions[0].towerCount} 塔，${lineOptions[0].station}）`
      : '该线路未在汇总表中，请手动填写';

  const validate = () => {
    const e = {};
    if (!form.lineName.trim()) e.lineName = '请填写线路名称';
    if (!form.towerRange.trim()) e.towerRange = '请填写杆塔 / 区段';
    if (!form.planDate) e.planDate = '请选择开始时间';
    if (!form.status) e.status = '请选择当前状态';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = e => {
    e.preventDefault();
    if (!validate()) return;
    // 提交前归一化线路名称为字典标准名称（去空格、# 号、大小写差异），统一字段
    const formToSubmit = { ...form, lineName: normalizeLineName(form.lineName) };
    if (isEdit) {
      updateTask(id, formToSubmit);
      navigate(`/tasks/${id}`);
    } else {
      // 创建后停留在表单方便连续录入：保留任务类型、线路、飞手、司机与开始时间共 6 项高复用字段；
      // 杆塔 / 区段每条任务不同必须清空，结束时间清空、当前状态重置为「待复扫」，避免误带到下一条
      const t = createTask(formToSubmit);
      setCreated({ taskNo: t.taskNo, id: t.id });
      // 保留归一化后的线路名称（连续录入时下一条也用标准名称）
      setForm(f => ({
        ...empty,
        taskType: f.taskType,
        lineName: formToSubmit.lineName,
        pilot: f.pilot,
        pilot2: f.pilot2,
        driver: f.driver,
        planDate: f.planDate
      }));
      setPreviewNo(genTaskNo(loadTasks())); // 预生成下一条编号
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-4">
        <BackButton onClick={() => navigate(-1)} />
        <div>
          <h2 className="text-xl font-semibold text-white">{isEdit ? '编辑任务' : '新建扫描任务'}</h2>
          <p className="text-sm text-white/45 mt-0.5">
            {isEdit ? `任务编号 ${form.taskNo}` : `任务编号将自动生成：${previewNo}`}
          </p>
        </div>
      </div>

      {created && !isEdit && (
        <div className="rounded-xl border border-brand/50 bg-brand/15 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm text-white">
            ✓ 已创建任务 <span className="font-mono text-brand">{created.taskNo}</span>，已保留任务类型、线路、飞手、司机与开始时间，可继续新建下一条。
          </span>
          <span className="flex items-center gap-2 text-xs">
            <button onClick={() => navigate(`/tasks/${created.id}`)} className="rounded-lg px-2.5 py-1 border border-brand/50 text-brand hover:bg-brand/20">
              查看该任务
            </button>
            <button onClick={() => navigate('/tasks')} className="rounded-lg px-2.5 py-1 border border-line text-white/60 hover:bg-white/5">
              查看列表
            </button>
          </span>
        </div>
      )}

      <form onSubmit={submit} className="rounded-2xl glass p-5 md:p-6 space-y-5">
        <Section title="基础信息">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="任务类型" required>
              <select className="input-dark w-full" value={form.taskType} onChange={e => set('taskType', e.target.value)}>
                {TASK_TYPES.map(o => <option key={o} value={o}>{o}任务</option>)}
              </select>
            </Field>
            <Field label="线路名称" required error={errors.lineName} hint="输入 1 个字/字母即可弹出可选线路（来自《应急抢修中心运维线路汇总表》）">
              <AutoComplete
                value={form.lineName}
                onChange={v => set('lineName', v)}
                onSearch={useCallback(q => searchLines(q, 30), [])}
                onSelect={item => {
                  // 选中后自动带出杆塔 / 区段（用户可继续编辑）
                  setForm(f => ({
                    ...f,
                    lineName: item.lineName,
                    towerRange: item.towerRange
                  }));
                  if (errors.lineName) setErrors(e => ({ ...e, lineName: undefined }));
                  if (errors.towerRange) setErrors(e => ({ ...e, towerRange: undefined }));
                }}
                getKey={item => `${item.station}-${item.lineName}-${item.towerRange}`}
                placeholder="如：群兴、500kV、甲线"
                renderItem={(item, isActive) => (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-white/85'}`}>
                        {item.lineName}
                      </div>
                      <div className="text-[11px] text-white/45 truncate mt-0.5">
                        {item.station} · 杆塔 {item.towerRange} · {item.towerCount} 塔 · {item.length} km
                      </div>
                    </div>
                    {isActive && (
                      <span className="text-[10px] text-brand shrink-0">回车选中</span>
                    )}
                  </div>
                )}
              />
            </Field>
            <Field label="杆塔 / 区段" required error={errors.towerRange} hint={towerHint}>
              <input className="input-dark w-full" value={form.towerRange} onChange={e => set('towerRange', e.target.value)} placeholder="如：123#-126#（选中线路后自动带出）" />
            </Field>
          </div>
        </Section>

        <Section title="人员与时间">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="责任飞手" hint="输入姓名 1 个字即可弹出可选飞手（来自《无人机实名登记表》）">
              <AutoComplete
                value={form.pilot}
                onChange={v => set('pilot', v)}
                onSearch={useCallback(q => searchPilots(q, 20), [])}
                onSelect={item => set('pilot', item)}
                getKey={item => item}
                placeholder="可选，如：张三"
                minQuery={1}
                renderItem={(item, isActive) => (
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm ${isActive ? 'text-white' : 'text-white/85'}`}>{item}</span>
                    {isActive && <span className="text-[10px] text-brand">回车选中</span>}
                  </div>
                )}
              />
            </Field>
            <Field label="协助飞手" hint="输入姓名 1 个字即可弹出可选飞手">
              <AutoComplete
                value={form.pilot2}
                onChange={v => set('pilot2', v)}
                onSearch={useCallback(q => searchPilots(q, 20), [])}
                onSelect={item => set('pilot2', item)}
                getKey={item => item}
                placeholder="可选，如：李明"
                minQuery={1}
                renderItem={(item, isActive) => (
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm ${isActive ? 'text-white' : 'text-white/85'}`}>{item}</span>
                    {isActive && <span className="text-[10px] text-brand">回车选中</span>}
                  </div>
                )}
              />
            </Field>
            <Field label="司机">
              <input className="input-dark w-full" value={form.driver} onChange={e => set('driver', e.target.value)} placeholder="可选，如：陈师傅" />
            </Field>
            <Field label="当前状态" required error={errors.status}>
              <select className="input-dark w-full" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="开始时间" required error={errors.planDate}>
              <input type="date" className="input-dark w-full" value={form.planDate} onChange={e => set('planDate', e.target.value)} />
            </Field>
            <Field label="结束时间">
              <input type="date" className="input-dark w-full" value={form.actualDate} onChange={e => set('actualDate', e.target.value)} />
            </Field>
          </div>
        </Section>

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-line/60">
          {!isEdit ? (
            <button
              type="button"
              onClick={() => { setForm(empty); setErrors({}); setCreated(null); }}
              className="text-xs text-white/40 hover:text-white/70 underline"
            >
              清空表单
            </button>
          ) : <span />}
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate(-1)} className="rounded-xl px-4 py-2 text-sm text-white/60 border border-line hover:bg-white/5">取消</button>
            <button type="submit" className="glass-btn rounded-xl px-5 py-2 text-sm font-medium">
              {isEdit ? '保存修改' : created ? '继续创建' : '创建任务'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-brand shadow-[0_0_10px_rgba(56,132,255,1)]" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, required, error, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs text-white/55">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-white/40 leading-relaxed">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
