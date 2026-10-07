import { Text } from '@shared/components';
import { credentialLabel, type DoorCredential } from '../../types/door';

interface DoorSuccessDetailsProps {
  credential?: DoorCredential | '' | null;
  warnings?: string[];
}

/** Under a successful scan: what was recognised, and anything staff should check. */
export function DoorSuccessDetails({ credential, warnings }: DoorSuccessDetailsProps) {
  const label = credentialLabel(credential);
  const list = warnings ?? [];
  if (!label && list.length === 0) return null;
  return (
    <div className="space-y-1">
      {label ? (
        <Text variant="muted" className="text-xs">
          Recognised: {label}
        </Text>
      ) : null}
      {list.length > 0 ? (
        <ul className="space-y-0.5">
          {list.map((warning) => (
            <li key={warning} className="text-xs font-semibold text-amber-800 dark:text-amber-200">
              ⚠ {warning}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
