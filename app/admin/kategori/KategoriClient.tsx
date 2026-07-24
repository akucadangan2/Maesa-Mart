"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/lib/types";
import { createCategory, updateCategory, deleteCategory } from "./actions";

export default function KategoriClient({
  initialCategories,
}: {
  initialCategories: Category[];
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function openTambah() {
    setEditing(null);
    setErrorMsg(null);
    setFormOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setErrorMsg(null);
    setFormOpen(true);
  }

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);
    try {
      if (editing) {
        await updateCategory(editing.id, formData);
      } else {
        await createCategory(formData);
      }
      setFormOpen(false);
      setEditing(null);
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  }

  async function handleDelete(category: Category) {
    if (!confirm(`Hapus kategori "${category.nama}"?`)) return;
    try {
      await deleteCategory(category.id);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal hapus");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Kategori</h1>
        <button onClick={openTambah} className="bg-brand text-white rounded-lg px-4 py-2 text-sm">
          + Tambah Kategori
        </button>
      </div>

      <table className="w-full text-sm bg-white rounded-lg overflow-hidden">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="p-3">Urutan</th>
            <th className="p-3">Nama</th>
            <th className="p-3">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {initialCategories.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="p-3">{c.urutan}</td>
              <td className="p-3">{c.nama}</td>
              <td className="p-3 space-x-2">
                <button onClick={() => openEdit(c)} className="text-brand text-xs">
                  Edit
                </button>
                <button onClick={() => handleDelete(c)} className="text-red-500 text-xs">
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
              <h2 className="font-bold text-lg">{editing ? "Edit Kategori" : "Tambah Kategori"}</h2>
              <button type="button" onClick={() => setFormOpen(false)} className="text-gray-400">
                ✕
              </button>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Nama Kategori</label>
              <input
                name="nama"
                defaultValue={editing?.nama}
                required
                className="border rounded-lg w-full px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Urutan Tampil</label>
              <input
                type="number"
                name="urutan"
                defaultValue={editing?.urutan ?? 0}
                required
                className="border rounded-lg w-full px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Angka lebih kecil tampil lebih dulu.</p>
            </div>

            {errorMsg && <p className="text-red-500 text-xs">{errorMsg}</p>}

            <button type="submit" className="bg-brand text-white rounded-lg py-2 text-sm w-full">
              {editing ? "Simpan Perubahan" : "Tambah Kategori"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}