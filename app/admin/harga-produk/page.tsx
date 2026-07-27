import { getProductsForHarga, getHargaProdukStatusCounts, getCategoriesForHarga } from "./actions";
import HargaProdukClient from "./HargaProdukClient";

export default async function HargaProdukPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string }>;
}) {
  const params = await searchParams;
  const status = params.status ?? "aktif";
  const category = params.category ?? "";

  const [products, statusCounts, categories] = await Promise.all([
    getProductsForHarga(status, category),
    getHargaProdukStatusCounts(),
    getCategoriesForHarga(),
  ]);

  return (
    <HargaProdukClient
      initialProducts={products}
      currentStatus={status}
      currentCategory={category}
      categories={categories}
      statusCounts={statusCounts}
    />
  );
}