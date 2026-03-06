"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const issueTypes = [
  { value: "bug", label: "Bug" },
  { value: "feature_request", label: "Feature Request" },
  { value: "question", label: "คำถาม" },
  { value: "complaint", label: "ร้องเรียน" },
  { value: "other", label: "อื่นๆ" },
];

const priorities = [
  { value: "low", label: "ต่ำ" },
  { value: "medium", label: "ปานกลาง" },
  { value: "high", label: "สูง" },
  { value: "critical", label: "วิกฤต" },
];

export default function SubmitIssuePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "",
    priority: "medium",
    projectName: "",
  });
  const [files, setFiles] = useState<File[]>([]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Create issue
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const { issue } = await res.json();

      // Upload attachments
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        await fetch(`/api/issues/${issue.id}/attachments`, {
          method: "POST",
          body: fd,
        });
      }

      return issue;
    },
    onSuccess: (issue) => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      router.push(`/customer/issues/${issue.id}`);
    },
  });

  const canSubmit = form.title && form.description && form.type;

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>แจ้งปัญหาใหม่</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>หัวข้อ *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="สรุปปัญหาสั้นๆ"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ประเภท *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue placeholder="เลือกประเภท" /></SelectTrigger>
                <SelectContent>
                  {issueTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ความสำคัญ</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>ชื่อโปรเจค / สัญญา</Label>
            <Input
              value={form.projectName}
              onChange={(e) => setForm({ ...form, projectName: e.target.value })}
              placeholder="ระบุชื่อโปรเจคหรือสัญญา (ถ้ามี)"
            />
          </div>

          <div className="space-y-2">
            <Label>รายละเอียด *</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="อธิบายปัญหาโดยละเอียด..."
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label>แนบไฟล์ (สูงสุด 5 ไฟล์, ไม่เกิน 10MB/ไฟล์)</Label>
            <Input
              type="file"
              multiple
              onChange={(e) => {
                const selected = Array.from(e.target.files ?? []).slice(0, 5);
                setFiles(selected);
              }}
            />
            {files.length > 0 && (
              <p className="text-sm text-muted-foreground">
                เลือก {files.length} ไฟล์
              </p>
            )}
          </div>

          <Button
            className="w-full"
            onClick={() => submitMutation.mutate()}
            disabled={!canSubmit || submitMutation.isPending}
          >
            {submitMutation.isPending ? "กำลังส่ง..." : "ส่งแจ้งปัญหา"}
          </Button>

          {submitMutation.isError && (
            <p className="text-sm text-destructive">
              {(submitMutation.error as Error).message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
