import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Button,
  Form,
  FormActions,
  FormRow,
  FormRowGroup,
  Input,
  Label,
  Modal,
  Text,
} from '@shared/components';
import { useToastStore } from '@/store';
import { eventService } from '../services/event-service';
import type { BigEvent } from '../types/event';

interface AddEventModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (event: BigEvent) => void;
}

/** Slugify a name into a safe default shortcut (lowercase, hyphenated). */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/**
 * Minimal event-creation modal. Only name + shortcut are required by the
 * backend; everything else is filled in via the builder afterwards.
 */
export function AddEventModal({ open, onClose, onCreated }: AddEventModalProps) {
  const addToast = useToastStore((state) => state.addToast);
  const [name, setName] = useState('');
  const [shortcut, setShortcut] = useState('');
  const [shortcutEdited, setShortcutEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setShortcut('');
      setShortcutEdited(false);
      setSubmitting(false);
    }
  }, [open]);

  // Auto-fill the shortcut from the name until the user edits it themselves.
  const handleNameChange = (value: string) => {
    setName(value);
    if (!shortcutEdited) setShortcut(slugify(value));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !shortcut.trim()) {
      addToast({ type: 'error', message: 'Name and shortcut are required.' });
      return;
    }
    setSubmitting(true);
    try {
      const created = await eventService.create({ name: name.trim(), shortcut: shortcut.trim() });
      addToast({ type: 'success', message: 'Event created.' });
      onCreated(created);
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to create event',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} title="Add New Event" onClose={onClose} contentClassName="max-w-lg">
      <Form onSubmit={handleSubmit}>
        <FormRowGroup columns={1}>
          <FormRow>
            <Label variant="form">Event name</Label>
            <Input value={name} onChange={(e) => handleNameChange(e.target.value)} autoFocus />
          </FormRow>
          <FormRow>
            <Label variant="form">URL shortcut</Label>
            <Input
              value={shortcut}
              onChange={(e) => {
                setShortcutEdited(true);
                setShortcut(slugify(e.target.value));
              }}
              placeholder="summit-2026"
            />
            <Text variant="muted" className="text-xs">
              Public page will be at /event/{shortcut || 'your-shortcut'}
            </Text>
          </FormRow>
        </FormRowGroup>
        <FormActions>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create event'}
          </Button>
        </FormActions>
      </Form>
    </Modal>
  );
}
