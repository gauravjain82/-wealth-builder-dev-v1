import { ExternalLink } from 'lucide-react';
import { Button, Checkbox, Divider, FormRow, Input, Label, Text } from '@shared/components';
import { eventService } from '../../../services/event-service';
import { getEventTheme, type EventThemeKey } from '../../../themes/registry';
import { accentColor } from '../../../utils/public-brand';
import { ImageUploadField } from '../image-upload-field';
import { ThemePicker } from '../theme-picker';
import { TabForm } from './tab-form';
import type { TabProps } from './types';
import { useTabForm } from './use-tab-form';

interface DesignForm {
  theme: EventThemeKey;
  brand_color: string;
  disable_banner_bg_color: boolean;
  event_video_url: string;
}

// BigEvent blob fields exposed as image uploads, each paired with its signed
// preview URL on the event (added to the detail serializer for the builder).
const IMAGE_FIELDS: {
  field: string;
  label: string;
  urlKey: keyof TabProps['event'];
  help?: string;
  accept?: string;
}[] = [
  { field: 'logo_blob_name', label: 'Logo', urlKey: 'logo_url' },
  { field: 'event_banner_blob_name', label: 'Event banner', urlKey: 'event_banner_url' },
  { field: 'location_banner_blob_name', label: 'Location banner', urlKey: 'location_banner_url' },
  { field: 'contact_banner_blob_name', label: 'Contact banner', urlKey: 'contact_banner_url' },
  {
    field: 'video_bg_banner_blob_name',
    label: 'Video background',
    urlKey: 'video_bg_banner_url',
    accept: 'image/*,video/mp4,video/webm',
    help: 'A short MP4/WebM loops silently behind the hero (event banner is its poster).',
  },
  { field: 'flyer_blob_name', label: 'Flyer', urlKey: 'flyer_url' },
];

/**
 * Theme, branding, banners, and media for the public landing page.
 *
 * `design_type` (Simple/Big) is no longer edited: it was never rendered and is
 * superseded by `theme`.
 */
export function DesignTab({ event, saving, onSave }: TabProps) {
  const { form, set, dirty, submit } = useTabForm<DesignForm>(
    {
      theme: getEventTheme(event.theme).key,
      brand_color: event.brand_color ?? '',
      disable_banner_bg_color: event.disable_banner_bg_color,
      event_video_url: event.event_video_url ?? '',
    },
    (data) => onSave({ ...data }),
  );

  // Persist the blob server-side, then refresh the event to get the signed URL.
  const uploadFor = (field: string) => async (file: File) => {
    await eventService.uploadImage(event.id, field, file);
    await onSave({});
  };

  // Blob fields are blank-not-null on the model, so clearing is an empty string.
  const removeFor = (field: string) => () => onSave({ [field]: '' });

  return (
    <div className="space-y-6">
      <TabForm dirty={dirty} saving={saving} onSubmit={submit}>
        <FormRow>
          <div className="flex items-center justify-between gap-3">
            <Label variant="form">Page theme</Label>
            {event.shortcut && (
              <a
                href={`/event/${event.shortcut}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Open public page <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <ThemePicker
            value={form.theme}
            onChange={(key) => set('theme', key)}
            accent={accentColor(form.brand_color, '') || undefined}
          />
          <Text variant="muted" className="text-xs">
            Themes change the look only — your content stays the same when you switch. Save,
            then open the public page to see it (only published events are public).
          </Text>
        </FormRow>

        <FormRow>
          <Label variant="form">Accent color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={accentColor(form.brand_color, getEventTheme(form.theme).defaultAccent)}
              onChange={(e) => set('brand_color', e.target.value)}
              className="h-9 w-12 cursor-pointer rounded border border-slate-200 dark:border-white/10"
              aria-label="Accent color picker"
            />
            <Input
              value={form.brand_color}
              onChange={(e) => set('brand_color', e.target.value)}
              placeholder={`Theme default (${getEventTheme(form.theme).defaultAccent})`}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => set('brand_color', '')}
              disabled={!form.brand_color}
            >
              Use theme accent
            </Button>
          </div>
          <Text variant="muted" className="text-xs">
            Buttons, highlights and the countdown use this color. Leave blank to use the
            theme&apos;s own accent.
          </Text>
        </FormRow>

        <FormRow>
          <Label variant="form">Event video URL</Label>
          <Input
            value={form.event_video_url}
            onChange={(e) => set('event_video_url', e.target.value)}
            placeholder="https://youtube.com/…"
          />
        </FormRow>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.disable_banner_bg_color}
            onChange={(e) => set('disable_banner_bg_color', e.target.checked)}
          />
          Disable banner background color
        </label>
      </TabForm>

      <Divider />

      <div className="space-y-4">
        <div>
          <Text className="text-sm font-medium">Images &amp; media</Text>
          <Text variant="muted" className="text-xs">
            Uploads and removals save immediately — no need to press Save changes.
          </Text>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {IMAGE_FIELDS.map((img) => (
            <ImageUploadField
              key={img.field}
              label={img.label}
              currentUrl={(event[img.urlKey] as string | null) ?? null}
              onUpload={uploadFor(img.field)}
              onRemove={removeFor(img.field)}
              help={img.help}
              accept={img.accept}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
