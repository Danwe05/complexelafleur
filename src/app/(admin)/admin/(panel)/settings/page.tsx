import { getSettings } from "@/lib/data";
import { getAdminDict } from "@/lib/admin-i18n";
import { saveSettings } from "../actions";
import { requireAdmin } from "@/lib/admin-auth";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin();
  const { saved, error } = await searchParams;
  const { lang, t } = await getAdminDict();
  const s = await getSettings();

  return (
    <>
      <h1 style={{ fontSize: "2rem" }}>{t.settings}</h1>
      {saved && <p className="alert alert-ok">{t.settingsSaved}</p>}
      {error && <p className="alert alert-error">{t.actionError}</p>}
      <form action={saveSettings} className="panel form-grid">
        <div className="field full">
          <label htmlFor="hotel_name">{t.hotelName}</label>
          <input id="hotel_name" name="hotel_name" defaultValue={s.hotel_name} required />
        </div>
        <div className="field">
          <label htmlFor="phone">{t.phone}</label>
          <input id="phone" name="phone" defaultValue={s.phone ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="phone2">{t.phone2}</label>
          <input id="phone2" name="phone2" defaultValue={s.phone2 ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="phone3">{t.phone3}</label>
          <input id="phone3" name="phone3" defaultValue={s.phone3 ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="open_time">{t.openTime}</label>
          <input id="open_time" name="open_time" type="time" defaultValue={s.open_time ?? "10:00"} />
        </div>
        <div className="field">
          <label htmlFor="close_time">{t.closeTime}</label>
          <input id="close_time" name="close_time" type="time" defaultValue={s.close_time ?? "19:00"} />
        </div>
        <div className="field">
          <label htmlFor="breakfast_start">{t.breakfastStart}</label>
          <input id="breakfast_start" name="breakfast_start" type="time" defaultValue={s.breakfast_start ?? ""} aria-describedby="breakfast-help" />
        </div>
        <div className="field">
          <label htmlFor="breakfast_end">{t.breakfastEnd}</label>
          <input id="breakfast_end" name="breakfast_end" type="time" defaultValue={s.breakfast_end ?? ""} aria-describedby="breakfast-help" />
          <small id="breakfast-help" className="muted">{t.breakfastHelp}</small>
        </div>
        <div className="field">
          <label htmlFor="whatsapp">{t.whatsapp}</label>
          <input id="whatsapp" name="whatsapp" defaultValue={s.whatsapp ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="email">{t.email}</label>
          <input id="email" name="email" type="email" defaultValue={s.email ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="manager_email">{t.managerEmail}</label>
          <input id="manager_email" name="manager_email" type="email" defaultValue={s.manager_email ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="address">{t.address}</label>
          <input id="address" name="address" defaultValue={s.address ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="maps_url">{t.mapsUrl}</label>
          <input id="maps_url" name="maps_url" type="url" defaultValue={s.maps_url ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="facebook_url">{t.facebook}</label>
          <input id="facebook_url" name="facebook_url" type="url" defaultValue={s.facebook_url ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="instagram_url">{t.instagram}</label>
          <input id="instagram_url" name="instagram_url" type="url" defaultValue={s.instagram_url ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="youtube_url">{t.youtube}</label>
          <input id="youtube_url" name="youtube_url" type="url" defaultValue={s.youtube_url ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="checkin_time">{t.checkin}</label>
          <input id="checkin_time" name="checkin_time" type="time" defaultValue={s.checkin_time} />
        </div>
        <div className="field">
          <label htmlFor="checkout_time">{t.checkout}</label>
          <input id="checkout_time" name="checkout_time" type="time" defaultValue={s.checkout_time} />
        </div>
        <div className="field">
          <label htmlFor="deposit_percent">{t.depositPercent}</label>
          <input id="deposit_percent" name="deposit_percent" type="number" min={0} max={100} defaultValue={s.deposit_percent} />
          <span className="help">{t.depositHelp}</span>
        </div>
        <div className="field">
          <label htmlFor="hold_hours">{t.holdHours}</label>
          <input id="hold_hours" name="hold_hours" type="number" min={1} max={168} defaultValue={s.hold_hours} />
        </div>
        <input type="hidden" name="lang" value={lang} />
        <div className="field full">
          <label htmlFor="cancellation_policy">{t.policy}</label>
          <textarea
            id="cancellation_policy"
            name="cancellation_policy"
            defaultValue={(lang === "en" ? s.cancellation_policy_en : s.cancellation_policy_fr) ?? ""}
          />
        </div>
        <div className="full">
          <button className="btn btn-primary" type="submit">{t.save}</button>
        </div>
      </form>
    </>
  );
}
