"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const statusLabels: Record<string, string> = {
  open: "เปิด",
  in_progress: "กำลังดำเนินการ",
  waiting_customer: "รอลูกค้า",
  resolved: "แก้ไขแล้ว",
  closed: "ปิด",
};

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  open: "destructive",
  in_progress: "default",
  waiting_customer: "secondary",
  resolved: "outline",
  closed: "outline",
};

const priorityLabels: Record<string, string> = {
  critical: "วิกฤต", high: "สูง", medium: "ปานกลาง", low: "ต่ำ",
};

const typeLabels: Record<string, string> = {
  bug: "Bug", feature_request: "Feature Request", question: "คำถาม", complaint: "ร้องเรียน", other: "อื่นๆ",
};

export default function AdminIssuesPage() {
  const [filters, setFilters] = useState({
    status: "all", priority: "all", type: "all", teamId: "all", companyId: "all",
  });
  const [page, setPage] = useState(1);

  const { data: teamsData } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => (await fetch("/api/teams")).json(),
  });

  const { data: companiesData } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => (await fetch("/api/companies")).json(),
  });

  const { data } = useQuery({
    queryKey: ["admin-issues", filters, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (filters.status !== "all") params.set("status", filters.status);
      if (filters.priority !== "all") params.set("priority", filters.priority);
      if (filters.type !== "all") params.set("type", filters.type);
      if (filters.teamId !== "all") params.set("teamId", filters.teamId);
      if (filters.companyId !== "all") params.set("companyId", filters.companyId);
      return (await fetch(`/api/issues?${params}`)).json();
    },
  });

  const issues = data?.issues ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);
  const teams = teamsData?.teams ?? [];
  const companies = companiesData?.companies ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">รายการ Issue ทั้งหมด</h2>
        <span className="text-sm text-muted-foreground">{total} รายการ</span>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <Select value={filters.status} onValueChange={(v) => { setFilters({ ...filters, status: v }); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="สถานะ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกสถานะ</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.priority} onValueChange={(v) => { setFilters({ ...filters, priority: v }); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="ความสำคัญ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกระดับ</SelectItem>
            {Object.entries(priorityLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.type} onValueChange={(v) => { setFilters({ ...filters, type: v }); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="ประเภท" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกประเภท</SelectItem>
            {Object.entries(typeLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.teamId} onValueChange={(v) => { setFilters({ ...filters, teamId: v }); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="ทีม" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกทีม</SelectItem>
            {teams.map((t: { id: string; name: string }) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.companyId} onValueChange={(v) => { setFilters({ ...filters, companyId: v }); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="บริษัท" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกบริษัท</SelectItem>
            {companies.map((c: { id: string; name: string }) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>หัวข้อ</TableHead>
            <TableHead>ประเภท</TableHead>
            <TableHead>ความสำคัญ</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead>บริษัท</TableHead>
            <TableHead>ทีม</TableHead>
            <TableHead>ผู้รับผิดชอบ</TableHead>
            <TableHead>วันที่แจ้ง</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {issues.map((issue: { id: string; title: string; type: string; priority: string; status: string; company: { name: string }; team: { name: string } | null; assignee: { name: string } | null; createdAt: string; slaResponseBreached: boolean; slaResolveBreached: boolean }) => (
            <TableRow key={issue.id} className={issue.slaResponseBreached || issue.slaResolveBreached ? "bg-destructive/5" : ""}>
              <TableCell>
                <Link href={`/admin/issues/${issue.id}`} className="font-medium hover:underline">
                  {issue.title}
                </Link>
                {(issue.slaResponseBreached || issue.slaResolveBreached) && (
                  <Badge variant="destructive" className="ml-2 text-xs">SLA</Badge>
                )}
              </TableCell>
              <TableCell>{typeLabels[issue.type] ?? issue.type}</TableCell>
              <TableCell>
                <Badge variant={issue.priority === "critical" ? "destructive" : "outline"}>
                  {priorityLabels[issue.priority]}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={statusColors[issue.status] ?? "outline"}>
                  {statusLabels[issue.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">{issue.company.name}</TableCell>
              <TableCell className="text-sm">{issue.team?.name ?? "-"}</TableCell>
              <TableCell className="text-sm">{issue.assignee?.name ?? "-"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(issue.createdAt).toLocaleDateString("th-TH")}
              </TableCell>
            </TableRow>
          ))}
          {issues.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                ไม่พบ Issue
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>ก่อนหน้า</Button>
          <span className="flex items-center text-sm text-muted-foreground">หน้า {page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>ถัดไป</Button>
        </div>
      )}
    </div>
  );
}
