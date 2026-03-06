"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";

interface TeamMember {
  id: string;
  role: string;
  user: { id: string; name: string; email: string; role: string };
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  members: TeamMember[];
  _count: { issues: number };
}

export default function TeamsPage() {
  const queryClient = useQueryClient();
  const [teamOpen, setTeamOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamForm, setTeamForm] = useState({ name: "", description: "" });
  const [memberForm, setMemberForm] = useState({ userId: "", role: "member" });

  const { data } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await fetch("/api/teams");
      return res.json();
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      return res.json();
    },
  });

  const createTeam = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teamForm),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setTeamOpen(false);
      setTeamForm({ name: "", description: "" });
    },
  });

  const deleteTeam = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/teams/${id}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teams"] }),
  });

  const addMember = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/teams/${selectedTeamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memberForm),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setMemberOpen(false);
      setMemberForm({ userId: "", role: "member" });
    },
  });

  const removeMember = useMutation({
    mutationFn: async ({ teamId, userId }: { teamId: string; userId: string }) => {
      await fetch(`/api/teams/${teamId}/members?userId=${userId}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teams"] }),
  });

  const teams: Team[] = data?.teams ?? [];
  const supportUsers = (usersData?.users ?? []).filter(
    (u: { role: string }) => ["support", "leader", "admin"].includes(u.role)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">จัดการทีม</h2>
        <Button onClick={() => setTeamOpen(true)}>สร้างทีม</Button>
      </div>

      <div className="grid gap-4">
        {teams.map((team) => (
          <Card key={team.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>{team.name}</CardTitle>
                {team.description && (
                  <p className="text-sm text-muted-foreground">{team.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setSelectedTeamId(team.id); setMemberOpen(true); }}
                >
                  เพิ่มสมาชิก
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => { if (confirm("ลบทีมนี้?")) deleteTeam.mutate(team.id); }}
                >
                  ลบ
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead>อีเมล</TableHead>
                    <TableHead>บทบาทในทีม</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{m.user.name}</TableCell>
                      <TableCell>{m.user.email}</TableCell>
                      <TableCell>
                        <Badge variant={m.role === "leader" ? "default" : "outline"}>{m.role}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => removeMember.mutate({ teamId: team.id, userId: m.user.id })}
                        >
                          ลบ
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {team.members.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        ยังไม่มีสมาชิก
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
        {teams.length === 0 && (
          <p className="text-center text-muted-foreground py-8">ยังไม่มีทีม</p>
        )}
      </div>

      <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>สร้างทีมใหม่</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ชื่อทีม</Label>
              <Input value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>รายละเอียด</Label>
              <Input value={teamForm.description} onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => createTeam.mutate()} disabled={!teamForm.name}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>เพิ่มสมาชิก</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>เลือกผู้ใช้</Label>
              <Select value={memberForm.userId} onValueChange={(v) => setMemberForm({ ...memberForm, userId: v })}>
                <SelectTrigger><SelectValue placeholder="เลือกผู้ใช้" /></SelectTrigger>
                <SelectContent>
                  {supportUsers.map((u: { id: string; name: string; email: string }) => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>บทบาท</Label>
              <Select value={memberForm.role} onValueChange={(v) => setMemberForm({ ...memberForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">สมาชิก</SelectItem>
                  <SelectItem value="leader">หัวหน้า</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => addMember.mutate()} disabled={!memberForm.userId}>เพิ่ม</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
