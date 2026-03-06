"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const priorities = ["critical", "high", "medium", "low"] as const;
const issueTypes = ["bug", "feature_request", "question", "complaint", "other"] as const;
const issueTypeLabels: Record<string, string> = {
  bug: "Bug",
  feature_request: "Feature Request",
  question: "Question",
  complaint: "Complaint",
  other: "Other",
};

interface SlaPolicy {
  id: string;
  priority: string;
  responseTimeMins: number;
  resolveTimeMins: number;
}

interface Mapping {
  id: string;
  issueType: string;
  teamId: string;
  team: { id: string; name: string };
}

export default function SettingsPage() {
  const queryClient = useQueryClient();

  // SLA Policies
  const { data: slaData } = useQuery({
    queryKey: ["sla-policies"],
    queryFn: async () => {
      const res = await fetch("/api/sla-policies");
      return res.json();
    },
  });

  const [editingSla, setEditingSla] = useState<string | null>(null);
  const [slaForm, setSlaForm] = useState({ responseTimeMins: 0, resolveTimeMins: 0 });

  const updateSla = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sla-policies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slaForm),
      });
      if (!res.ok) throw new Error("Update failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla-policies"] });
      setEditingSla(null);
    },
  });

  // Team-Issue Type Mappings
  const { data: mappingsData } = useQuery({
    queryKey: ["team-issue-type-mappings"],
    queryFn: async () => {
      const res = await fetch("/api/team-issue-type-mappings");
      return res.json();
    },
  });

  const { data: teamsData } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await fetch("/api/teams");
      return res.json();
    },
  });

  const upsertMapping = useMutation({
    mutationFn: async (data: { issueType: string; teamId: string }) => {
      const res = await fetch("/api/team-issue-type-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Save failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team-issue-type-mappings"] }),
  });

  const policies: SlaPolicy[] = slaData?.policies ?? [];
  const mappings: Mapping[] = mappingsData?.mappings ?? [];
  const teams = teamsData?.teams ?? [];
  const mappingsByType = Object.fromEntries(mappings.map((m) => [m.issueType, m]));

  function formatTime(mins: number) {
    if (mins < 60) return `${mins} นาที`;
    if (mins < 1440) return `${mins / 60} ชั่วโมง`;
    return `${mins / 1440} วัน`;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-6">ตั้งค่าระบบ</h2>
      </div>

      {/* SLA Policies */}
      <Card>
        <CardHeader>
          <CardTitle>นโยบาย SLA</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ระดับความสำคัญ</TableHead>
                <TableHead>เวลาตอบกลับ</TableHead>
                <TableHead>เวลาแก้ไข</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium capitalize">{p.priority}</TableCell>
                  <TableCell>
                    {editingSla === p.id ? (
                      <Input
                        type="number"
                        className="w-24"
                        value={slaForm.responseTimeMins}
                        onChange={(e) => setSlaForm({ ...slaForm, responseTimeMins: Number(e.target.value) })}
                      />
                    ) : (
                      formatTime(p.responseTimeMins)
                    )}
                  </TableCell>
                  <TableCell>
                    {editingSla === p.id ? (
                      <Input
                        type="number"
                        className="w-24"
                        value={slaForm.resolveTimeMins}
                        onChange={(e) => setSlaForm({ ...slaForm, resolveTimeMins: Number(e.target.value) })}
                      />
                    ) : (
                      formatTime(p.resolveTimeMins)
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingSla === p.id ? (
                      <div className="space-x-2">
                        <Button size="sm" onClick={() => updateSla.mutate(p.id)}>บันทึก</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingSla(null)}>ยกเลิก</Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingSla(p.id);
                          setSlaForm({ responseTimeMins: p.responseTimeMins, resolveTimeMins: p.resolveTimeMins });
                        }}
                      >
                        แก้ไข
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Separator />

      {/* Team-Issue Type Mappings */}
      <Card>
        <CardHeader>
          <CardTitle>การกำหนดทีมตามประเภท Issue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {issueTypes.map((type) => (
              <div key={type} className="flex items-center gap-4">
                <Label className="w-40">{issueTypeLabels[type]}</Label>
                <Select
                  value={mappingsByType[type]?.teamId ?? ""}
                  onValueChange={(teamId) => upsertMapping.mutate({ issueType: type, teamId })}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="ยังไม่ได้กำหนด" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t: { id: string; name: string }) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
