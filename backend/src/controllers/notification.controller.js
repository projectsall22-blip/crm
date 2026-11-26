import Lead from '../models/Lead.js';
import Policy from '../models/Policy.js';
import Renewal from '../models/Renewal.js';
import Task from '../models/Task.js';
import Activity from '../models/Activity.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/v1/notifications
 * Returns aggregated, role-aware notifications for the bell panel.
 * Categories: new_lead, lead_won (client convert), policy_issued, renewal_due, overdue_task, expiring_policy
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const isProducer = req.user.role === 'producer';
  const uid        = req.user._id;

  const now            = new Date();
  const last24h        = new Date(now - 24 * 60 * 60 * 1000);
  const last48h        = new Date(now - 48 * 60 * 60 * 1000);
  const thirtyDaysOut  = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const leadFilter   = isProducer
    ? { $or: [{ ownerProducerId: uid }, { assignedProducer: uid }] }
    : {};
  const policyFilter = isProducer ? { producerId: uid } : {};

  // ── 1. New leads (last 48h) ──────────────────────────────────
  const newLeads = await Lead.find({
    ...leadFilter,
    createdAt: { $gte: last48h },
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('createdBy', 'firstName lastName')
    .select('leadId clientName insuranceType leadStatus createdAt createdBy');

  // ── 2. Lead Won → Client conversion (last 48h) ───────────────
  const wonLeads = await Lead.find({
    ...leadFilter,
    leadStatus: 'Won',
    wonAt: { $gte: last48h },
  })
    .sort({ wonAt: -1 })
    .limit(10)
    .populate('assignedProducer', 'firstName lastName')
    .select('leadId clientName insuranceType wonAt assignedProducer clientId');

  // ── 3. Policies issued / activated (last 48h) ────────────────
  const issuedPolicies = await Policy.find({
    ...policyFilter,
    policyStatus: 'Active',
    issuedAt: { $gte: last48h },
  })
    .sort({ issuedAt: -1 })
    .limit(10)
    .populate('clientId', 'firstName lastName')
    .populate('producerId', 'firstName lastName')
    .select('policyId policyNumber insuranceCategory totalPremium currency issuedAt clientId producerId');

  // ── 4. Renewals due in 30 days (Pending status) ───────────────
  const upcomingRenewals = await Renewal.find({
    ...(isProducer ? { producerId: uid } : {}),
    status: 'Pending',
    expiryDate: { $gte: now, $lte: thirtyDaysOut },
  })
    .sort({ expiryDate: 1 })
    .limit(15)
    .populate('clientId', 'firstName lastName')
    .populate('originalPolicyId', 'policyNumber policyId insuranceCategory')
    .select('renewalNumber expiryDate status clientId originalPolicyId');

  // ── 5. Overdue tasks ─────────────────────────────────────────
  const overdueTasks = await Task.find({
    ...(isProducer ? { assignedTo: uid } : {}),
    status: { $in: ['Pending', 'In Progress'] },
    dueDate: { $lt: now },
  })
    .sort({ dueDate: 1 })
    .limit(10)
    .populate('assignedTo', 'firstName lastName')
    .select('title dueDate priority status assignedTo taskType');

  // ── 6. Expiring policies (next 14 days) ──────────────────────
  const fourteenDaysOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const expiringPolicies = await Policy.find({
    ...policyFilter,
    policyStatus: { $in: ['Active', 'Expiring Soon'] },
    expiryDate: { $gte: now, $lte: fourteenDaysOut },
  })
    .sort({ expiryDate: 1 })
    .limit(10)
    .populate('clientId', 'firstName lastName')
    .select('policyId policyNumber insuranceCategory expiryDate clientId');

  // ── 7. Pending issuance policies (waiting for action) ────────
  const pendingIssuance = await Policy.find({
    ...policyFilter,
    policyStatus: 'Policy Issuance Pending',
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('clientId', 'firstName lastName')
    .select('policyId policyNumber insuranceCategory createdAt clientId');

  // ── Build notification items ──────────────────────────────────
  const notifications = [];

  newLeads.forEach((l) => {
    notifications.push({
      id:        `lead_new_${l._id}`,
      type:      'new_lead',
      category:  'lead',
      title:     'New Lead Added',
      message:   `${l.clientName} — ${l.insuranceType || 'General'}`,
      sub:       `by ${l.createdBy?.firstName || '?'} ${l.createdBy?.lastName || ''}`,
      time:      l.createdAt,
      link:      `/leads`,
      entityId:  l._id,
      read:      false,
    });
  });

  wonLeads.forEach((l) => {
    notifications.push({
      id:        `lead_won_${l._id}`,
      type:      'lead_won',
      category:  'lead',
      title:     'Lead Won 🎉',
      message:   `${l.clientName} converted to client`,
      sub:       `${l.insuranceType || ''} · ${l.assignedProducer?.firstName || ''}`,
      time:      l.wonAt,
      link:      `/leads`,
      entityId:  l._id,
      read:      false,
    });
  });

  issuedPolicies.forEach((p) => {
    const client = p.clientId ? `${p.clientId.firstName} ${p.clientId.lastName}` : '—';
    notifications.push({
      id:        `policy_issued_${p._id}`,
      type:      'policy_issued',
      category:  'policy',
      title:     'Policy Issued ✓',
      message:   `${p.policyNumber || p.policyId} — ${client}`,
      sub:       `${p.insuranceCategory || ''} · ${p.currency} ${(p.totalPremium || 0).toLocaleString()}`,
      time:      p.issuedAt,
      link:      `/policies`,
      entityId:  p._id,
      read:      false,
    });
  });

  upcomingRenewals.forEach((r) => {
    const client  = r.clientId ? `${r.clientId.firstName} ${r.clientId.lastName}` : '—';
    const daysLeft= Math.ceil((new Date(r.expiryDate) - now) / (1000 * 60 * 60 * 24));
    notifications.push({
      id:        `renewal_due_${r._id}`,
      type:      'renewal_due',
      category:  'renewal',
      title:     `Renewal Due in ${daysLeft}d`,
      message:   `${client} — ${r.originalPolicyId?.policyNumber || r.renewalNumber}`,
      sub:       `${r.originalPolicyId?.insuranceCategory || ''} · Expires ${new Date(r.expiryDate).toLocaleDateString()}`,
      time:      r.expiryDate,
      link:      `/renewals`,
      entityId:  r._id,
      read:      false,
      urgent:    daysLeft <= 7,
    });
  });

  overdueTasks.forEach((t) => {
    const daysOverdue = Math.ceil((now - new Date(t.dueDate)) / (1000 * 60 * 60 * 24));
    notifications.push({
      id:        `task_overdue_${t._id}`,
      type:      'task_overdue',
      category:  'task',
      title:     'Task Overdue',
      message:   t.title,
      sub:       `${t.priority} priority · ${daysOverdue}d overdue`,
      time:      t.dueDate,
      link:      `/tasks`,
      entityId:  t._id,
      read:      false,
      urgent:    true,
    });
  });

  expiringPolicies.forEach((p) => {
    const client  = p.clientId ? `${p.clientId.firstName} ${p.clientId.lastName}` : '—';
    const daysLeft= Math.ceil((new Date(p.expiryDate) - now) / (1000 * 60 * 60 * 24));
    notifications.push({
      id:        `policy_expiring_${p._id}`,
      type:      'policy_expiring',
      category:  'policy',
      title:     `Policy Expires in ${daysLeft}d`,
      message:   `${p.policyNumber || p.policyId} — ${client}`,
      sub:       `${p.insuranceCategory || ''} · Expires ${new Date(p.expiryDate).toLocaleDateString()}`,
      time:      p.expiryDate,
      link:      `/policies`,
      entityId:  p._id,
      read:      false,
      urgent:    daysLeft <= 7,
    });
  });

  pendingIssuance.forEach((p) => {
    const client = p.clientId ? `${p.clientId.firstName} ${p.clientId.lastName}` : '—';
    notifications.push({
      id:        `policy_pending_${p._id}`,
      type:      'policy_pending',
      category:  'policy',
      title:     'Awaiting Policy Issuance',
      message:   `${p.policyNumber || p.policyId || 'Draft'} — ${client}`,
      sub:       `${p.insuranceCategory || ''} · Created ${new Date(p.createdAt).toLocaleDateString()}`,
      time:      p.createdAt,
      link:      `/policies`,
      entityId:  p._id,
      read:      false,
    });
  });

  // Sort: urgent first, then by time descending
  notifications.sort((a, b) => {
    if (a.urgent && !b.urgent) return -1;
    if (!a.urgent && b.urgent) return 1;
    return new Date(b.time) - new Date(a.time);
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  res.json({
    notifications: notifications.slice(0, 50),
    unreadCount,
    summary: {
      newLeads:         newLeads.length,
      wonLeads:         wonLeads.length,
      issuedPolicies:   issuedPolicies.length,
      upcomingRenewals: upcomingRenewals.length,
      overdueTasks:     overdueTasks.length,
      expiringPolicies: expiringPolicies.length,
      pendingIssuance:  pendingIssuance.length,
    },
  });
});
