export interface AddressParts {
  street_address?: string | null;
  street_address_2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  address?: string | null;
}

function readString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function formatAddress(source: AddressParts | null | undefined): string {
  if (!source) return "—";

  const parts = [source.street_address, source.street_address_2, source.city, source.postal_code]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  if (parts.length > 0) return parts.join(", ");
  return source.address?.trim() || "—";
}

export function getAddressDefaults(source: AddressParts | null | undefined = {}) {
  const safeSource = source ?? {};

  return {
    street_address: safeSource.street_address ?? safeSource.address ?? "",
    street_address_2: safeSource.street_address_2 ?? "",
    city: safeSource.city ?? "",
    postal_code: safeSource.postal_code ?? "",
  };
}

export function readAddressForm(formData: FormData) {
  const street_address = readString(formData, "street_address");
  const street_address_2 = readString(formData, "street_address_2");
  const city = readString(formData, "city");
  const postal_code = readString(formData, "postal_code");
  const parts = [street_address, street_address_2, city, postal_code].filter(Boolean) as string[];

  return {
    street_address,
    street_address_2,
    city,
    postal_code,
    address: parts.length > 0 ? parts.join(", ") : null,
  };
}