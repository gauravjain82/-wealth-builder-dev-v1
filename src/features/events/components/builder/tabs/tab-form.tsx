import type { FormEvent, ReactNode } from 'react';
import { Button, Form, FormActions } from '@shared/components';

interface TabFormProps {
  dirty: boolean;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}

/** Standard builder-tab wrapper: fields + a save footer gated on dirty/saving. */
export function TabForm({ dirty, saving, onSubmit, children }: TabFormProps) {
  return (
    <Form onSubmit={onSubmit}>
      {children}
      <FormActions>
        <Button type="submit" disabled={!dirty || saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </FormActions>
    </Form>
  );
}
