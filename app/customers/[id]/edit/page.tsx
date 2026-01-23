"use client";

import { useParams } from "next/navigation";
import CustomerNav from "../../components/CustomerNav";

export default function EditCustomerPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="ui-page">
      <h1 className="ui-title">Edit Customer</h1>
      <CustomerNav customerId={id} />

      <div className="mt-6 ui-card ui-card-pad">
        Edit form goes here (name, phone, notes, etc)
      </div>
    </div>
  );
}
