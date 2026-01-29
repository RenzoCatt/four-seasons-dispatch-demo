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
            Jobs list page rebuilt into a searchable table view (ServiceTitan style).
          </li>
          <li>
            Job details page updated to Housecall Pro style layout (left customer panel + main workflow).
          </li>
          <li>
            Line items now support title + long description (stored as description + details).
          </li>
          <li>
            Line items are editable without auto-saving; one "Save Work Order" button saves changes.
          </li>
          <li>
            Quantity and Unit Price support decimals and display as 1.00 / 640.00.
          </li>
          <li>
            Pricebook add now carries over long descriptions into line item details.
          </li>
        </ul>

        <div className="text-xs text-gray-500">
          Note: "Due amount / payments" are not implemented yet.
        </div>
      </div>
    </div>
  );
}
