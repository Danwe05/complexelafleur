"use client";

import { deleteRoom } from "@/app/(admin)/admin/(panel)/actions";

export function DeleteRoomButton({ id, label, confirmText }: { id: string; label: string; confirmText: string }) {
  return (
    <form
      action={deleteRoom}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="btn btn-danger btn-sm" type="submit">{label}</button>
    </form>
  );
}
