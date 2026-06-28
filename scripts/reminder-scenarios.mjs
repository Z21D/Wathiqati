import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEST_PREFIX = "eg-reminder-test";
const ORG_A_SLUG = `${TEST_PREFIX}-tenant-a`;
const ORG_B_SLUG = `${TEST_PREFIX}-tenant-b`;
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
      await seed(expiredFrequencyArg);
      break;
    case "seed-daily-expired":
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
      members: { create: { userId: userA.id, role: "OWNER" } },
    },
  });
  const orgB = await prisma.organization.create({
    data: {
      name: "Reminder Test Tenant B",
      slug: ORG_B_SLUG,
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
        { userEmail: { in: [USER_A_EMAIL, USER_B_EMAIL, USER_A_NOTIFY, USER_B_NOTIFY] } },
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
  const orgs = await prisma.organization.findMany({
    where: { slug: { in: [ORG_A_SLUG, ORG_B_SLUG] } },
    select: { id: true },
  });
  const orgIds = orgs.map((org) => org.id);

  if (orgIds.length > 0) {
    await prisma.notificationLog.deleteMany({
      where: { organizationId: { in: orgIds } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: orgIds } },
    });
  }

  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { in: [USER_A_EMAIL, USER_B_EMAIL] } },
        { name: { startsWith: "Reminder Test User" } },
      ],
    },
  });

  if (!options.silent) console.log("Cleaned reminder test data.");
}

async function getTestOrganizationIds() {
  const orgs = await prisma.organization.findMany({
    where: { slug: { in: [ORG_A_SLUG, ORG_B_SLUG] } },
    select: { id: true },
  });

  return orgs.map((org) => org.id);
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

Optional env:
  REMINDER_TEST_USER_A_EMAIL
  REMINDER_TEST_USER_A_NOTIFY_EMAIL
  REMINDER_TEST_USER_B_EMAIL
  REMINDER_TEST_USER_B_NOTIFY_EMAIL
`);
}
