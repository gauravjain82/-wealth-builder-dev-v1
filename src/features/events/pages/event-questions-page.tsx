import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Heading,
  LoadingState,
  Select,
  Text,
  Textarea,
} from '@shared/components';
import { useToastStore } from '@/store';
import { eventService } from '../services/event-service';
import { postSaleService } from '../services/post-sale-service';
import { EventSubnav } from '../components/event-subnav';
import type { BigEvent } from '../types/event';
import type { EventQuestion, QuestionStatus } from '../types/post-sale';

const STATUS_OPTIONS: Array<{ value: '' | QuestionStatus; label: string }> = [
  { value: '', label: 'All questions' },
  { value: 'OPEN', label: 'Open' },
  { value: 'ANSWERED', label: 'Answered' },
  { value: 'CLOSED', label: 'Closed' },
];

const STATUS_VARIANT: Record<QuestionStatus, 'warning' | 'success' | 'secondary'> = {
  OPEN: 'warning',
  ANSWERED: 'success',
  CLOSED: 'secondary',
};

/** Staff view of attendee questions: answer (emails the asker) or close. */
export default function EventQuestionsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const id = Number(eventId);
  const addToast = useToastStore((state) => state.addToast);

  const [event, setEvent] = useState<BigEvent | null>(null);
  const [questions, setQuestions] = useState<EventQuestion[]>([]);
  const [statusFilter, setStatusFilter] = useState<'' | QuestionStatus>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setQuestions(await postSaleService.listQuestions(id, statusFilter || undefined));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [id, statusFilter]);

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    void eventService.get(id).then(setEvent).catch(() => setEvent(null));
  }, [id]);

  useEffect(() => {
    if (Number.isFinite(id)) void load();
  }, [id, load]);

  const answer = async (questionId: number, text: string) => {
    try {
      await postSaleService.answerQuestion(id, questionId, text);
      addToast({ type: 'success', message: 'Answer sent to the asker.' });
      await load();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to answer' });
    }
  };

  const close = async (questionId: number) => {
    try {
      await postSaleService.closeQuestion(id, questionId);
      await load();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to close' });
    }
  };

  if (!Number.isFinite(id)) return <Text variant="muted">Invalid event.</Text>;

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h1">
          {event?.name || 'Questions'}
        </Heading>
        <Text variant="muted">Questions attendees asked from the public page</Text>
      </div>
      <EventSubnav eventId={id} />

      <Select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as '' | QuestionStatus)}
        className="max-w-[200px]"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <Text className="text-red-600">{error}</Text>
      ) : questions.length === 0 ? (
        <Text variant="muted">No questions yet.</Text>
      ) : (
        <div className="space-y-4">
          {questions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              onAnswer={(text) => void answer(question.id, text)}
              onClose={() => void close(question.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface QuestionCardProps {
  question: EventQuestion;
  onAnswer: (text: string) => void;
  onClose: () => void;
}

function QuestionCard({ question, onAnswer, onClose }: QuestionCardProps) {
  const [draft, setDraft] = useState(question.answer);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <Text className="font-medium">{question.subject || 'Question'}</Text>
            <Text variant="muted" className="text-xs">
              {question.name} · {question.email}
              {question.phone ? ` · ${question.phone}` : ''}
            </Text>
          </div>
          <Badge variant={STATUS_VARIANT[question.status]}>{question.status}</Badge>
        </div>

        <Text className="mb-3 whitespace-pre-wrap text-sm">{question.message}</Text>

        {question.status !== 'CLOSED' ? (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write an answer — this is emailed to the asker…"
              rows={3}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => onAnswer(draft)} disabled={!draft.trim()}>
                {question.status === 'ANSWERED' ? 'Re-send answer' : 'Send answer'}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={onClose}>
                Close without reply
              </Button>
            </div>
          </div>
        ) : question.answer ? (
          <div className="rounded-md bg-slate-50 p-3 dark:bg-white/5">
            <Text variant="muted" className="text-xs uppercase tracking-wide">
              Answer
            </Text>
            <Text className="mt-1 whitespace-pre-wrap text-sm">{question.answer}</Text>
          </div>
        ) : null}

        {question.answered_by_detail ? (
          <Text variant="muted" className="mt-2 text-xs">
            Answered by {question.answered_by_detail.name}
            {question.answered_at ? ` on ${new Date(question.answered_at).toLocaleString()}` : ''}
          </Text>
        ) : null}
      </CardContent>
    </Card>
  );
}
