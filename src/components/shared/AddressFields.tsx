import { getAddressDefaults, type AddressParts } from "@/lib/address";

export default function AddressFields({
  defaultValues,
  className = "md:col-span-2 lg:col-span-3",
}: {
  defaultValues?: AddressParts | null;
  className?: string;
}) {
  const defaults = getAddressDefaults(defaultValues);

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="form-label">Street Address</label>
          <input name="street_address" defaultValue={defaults.street_address} className="form-input" />
        </div>
        <div className="md:col-span-2">
          <label className="form-label">Street Address 2 <span className="text-gray-400">(Optional)</span></label>
          <input name="street_address_2" defaultValue={defaults.street_address_2} className="form-input" />
        </div>
        <div>
          <label className="form-label">City</label>
          <input name="city" defaultValue={defaults.city} className="form-input" />
        </div>
        <div>
          <label className="form-label">Postal Code</label>
          <input name="postal_code" defaultValue={defaults.postal_code} className="form-input" />
        </div>
      </div>
    </div>
  );
}