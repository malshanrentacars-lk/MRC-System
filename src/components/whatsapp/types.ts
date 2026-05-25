export type ChannelType = "whatsapp" | "email" | "both";

export type TemplateItem = {
  _id: string;
  name: string;
  type: string;
  message: string;
  isActive: boolean;
  channel: ChannelType;
};

export type RentalItem = {
  _id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  vehicleName: string;
  vehicleRegNo: string;
  pickupDate: string;
  returnDate: string;
};

export type MessageLogItem = {
  _id: string;
  customer: string;
  channel: ChannelType;
  message: string;
  status: "Sent" | "Delivered" | "Failed" | "Read";
  createdAt: string;
};
