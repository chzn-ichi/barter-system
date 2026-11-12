import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Check, MapPin, ShieldCheck } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import {
  HOURS,
  MONTHS,
  PLACES,
  WEEKDAYS,
  dateKey,
  formatTime,
  hourValue,
} from "@/lib/meetupUtils";

export type MeetupInitial = { date: string; time: string; location: string } | null;

export function MeetupForm({
  initial,
  submitting,
  error,
  submitLabel,
  onSubmit,
}: {
  initial: MeetupInitial;
  submitting: boolean;
  error: string | null;
  submitLabel: string;
  onSubmit: (date: string, time: string, location: string) => void;
}) {
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const initialIsPreset = initial ? PLACES.includes(initial.location) : false;

  const [date, setDate] = useState(initial?.date ?? dateKey(days[0]));
  const [time, setTime] = useState<string | null>(initial?.time ?? null);
  const [place, setPlace] = useState<string | null>(initial ? (initialIsPreset ? initial.location : "other") : null);
  const [otherText, setOtherText] = useState(initial && !initialIsPreset ? initial.location : "");

  const location = place === "other" ? otherText.trim() : place ?? "";
  const ready = !!date && !!time && !!location;

  return (
    <View>
      {error ? <ErrorBanner message={error} /> : null}

      <Text className="mb-2 text-sm font-semibold text-ink">Date</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2" className="mb-5">
        {days.map((d, i) => {
          const key = dateKey(d);
          const active = key === date;
          return (
            <Pressable
              key={key}
              onPress={() => setDate(key)}
              className={`w-14 items-center rounded-xl border py-2.5 ${
                active ? "border-primary bg-primary" : "border-border bg-card"
              }`}
            >
              <Text className={`text-[11px] ${active ? "text-card" : "text-muted"}`}>
                {i === 0 ? "Today" : WEEKDAYS[d.getDay()]}
              </Text>
              <Text className={`text-base font-semibold ${active ? "text-card" : "text-ink"}`}>{d.getDate()}</Text>
              <Text className={`text-[10px] ${active ? "text-card" : "text-muted"}`}>{MONTHS[d.getMonth()]}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text className="mb-2 text-sm font-semibold text-ink">Time</Text>
      <View className="mb-5 flex-row flex-wrap gap-2">
        {HOURS.map((h) => {
          const value = hourValue(h);
          const active = time === value;
          return (
            <Pressable
              key={value}
              onPress={() => setTime(value)}
              className={`rounded-full border px-3 py-1.5 ${
                active ? "border-primary bg-primary" : "border-border bg-card"
              }`}
            >
              <Text className={`text-xs ${active ? "text-card" : "text-ink"}`}>{formatTime(value)}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="mb-2 text-sm font-semibold text-ink">Place</Text>
      <View className="mb-5">
        {PLACES.map((p) => {
          const active = place === p;
          return (
            <Pressable
              key={p}
              onPress={() => setPlace(p)}
              className={`mb-2 flex-row items-center rounded-lg border p-3 ${
                active ? "border-primary bg-primary/5" : "border-border bg-card"
              }`}
            >
              <MapPin size={16} color="#64748B" />
              <Text className="ml-2.5 flex-1 text-sm text-ink">{p}</Text>
              {active ? <Check size={16} color="#0F2A4A" /> : null}
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setPlace("other")}
          className={`mb-2 flex-row items-center rounded-lg border p-3 ${
            place === "other" ? "border-primary bg-primary/5" : "border-border bg-card"
          }`}
        >
          <MapPin size={16} color="#64748B" />
          <Text className="ml-2.5 flex-1 text-sm text-ink">Other public place</Text>
          {place === "other" ? <Check size={16} color="#0F2A4A" /> : null}
        </Pressable>
        {place === "other" ? (
          <TextInput
            placeholder="Type a busy, public place"
            placeholderTextColor="#64748B"
            value={otherText}
            onChangeText={setOtherText}
            className="h-11 rounded-lg border border-border bg-card px-3 text-base text-ink"
          />
        ) : null}
      </View>

      <View className="mb-5 flex-row rounded-lg bg-accent/10 p-3">
        <ShieldCheck size={18} color="#2F5D9E" />
        <Text className="ml-2.5 flex-1 text-xs leading-5 text-accent">
          Meet in a busy, well-lit public place, and avoid home addresses.
        </Text>
      </View>

      <Button
        label={submitLabel}
        onPress={() => time && onSubmit(date, time, location)}
        loading={submitting}
        disabled={!ready}
      />
    </View>
  );
}