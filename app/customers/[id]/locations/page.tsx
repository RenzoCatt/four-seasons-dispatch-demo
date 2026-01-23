"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import CustomerNav from "../../components/CustomerNav";

export default function CustomerLocationsPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="ui-page">
      <div className="flex items-center justify-between">
        <h1 className="ui-title">Locations</h1>
        <Link className="ui-btn ui-btn-primary" href={`/customers/${id}/locations/new`}>
          Add Location
        </Link>
      </div>

      <CustomerNav customerId={id} />

      <div className="mt-6 ui-card ui-card-pad">
        Locations list goes here
      </div>
    </div>
  );
}
