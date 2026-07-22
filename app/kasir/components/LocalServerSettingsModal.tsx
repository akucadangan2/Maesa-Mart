"use client";

import { useState } from "react";
import { X } from "lucide-react";

export default function LocalServerSettingsModal({
  initialUrl,
  onClose,
  onSave,
}: {
  initialUrl: string;
  onClose: () => void;
  onSave: (url: string) => void;
}) {
  const [value, setValue] = useState(initialUrl);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Alamat Server Lokal</h2>
          <button onClick={onClose} className="text-gray-400">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Biarin default kalau komputer ini yang jalanin server lokal-nya sendiri. Kalau ini
          komputer kasir LAIN, isi alamat IP komputer yang jalanin server lokal (contoh:{" "}
          <span className="font-mono">http://192.168.1.5:4000</span>).
        </p>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="http://localhost:4000"
          className="border rounded-lg w-full px-3 py-2 text-sm font-mono mb-3"
        />
        <button
          onClick={() => onSave(value.trim() || "http://localhost:4000")}
          className="w-full bg-brand text-white rounded-lg py-2 text-sm font-medium"
        >
          Simpan
        </button>
      </div>
    </div>
  );
}
