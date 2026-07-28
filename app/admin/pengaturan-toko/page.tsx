import { getMinimalBelanja, getBatasQty } from "./actions";
import PengaturanTokoClient from "./PengaturanTokoClient";

export default async function PengaturanTokoPage() {
  const [minimalBelanja, batasQty] = await Promise.all([getMinimalBelanja(), getBatasQty()]);

  return (
    <PengaturanTokoClient
      minimalBelanjaAwal={minimalBelanja}
      batasQtyKecilAwal={batasQty.kecil}
      batasQtyBesarAwal={batasQty.besar}
    />
  );
}