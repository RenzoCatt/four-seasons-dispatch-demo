export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-gray-600">
          Prototype status and recent changes.
        </p>
      </div>

      <div className="ui-card ui-card-pad space-y-3">
        <div className="font-semibold">Latest updates</div>

        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2">
          <li>
            <strong>Dispatch page major overhaul:</strong> Weekly grid view with drag-and-drop scheduling, completed jobs crossed off, click-to-view job modal with customer info and line items.
          </li>
          <li>
            <strong>Jobs page rebuilt:</strong> ServiceTitan-style searchable table with filtering, real-time status, and assigned tech display.
          </li>
          <li>
            <strong>Job details redesigned:</strong> Housecall Pro layout with customer sidebar, field tech status, and editable line items (no more auto-save, single Save button).
          </li>
          <li>
            <strong>Line items improvements:</strong> Title + details fields, decimal quantities (1.50), currency formatting (640.00), pricebook integration with full descriptions.
          </li>
          <li>
            <strong>Status sync fixed:</strong> Completing a job in dispatch now marks the work order complete, and vice versa — no more mismatched statuses.
          </li>
          <li>
            <strong>Field tech assignment:</strong> Job details now show assigned tech name and scheduled times pulled from dispatch events.
          </li>
          <li>
            <strong>Invoice PDF polish:</strong> Real logo from /public, item details included, cleaner header with divider line.
          </li>
          <li>
            <strong>UI polish:</strong> Removed number input spinners, fixed sidebar collapse on wide tables, better responsive layout.
          </li>
        </ul>

        <div className="text-xs text-gray-500">
          Note: Payments tracking not yet implemented.
        </div>
      </div>
    </div>
  );
}
