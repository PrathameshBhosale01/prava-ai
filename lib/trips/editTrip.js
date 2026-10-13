// Pure helpers shared by the New Trip and Edit Trip forms: turning a saved trip into form
// state, form state into the fields to save, and deciding what editing does to a saved plan.
// No React, no Firestore, so it is unit-tested directly.

import { getStops, routeSignature, routeToTripFields } from "./stops.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const str = (value) => (typeof value === "string" ? value : "");

/** A saved trip → everything the form needs to show it. Older trips (no `stops`) work too. */
export function tripToFormState(trip) {
  const t = trip && typeof trip === "object" ? trip : {};
  const stops = getStops(t);
  const endingAt = str(t.endingAt).trim();

  return {
    formData: {
      title: str(t.title),
      category: str(t.category),
      description: str(t.description),
      budget: Number(t.budget) > 0 ? String(t.budget) : "",
      currency: str(t.currency) || "INR",
      travelers: Number(t.travelers) > 0 ? Number(t.travelers) : 1,
      startDate: ISO_DATE.test(str(t.startDate)) ? t.startDate : "",
      interests: Array.isArray(t.interests) ? t.interests.filter((i) => typeof i === "string") : [],
      accommodation: str(t.accommodation),
      transportation: str(t.transportation),
    },
    startingFrom: str(t.startingFrom),
    stops: stops.length > 0 ? stops : [{ id: "stop-1", place: "", nights: 3 }],
    end: t.oneWay === true ? { mode: "oneWay", place: "" } : endingAt ? { mode: "elsewhere", place: endingAt } : { mode: "return", place: "" },
  };
}

/**
 * The trip fields to save, from the (already validated) form state.
 * `stops` is the cleaned list from validateRoute. Used by both create and edit, so they can't drift.
 */
export function buildTripFields({ formData, startingFrom, stops, end }) {
  return {
    title: formData.title.trim(),
    category: formData.category,
    description: formData.description.trim(),
    startingFrom: startingFrom.trim(),
    ...routeToTripFields({ stops, endingAt: end.mode === "elsewhere" ? end.place : "", oneWay: end.mode === "oneWay" }),
    budget: Number(formData.budget),
    currency: formData.currency,
    travelers: Number(formData.travelers),
    startDate: formData.startDate,
    interests: formData.interests,
    accommodation: formData.accommodation,
    transportation: formData.transportation,
  };
}

/** Did these edits change anything an itinerary depends on (cities, order, nights, modes, start/end, dates)? */
export function routeChanged(original, fields) {
  return routeSignature(original) !== routeSignature({ ...original, ...fields });
}

/**
 * What to send to Firestore when saving an edit.
 *
 * A plan saved before this feature has no route fingerprint, so after the route changes the page
 * could not tell it was out of date. In that case we stamp the plan with the fingerprint of the
 * route it was actually made for (the trip as it was before this edit), using a dotted field path
 * so the rest of the plan is untouched.
 */
export function buildUpdate(original, fields) {
  const needsStamp = routeChanged(original, fields) && original?.itinerary && typeof original.itinerary === "object" && !original.itinerary.routeSignature;
  return needsStamp ? { ...fields, "itinerary.routeSignature": routeSignature(original) } : fields;
}
