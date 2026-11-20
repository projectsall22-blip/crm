import User from '../models/User.js';
import Client from '../models/Client.js';
import Lead from '../models/Lead.js';
import Policy from '../models/Policy.js';
import Renewal from '../models/Renewal.js';
import EmailLog from '../models/EmailLog.js';
import Activity from '../models/Activity.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// GET /reports/overview
export const getOverview = asyncHandler(async (req, res) => {
  const isProducer = req.user.role === 'producer';
  const uid = req.user._id;

  const clientFilter = isProducer ? { ownerProducerId: uid } : {};
  const leadFilter   = isProducer ? { $or: [{ ownerProducerId: uid }, { assignedProducer: uid }] } : {};
  const policyFilter = isProducer ? { producerId: uid } : {};

  const totalClients   = await Client.countDocuments({ ...clientFilter, isActive: { $ne: false } });
  const totalLeads     = await Lead.countDocuments(leadFilter);
  const wonLeads       = await Lead.countDocuments({ ...leadFilter, leadStatus: 'Won' });
  const lostLeads      = await Lead.countDocuments({ ...leadFilter, leadStatus: 'Lost' });
  const newLeads       = await Lead.countDocuments({ ...leadFilter, leadStatus: 'New' });
  const inProgressLeads= await Lead.countDocuments({ ...leadFilter, leadStatus: 'In Progress' });
  const conversionRate = wonLeads + lostLeads > 0
    ? ((wonLeads / (wonLeads + lostLeads)) * 100).toFixed(1)
    : '0';

  const totalProducers = isProducer ? 1 : await User.countDocuments({ role: 'producer', isActive: true });

  const activePolicies   = await Policy.countDocuments({ ...policyFilter, policyStatus: 'Active' });
  const pendingIssuance  = await Policy.countDocuments({ ...policyFilter, policyStatus: 'Policy Issuance Pending' });
  const cancelledPolicies= await Policy.countDocuments({ ...policyFilter, policyStatus: 'Cancelled' });
  const expiredPolicies  = await Policy.countDocuments({ ...policyFilter, policyStatus: 'Expired' });
  const expiringSoon     = await Policy.countDocuments({ ...policyFilter, policyStatus: 'Expiring Soon' });

  const now = new Date();
  const ninetyDaysLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const upcomingRenewals = await Policy.countDocuments({
    ...policyFilter,
    expiryDate:   { $gte: now, $lte: ninetyDaysLater },
    policyStatus: { $in: ['Active', 'Expiring Soon'] },
  });

  // Email stats
  const emailStats = {};
  for (const s of ['Pending', 'Sent', 'Failed', 'Retrying']) {
    emailStats[s] = await EmailLog.countDocuments({ status: s });
  }
  const totalEmails = Object.values(emailStats).reduce((s, v) => s + v, 0);

  const activityFilter = isProducer ? { performedBy: uid } : {};
  const recentActivities = await Activity.find(activityFilter)
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('performedBy', 'firstName lastName');

  const leadStatusDist = await Lead.aggregate([
    { $match: leadFilter },
    { $group: { _id: '$leadStatus', count: { $sum: 1 } } },
  ]);

  const policyStatusDist = await Policy.aggregate([
    { $match: policyFilter },
    { $group: { _id: '$policyStatus', count: { $sum: 1 } } },
  ]);

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const monthlyLeads = await Lead.aggregate([
    { $match: { ...leadFilter, createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  res.json({
    clients:  { total: totalClients },
    producers:{ total: totalProducers },
    leads: {
      total: totalLeads, won: wonLeads, lost: lostLeads,
      new: newLeads, inProgress: inProgressLeads, conversionRate,
      statusDistribution: leadStatusDist, monthlyTrend: monthlyLeads,
    },
    policies: {
      active: activePolicies, pendingIssuance,
      cancelled: cancelledPolicies, expired: expiredPolicies,
      expiringSoon, upcomingRenewals,
      statusDistribution: policyStatusDist,
    },
    email: {
      stats: emailStats, total: totalEmails,
      deliveryRate: totalEmails > 0 ? ((emailStats.Sent / totalEmails) * 100).toFixed(1) : 0,
    },
    recentActivities,
  });
});

// GET /reports/producers
export const getProducerReports = asyncHandler(async (req, res) => {
  const producers = await User.find({ role: 'producer', isActive: true })
    .select('firstName lastName email');

  const reports = [];
  for (const producer of producers) {
    const pid = producer._id;
    const [clients, leads, wonLeads, lostLeads, activePolicies] = await Promise.all([
      Client.countDocuments({ ownerProducerId: pid }),
      Lead.countDocuments({ $or: [{ ownerProducerId: pid }, { assignedProducer: pid }] }),
      Lead.countDocuments({ $or: [{ ownerProducerId: pid }, { assignedProducer: pid }], leadStatus: 'Won' }),
      Lead.countDocuments({ $or: [{ ownerProducerId: pid }, { assignedProducer: pid }], leadStatus: 'Lost' }),
      Policy.countDocuments({ producerId: pid, policyStatus: 'Active' }),
    ]);

    const conversionRate = wonLeads + lostLeads > 0
      ? ((wonLeads / (wonLeads + lostLeads)) * 100).toFixed(1)
      : '0';

    reports.push({ producer, clients, leads, wonLeads, lostLeads, conversionRate, activePolicies });
  }

  res.json({ reports });
});
