import { STATUS_STYLES, OVERDUE_STYLE } from '../lib/constants';

export default function StatusBadge({ status, overdue = false }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES['待复扫'];
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
        style={{ color: s.text, background: s.bg, border: `1px solid ${s.border}` }}
      >
        {status}
      </span>
      {overdue && (
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap"
          style={{ color: OVERDUE_STYLE.text, background: OVERDUE_STYLE.bg, border: `1px solid ${OVERDUE_STYLE.border}` }}
        >
          逾期
        </span>
      )}
    </span>
  );
}
