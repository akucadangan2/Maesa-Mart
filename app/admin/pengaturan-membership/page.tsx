import { getProdukDenganPoin, getDiskonTiers } from "./actions";
import PengaturanMembershipClient from "./PengaturanMembershipClient";

export default async function PengaturanMembershipPage() {
  const [produk, tiers] = await Promise.all([getProdukDenganPoin(), getDiskonTiers()]);
  return <PengaturanMembershipClient initialProduk={produk} initialTiers={tiers} />;
}