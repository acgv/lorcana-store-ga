"use client"

import { useEffect, useState } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AdminHeader } from "@/components/admin-header"
import { useLanguage } from "@/components/language-provider"
import { useUser } from "@/hooks/use-user"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Shield, ShieldOff, User, Users, Search } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface UserData {
  id: string
  email: string | null
  name: string | null
  avatar: string | null
  provider: string
  role: string | null
  roleAssignedAt: string | null
  createdAt: string
  lastSignIn: string | null
}

export default function UsersManagementPage() {
  const { t } = useLanguage()
  const { user: currentUser } = useUser()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserData[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [actionType, setActionType] = useState<"add" | "remove" | null>(null)
  const [processing, setProcessing] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)
  const [passwordUserEmail, setPasswordUserEmail] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    // Filter users by search term
    if (searchTerm.trim() === "") {
      setFilteredUsers(users)
    } else {
      const term = searchTerm.toLowerCase()
      setFilteredUsers(
        users.filter(
          (u) =>
            u.email?.toLowerCase().includes(term) ||
            u.name?.toLowerCase().includes(term)
        )
      )
    }
  }, [searchTerm, users])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/users")
      const data = await response.json()

      if (data.success) {
        setUsers(data.data)
        setFilteredUsers(data.data)
      } else {
        toast({
          variant: "destructive",
          title: t("error"),
          description: data.error || "Failed to load users",
        })
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        variant: "destructive",
        title: t("error"),
        description: "Failed to load users",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMakeAdmin = (user: UserData) => {
    setSelectedUser(user)
    setActionType("add")
  }

  const handleRemoveAdmin = (user: UserData) => {
    if (user.id === currentUser?.id) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("cannotRemoveSelf"),
      })
      return
    }
    setSelectedUser(user)
    setActionType("remove")
  }

  const confirmAction = async () => {
    if (!selectedUser) return

    try {
      setProcessing(true)
      const response = await fetch(`/api/admin/users/${selectedUser.id}/role`, {
        method: actionType === "add" ? "POST" : "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        // If temporary password was generated, show it in a dialog
        if (data.temporaryPassword && actionType === "add") {
          setTemporaryPassword(data.temporaryPassword)
          setPasswordUserEmail(selectedUser.email || null)
          setShowPasswordDialog(true)
          // Also show in console for easy copying
          console.log("🔑 Temporary password for new admin:", data.temporaryPassword)
          console.log("📧 User email:", selectedUser.email)
        } else {
          toast({
            title: t("success"),
            description:
              actionType === "add" ? t("adminRoleAssigned") : t("adminRoleRemoved"),
          })
        }
        fetchUsers() // Reload users
      } else {
        toast({
          variant: "destructive",
          title: t("error"),
          description: data.error || "Failed to update role",
        })
      }
    } catch (error) {
      console.error("Error updating role:", error)
      toast({
        variant: "destructive",
        title: t("error"),
        description: "Failed to update role",
      })
    } finally {
      setProcessing(false)
      setSelectedUser(null)
      setActionType(null)
    }
  }

  const cancelAction = () => {
    setSelectedUser(null)
    setActionType(null)
  }

  const adminCount = users.filter((u) => u.role === "admin").length
  const regularCount = users.length - adminCount

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <AdminHeader title={t("userManagement")} />

        <main className="container mx-auto px-4 py-8">
          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("totalUsers")}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("adminUsers")}</CardTitle>
                <Shield className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{adminCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("regularUsers")}</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{regularCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{t("allUsers")}</CardTitle>
              <CardDescription>{t("userManagementDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t("searchUsers")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">{t("noUsersFound")}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">{t("userName")}</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">{t("userEmail")}</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">{t("userRole")}</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">{t("userSince")}</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">{t("actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="border-b last:border-b-0 hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {user.avatar ? (
                                <img
                                  src={user.avatar}
                                  alt={user.name || "User"}
                                  className="h-8 w-8 rounded-full"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="h-4 w-4 text-primary" />
                                </div>
                              )}
                              <span className="font-medium">
                                {user.name || t("unknown")}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {user.email || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {user.role === "admin" ? (
                              <Badge className="bg-primary/10 text-primary border-primary/20">
                                <Shield className="h-3 w-3 mr-1" />
                                {t("admin")}
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <User className="h-3 w-3 mr-1" />
                                {t("user")}
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {user.role === "admin" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveAdmin(user)}
                                disabled={user.id === currentUser?.id}
                              >
                                <ShieldOff className="h-4 w-4 mr-2" />
                                {t("removeAdmin")}
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMakeAdmin(user)}
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                {t("makeAdmin")}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </main>

        {/* Temporary Password Dialog */}
        <AlertDialog open={showPasswordDialog} onOpenChange={(open) => {
          if (!open) {
            setShowPasswordDialog(false)
            setTemporaryPassword(null)
            setPasswordUserEmail(null)
          }
        }}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl">{t("adminRoleAssigned")}</AlertDialogTitle>
              <AlertDialogDescription className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  {t("sharePasswordWithUser")}
                </p>
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{t("email")}:</span>
                    <code className="text-sm bg-background px-2 py-1 rounded break-all">{passwordUserEmail || "—"}</code>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-medium block">{t("temporaryPassword")}:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-background px-3 py-2 rounded font-mono flex-1 text-center font-bold text-primary select-all">
                        {temporaryPassword}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (temporaryPassword) {
                            navigator.clipboard.writeText(temporaryPassword)
                            toast({
                              title: t("copied") || "Copied!",
                              description: t("passwordCopied") || "Password copied to clipboard",
                            })
                          }
                        }}
                      >
                        {t("copy") || "Copy"}
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground italic pt-2">
                  {t("userCanAlsoUseOAuth")}
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => {
                setShowPasswordDialog(false)
                setTemporaryPassword(null)
                setPasswordUserEmail(null)
              }}>
                {t("close") || "Close"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirmation Dialog */}
        <AlertDialog open={!!selectedUser && !showPasswordDialog} onOpenChange={(open) => !open && cancelAction()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actionType === "add" ? t("makeAdmin") : t("removeAdmin")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {actionType === "add"
                  ? t("confirmMakeAdmin")
                  : t("confirmRemoveAdmin")}
                <br />
                <br />
                <strong>{selectedUser?.email}</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelAction} disabled={processing}>
                {t("cancel")}
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmAction} disabled={processing}>
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("loadingText")}
                  </>
                ) : (
                  t("confirm")
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AuthGuard>
  )
}

