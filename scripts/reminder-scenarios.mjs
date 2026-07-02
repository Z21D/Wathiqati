import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEST_PREFIX = "eg-reminder-test";
const ORG_A_SLUG = `${TEST_PREFIX}-tenant-a`;
const ORG_B_SLUG = `${TEST_PREFIX}-tenant-b`;
const TEST_ORG_NAMES = ["Reminder Test Tenant A", "Reminder Test Tenant B"];
const TEST_USER_NAMES = ["Reminder Test User A", "Reminder Test User B"];
const USER_A_EMAIL =
  process.env.REMINDER_TEST_USER_A_EMAIL ?? "reminder-user-a@example.com";
const USER_B_EMAIL =
  process.env.REMINDER_TEST_USER_B_EMAIL ?? "reminder-user-b@example.com";
const USER_A_NOTIFY =
  process.env.REMINDER_TEST_USER_A_NOTIFY_EMAIL ??
  process.env.RESEND_TEST_TO ??
  USER_A_EMAIL;
const USER_B_NOTIFY =
  process.env.REMINDER_TEST_USER_B_NOTIFY_EMAIL ??
  process.env.RESEND_TEST_TO ??
  USER_B_EMAIL;
const expiredFrequencyArg = process.argv.includes("--expired=daily")
  ? "daily"
  : "once";

const scenarios = [
  {
    tenant: "A",
    company: "Reminder Test Tenant A",
    employee: "Tenant A Thirty Day",
    documentType: "Thirty Day Permit",
    referenceId: "A-REM-30",
    daysFromNow: 30,
    reminderKey: "REMINDER_30",
  },
  {
    tenant: "A",
    company: "Reminder Test Tenant A",
    employee: "Tenant A Fourteen Day",
    documentType: "Fourteen Day Permit",
    referenceId: "A-REM-14",
    daysFromNow: 14,
    reminderKey: "REMINDER_14",
  },
  {
    tenant: "A",
    company: "Reminder Test Tenant A",
    employee: "Tenant A Tomorrow",
    documentType: "Tomorrow Permit",
    referenceId: "A-REM-1",
    daysFromNow: 1,
    reminderKey: "REMINDER_1",
  },
  {
    tenant: "A",
    company: "Reminder Test Tenant A",
    employee: "Tenant A Seven Day",
    documentType: "Seven Day Permit",
    referenceId: "A-REM-7",
    daysFromNow: 7,
    reminderKey: "REMINDER_7",
  },
  {
    tenant: "A",
    company: "Reminder Test Tenant A",
    employee: "Tenant A Expired",
    documentType: "Expired Permit",
    referenceId: "A-REM-EXPIRED",
    daysFromNow: -1,
    reminderKey: "REMINDER_EXPIRED",
  },
  {
    tenant: "B",
    company: "Reminder Test Tenant B",
    employee: "Tenant B Tomorrow",
    documentType: "Tenant B Permit",
    referenceId: "B-REM-1",
    daysFromNow: 1,
    reminderKey: "REMINDER_1",
  },
];

const command = process.argv[2] ?? "help";

try {
  switch (command) {
    case "seed":
      assertNotProductionSeed();
      await seed(expiredFrequencyArg);
      break;
    case "seed-daily-expired":
      assertNotProductionSeed();
      await seed("daily");
      break;
    case "reset-logs":
      await resetLogs();
      break;
    case "simulate-next-expired-day":
      await simulateNextExpiredDay();
      break;
    case "inspect":
      await inspect();
      break;
    case "cleanup":
      await cleanup();
      break;
    case "verify-clean":
      await verifyClean();
      break;
    default:
      printHelp();
  }
} finally {
  await prisma.$disconnect();
}

async function seed(expiredReminderFrequency = "once") {
  await cleanup({ silent: true });

  const userA = await prisma.user.create({
    data: {
      email: USER_A_EMAIL,
      name: "Reminder Test User A",
      notificationEmail: USER_A_NOTIFY,
      emailRemindersEnabled: true,
      reminderSchedule: "30,14,7,3,1,expired",
      expiredReminderFrequency,
    },
  });
  const userB = await prisma.user.create({
    data: {
      email: USER_B_EMAIL,
      name: "Reminder Test User B",
      notificationEmail: USER_B_NOTIFY,
      emailRemindersEnabled: true,
      reminderSchedule: "30,14,7,3,1,expired",
      expiredReminderFrequency: "once",
    },
  });

  const orgA = await prisma.organization.create({
    data: {
      name: "Reminder Test Tenant A",
      slug: ORG_A_SLUG,
      isTestData: true,
      members: { create: { userId: userA.id, role: "OWNER" } },
    },
  });
  const orgB = await prisma.organization.create({
    data: {
      name: "Reminder Test Tenant B",
      slug: ORG_B_SLUG,
      isTestData: true,
      members: { create: { userId: userB.id, role: "OWNER" } },
    },
  });

  const companyA = await prisma.company.create({
    data: { name: "Reminder Test Tenant A", organizationId: orgA.id },
  });
  const companyB = await prisma.company.create({
    data: { name: "Reminder Test Tenant B", organizationId: orgB.id },
  });

  for (const scenario of scenarios) {
    const organizationId = scenario.tenant === "A" ? orgA.id : orgB.id;
    const companyId = scenario.tenant === "A" ? companyA.id : companyB.id;

    await prisma.document.create({
      data: {
        organizationId,
        companyId,
        employeeName: scenario.employee,
        documentType: scenario.documentType,
        referenceId: scenario.referenceId,
        expiresAt: dateInDays(scenario.daysFromNow),
        description: `${TEST_PREFIX} ${scenario.reminderKey}`,
      },
    });
  }

  console.log("Seeded reminder scenarios.");
  console.log(
    JSON.stringify(
      {
        tenantA: {
          organization: orgA.slug,
          userEmail: userA.email,
          notificationEmail: userA.notificationEmail,
          expiredReminderFrequency: userA.expiredReminderFrequency,
          scenarios: ["30-day", "14-day", "7-day", "3-day", "1-day", "expired"],
        },
        tenantB: {
          organization: orgB.slug,
          userEmail: userB.email,
          notificationEmail: userB.notificationEmail,
          scenarios: ["1-day"],
        },
        warning:
          USER_A_NOTIFY === USER_B_NOTIFY
            ? "Tenant A and B notification emails are the same. Use REMINDER_TEST_USER_A_NOTIFY_EMAIL and REMINDER_TEST_USER_B_NOTIFY_EMAIL for inbox-level isolation testing."
            : undefined,
      },
      null,
      2
    )
  );
}

async function resetLogs() {
  const orgIds = await getTestOrganizationIds();
  const documents = await prisma.document.findMany({
    where: { organizationId: { in: orgIds } },
    select: { id: true },
  });

  const result = await prisma.notificationLog.deleteMany({
    where: {
      OR: [
        { organizationId: { in: orgIds } },
        { documentId: { in: documents.map((document) => document.id) } },
      ],
    },
  });

  console.log(`Deleted ${result.count} reminder test notification logs.`);
}

async function inspect() {
  const orgs = await prisma.organization.findMany({
    where: { slug: { in: [ORG_A_SLUG, ORG_B_SLUG] } },
    include: {
      members: { include: { user: true } },
      documents: { include: { company: true } },
    },
    orderBy: { slug: "asc" },
  });

  const logs = await prisma.notificationLog.findMany({
    where: { organizationId: { in: orgs.map((org) => org.id) } },
    orderBy: { sentAt: "asc" },
  });

  const checks = [];

  for (const scenario of scenarios) {
    const org = orgs.find((item) =>
      scenario.tenant === "A" ? item.slug === ORG_A_SLUG : item.slug === ORG_B_SLUG
    );
    const document = org?.documents.find(
      (item) => item.referenceId === scenario.referenceId
    );
    const user = org?.members[0]?.user;
    const scenarioLogs = logs.filter(
      (log) =>
        log.documentId === document?.id &&
        log.userId === user?.id &&
        reminderKeyMatches(log.reminderKey, scenario.reminderKey) &&
        log.status === "SENT"
    );

    checks.push({
      tenant: scenario.tenant,
      referenceId: scenario.referenceId,
      reminderKey: scenario.reminderKey,
      expectedRecipient: user?.notificationEmail || user?.email,
      actualReminderKeys: scenarioLogs.map((log) => log.reminderKey),
      sentCount: scenarioLogs.length,
      pass: scenarioLogs.length === 1,
    });
  }

  const crossTenantLeaks = logs.filter((log) => {
    const org = orgs.find((item) => item.id === log.organizationId);
    if (!org) return false;
    const user = org.members[0]?.user;
    return log.userId !== user?.id || log.userEmail !== (user.notificationEmail || user.email);
  });

  const duplicateFailures = checks.filter((check) => !check.pass);

  console.log(
    JSON.stringify(
      {
        totals: {
          sentLogs: logs.filter((log) => log.status === "SENT").length,
          failedLogs: logs.filter((log) => log.status === "FAILED").length,
          crossTenantLeaks: crossTenantLeaks.length,
          duplicateOrMissingFailures: duplicateFailures.length,
        },
        checks,
        failedLogs: logs
          .filter((log) => log.status === "FAILED")
          .map((log) => ({
            userEmail: log.userEmail,
            reminderKey: log.reminderKey,
            error: log.error,
          })),
        pass:
          duplicateFailures.length === 0 &&
          crossTenantLeaks.length === 0 &&
          logs.filter((log) => log.status === "FAILED").length === 0,
      },
      null,
      2
    )
  );
}

async function simulateNextExpiredDay() {
  const orgs = await prisma.organization.findMany({
    where: { slug: { in: [ORG_A_SLUG, ORG_B_SLUG] } },
    include: { documents: true },
  });
  const expiredDocumentIds = orgs.flatMap((org) =>
    org.documents
      .filter((document) => document.referenceId.endsWith("EXPIRED"))
      .map((document) => document.id)
  );
  const yesterdayKey = `REMINDER_EXPIRED:${dateKey(dateInDays(-1))}`;

  const result = await prisma.notificationLog.updateMany({
    where: {
      documentId: { in: expiredDocumentIds },
      reminderKey: { startsWith: "REMINDER_EXPIRED" },
      status: "SENT",
    },
    data: { reminderKey: yesterdayKey },
  });

  console.log(
    `Moved ${result.count} expired reminder log(s) to ${yesterdayKey}. Run cron again to verify daily expired reminders send once for today.`
  );
}

async function cleanup(options = {}) {
  const orgs = await getTestOrganizations();
  const orgIds = orgs.map((org) => org.id);
  const testUsers = await getTestUsers();
  const userIds = testUsers.map((user) => user.id);
  const documents = await prisma.document.findMany({
    where: {
      OR: [
        { organizationId: { in: orgIds } },
        { description: { startsWith: TEST_PREFIX } },
        { referenceId: { startsWith: "A-REM-" } },
        { referenceId: { startsWith: "B-REM-" } },
      ],
    },
    select: { id: true },
  });
  const documentIds = documents.map((document) => document.id);

  const notificationLogResult = await prisma.notificationLog.deleteMany({
    where: {
      OR: [
        { organizationId: { in: orgIds } },
        { documentId: { in: documentIds } },
        { userId: { in: userIds } },
      ],
    },
  });
  const alertReadResult = await prisma.alertRead.deleteMany({
    where: {
      OR: [
        { organizationId: { in: orgIds } },
        { documentId: { in: documentIds } },
        { userId: { in: userIds } },
      ],
    },
  });
  const documentResult = await prisma.document.deleteMany({
    where: {
      OR: [
        { id: { in: documentIds } },
        { organizationId: { in: orgIds } },
      ],
    },
  });
  const importLogResult = await prisma.importLog.deleteMany({
    where: { organizationId: { in: orgIds } },
  });
  const companyResult = await prisma.company.deleteMany({
    where: { organizationId: { in: orgIds } },
  });
  const membershipResult = await prisma.organizationMember.deleteMany({
    where: {
      OR: [
        { organizationId: { in: orgIds } },
        { userId: { in: userIds } },
      ],
    },
  });
  const organizationResult = await prisma.organization.deleteMany({
    where: { id: { in: orgIds } },
  });
  const accountResult = await prisma.account.deleteMany({
    where: { userId: { in: userIds } },
  });
  const sessionResult = await prisma.session.deleteMany({
    where: { userId: { in: userIds } },
  });

  const userResult = await prisma.user.deleteMany({
    where: { id: { in: userIds } },
  });

  if (!options.silent) {
    console.log(
      JSON.stringify(
        {
          cleaned: {
            organizations: organizationResult.count,
            users: userResult.count,
            memberships: membershipResult.count,
            documents: documentResult.count,
            companies: companyResult.count,
            importLogs: importLogResult.count,
            alertReads: alertReadResult.count,
            notificationLogs: notificationLogResult.count,
            accounts: accountResult.count,
            sessions: sessionResult.count,
          },
        },
        null,
        2
      )
    );
  }
}

async function getTestOrganizationIds() {
  const orgs = await getTestOrganizations();

  return orgs.map((org) => org.id);
}

async function getTestOrganizations() {
  return prisma.organization.findMany({
    where: {
      OR: [
        { isTestData: true },
        { slug: { in: [ORG_A_SLUG, ORG_B_SLUG] } },
        { slug: { startsWith: TEST_PREFIX } },
        { name: { in: TEST_ORG_NAMES } },
        { name: { startsWith: "Reminder Test Tenant" } },
      ],
    },
    select: { id: true },
  });
}

async function getTestUsers() {
  return prisma.user.findMany({
    where: {
      OR: [
        { email: { in: [USER_A_EMAIL, USER_B_EMAIL] } },
        { name: { in: TEST_USER_NAMES } },
        { name: { startsWith: "Reminder Test User" } },
      ],
    },
    select: { id: true },
  });
}

async function verifyClean() {
  const testOrgs = await prisma.organization.findMany({
    where: {
      OR: [
        { isTestData: true },
        { slug: { startsWith: TEST_PREFIX } },
        { slug: { in: [ORG_A_SLUG, ORG_B_SLUG] } },
        { name: { in: TEST_ORG_NAMES } },
        { name: { startsWith: "Reminder Test Tenant" } },
      ],
    },
    include: {
      members: { include: { user: true } },
      _count: { select: { documents: true, companies: true, importLogs: true } },
    },
  });
  const testUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { in: [USER_A_EMAIL, USER_B_EMAIL] } },
        { name: { startsWith: "Reminder Test User" } },
      ],
    },
    select: {
      id: true,
      email: true,
      notificationEmail: true,
      name: true,
    },
  });
  const testDocuments = await prisma.document.findMany({
    where: {
      OR: [
        { description: { startsWith: TEST_PREFIX } },
        { referenceId: { startsWith: "A-REM-" } },
        { referenceId: { startsWith: "B-REM-" } },
      ],
    },
    select: { id: true, organizationId: true, documentType: true, referenceId: true },
  });
  const testNotificationLogs = await prisma.notificationLog.findMany({
    where: {
      OR: [
        { organizationId: { in: testOrgs.map((org) => org.id) } },
        { documentId: { in: testDocuments.map((document) => document.id) } },
        { userId: { in: testUsers.map((user) => user.id) } },
      ],
    },
    select: {
      id: true,
      organizationId: true,
      userId: true,
      userEmail: true,
      reminderKey: true,
    },
  });
  const realEmailLeaks = testUsers.filter((user) => {
    const email = user.notificationEmail || user.email;
    return Boolean(email) && !email.endsWith("@example.com");
  });

  const [
    orphanDocuments,
    orphanCompanies,
    orphanMembershipsNoUser,
    orphanMembershipsNoOrg,
    orphanImportLogs,
    orphanAlertReads,
    orphanNotificationLogsNoUser,
    orphanNotificationLogsNoOrg,
    authAccountsNoUser,
    authSessionsNoUser,
  ] = await Promise.all([
    rawQuery('SELECT d.id FROM "Document" d LEFT JOIN "Organization" o ON o.id = d."organizationId" WHERE o.id IS NULL'),
    rawQuery('SELECT c.id FROM "Company" c LEFT JOIN "Organization" o ON o.id = c."organizationId" WHERE o.id IS NULL'),
    rawQuery('SELECT m.id FROM "OrganizationMember" m LEFT JOIN "User" u ON u.id = m."userId" WHERE u.id IS NULL'),
    rawQuery('SELECT m.id FROM "OrganizationMember" m LEFT JOIN "Organization" o ON o.id = m."organizationId" WHERE o.id IS NULL'),
    rawQuery('SELECT l.id FROM "ImportLog" l LEFT JOIN "Organization" o ON o.id = l."organizationId" WHERE o.id IS NULL'),
    rawQuery('SELECT a.id FROM "AlertRead" a LEFT JOIN "Organization" o ON o.id = a."organizationId" LEFT JOIN "Document" d ON d.id = a."documentId" LEFT JOIN "User" u ON u.id = a."userId" WHERE o.id IS NULL OR d.id IS NULL OR u.id IS NULL'),
    rawQuery('SELECT n.id FROM "NotificationLog" n LEFT JOIN "User" u ON u.id = n."userId" WHERE u.id IS NULL'),
    rawQuery('SELECT n.id FROM "NotificationLog" n LEFT JOIN "Organization" o ON o.id = n."organizationId" WHERE o.id IS NULL'),
    rawQuery('SELECT a.id FROM "Account" a LEFT JOIN "User" u ON u.id = a."userId" WHERE u.id IS NULL'),
    rawQuery('SELECT s.id FROM "Session" s LEFT JOIN "User" u ON u.id = s."userId" WHERE u.id IS NULL'),
  ]);

  const orphanCounts = {
    orphanDocuments: orphanDocuments.length,
    orphanCompanies: orphanCompanies.length,
    orphanMembershipsNoUser: orphanMembershipsNoUser.length,
    orphanMembershipsNoOrg: orphanMembershipsNoOrg.length,
    orphanImportLogs: orphanImportLogs.length,
    orphanAlertReads: orphanAlertReads.length,
    orphanNotificationLogsNoUser: orphanNotificationLogsNoUser.length,
    orphanNotificationLogsNoOrg: orphanNotificationLogsNoOrg.length,
    authAccountsNoUser: authAccountsNoUser.length,
    authSessionsNoUser: authSessionsNoUser.length,
  };
  const pass =
    testOrgs.length === 0 &&
    testUsers.length === 0 &&
    testDocuments.length === 0 &&
    testNotificationLogs.length === 0 &&
    realEmailLeaks.length === 0 &&
    Object.values(orphanCounts).every((count) => count === 0);

  console.log(
    JSON.stringify(
      {
        pass,
        environment: process.env.NODE_ENV ?? "development",
        checks: {
          testOrganizations: testOrgs.length,
          testUsers: testUsers.length,
          testDocuments: testDocuments.length,
          testNotificationLogs: testNotificationLogs.length,
          testUsersPointingToRealEmails: realEmailLeaks.length,
          organizationsWithIsTestDataTrueBeingScannedInProduction: testOrgs.filter(
            (org) => org.isTestData
          ).length,
          orphanCounts,
        },
        testOrganizations: testOrgs.map((org) => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          isTestData: org.isTestData,
          documents: org._count.documents,
          companies: org._count.companies,
          importLogs: org._count.importLogs,
          members: org.members.map((member) => ({
            userId: member.userId,
            email: member.user.email,
            notificationEmail: member.user.notificationEmail,
          })),
        })),
      },
      null,
      2
    )
  );

  if (!pass) {
    process.exitCode = 1;
  }
}

async function rawQuery(sql) {
  return prisma.$queryRawUnsafe(sql);
}

function assertNotProductionSeed() {
  if (process.env.NODE_ENV !== "production") return;

  console.error(
    "Refusing to seed reminder test data in production. Test reminder tenants can send real emails and must only be created in local development."
  );
  process.exit(1);
}

function dateInDays(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function reminderKeyMatches(actual, expected) {
  if (expected === "REMINDER_EXPIRED") {
    return actual === expected || actual?.startsWith(`${expected}:`);
  }

  return actual === expected;
}

function printHelp() {
  console.log(`Usage:
  node scripts/reminder-scenarios.mjs seed
  node scripts/reminder-scenarios.mjs seed --expired=daily
  node scripts/reminder-scenarios.mjs seed-daily-expired
  node scripts/reminder-scenarios.mjs reset-logs
  node scripts/reminder-scenarios.mjs simulate-next-expired-day
  node scripts/reminder-scenarios.mjs inspect
  node scripts/reminder-scenarios.mjs cleanup
  node scripts/reminder-scenarios.mjs verify-clean

Optional env:
  REMINDER_TEST_USER_A_EMAIL
  REMINDER_TEST_USER_A_NOTIFY_EMAIL
  REMINDER_TEST_USER_B_EMAIL
  REMINDER_TEST_USER_B_NOTIFY_EMAIL
`);
}
