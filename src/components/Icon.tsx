import type { SVGProps } from "react";

const paths = {
  bed: "M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7 M3 14h18 M3 18v2 M21 18v2 M7 9V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2",
  utensils: "M6 3v7a2 2 0 0 0 2 2 M8 3v18 M10 3v7a2 2 0 0 1-2 2 M17 21V3c-2 1-3 4-3 7s1 4 3 4",
  waves: "M3 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0 M3 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0 M3 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0",
  lotus: "M12 20c-4 0-7-3-8-7 3 0 5 1 6 3 M12 20c4 0 7-3 8-7-3 0-5 1-6 3 M12 20c-3-3-3-8 0-13 3 5 3 10 0 13z",
  users: "M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1 M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M20 20v-1a3 3 0 0 0-2-2.8 M16 5.2a3 3 0 0 1 0 5.6",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1",
  wifi: "M2 9a15 15 0 0 1 20 0 M5 12.5a10 10 0 0 1 14 0 M8.5 16a5 5 0 0 1 7 0 M12 19.5h.01",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z M9 12l2 2 4-4",
  parking: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M9 17V7h4a3 3 0 0 1 0 6H9",
  headset: "M4 14v-2a8 8 0 0 1 16 0v2 M4 14h3v5H5a1 1 0 0 1-1-1v-4z M20 14h-3v5h2a1 1 0 0 0 1-1v-4z M17 19c0 1.5-2 2-5 2",
  calendar: "M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z M3 10h18 M8 3v4 M16 3v4",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M21 21l-5-5",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  snowflake: "M12 2v20 M4.2 7l15.6 10 M4.2 17L19.8 7 M9 3.5l3 2 3-2 M9 20.5l3-2 3 2",
  sofa: "M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3 M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5H3v-5z M5 18v2 M19 18v2",
  facebook: "M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8a1 1 0 0 1 1-1z",
  instagram: "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M17.5 6.5h.01",
  whatsapp: "M3 21l1.6-4.6A9 9 0 1 1 8 19.6L3 21z M9 9c0 3 3 6 6 6l1.5-1.5-2-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-2L9 9z",
  youtube: "M3 8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8z M10 9v6l5-3-5-3z",
  coffee: "M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z M17 10h1.5a2.5 2.5 0 0 1 0 5H17 M8 3v3 M12 3v3",
  fan: "M12 12a2 2 0 1 0 0-.01z M12 10c0-4 1-7 4-7 2 0 3 2 1 4l-5 3 M14 12c4 0 7 1 7 4 0 2-2 3-4 1l-3-5 M12 14c0 4-1 7-4 7-2 0-3-2-1-4l5-3 M10 12c-4 0-7-1-7-4 0-2 2-3 4-1l3 5",
  tv: "M3 6h18v11H3z M8 21h8 M12 17v4",
  droplet: "M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z",
  bath: "M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3z M6 12V6a2 2 0 0 1 4 0 M7 19l-1 2 M17 19l1 2",
  fridge: "M6 3h12v18H6z M6 10h12 M9 6v2 M9 13v3",
  desk: "M3 8h18 M5 8v12 M19 8v12 M13 8v6h6",
  lock: "M6 11h12v10H6z M8 11V7a4 4 0 0 1 8 0v4 M12 15v2",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7l1-8z",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2z M10 21h4",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4",
  route: "M3 11l18-8-8 18-2-8-8-2z",
  pin: "M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  mail: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M3 7l9 6 9-6",
  rings: "M9 20a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M15 20a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M8 6l1-2h2l1 2",
  cake: "M4 20h16 M5 20v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6 M5 16c2 1.5 4 1.5 7 0s5-1.5 7 0 M12 12V8 M12 6v.01",
  presentation: "M3 4h18 M5 4v10h14V4 M12 14v5 M8 21l4-2 4 2",
  sparkles: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z",
  jacuzzi: "M3 12h18v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-3z M7 9v.01 M11 6v.01 M15 9v.01 M18 5v.01 M5 12V8a2 2 0 0 1 4 0",
  steam: "M7 3c-2 2 2 3 0 5 M12 3c-2 2 2 3 0 5 M17 3c-2 2 2 3 0 5 M4 13h16 M6 13v6h12v-6",
  flame: "M12 3c1 3 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-8z",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5l3 2",
  check: "M5 12l5 5 9-10",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 24, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={paths[name]} />
    </svg>
  );
}
