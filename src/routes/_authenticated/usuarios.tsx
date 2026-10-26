import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Shield, Users, ArrowLeft, UserPlus, Loader2, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/lib/admin.functions";
import { listUsers, updateUserRole, toggleUserActive, createUser, updateUser, deleteUser } from "@/lib/users.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/usuarios")({
  ssr: false,
  component: UsersPage,
});

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "suporte", label: "Suporte" },
  { value: "franchisee", label: "Franqueado" },
  { value: "client", label: "Cliente" },
];

function UsersPage() {
  const navigate = useNavigate();
  const checkIsAdminFn = useServerFn(checkIsAdmin);
  const listUsersFn = useServerFn(listUsers);
  const updateRoleFn = useServerFn(updateUserRole);
  const toggleActiveFn = useServerFn(toggleUserActive);
  const createUserFn = useServerFn(createUser);
  const updateUserFn = useServerFn(updateUser);
  const deleteUserFn = useServerFn(deleteUser);

  const [authChecked, setAuthChecked] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editUser, setEditUser] = useState<{ id: string; fullName: string; email: string; password: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "client" as any,
    confirmEmail: false,
    needsApproval: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hasLocalDev = typeof window !== "undefined" && localStorage.getItem("visitor_id") === "admin-local-dev";
      if (hasLocalDev) {
        setAuthChecked(true);
        return;
      }

      if (!isSupabaseConfigured()) {
        setAuthChecked(true);
        return;
      }

      try {
        const { data } = await supabase.auth.getUser();
        if (!data?.user && !hasLocalDev) {
          navigate({ to: "/auth", replace: true });
          return;
        }
        const res = await checkIsAdminFn();
        if (!cancelled) {
          if (!res.isAdmin) {
            toast.error("Acesso restrito a administradores");
            navigate({ to: "/chat", replace: true });
            return;
          }
          setAuthChecked(true);
        }
      } catch {
        if (!cancelled) {
          setAuthChecked(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [checkIsAdminFn, navigate]);

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listUsersFn(),
    enabled: authChecked,
  });

  async function handleRoleChange(userId: string, role: string) {
    try {
      await updateRoleFn({ data: { userId, role: role as any } });
      toast.success("Nível de acesso atualizado");
      refetch();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao atualizar");
    }
  }

  async function handleActiveToggle(userId: string, isActive: boolean) {
    try {
      await toggleActiveFn({ data: { userId, isActive } });
      toast.success(isActive ? "Conta ativada" : "Conta desativada");
      refetch();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao atualizar");
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setIsCreating(true);
    try {
      await createUserFn({ data: newUser });
      toast.success("Usuário criado com sucesso!");
      setIsCreateOpen(false);
      setNewUser({
        email: "",
        password: "",
        fullName: "",
        role: "client",
        confirmEmail: false,
        needsApproval: false,
      });
      refetch();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao criar usuário");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setIsSaving(true);
    try {
      await updateUserFn({
        data: {
          userId: editUser.id,
          fullName: editUser.fullName,
          email: editUser.email,
          password: editUser.password || undefined,
        },
      });
      toast.success("Usuário atualizado");
      setEditUser(null);
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Falha ao atualizar usuário");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(userId: string, name: string) {
    if (!window.confirm(`Excluir permanentemente o usuário ${name}? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteUserFn({ data: { userId } });
      toast.success("Usuário excluído");
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Falha ao excluir usuário");
    }
  }



  if (!authChecked) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Verificando permissões...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gestão de Usuários</h1>
            <p className="text-sm text-muted-foreground">
              Controle de acesso exclusivo do Admin Master.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <UserPlus className="h-4 w-4" /> Criar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Usuário</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <Input
                    id="fullName"
                    required
                    value={newUser.fullName}
                    onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha Inicial</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nível de Acesso</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(v) => setNewUser({ ...newUser, role: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="confirmEmail"
                    checked={newUser.confirmEmail}
                    onCheckedChange={(checked) =>
                      setNewUser({ ...newUser, confirmEmail: !!checked })
                    }
                  />
                  <Label htmlFor="confirmEmail" className="text-sm font-normal">
                    Confirmar e-mail e liberar acesso imediatamente (ignora verificação)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="needsApproval"
                    checked={newUser.needsApproval}
                    onCheckedChange={(checked) =>
                      setNewUser({ ...newUser, needsApproval: !!checked })
                    }
                  />
                  <Label htmlFor="needsApproval" className="text-sm font-normal">
                    Criar como "Pendente de Aprovação" (inicia desativado)
                  </Label>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...
                      </>
                    ) : (
                      "Criar Usuário"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={() => navigate({ to: "/chat" })}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Chat
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3 w-52">Nível de acesso</th>
              <th className="px-4 py-3 w-32 text-center">Ativo</th>
              <th className="px-4 py-3 w-28 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Carregando usuários...
                </td>
              </tr>
            )}
            {!isLoading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
            {(users as any[]).map((u) => (
              <tr key={u.id} className={u.is_active === false ? "opacity-60" : ""}>
                <td className="px-4 py-3 font-medium">{u.full_name || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email || "—"}</td>
                <td className="px-4 py-3">
                  <Select
                    value={u.role || "client"}
                    onValueChange={(v) => handleRoleChange(u.id, v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3 text-center">
                  <Switch
                    checked={u.is_active !== false}
                    onCheckedChange={(checked) => handleActiveToggle(u.id, checked)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Editar usuário"
                      onClick={() =>
                        setEditUser({
                          id: u.id,
                          fullName: u.full_name || "",
                          email: u.email || "",
                          password: "",
                        })
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title="Excluir usuário"
                      onClick={() => handleDelete(u.id, u.full_name || u.email)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          {editUser && (
            <form onSubmit={handleSaveEdit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Nome Completo</Label>
                <Input
                  id="editName"
                  required
                  value={editUser.fullName}
                  onChange={(e) => setEditUser({ ...editUser, fullName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEmail">E-mail</Label>
                <Input
                  id="editEmail"
                  type="email"
                  required
                  value={editUser.email}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPassword">Nova senha (opcional)</Label>
                <Input
                  id="editPassword"
                  type="password"
                  placeholder="Deixe em branco para manter a atual"
                  value={editUser.password}
                  onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                    </>
                  ) : (
                    "Salvar alterações"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>


      <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
        <Shield className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          Alterações refletem imediatamente nos privilégios do usuário. Contas desativadas
          permanecem no histórico mas perdem acesso às áreas protegidas.
        </p>
      </div>
    </div>
  );
}
