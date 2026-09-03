import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  Heading,
  Input,
  LoadingState,
  Text,
} from '@shared/components';
import { useToastStore } from '@/store';
import { eventService } from '../services/event-service';
import { postSaleService } from '../services/post-sale-service';
import { EventSubnav } from '../components/event-subnav';
import type { BigEvent } from '../types/event';
import type { RecognitionAward, RecognitionCategory } from '../types/post-sale';

/** Recognition categories and their awards for an event. */
export default function EventRecognitionPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const id = Number(eventId);
  const addToast = useToastStore((state) => state.addToast);

  const [event, setEvent] = useState<BigEvent | null>(null);
  const [categories, setCategories] = useState<RecognitionCategory[]>([]);
  const [awards, setAwards] = useState<RecognitionAward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, awds] = await Promise.all([
        postSaleService.listRecognitionCategories(id),
        postSaleService.listRecognitionAwards(id),
      ]);
      setCategories(cats);
      setAwards(awds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recognition');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    void eventService.get(id).then(setEvent).catch(() => setEvent(null));
    void load();
  }, [id, load]);

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    try {
      await postSaleService.createRecognitionCategory(id, { name, sort_order: categories.length });
      setNewCategory('');
      await load();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to add category' });
    }
  };

  const removeCategory = async (categoryId: number) => {
    try {
      await postSaleService.deleteRecognitionCategory(id, categoryId);
      await load();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to delete' });
    }
  };

  const addAward = async (categoryId: number, payload: Partial<RecognitionAward>) => {
    try {
      await postSaleService.createRecognitionAward(id, { ...payload, category: categoryId });
      await load();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to add award' });
    }
  };

  const removeAward = async (awardId: number) => {
    try {
      await postSaleService.deleteRecognitionAward(id, awardId);
      await load();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to delete' });
    }
  };

  if (!Number.isFinite(id)) return <Text variant="muted">Invalid event.</Text>;

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h1">
          {event?.name || 'Recognition'}
        </Heading>
        <Text variant="muted">Categories and the people recognised in each</Text>
      </div>
      <EventSubnav eventId={id} />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New category name…"
          className="max-w-xs"
        />
        <Button type="button" onClick={() => void addCategory()} disabled={!newCategory.trim()}>
          Add category
        </Button>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <Text className="text-red-600">{error}</Text>
      ) : categories.length === 0 ? (
        <Text variant="muted">No recognition categories yet.</Text>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              awards={awards.filter((a) => a.category === category.id)}
              onDeleteCategory={() => void removeCategory(category.id)}
              onAddAward={(payload) => void addAward(category.id, payload)}
              onDeleteAward={(awardId) => void removeAward(awardId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CategoryCardProps {
  category: RecognitionCategory;
  awards: RecognitionAward[];
  onDeleteCategory: () => void;
  onAddAward: (payload: Partial<RecognitionAward>) => void;
  onDeleteAward: (awardId: number) => void;
}

function CategoryCard({ category, awards, onDeleteCategory, onAddAward, onDeleteAward }: CategoryCardProps) {
  const [name, setName] = useState('');
  const [agentCode, setAgentCode] = useState('');
  const [rank, setRank] = useState('');

  const submit = () => {
    if (!name.trim()) return;
    onAddAward({ recipient_name: name.trim(), agent_code: agentCode.trim(), rank: rank.trim(), sort_order: awards.length });
    setName('');
    setAgentCode('');
    setRank('');
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <Text className="font-medium">
            {category.name}
            <span className="ml-2 text-xs text-slate-500">{category.award_count} recognised</span>
          </Text>
          <Button type="button" variant="outline" size="sm" onClick={onDeleteCategory}>
            Delete
          </Button>
        </div>

        {awards.length > 0 ? (
          <table className="mb-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-1">Recipient</th>
                <th className="py-1">Agent code</th>
                <th className="py-1">Rank</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody>
              {awards.map((award) => (
                <tr key={award.id} className="border-t border-slate-100 dark:border-white/10">
                  <td className="py-1.5">{award.recipient_name}</td>
                  <td className="py-1.5">{award.agent_code || '—'}</td>
                  <td className="py-1.5">{award.rank || '—'}</td>
                  <td className="py-1.5 text-right">
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => onDeleteAward(award.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Text variant="muted" className="mb-3 text-sm">
            No recipients yet.
          </Text>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Recipient name" className="max-w-[200px]" />
          <Input value={agentCode} onChange={(e) => setAgentCode(e.target.value)} placeholder="Agent code" className="max-w-[140px]" />
          <Input value={rank} onChange={(e) => setRank(e.target.value)} placeholder="Rank" className="max-w-[120px]" />
          <Button type="button" size="sm" onClick={submit} disabled={!name.trim()}>
            Add recipient
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
