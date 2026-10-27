export type Venue = {
  id: number;
  name: string;
  building: string;
  kind: string;
  capacity: number;
  facilities: string[];
  open_time: string; // "08:00:00"
  close_time: string;
};

export type Role = "student" | "faculty" | "staff";

export type Booking = {
  id: number;
  venue_id: number;
  venue_name: string;
  building: string;
  title: string;
  description: string;
  category: string;
  organizer_name: string;
  organizer_role: Role;
  department: string;
  expected_count: number;
  starts_at: string; // ISO
  ends_at: string;
  status: "confirmed" | "cancelled";
};

export const CATEGORIES = ["event", "workshop", "seminar", "meeting", "club activity", "exam", "sports", "cultural"] as const;
