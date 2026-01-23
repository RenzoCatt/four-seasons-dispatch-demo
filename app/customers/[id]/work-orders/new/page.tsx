"use client";

import { useParams } from "next/navigation";
import CustomerNav from "../../../components/CustomerNav";

export default function NewWorkOrderFromCustomerPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="ui-page">
      <h1 className="ui-title">New Work Order</h1>
      <CustomerNav customerId={id} />

      <div className="mt-6 ui-card ui-card-pad">
        Work order form goes here (prefill customerId = {id})
      </div>
    </div>
  );
}
