import QrClient from "./QrClient";

export default function AdminQrPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return <QrClient orderUrl={`${appUrl}/order`} />;
}