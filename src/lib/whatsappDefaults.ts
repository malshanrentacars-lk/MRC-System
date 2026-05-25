import { TemplateItem } from "@/components/whatsapp/types";

export const defaultWhatsAppTemplates: TemplateItem[] = [
  {
    _id: "default-birthday",
    name: "Birthday Wish",
    type: "Birthday Wish",
    channel: "both",
    isActive: true,
    message: "Happy Birthday {customerFirstName}! Wishing you a wonderful day from {companyName}.",
  },
  {
    _id: "default-due-date",
    name: "Due Date Reminder",
    type: "Due Date Reminder",
    channel: "both",
    isActive: true,
    message: "Hi {customerName}, your rental ({vehicleName} - {vehicleRegNo}) is due on {returnDate}.",
  },
  {
    _id: "default-promo",
    name: "Promotional Message",
    type: "Promotional Message",
    channel: "both",
    isActive: true,
    message: "Special offer from {companyName}! Contact us at {companyPhone} to claim your deal.",
  },
  {
    _id: "default-completed",
    name: "Rental Completed",
    type: "Rental Completed",
    channel: "both",
    isActive: true,
    message: "Thank you {customerName} for completing rental {rentalNumber}. Total amount: {totalAmount}.",
  },
  {
    _id: "default-reservation",
    name: "Rental Reservation",
    type: "Rental Reservation",
    channel: "both",
    isActive: true,
    message: "Your reservation for {vehicleName} ({vehicleRegNo}) is confirmed from {pickupDate} to {returnDate}.",
  },
];
