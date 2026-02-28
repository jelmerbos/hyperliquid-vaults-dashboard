import { VaultTable } from "@/components/vault-table/vault-table";

export default function Home() {
  return (
    <main className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Hyperliquid Vaults</h1>
        <p className="text-muted-foreground mt-1">
          Compare vaults by performance, risk, and fees
        </p>
      </div>
      <VaultTable />
    </main>
  );
}
