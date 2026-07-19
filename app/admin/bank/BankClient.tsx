"use client";

import { useState } from "react";
import type { BankAccount } from "@/lib/types";
import { createBankAccount, updateBankAccount, deleteBankAccount } from "./actions";

export default function BankClient({
  initialBankAccounts,
}: {
  initialBankAccounts: BankAccount[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function openTambah() {
    setEditing(null);
    setErrorMsg(null);
    setFormOpen(true);
  }

  function openEdit(bank: BankAccount) {
    setEditing(bank);
    setErrorMsg(null);
    setFormOpen(true);
  }

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);
    try {
      if (editing) {
        await updateBankAccount(editing.id, formData);
      } else {
        await createBankAccount(formData);
      }
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  }

  async function handleDelete(bank: BankAccount) {
    if (!confirm(`Hapus rekening "${bank.nama_bank} - ${bank.no_rekening}"?`)) return;
    try {
      await deleteBankAccount(bank.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal hapus");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Rekening Bank</h1>
        <button onClick={openTambah} className="bg-brand text-white rounded-lg px-4 py-2 text-sm">
          + Tambah Rekening
        </button>
      </div>

      <table className="w-full text-sm bg-white rounded-lg overflow-hidden">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="p-3">Bank</th>
            <th className="p-3">No Rekening</th>
            <th className="p-3">Atas Nama</th>
            <th className="p-3">Status</th>
            <th className="p-3">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {initialBankAccounts.map((b) => (
            <tr key={b.id} className="border-t">
              <td className="p-3">{b.nama_bank}</td>
              <td className="p-3 font-mono">{b.no_rekening}</td>
              <td className="p-3">{b.atas_nama}</td>
              <td className="p-3">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    b.is_aktif ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {b.is_aktif ? "Aktif" : "Nonaktif"}
                </span>
              </td>
              <td className="p-3 space-x-2">
                <button onClick={() => openEdit(b)} className="text-brand text-xs">
                  Edit
                </button>
                <button onClick={() => handleDelete(b)} className="text-red-500 text-xs">
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {formOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleFormSubmit} className="bg-white rounded-xl p-6 max-w-sm w-full space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-lg">{editing ? "Edit Rekening" : "Tambah Rekening"}</h2>
              <button type="button" onClick={() => setFormOpen(false)} className="text-gray-400">
                ✕
              </button>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Nama Bank</label>
              <input
                name="nama_bank"
                defaultValue={editing?.nama_bank}
                placeholder="Contoh: BCA"
                required
                className="border rounded-lg w-full px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">No Rekening</label>
              <input
                name="no_rekening"
                defaultValue={editing?.no_rekening}
                required
                className="border rounded-lg w-full px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Atas Nama</label>
              <input
                name="atas_nama"
                defaultValue={editing?.atas_nama}
                required
                className="border rounded-lg w-full px-3 py-2 text-sm"
              />
            </div>

            {editing && (
              <label className="text-sm font-medium flex items-center gap-2">
                <input type="checkbox" name="is_aktif" value="true" defaultChecked={editing.is_aktif} />
                Aktif (tampil sebagai opsi transfer)
              </label>
            )}

            {errorMsg && <p className="text-red-500 text-xs">{errorMsg}</p>}

            <button type="submit" className="bg-brand text-white rounded-lg py-2 text-sm w-full">
              {editing ? "Simpan Perubahan" : "Tambah Rekening"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}