"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useState } from "react";

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
  critical: "วิกฤต",
  high: "สูง",
  medium: "ปานกลาง",
  low: "ต่ำ",
};

const typeLabels: Record<string, string> = {
  bug: "Bug",
  feature_request: "Feature Request",
  question: "คำถาม",
  complaint: "ร้องเรียน",
  other: "อื่นๆ",
};

export default function CustomerIssuesPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data } = useQuery({
    queryKey: ["issues", statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/issues?${params}`);
      return res.json();
    },
  });

  const issues = data?.issues ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">รายการ Issue</h2>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="ทุกสถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกสถานะ</SelectItem>
              {Object.entries(statusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link href="/customer">
            <Button>แจ้งปัญหาใหม่</Button>
          </Link>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>หัวข้อ</TableHead>
            <TableHead>ประเภท</TableHead>
            <TableHead>ความสำคัญ</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead>วันที่แจ้ง</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {issues.map((issue: { id: string; title: string; type: string; priority: string; status: string; createdAt: string; _count: { comments: number } }) => (
            <TableRow key={issue.id}>
              <TableCell>
                <Link href={`/customer/issues/${issue.id}`} className="font-medium hover:underline">
                  {issue.title}
                </Link>
                {issue._count.comments > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({issue._count.comments} ความคิดเห็น)
                  </span>
                )}
              </TableCell>
              <TableCell>{typeLabels[issue.type] ?? issue.type}</TableCell>
              <TableCell>
                <Badge variant={issue.priority === "critical" ? "destructive" : "outline"}>
                  {priorityLabels[issue.priority] ?? issue.priority}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={statusColors[issue.status] ?? "outline"}>
                  {statusLabels[issue.status] ?? issue.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(issue.createdAt).toLocaleDateString("th-TH")}
              </TableCell>
            </TableRow>
          ))}
          {issues.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                ยังไม่มี Issue
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ก่อนหน้า
          </Button>
          <span className="flex items-center text-sm text-muted-foreground">
            หน้า {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            ถัดไป
          </Button>
        </div>
      )}
    </div>
  );
}
