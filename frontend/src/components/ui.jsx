import { forwardRef } from 'react';

/* ─────────────────────────────────────────────────────────────
   CARD
───────────────────────────────────────────────────────────── */
export function Card({ children, className = '', title, action }) {
  return (
    <div className={`card ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          {title && <h3 className="text-sm font-semibold text-gray-700">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   BADGE
───────────────────────────────────────────────────────────── */
export function Badge({ children, color = 'gray' }) {
  const colors = {
    gray:   'bg-gray-100 text-gray-600',
    blue:   'bg-blue-100 text-blue-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    green:  'bg-emerald-100 text-emerald-700',
    yellow: 'bg-amber-100 text-amber-700',
    red:    'bg-red-100 text-red-700',
    purple: 'bg-purple-100 text-purple-700',
    slate:  'bg-slate-100 text-slate-600',
    navy:   'bg-indigo-100 text-indigo-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
}

/* Status → color map */
const STATUS_COLORS = {
  New: 'blue', Contacted: 'gray', 'Follow-up': 'yellow', Interested: 'purple',
  'In Progress': 'yellow', Won: 'green', Lost: 'red', 'On Hold': 'gray',
  Draft: 'gray', 'Policy Issuance Pending': 'yellow', Active: 'green',
  'Expiring Soon': 'yellow', 'Renewal Pending': 'yellow', Cancelled: 'red',
  Expired: 'red', 'Not Taken Up': 'red',
  Unpaid: 'red', 'Partially Paid': 'yellow', Paid: 'green', Overdue: 'red',
  'Refund Pending': 'yellow', Refunded: 'gray',
  Estimated: 'gray', Pending: 'yellow', Approved: 'green',
  Payable: 'blue', Reversed: 'red',
  Renewed: 'green', Lapsed: 'red',
  Inactive: 'red', Sent: 'green', Failed: 'red',
  Retrying: 'yellow', Completed: 'green',
};

export function StatusBadge({ status }) {
  return <Badge color={STATUS_COLORS[status] || 'gray'}>{status}</Badge>;
}

/* ─────────────────────────────────────────────────────────────
   FORM CONTROLS
───────────────────────────────────────────────────────────── */
export const Input = forwardRef(({ label, error, className = '', ...props }, ref) => (
  <div>
    {label && <label className="label">{label}</label>}
    <input
      ref={ref}
      className={`input ${error ? 'input-error' : ''} ${className}`}
      {...props}
    />
    {error && <p className="field-error">{error}</p>}
  </div>
));
Input.displayName = 'Input';

export const Select = forwardRef(({ label, error, children, className = '', ...props }, ref) => (
  <div>
    {label && <label className="label">{label}</label>}
    <select ref={ref} className={`input ${className}`} {...props}>
      {children}
    </select>
    {error && <p className="field-error">{error}</p>}
  </div>
));
Select.displayName = 'Select';

export const Textarea = forwardRef(({ label, error, className = '', ...props }, ref) => (
  <div>
    {label && <label className="label">{label}</label>}
    <textarea ref={ref} className={`input ${className}`} {...props} />
    {error && <p className="field-error">{error}</p>}
  </div>
));
Textarea.displayName = 'Textarea';

/* ─────────────────────────────────────────────────────────────
   MODAL
───────────────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal-box ${sizes[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none font-light transition-colors"
          >
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGINATION
───────────────────────────────────────────────────────────── */
export function Pagination({ page, pages, total, onChange }) {
  if (!total) return null;
  return (
    <div className="pagination">
      <span>
        Page {page} of {pages || 1} &nbsp;·&nbsp; {total} records
      </span>
      <div className="flex gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="pagination-btn"
        >
          Prev
        </button>
        <button
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          className="pagination-btn"
        >
          Next
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   EMPTY STATE
───────────────────────────────────────────────────────────── */
export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="empty-state">
      {Icon && (
        <div className="empty-state-icon">
          <Icon className="w-7 h-7" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      {message && (
        <p className="text-sm text-gray-400 mt-1 max-w-sm">{message}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SPINNER / LOADING
───────────────────────────────────────────────────────────── */
export function Spinner({ className = '' }) {
  return <div className={`spinner ${className}`} style={{ width: '1.25rem', height: '1.25rem' }} />;
}

export function LoadingScreen() {
  return (
    <div
      className="flex items-center justify-center h-screen"
      style={{ background: '#F4F5FB' }}
    >
      <div className="text-center">
        <div
          className="spinner mx-auto mb-3"
          style={{ width: '2.5rem', height: '2.5rem' }}
        />
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    </div>
  );
}
