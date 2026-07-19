import { getProductsForHarga } from "./actions";
import HargaProdukClient from "./HargaProdukClient";

export default async function HargaProdukPage() {
  const products = await getProductsForHarga();
  return <HargaProdukClient initialProducts={products} />;
}