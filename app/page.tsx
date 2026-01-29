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
            <strong>Dispatch view rebuilt:</strong> Weekly grid with tech rows, drag-and-drop scheduling, and completed tasks crossed off.
          </li>
          <li>
            <strong>Job details modal in dispatch:</strong> Click any scheduled job to see customer info, address, phone, services, and quick actions (Start/Complete/Unassign/View Job).
          </li>
          <li>
            <strong>Dispatch events support optional work orders:</strong> Can now schedule pure tasks/meetings without requiring a full job (type: JOB, TASK, MEETING).
          </li>
          <li>
            <strong>More information density:</strong> Event blocks show job description, customer name, and street + city (no province/postal clutter).
          </li>
          <li>
            <strong>Work order line items visible in dispatch:</strong> "Work to be done" section shows all services with descriptions and quantities.
          </li>
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
