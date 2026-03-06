import { describe, it, expect, beforeAll } from "vitest";

const BASE = "http://localhost:2028";

let adminCookie: string;
let customerCookie: string;
let testIssueId: string;

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    redirect: "manual",
  });
  expect(res.ok).toBe(true);
  const cookies = res.headers.getSetCookie();
  return cookies.map((c) => c.split(";")[0]).join("; ");
}

function authed(cookie: string) {
  return { headers: { Cookie: cookie } };
}

describe("Auth API", () => {
  it("POST /api/auth/login - success", async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@demo.com", password: "Password123!" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.email).toBe("admin@demo.com");
    expect(data.user.role).toBe("admin");
  });

  it("POST /api/auth/login - wrong password", async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@demo.com", password: "wrong" }),
    });
    expect(res.status).toBe(401);
  });

  it("GET /api/auth/me - unauthenticated", async () => {
    const res = await fetch(`${BASE}/api/auth/me`);
    expect(res.status).toBe(401);
  });

  it("GET /api/auth/me - authenticated", async () => {
    adminCookie = await login("admin@demo.com", "Password123!");
    const res = await fetch(`${BASE}/api/auth/me`, authed(adminCookie));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.role).toBe("admin");
  });
});

describe("Company API", () => {
  beforeAll(async () => {
    adminCookie = adminCookie || await login("admin@demo.com", "Password123!");
  });

  it("GET /api/companies - list", async () => {
    const res = await fetch(`${BASE}/api/companies`, authed(adminCookie));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.companies.length).toBeGreaterThan(0);
  });
});

describe("Team API", () => {
  beforeAll(async () => {
    adminCookie = adminCookie || await login("admin@demo.com", "Password123!");
  });

  it("GET /api/teams - list", async () => {
    const res = await fetch(`${BASE}/api/teams`, authed(adminCookie));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.teams.length).toBeGreaterThan(0);
  });
});

describe("Issue API", () => {
  beforeAll(async () => {
    adminCookie = adminCookie || await login("admin@demo.com", "Password123!");
    customerCookie = await login("customer1@demo.com", "Password123!");
  });

  it("POST /api/issues - create as customer", async () => {
    const res = await fetch(`${BASE}/api/issues`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: customerCookie },
      body: JSON.stringify({
        title: "Test Issue from vitest",
        description: "This is a test issue created by automated tests",
        type: "bug",
        priority: "high",
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.issue.title).toBe("Test Issue from vitest");
    expect(data.issue.status).toBe("open");
    expect(data.issue.slaResponseDeadline).toBeTruthy();
    expect(data.issue.slaResolveDeadline).toBeTruthy();
    testIssueId = data.issue.id;
  });

  it("GET /api/issues - list as customer (own company only)", async () => {
    const res = await fetch(`${BASE}/api/issues`, authed(customerCookie));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.issues.length).toBeGreaterThan(0);
    // All issues should be from same company
    const companyIds = new Set(data.issues.map((i: { company: { id: string } }) => i.company.id));
    expect(companyIds.size).toBe(1);
  });

  it("GET /api/issues - list as admin (all issues)", async () => {
    const res = await fetch(`${BASE}/api/issues`, authed(adminCookie));
    expect(res.status).toBe(200);
    const data = await res.json();
    // Admin sees all companies
    const companyIds = new Set(data.issues.map((i: { company: { id: string } }) => i.company.id));
    expect(companyIds.size).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/issues/:id - detail", async () => {
    const res = await fetch(`${BASE}/api/issues/${testIssueId}`, authed(customerCookie));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.issue.title).toBe("Test Issue from vitest");
    expect(data.issue.statusLogs.length).toBeGreaterThan(0);
  });

  it("PUT /api/issues/:id/status - transition open -> in_progress", async () => {
    const res = await fetch(`${BASE}/api/issues/${testIssueId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ status: "in_progress" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.issue.status).toBe("in_progress");
  });

  it("PUT /api/issues/:id/status - invalid transition", async () => {
    const res = await fetch(`${BASE}/api/issues/${testIssueId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ status: "closed" }),
    });
    expect(res.status).toBe(400);
  });

  it("PUT /api/issues/:id/status - customer cannot change status", async () => {
    const res = await fetch(`${BASE}/api/issues/${testIssueId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: customerCookie },
      body: JSON.stringify({ status: "resolved" }),
    });
    expect(res.status).toBe(403);
  });

  it("POST /api/issues/:id/comments - add comment", async () => {
    const res = await fetch(`${BASE}/api/issues/${testIssueId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: customerCookie },
      body: JSON.stringify({ content: "Test comment from vitest" }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.comment.content).toBe("Test comment from vitest");
  });

  it("GET /api/issues/:id/comments - list comments", async () => {
    const res = await fetch(`${BASE}/api/issues/${testIssueId}/comments`, authed(customerCookie));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.comments.length).toBeGreaterThan(0);
  });
});

describe("SLA API", () => {
  beforeAll(async () => {
    adminCookie = adminCookie || await login("admin@demo.com", "Password123!");
  });

  it("GET /api/sla-policies - list", async () => {
    const res = await fetch(`${BASE}/api/sla-policies`, authed(adminCookie));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.policies.length).toBe(4);
    const critical = data.policies.find((p: { priority: string }) => p.priority === "critical");
    expect(critical.responseTimeMins).toBe(30);
    expect(critical.resolveTimeMins).toBe(240);
  });
});

describe("Dashboard API", () => {
  beforeAll(async () => {
    adminCookie = adminCookie || await login("admin@demo.com", "Password123!");
  });

  it("GET /api/dashboard/stats - returns stats", async () => {
    const res = await fetch(`${BASE}/api/dashboard/stats`, authed(adminCookie));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalIssues).toBeGreaterThan(0);
    expect(data.issuesByStatus).toBeDefined();
    expect(data.issuesByPriority).toBeDefined();
    expect(data.recentIssues.length).toBeGreaterThan(0);
  });

  it("GET /api/dashboard/sla - returns SLA data", async () => {
    const res = await fetch(`${BASE}/api/dashboard/sla`, authed(adminCookie));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.responseCompliance).toBeDefined();
    expect(data.slaByPriority.length).toBe(4);
  });

  it("GET /api/dashboard/stats - forbidden for customer", async () => {
    const res = await fetch(`${BASE}/api/dashboard/stats`, authed(customerCookie));
    expect(res.status).toBe(403);
  });
});

describe("Notifications API", () => {
  beforeAll(async () => {
    adminCookie = adminCookie || await login("admin@demo.com", "Password123!");
  });

  it("GET /api/notifications - list", async () => {
    const res = await fetch(`${BASE}/api/notifications`, authed(adminCookie));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.notifications).toBeDefined();
    expect(typeof data.unreadCount).toBe("number");
  });

  it("PUT /api/notifications - mark all read", async () => {
    const res = await fetch(`${BASE}/api/notifications`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ markAllRead: true }),
    });
    expect(res.status).toBe(200);
  });
});
