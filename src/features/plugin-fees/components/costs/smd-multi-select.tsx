/**
 * Pick one or more SMDs for the cost form. Searches `GET costs/smds/` (active SMDs only),
 * shows each match's email, and lists the picked SMDs as removable chips with their email.
 */

import { useCallback, useRef } from "react";
import { X } from "lucide-react";

import {
  Button,
  UserAutocompleteDropdown,
  type UserAutocompleteOption,
} from "@/shared/components";

import { searchCostSmds } from "../../services/plugin-fees-service";
import type { ReviewAgent } from "../../types";

export interface PickedSmd {
  id: number;
  name: string;
  email: string | null;
  agencyCode: string | null;
}

interface SmdMultiSelectProps {
  selected: PickedSmd[];
  onChange: (smds: PickedSmd[]) => void;
  disabled?: boolean;
}

export function SmdMultiSelect({
  selected,
  onChange,
  disabled = false,
}: SmdMultiSelectProps) {
  // The dropdown hands back an option; the search results keep the SMD's email.
  const seen = useRef(new Map<number, ReviewAgent>());

  const searchOptions = useCallback(
    async (search: string): Promise<UserAutocompleteOption[]> => {
      const agents = await searchCostSmds(search);
      agents.forEach((agent) => seen.current.set(agent.id, agent));
      return agents.map((agent) => ({
        id: agent.id,
        label: agent.name,
        agencyCode: agent.agency_code ?? "",
        meta: [agent.email, agent.agency_code].filter(Boolean).join(" | "),
      }));
    },
    [],
  );

  const add = (option: UserAutocompleteOption) => {
    if (selected.some((smd) => smd.id === option.id)) return;
    const agent = seen.current.get(option.id);
    onChange([
      ...selected,
      {
        id: option.id,
        name: option.label,
        email: agent?.email ?? null,
        agencyCode: agent?.agency_code ?? (option.agencyCode || null),
      },
    ]);
  };

  const remove = (id: number) =>
    onChange(selected.filter((smd) => smd.id !== id));

  return (
    <div className="wb-pf-stack" style={{ gap: 8 }}>
      <UserAutocompleteDropdown
        selectedId={null}
        selectedLabel=""
        placeholder="Search SMDs by name, email or agency code…"
        fetchOptions={searchOptions}
        disabled={disabled}
        buttonText="ADD"
        onSelect={add}
      />
      {selected.length > 0 ? (
        <>
          <ul className="wb-pf-chips" aria-label="SMDs charged">
            {selected.map((smd) => (
              <li key={smd.id} className="wb-pf-chip">
                <span className="wb-pf-chip-text">
                  <strong>{smd.name}</strong>
                  <span className="wb-pf-muted">
                    {smd.email || smd.agencyCode || "no email"}
                  </span>
                </span>
                <button
                  type="button"
                  className="wb-pf-chip-remove"
                  aria-label={`Remove ${smd.name}`}
                  disabled={disabled}
                  onClick={() => remove(smd.id)}
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
          <div className="wb-pf-row">
            <span className="wb-pf-muted">
              {selected.length} SMD{selected.length === 1 ? "" : "s"} selected
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => onChange([])}
            >
              Clear all
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
