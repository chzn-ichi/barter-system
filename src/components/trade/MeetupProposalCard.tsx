import { Text, View } from "react-native";
import { CalendarDays, Clock, MapPin, type LucideIcon } from "lucide-react-native";
import type { MeetupProposal } from "@/lib/meetupApi";
import { formatDate, formatTime } from "@/lib/meetupUtils";
import { Button } from "@/components/ui/Button";

function Row({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <View className="mb-1.5 flex-row items-center last:mb-0">
      <Icon size={14} color="#0F2A4A" />
      <Text className="ml-2 flex-1 text-sm text-ink">{text}</Text>
    </View>
  );
}

export function MeetupProposalCard({
  proposal,
  mine,
  otherName,
  canRespond,
  responding,
  onRespond,
}: {
  proposal: MeetupProposal;
  mine: boolean;
  otherName: string;
  canRespond: boolean;
  responding: boolean;
  onRespond: (accept: boolean) => void;
}) {
  const title = proposal.isChange ? "Meetup change request" : "Meetup proposal";
  const pending = proposal.status === "pending";

  return (
    <View
      className={`w-72 max-w-[88%] rounded-xl border bg-card p-3 ${
        pending ? "border-primary" : "border-border"
      }`}
    >
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {mine ? `You proposed · ${title}` : title}
      </Text>

      <Row icon={CalendarDays} text={formatDate(proposal.date)} />
      <Row icon={Clock} text={formatTime(proposal.time)} />
      <Row icon={MapPin} text={proposal.location} />

      <View className="mt-3 border-t border-border pt-3">
        {pending && !mine && canRespond ? (
          <View>
            {proposal.isChange ? (
              <Text className="mb-2 text-xs text-muted">The current meetup stays until you accept.</Text>
            ) : null}
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button label="Decline" variant="outline" onPress={() => onRespond(false)} disabled={responding} />
              </View>
              <View className="flex-1">
                <Button label="Accept" onPress={() => onRespond(true)} loading={responding} />
              </View>
            </View>
          </View>
        ) : null}

        {pending && mine ? (
          <Text className="text-xs text-muted">
            Waiting for {otherName} to respond.
            {proposal.isChange ? " The current meetup stays until then." : ""}
          </Text>
        ) : null}

        {pending && !mine && !canRespond ? (
          <Text className="text-xs text-muted">This trade is no longer open for meetups.</Text>
        ) : null}

        {proposal.status === "accepted" ? (
          <Text className="text-xs font-medium text-success">
            {proposal.isChange ? "✓ Updated" : "✓ Confirmed"}
          </Text>
        ) : null}

        {proposal.status === "declined" ? <Text className="text-xs font-medium text-danger">Declined</Text> : null}

        {proposal.status === "superseded" ? (
          <Text className="text-xs text-muted">Replaced by a newer proposal</Text>
        ) : null}
      </View>
    </View>
  );
}