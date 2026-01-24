import Link from "next/link";

export default function ReportsHome() {
  return (
    <div className="ui-page">
      <div className="space-y-2">
        <h1 className="ui-title">Reports</h1>
        <p className="ui-subtitle">Invoicing and reporting tools.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <Link
          href="/reports/invoices/create"
          className="ui-card ui-card-pad hover:opacity-90 transition cursor-pointer"
        >
          <div className="font-semibold">Create Invoices</div>
          <div className="text-sm text-gray-600 mt-2">
            Create invoices for completed work orders that have not been invoiced yet.
          </div>
        </Link>

        <div className="ui-card ui-card-pad opacity-50 cursor-not-allowed">
          <div className="font-semibold">Invoice Dashboard</div>
          <div className="text-sm text-gray-600 mt-2">Coming soon.</div>
        </div>
      </div>
    </div>
  );
}
