"use client";

import { useState } from "react";
import type { Supplier } from "@/lib/types";
import { createSupplier, updateSupplier, deleteSupplier } from "./actions";

export default function SupplierClient({
  initialSuppliers,
}: {
  initialSuppliers: Supplier[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function openTambah() {
    setEditing(null);
    setErrorMsg(null);
    setFormOpen(true);
  }

  function openEdit(supplier: Supplier) {
    setEditing(supplier);
    setErrorMsg(null);
    setFormOpen(true);
  }

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);
    try {
      if (editing) {
        await updateSupplier(editing.id, formData);
      } else {
        await createSupplier(formData);
      }
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  }

  async function handleDelete(supplier: Supplier) {
    if (!confirm(`Hapus supplier "${supplier.nama}"?`)) return;
    try {
      await deleteSupplier(supplier.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal hapus");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Data Supplier</h1>
        <button onClick={openTambah} className="bg-brand text-white rounded-lg px-4 py-2 text-sm">
          + Tambah Supplier
        </button>
      </div>

      <table className="w-full text-sm bg-white rounded-lg overflow-hidden">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="p-3">Nama</th>
            <th className="p-3">Alamat</th>
            <th className="p-3">Telepon</th>
            <th className="p-3">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {initialSuppliers.length === 0 ? (
            <tr>
              <td colSpan={4} className="p-4 text-center text-gray-400 italic">
                Belum ada supplier.
              </td>
            </tr>
          ) : (
            initialSuppliers.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3">{s.nama}</td>
                <td className="p-3">{s.alamat ?? "-"}</td>
                <td className="p-3">{s.telepon ?? "-"}</td>
                <td className="p-3 space-x-2">
                  <button onClick={() => openEdit(s)} className="text-brand text-xs">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(s)} className="text-red-500 text-xs">
                    Hapus
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {formOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleFormSubmit}
            className="bg-white rounded-xl p-6 max-w-sm w-full space-y-3"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-lg">{editing ? "Edit Supplier" : "Tambah Supplier"}</h2>
              <button type="button" onClick={() => setFormOpen(false)} className="text-gray-400">
                ✕
              </button>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Nama Supplier</label>
              <input
                name="nama"
                defaultValue={editing?.nama}
                required
                className="border rounded-lg w-full px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Alamat</label>
              <input
                name="alamat"
                defaultValue={editing?.alamat ?? ""}
                className="border rounded-lg w-full px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Telepon</label>
              <input
                name="telepon"
                defaultValue={editing?.telepon ?? ""}
                className="border rounded-lg w-full px-3 py-2 text-sm"
              />
            </div>

            {errorMsg && <p className="text-red-500 text-xs">{errorMsg}</p>}

            <button type="submit" className="bg-brand text-white rounded-lg py-2 text-sm w-full">
              {editing ? "Simpan Perubahan" : "Tambah Supplier"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}