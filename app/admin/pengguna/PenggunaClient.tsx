"use client";

import { useState } from "react";
import type { Staff } from "@/lib/types";
import { createStaff, updateStaff, toggleStaffActive, deleteStaff } from "./actions";

const roleBadge: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  kasir: "bg-gray-100 text-gray-600",
};

const roleLabel: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  kasir: "Kasir",
};

export default function PenggunaClient({ initialStaff }: { initialStaff: Staff[] }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function openTambah() {
    setEditing(null);
    setErrorMsg(null);
    setFormOpen(true);
  }

  function openEdit(staff: Staff) {
    setEditing(staff);
    setErrorMsg(null);
    setFormOpen(true);
  }

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);
    try {
      if (editing) {
        await updateStaff(editing.id, formData);
      } else {
        await createStaff(formData);
      }
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  }

  async function handleToggleActive(staff: Staff) {
    try {
      await toggleStaffActive(staff.id, !staff.is_aktif);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal mengubah status");
    }
  }

  async function handleDelete(staff: Staff) {
    if (!confirm(`Hapus akun "${staff.nama}"? Ini gak bisa dibatalkan.`)) return;
    try {
      await deleteStaff(staff.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal hapus");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Data User</h1>
        <button onClick={openTambah} className="bg-brand text-white rounded-lg px-4 py-2 text-sm">
          + Tambah User
        </button>
      </div>

      <table className="w-full text-sm bg-white rounded-lg overflow-hidden">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="p-3">Nama</th>
            <th className="p-3">Email</th>
            <th className="p-3">Role</th>
            <th className="p-3">Aktif</th>
            <th className="p-3">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {initialStaff.map((s) => (
            <tr key={s.id} className="border-t">
              <td className="p-3">{s.nama}</td>
              <td className="p-3 text-xs text-gray-500">{s.email}</td>
              <td className="p-3">
                <span className={`text-xs px-2 py-1 rounded-full ${roleBadge[s.role]}`}>
                  {roleLabel[s.role]}
                </span>
              </td>
              <td className="p-3">
                <button
                  onClick={() => handleToggleActive(s)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${
                    s.is_aktif ? "bg-brand" : "bg-gray-300"
                  }`}
                  aria-label="Toggle aktif"
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      s.is_aktif ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </td>
              <td className="p-3 space-x-2">
                <button onClick={() => openEdit(s)} className="text-brand text-xs">
                  Edit
                </button>
                <button onClick={() => handleDelete(s)} className="text-red-500 text-xs">
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {formOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleFormSubmit}
            className="bg-white rounded-xl p-6 max-w-sm w-full space-y-3"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-lg">{editing ? "Edit User" : "Tambah User"}</h2>
              <button type="button" onClick={() => setFormOpen(false)} className="text-gray-400">
                ✕
              </button>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Nama</label>
              <input
                name="nama"
                defaultValue={editing?.nama}
                required
                className="border rounded-lg w-full px-3 py-2 text-sm"
              />
            </div>

            {!editing && (
              <div>
                <label className="text-sm font-medium block mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  autoComplete="off"
                  required
                  className="border rounded-lg w-full px-3 py-2 text-sm"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium block mb-1">
                {editing ? "Password Baru (kosongkan kalau tidak diubah)" : "Password"}
              </label>
              <input
                type="password"
                name="staff_password"
                autoComplete="new-password"
                required={!editing}
                minLength={6}
                className="border rounded-lg w-full px-3 py-2 text-sm"
              />
              {editing && (
                <p className="text-xs text-orange-600 mt-1">
                  Pastikan kolom ini kosong kalau cuma mau ubah nama/role, jangan sampai
                  ke-autofill browser.
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Role</label>
              <select
                name="role"
                defaultValue={editing?.role ?? "kasir"}
                className="border rounded-lg w-full px-3 py-2 text-sm"
              >
                <option value="kasir">Kasir</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>

            {errorMsg && <p className="text-red-500 text-xs">{errorMsg}</p>}

            <button type="submit" className="bg-brand text-white rounded-lg py-2 text-sm w-full">
              {editing ? "Simpan Perubahan" : "Tambah User"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}