import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import EmailRecipient from '../models/EmailRecipient.js';
import EmailTemplate from '../models/EmailTemplate.js';
import EmailRule from '../models/EmailRule.js';
import Insurer from '../models/Insurer.js';
import Product from '../models/Product.js';
import { config } from '../config/env.js';

/**
 * Seeds the database with:
 *  - A default admin user
 *  - Default email recipients
 *  - Default email templates + automation rules
 *  - Sample insurer + product
 */
async function seed() {
  await connectDB();
  console.log('[seed] Starting seed...');

  // --- Default Admin ---
  let admin = await User.findOne({ email: config.defaults.adminEmail.toLowerCase() });
  if (!admin) {
    admin = await User.create({
      firstName: 'System',
      lastName: 'Admin',
      email: config.defaults.adminEmail,
      password: config.defaults.adminPassword,
      role: 'admin',
      isActive: true,
    });
    console.log(`[seed] Created default admin: ${admin.email}`);
  } else {
    console.log(`[seed] Admin already exists: ${admin.email}`);
  }

  // --- Sample Manager ---
  const managerEmail = 'manager@brokerage.com';
  let manager = await User.findOne({ email: managerEmail });
  if (!manager) {
    manager = await User.create({
      firstName: 'Jane',
      lastName: 'Manager',
      email: managerEmail,
      password: 'Manager123!',
      role: 'manager',
    });
    console.log(`[seed] Created sample manager: ${manager.email}`);
  }

  // --- Sample Producer ---
  const producerEmail = 'producer@brokerage.com';
  let producer = await User.findOne({ email: producerEmail });
  if (!producer) {
    producer = await User.create({
      firstName: 'John',
      lastName: 'Producer',
      email: producerEmail,
      password: 'Producer123!',
      role: 'producer',
      managerId: manager._id,
    });
    console.log(`[seed] Created sample producer: ${producer.email}`);
  }

  // --- Default Email Recipients ---
  const recipients = [
    { name: 'Manager', email: 'manager@company.com', description: 'Primary manager inbox', type: 'preconfigured', groups: ['Management'], isDefault: true },
    { name: 'Operations', email: 'operations@company.com', description: 'Operations team', type: 'preconfigured', groups: ['Operations'], isDefault: true },
    { name: 'Sales Team', email: 'sales@company.com', description: 'Sales team inbox', type: 'preconfigured', groups: ['Sales'] },
    { name: 'Admin', email: 'admin@company.com', description: 'Admin notifications', type: 'preconfigured', groups: ['Management'], isDefault: true },
  ];
  for (const r of recipients) {
    const exists = await EmailRecipient.findOne({ email: r.email });
    if (!exists) {
      await EmailRecipient.create({ ...r, userId: admin._id });
    }
  }
  console.log('[seed] Email recipients seeded');

  // --- Default Email Templates ---
  const templates = [
    {
      name: 'New Lead Created',
      subject: 'New Insurance Lead Created – {{clientName}}',
      bodyHtml: `<div style="font-family:Arial,sans-serif;padding:24px;color:#1e293b;">
  <h2>A new insurance lead has been created.</h2>
  <table style="font-size:14px;border-collapse:collapse;">
    <tr><td style="padding:4px 12px;font-weight:600;">Client Name:</td><td style="padding:4px 12px;">{{clientName}}</td></tr>
    <tr><td style="padding:4px 12px;font-weight:600;">Insurance Type:</td><td style="padding:4px 12px;">{{insuranceType}}</td></tr>
    <tr><td style="padding:4px 12px;font-weight:600;">Expected Premium:</td><td style="padding:4px 12px;">{{expectedPremium}}</td></tr>
    <tr><td style="padding:4px 12px;font-weight:600;">Producer:</td><td style="padding:4px 12px;">{{producerName}}</td></tr>
    <tr><td style="padding:4px 12px;font-weight:600;">Lead Source:</td><td style="padding:4px 12px;">{{leadSource}}</td></tr>
  </table>
  <p style="color:#64748b;font-size:12px;margin-top:16px;">Please review the lead details in the CRM. Only authorized fields are shared in this email.</p>
</div>`,
      triggerType: 'lead_created',
      allowedFields: ['clientName', 'insuranceType', 'expectedPremium', 'leadSource', 'producerName', 'leadStatus', 'notes'],
    },
    {
      name: 'Lead Won',
      subject: 'Lead Won – {{clientName}}',
      bodyHtml: `<div style="font-family:Arial,sans-serif;padding:24px;color:#1e293b;">
  <h2>Congratulations! A lead has been marked as Won.</h2>
  <table style="font-size:14px;border-collapse:collapse;">
    <tr><td style="padding:4px 12px;font-weight:600;">Client Name:</td><td style="padding:4px 12px;">{{clientName}}</td></tr>
    <tr><td style="padding:4px 12px;font-weight:600;">Insurance Type:</td><td style="padding:4px 12px;">{{insuranceType}}</td></tr>
    <tr><td style="padding:4px 12px;font-weight:600;">Expected Premium:</td><td style="padding:4px 12px;">{{expectedPremium}}</td></tr>
    <tr><td style="padding:4px 12px;font-weight:600;">Producer:</td><td style="padding:4px 12px;">{{producerName}}</td></tr>
  </table>
  <p style="color:#0f766e;margin-top:12px;font-weight:600;">Policy registration workflow has been triggered.</p>
</div>`,
      triggerType: 'lead_won',
      allowedFields: ['clientName', 'insuranceType', 'expectedPremium', 'producerName', 'leadSource'],
    },
    {
      name: 'Lead Lost',
      subject: 'Lead Lost – {{clientName}}',
      bodyHtml: `<div style="font-family:Arial,sans-serif;padding:24px;color:#1e293b;">
  <h2>A lead has been marked as Lost.</h2>
  <table style="font-size:14px;border-collapse:collapse;">
    <tr><td style="padding:4px 12px;font-weight:600;">Client Name:</td><td style="padding:4px 12px;">{{clientName}}</td></tr>
    <tr><td style="padding:4px 12px;font-weight:600;">Insurance Type:</td><td style="padding:4px 12px;">{{insuranceType}}</td></tr>
    <tr><td style="padding:4px 12px;font-weight:600;">Producer:</td><td style="padding:4px 12px;">{{producerName}}</td></tr>
  </table>
</div>`,
      triggerType: 'lead_lost',
      allowedFields: ['clientName', 'insuranceType', 'producerName', 'leadSource'],
    },
    {
      name: 'Lead Assigned',
      subject: 'Lead Assigned to You – {{clientName}}',
      bodyHtml: `<div style="font-family:Arial,sans-serif;padding:24px;color:#1e293b;">
  <h2>A lead has been assigned to you.</h2>
  <table style="font-size:14px;border-collapse:collapse;">
    <tr><td style="padding:4px 12px;font-weight:600;">Client Name:</td><td style="padding:4px 12px;">{{clientName}}</td></tr>
    <tr><td style="padding:4px 12px;font-weight:600;">Insurance Type:</td><td style="padding:4px 12px;">{{insuranceType}}</td></tr>
    <tr><td style="padding:4px 12px;font-weight:600;">Lead Source:</td><td style="padding:4px 12px;">{{leadSource}}</td></tr>
  </table>
  <p>Please review the lead in the CRM and initiate follow-up.</p>
</div>`,
      triggerType: 'lead_assigned',
      allowedFields: ['clientName', 'insuranceType', 'leadSource', 'producerName'],
    },
  ];

  for (const t of templates) {
    const exists = await EmailTemplate.findOne({ name: t.name });
    if (!exists) {
      await EmailTemplate.create({ ...t, createdBy: admin._id, isActive: true });
    }
  }
  console.log('[seed] Email templates seeded');

  // --- Default Email Rules ---
  const rules = [
    {
      name: 'Notify Manager on New Producer Lead',
      trigger: 'producer_creates_lead',
      description: 'When a producer creates a new lead, send selected details to the manager.',
      isActive: true,
      recipients: {
        manager: true,
        admin: false,
        producer: false,
        preconfiguredIds: [],
        customEmails: [],
      },
      selectedFields: ['clientName', 'insuranceType', 'expectedPremium', 'leadSource', 'producerName'],
    },
    {
      name: 'Notify Producer on Admin-Created Lead',
      trigger: 'admin_creates_lead',
      description: 'When admin creates a lead, notify the assigned producer.',
      isActive: true,
      recipients: { manager: false, admin: false, producer: true, preconfiguredIds: [], customEmails: [] },
      selectedFields: ['clientName', 'insuranceType', 'leadSource', 'notes'],
    },
    {
      name: 'Notify on Lead Won',
      trigger: 'lead_won',
      description: 'When a lead becomes Won, notify manager and configured operations recipients.',
      isActive: true,
      recipients: { manager: true, admin: false, producer: false, preconfiguredIds: [], customEmails: [] },
      selectedFields: ['clientName', 'insuranceType', 'expectedPremium', 'producerName'],
    },
    {
      name: 'Notify on Lead Lost',
      trigger: 'lead_lost',
      description: 'When a lead becomes Lost, notify configured recipients if enabled.',
      isActive: true,
      recipients: { manager: true, admin: false, producer: false, preconfiguredIds: [], customEmails: [] },
      selectedFields: ['clientName', 'insuranceType', 'producerName'],
    },
    {
      name: 'Notify New Producer on Assignment',
      trigger: 'lead_assigned',
      description: 'When a lead is assigned to another producer, notify the new producer.',
      isActive: true,
      recipients: { manager: false, admin: false, producer: true, preconfiguredIds: [], customEmails: [] },
      selectedFields: ['clientName', 'insuranceType', 'leadSource'],
    },
  ];

  for (const r of rules) {
    const exists = await EmailRule.findOne({ name: r.name });
    if (!exists) {
      // Link template if exists
      const templateNameMap = {
        producer_creates_lead: 'New Lead Created',
        admin_creates_lead: 'New Lead Created',
        lead_won: 'Lead Won',
        lead_lost: 'Lead Lost',
        lead_assigned: 'Lead Assigned',
      };
      const template = await EmailTemplate.findOne({ name: templateNameMap[r.trigger] });
      await EmailRule.create({ ...r, templateId: template?._id || null, createdBy: admin._id });
    }
  }
  console.log('[seed] Email rules seeded');

  // --- Sample Insurer ---
  let insurer = await Insurer.findOne({ companyName: 'GlobalGuard Insurance' });
  if (!insurer) {
    insurer = await Insurer.create({
      companyName: 'GlobalGuard Insurance',
      country: 'United States',
      website: 'https://globalguard.example.com',
      contactEmail: 'contact@globalguard.example.com',
      contactPhone: '+1-555-0100',
      status: 'Active',
      createdBy: admin._id,
    });
    console.log('[seed] Created sample insurer');
  }

  // --- Sample Product ---
  let product = await Product.findOne({ productName: 'Comprehensive Auto', insurerId: insurer._id });
  if (!product) {
    await Product.create({
      productName: 'Comprehensive Auto',
      insurerId: insurer._id,
      insuranceCategory: 'Motor Insurance',
      description: 'Full coverage auto insurance including third-party liability and own damage.',
      isActive: true,
      createdBy: admin._id,
    });
    console.log('[seed] Created sample product');
  }

  console.log('[seed] Seeding complete.');
  console.log('\n=================================');
  console.log('Default credentials:');
  console.log(`  Admin:    ${config.defaults.adminEmail} / ${config.defaults.adminPassword}`);
  console.log('  Manager:  manager@brokerage.com / Manager123!');
  console.log('  Producer:  producer@brokerage.com / Producer123!');
  console.log('=================================\n');

  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] Error:', err);
  process.exit(1);
});
