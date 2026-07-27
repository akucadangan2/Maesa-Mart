import AsistenStokClient from "./AsistenStokClient";
import { getKategoriList } from "./actions";

export default async function AsistenStokPage() {
  const kategori = await getKategoriList();
  return <AsistenStokClient kategoriList={kategori} />;
}