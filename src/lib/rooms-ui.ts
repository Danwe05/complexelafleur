import type { Room } from "./types";

export { amenityIconFor as amenityIcon, amenityLabel } from "./amenities";

/** Photo de la chambre : celle saisie dans l'admin, sinon /public/images/rooms/<slug>.jpg. */
export function roomPhoto(room: Pick<Room, "image_url" | "slug">) {
  return room.image_url || `/images/rooms/${room.slug}.jpg`;
}

/** All photos of a room (gallery from the admin), falling back to the single main photo. */
export function roomPhotos(room: Pick<Room, "image_url" | "slug" | "images">): string[] {
  const gallery = (room.images ?? []).filter(Boolean);
  return gallery.length > 0 ? gallery : [roomPhoto(room)];
}

export function guestRange(capacity: number): [number, number] {
  return [capacity <= 2 ? 1 : 2, capacity];
}
