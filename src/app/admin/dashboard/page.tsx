"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const statusLabels: Record<string, string> = {
  open: "เปิด", in_progress: "กำลังดำเนินการ", waiting_customer: "รอลูกค้า",
  resolved: "แก้ไขแล้ว", closed: "ปิด",
};
const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  open: "destructive", in_progress: "default", waiting_customer: "secondary",
  resolved: "outline", closed: "outline",
};

export default function DashboardPage() {
  const { data } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => (await fetch("/api/dashboard/stats")).json(),
  });

  const stats = data ?? {};

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">แดชบอร์ด</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">ทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalIssues ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">เปิดอยู่</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-500">{stats.openIssues ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">กำลังดำเนินการ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-500">{stats.inProgressIssues ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">แก้ไขแล้ว</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-500">{stats.resolvedIssues ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">SLA Response</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{stats.slaResponseBreached ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">SLA Resolve</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{stats.slaResolveBreached ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">ตามสถานะ</CardTitle>
          </CardHeader>
          <CardContent>
            {(stats.issuesByStatus ?? []).map((s: { status: string; count: number }) => (
              <div key={s.status} className="flex items-center justify-between py-1">
                <Badge variant={statusColors[s.status]}>{statusLabels[s.status]}</Badge>
                <span className="font-medium">{s.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">ตามความสำคัญ</CardTitle>
          </CardHeader>
          <CardContent>
            {(stats.issuesByPriority ?? []).map((p: { priority: string; count: number }) => (
              <div key={p.priority} className="flex items-center justify-between py-1">
                <span className="capitalize">{p.priority}</span>
                <span className="font-medium">{p.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">ตามประเภท</CardTitle>
          </CardHeader>
          <CardContent>
            {(stats.issuesByType ?? []).map((t: { type: string; count: number }) => (
              <div key={t.type} className="flex items-center justify-between py-1">
                <span>{t.type}</span>
                <span className="font-medium">{t.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Issues */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Issue ล่าสุด</CardTitle>
          <Link href="/admin/issues" className="text-sm text-primary hover:underline">ดูทั้งหมด</Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>หัวข้อ</TableHead>
                <TableHead>บริษัท</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>วันที่</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(stats.recentIssues ?? []).map((issue: { id: string; title: string; company: { name: string }; status: string; createdAt: string }) => (
                <TableRow key={issue.id}>
                  <TableCell>
                    <Link href={`/admin/issues/${issue.id}`} className="hover:underline">
                      {issue.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{issue.company.name}</TableCell>
                  <TableCell>
                    <Badge variant={statusColors[issue.status]}>{statusLabels[issue.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(issue.createdAt).toLocaleDateString("th-TH")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
