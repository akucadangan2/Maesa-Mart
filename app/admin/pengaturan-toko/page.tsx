import { getMinimalBelanja } from "./actions";
import PengaturanTokoClient from "./PengaturanTokoClient";

export default async function PengaturanTokoPage() {
  const minimalBelanja = await getMinimalBelanja();
  return <PengaturanTokoClient minimalBelanjaAwal={minimalBelanja} />;
}