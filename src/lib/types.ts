export type Locale = "fr" | "en";

export type Settings = {
  id: number;
  hotel_name: string;
  phone: string | null;
  phone2: string | null;
  /** Deuxième numéro de réservation */
  phone3: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  maps_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  checkin_time: string;
  checkout_time: string;
  /** Horaires d'ouverture du complexe, « HH:MM » */
  open_time: string;
  close_time: string;
  /** Petit-déjeuner, « HH:MM » ; vide = service masqué */
  breakfast_start: string | null;
  breakfast_end: string | null;
  deposit_percent: number;
  hold_hours: number;
  manager_email: string | null;
  cancellation_policy_fr: string | null;
  cancellation_policy_en: string | null;
};

export type Room = {
  id: string;
  slug: string;
  name_fr: string;
  name_en: string;
  description_fr: string;
  description_en: string;
  price_per_night: number;
  capacity: number;
  quantity: number;
  amenities: string[];
  image_url: string | null;
  /** Gallery (slider). Empty/absent until the 0002 migration is applied. */
  images?: string[] | null;
  sort_order: number;
  active: boolean;
};

export type BookingStatus =
  | "awaiting_payment"
  | "pending"
  | "confirmed"
  | "declined"
  | "cancelled"
  | "expired";

export type PaymentStatus = "none" | "pending" | "paid" | "failed" | "refund_due" | "refunded";

export type Booking = {
  id: string;
  reference: string;
  room_id: string;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  notes: string | null;
  locale: Locale;
  total_amount: number;
  deposit_amount: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  hold_expires_at: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};
