"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#22c55e", "#ef4444"];
const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e",
};

export default function SlaPage() {
  const { data } = useQuery({
    queryKey: ["sla-dashboard"],
    queryFn: async () => (await fetch("/api/dashboard/sla")).json(),
  });

  if (!data) {
    return <p className="text-center text-muted-foreground py-8">กำลังโหลด...</p>;
  }

  const complianceData = [
    { name: "ตอบกลับทันเวลา", value: data.totalWithSla - data.responseBreached },
    { name: "ตอบกลับเกิน SLA", value: data.responseBreached },
  ];

  const resolveComplianceData = [
    { name: "แก้ไขทันเวลา", value: data.totalWithSla - data.resolveBreached },
    { name: "แก้ไขเกิน SLA", value: data.resolveBreached },
  ];

  function formatMins(mins: number) {
    if (mins < 60) return `${mins} นาที`;
    if (mins < 1440) return `${(mins / 60).toFixed(1)} ชม.`;
    return `${(mins / 1440).toFixed(1)} วัน`;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">SLA Dashboard</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Response Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-500">{data.responseCompliance}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Resolve Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-500">{data.resolveCompliance}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">เวลาตอบกลับเฉลี่ย</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatMins(data.avgResponseMins)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">เวลาแก้ไขเฉลี่ย</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatMins(data.avgResolveMins)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">SLA Response Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            {data.totalWithSla > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={complianceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {complianceData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">ยังไม่มีข้อมูล</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">SLA Resolve Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            {data.totalWithSla > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={resolveComplianceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {resolveComplianceData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">ยังไม่มีข้อมูล</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SLA by Priority */}
      <Card className="mb-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">SLA Compliance ตามความสำคัญ</CardTitle>
        </CardHeader>
        <CardContent>
          {data.slaByPriority.some((p: { total: number }) => p.total > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.slaByPriority}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="priority" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="compliant" name="ทันเวลา" fill="#22c55e" />
                <Bar dataKey="breached" name="เกิน SLA" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">ยังไม่มีข้อมูล</p>
          )}
        </CardContent>
      </Card>

      {/* Breached Issues List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Issues ที่เกิน SLA ({data.breachedIssues.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {data.breachedIssues.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>หัวข้อ</TableHead>
                  <TableHead>ความสำคัญ</TableHead>
                  <TableHead>บริษัท</TableHead>
                  <TableHead>ทีม</TableHead>
                  <TableHead>ประเภท Breach</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.breachedIssues.map((issue: { id: string; title: string; priority: string; company: { name: string }; team: { name: string } | null; slaResponseBreached: boolean; slaResolveBreached: boolean }) => (
                  <TableRow key={issue.id}>
                    <TableCell>
                      <Link href={`/admin/issues/${issue.id}`} className="hover:underline">{issue.title}</Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={issue.priority === "critical" ? "destructive" : "outline"}>
                        {issue.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>{issue.company.name}</TableCell>
                    <TableCell>{issue.team?.name ?? "-"}</TableCell>
                    <TableCell>
                      {issue.slaResponseBreached && <Badge variant="destructive" className="mr-1">Response</Badge>}
                      {issue.slaResolveBreached && <Badge variant="destructive">Resolve</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">ไม่มี Issue ที่เกิน SLA</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
