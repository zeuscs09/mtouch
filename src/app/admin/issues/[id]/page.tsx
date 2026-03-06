"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const statusLabels: Record<string, string> = {
  open: "เปิด", in_progress: "กำลังดำเนินการ", waiting_customer: "รอลูกค้า",
  resolved: "แก้ไขแล้ว", closed: "ปิด",
};
const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  open: "destructive", in_progress: "default", waiting_customer: "secondary",
  resolved: "outline", closed: "outline",
};
const priorityLabels: Record<string, string> = {
  critical: "วิกฤต", high: "สูง", medium: "ปานกลาง", low: "ต่ำ",
};
const typeLabels: Record<string, string> = {
  bug: "Bug", feature_request: "Feature Request", question: "คำถาม",
  complaint: "ร้องเรียน", other: "อื่นๆ",
};

const validTransitions: Record<string, string[]> = {
  open: ["in_progress"],
  in_progress: ["waiting_customer", "resolved"],
  waiting_customer: ["in_progress", "resolved"],
  resolved: ["closed", "in_progress"],
  closed: ["open"],
};

export default function AdminIssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");

  const { data } = useQuery({
    queryKey: ["issue", id],
    queryFn: async () => {
      const res = await fetch(`/api/issues/${id}`);
      if (!res.ok) throw new Error("Issue not found");
      return res.json();
    },
  });

  const { data: teamsData } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => (await fetch("/api/teams")).json(),
  });

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await fetch("/api/users")).json(),
  });

  const changeStatus = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/issues/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["issue", id] }),
  });

  const updateIssue = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/issues/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["issue", id] }),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/issues/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue", id] });
      setComment("");
    },
  });

  const issue = data?.issue;
  const teams = teamsData?.teams ?? [];
  const supportUsers = (usersData?.users ?? []).filter(
    (u: { role: string }) => ["support", "leader", "admin"].includes(u.role)
  );

  if (!issue) {
    return <p className="text-center text-muted-foreground py-8">กำลังโหลด...</p>;
  }

  const nextStatuses = validTransitions[issue.status] ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">{issue.title}</h2>
        <div className="flex gap-2 flex-wrap">
          <Badge variant={statusColors[issue.status]}>{statusLabels[issue.status]}</Badge>
          <Badge variant={issue.priority === "critical" ? "destructive" : "outline"}>
            {priorityLabels[issue.priority]}
          </Badge>
          <Badge variant="secondary">{typeLabels[issue.type]}</Badge>
          {(issue.slaResponseBreached || issue.slaResolveBreached) && (
            <Badge variant="destructive">SLA Breached</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="whitespace-pre-wrap">{issue.description}</div>
            </CardContent>
          </Card>

          {/* Attachments */}
          {issue.attachments.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">ไฟล์แนบ ({issue.attachments.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {issue.attachments.map((att: { id: string; fileName: string; fileUrl: string; fileSize: number }) => (
                  <div key={att.id} className="flex items-center justify-between py-1">
                    <a href={att.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                      {att.fileName}
                    </a>
                    <span className="text-xs text-muted-foreground">{(att.fileSize / 1024).toFixed(0)} KB</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Status Timeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">ประวัติสถานะ</CardTitle>
            </CardHeader>
            <CardContent>
              {issue.statusLogs.map((log: { id: string; fromStatus: string | null; toStatus: string; changedBy: { name: string }; createdAt: string }) => (
                <div key={log.id} className="flex items-center gap-2 text-sm py-1">
                  <span className="text-muted-foreground w-36">
                    {new Date(log.createdAt).toLocaleString("th-TH")}
                  </span>
                  <span>{log.fromStatus ? `${statusLabels[log.fromStatus]} → ` : ""}{statusLabels[log.toStatus]}</span>
                  <span className="text-muted-foreground">โดย {log.changedBy.name}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">ความคิดเห็น ({issue.comments.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {issue.comments.map((c: { id: string; content: string; user: { name: string; role: string }; createdAt: string }) => (
                <div key={c.id} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{c.user.name}</span>
                    <Badge variant="outline" className="text-xs">{c.user.role}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.createdAt).toLocaleString("th-TH")}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                </div>
              ))}
              {issue.comments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center">ยังไม่มีความคิดเห็น</p>
              )}
              <Separator />
              <div className="space-y-2">
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="เขียนความคิดเห็น..." rows={3} />
                <Button size="sm" onClick={() => addComment.mutate()} disabled={!comment.trim() || addComment.isPending}>
                  {addComment.isPending ? "กำลังส่ง..." : "ส่งความคิดเห็น"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">เปลี่ยนสถานะ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {nextStatuses.map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => changeStatus.mutate(s)}
                  disabled={changeStatus.isPending}
                >
                  → {statusLabels[s]}
                </Button>
              ))}
              {nextStatuses.length === 0 && (
                <p className="text-sm text-muted-foreground">ไม่สามารถเปลี่ยนสถานะได้</p>
              )}
            </CardContent>
          </Card>

          {/* Assign Team */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">ทีม</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={issue.teamId ?? "none"}
                onValueChange={(v) => updateIssue.mutate({ teamId: v === "none" ? null : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ไม่ระบุ</SelectItem>
                  {teams.map((t: { id: string; name: string }) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Assign Person */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">ผู้รับผิดชอบ</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={issue.assigneeId ?? "none"}
                onValueChange={(v) => updateIssue.mutate({ assigneeId: v === "none" ? null : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ไม่ระบุ</SelectItem>
                  {supportUsers.map((u: { id: string; name: string }) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">ข้อมูล</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">ผู้แจ้ง:</span> {issue.reporter.name}</div>
              <div><span className="text-muted-foreground">บริษัท:</span> {issue.company.name}</div>
              {issue.projectName && <div><span className="text-muted-foreground">โปรเจค:</span> {issue.projectName}</div>}
              <div><span className="text-muted-foreground">วันที่แจ้ง:</span> {new Date(issue.createdAt).toLocaleString("th-TH")}</div>
              {issue.slaResponseDeadline && (
                <div>
                  <span className="text-muted-foreground">SLA ตอบกลับ:</span>{" "}
                  <span className={issue.slaResponseBreached ? "text-destructive font-medium" : ""}>
                    {new Date(issue.slaResponseDeadline).toLocaleString("th-TH")}
                  </span>
                </div>
              )}
              {issue.slaResolveDeadline && (
                <div>
                  <span className="text-muted-foreground">SLA แก้ไข:</span>{" "}
                  <span className={issue.slaResolveBreached ? "text-destructive font-medium" : ""}>
                    {new Date(issue.slaResolveDeadline).toLocaleString("th-TH")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
