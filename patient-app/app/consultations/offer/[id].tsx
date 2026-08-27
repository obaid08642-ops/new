// @ts-nocheck
// app/consultations/offer/[id].tsx
// E2: this screen was fully broken — `promos` was a hardcoded empty array so
// `offer[2]` crashed on render, `providers` was undefined, and the book button
// pointed at a non-existent route. The real offer experience lives in
// /offers/[id] (fetches /offers/:id from the backend). Redirect there.
import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ConsultationOfferRedirect() {
  const { id } = useLocalSearchParams();
  return <Redirect href={{ pathname: '/offers/[id]', params: { id: String(id ?? '') } }} />;
}
