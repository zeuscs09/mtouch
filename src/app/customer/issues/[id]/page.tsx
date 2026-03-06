"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";

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

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
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

  const addComment = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/issues/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue", id] });
      setComment("");
    },
  });

  const issue = data?.issue;

  if (!issue) {
    return <p className="text-center text-muted-foreground py-8">กำลังโหลด...</p>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Issue Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">{issue.title}</h2>
        <div className="flex gap-2 flex-wrap">
          <Badge variant={statusColors[issue.status] ?? "outline"}>
            {statusLabels[issue.status] ?? issue.status}
          </Badge>
          <Badge variant={issue.priority === "critical" ? "destructive" : "outline"}>
            {priorityLabels[issue.priority] ?? issue.priority}
          </Badge>
          <Badge variant="secondary">{typeLabels[issue.type] ?? issue.type}</Badge>
        </div>
      </div>

      {/* Issue Details */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="whitespace-pre-wrap">{issue.description}</div>
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">ผู้แจ้ง:</span>{" "}
              {issue.reporter.name}
            </div>
            <div>
              <span className="text-muted-foreground">บริษัท:</span>{" "}
              {issue.company.name}
            </div>
            {issue.projectName && (
              <div>
                <span className="text-muted-foreground">โปรเจค:</span>{" "}
                {issue.projectName}
              </div>
            )}
            {issue.team && (
              <div>
                <span className="text-muted-foreground">ทีม:</span>{" "}
                {issue.team.name}
              </div>
            )}
            {issue.assignee && (
              <div>
                <span className="text-muted-foreground">ผู้รับผิดชอบ:</span>{" "}
                {issue.assignee.name}
              </div>
            )}
            <div>
              <span className="text-muted-foreground">วันที่แจ้ง:</span>{" "}
              {new Date(issue.createdAt).toLocaleString("th-TH")}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attachments */}
      {issue.attachments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">ไฟล์แนบ ({issue.attachments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {issue.attachments.map((att: { id: string; fileName: string; fileUrl: string; fileSize: number }) => (
                <div key={att.id} className="flex items-center justify-between">
                  <a
                    href={att.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {att.fileName}
                  </a>
                  <span className="text-xs text-muted-foreground">
                    {(att.fileSize / 1024).toFixed(0)} KB
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Timeline */}
      {issue.statusLogs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">ประวัติสถานะ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {issue.statusLogs.map((log: { id: string; fromStatus: string | null; toStatus: string; changedBy: { name: string }; createdAt: string }) => (
                <div key={log.id} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString("th-TH")}
                  </span>
                  <span>
                    {log.fromStatus ? `${statusLabels[log.fromStatus]} → ` : ""}
                    {statusLabels[log.toStatus]}
                  </span>
                  <span className="text-muted-foreground">โดย {log.changedBy.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="เขียนความคิดเห็น..."
              rows={3}
            />
            <Button
              size="sm"
              onClick={() => addComment.mutate()}
              disabled={!comment.trim() || addComment.isPending}
            >
              {addComment.isPending ? "กำลังส่ง..." : "ส่งความคิดเห็น"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
