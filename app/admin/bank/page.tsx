import { createServiceRoleClient } from "@/lib/supabase/server";
import BankClient from "./BankClient";

export default async function AdminBankPage() {
  const supabase = createServiceRoleClient();

  const { data: bankAccounts } = await supabase
    .from("bank_accounts")
    .select("*")
    .order("created_at");

  return <BankClient initialBankAccounts={bankAccounts ?? []} />;
}