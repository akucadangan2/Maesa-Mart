import { getProductsForHarga, getHargaProdukStatusCounts } from "./actions";
import HargaProdukClient from "./HargaProdukClient";

export default async function HargaProdukPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = params.status ?? "aktif";

  const [products, statusCounts] = await Promise.all([
    getProductsForHarga(status),
    getHargaProdukStatusCounts(),
  ]);

  return <HargaProdukClient initialProducts={products} currentStatus={status} statusCounts={statusCounts} />;
}