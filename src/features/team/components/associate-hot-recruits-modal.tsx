import type { ReactNode } from 'react';
import type { HotRecruitUser } from '@/features/team/associate-tracker/services/associate-tracker-service';
import {
  ProspectTrackerListModal,
  type ProspectTrackerListUser,
} from '@/features/team/prospect/components/prospect-tracker-list-modal';

interface AssociateHotRecruitsModalProps {
  open: boolean;
  ownerName: string;
  loading: boolean;
  recruits: HotRecruitUser[];
  recruitSummary?: RecruitSummary;
  loadingMore?: boolean;
  onReachEnd?: () => void;
  onClose: () => void;
}

interface RecruitSummary {
  currentMonthPersonal: number | null | undefined;
  currentMonthTeam: number | null | undefined;
  rollingThreeMonthPersonal: number | null | undefined;
  rollingThreeMonthTeam: number | null | undefined;
}

interface AssociateUserListModalProps {
  open: boolean;
  ownerName: string;
  loading: boolean;
  users: HotRecruitUser[];
  title: string;
  introText: string;
  loadingText: string;
  emptyText: string;
  headerContent?: ReactNode;
  loadingMore?: boolean;
  onReachEnd?: () => void;
  onClose: () => void;
}

interface AssociateClientUsersModalProps {
  open: boolean;
  ownerName: string;
  loading: boolean;
  users: HotRecruitUser[];
  pointsSummary?: PointsSummary;
  loadingMore?: boolean;
  onReachEnd?: () => void;
  onClose: () => void;
}

interface AssociateLicensedUsersModalProps {
  open: boolean;
  ownerName: string;
  loading: boolean;
  users: HotRecruitUser[];
  loadingMore?: boolean;
  onReachEnd?: () => void;
  onClose: () => void;
}

function AssociateUserListModal({
  open,
  ownerName,
  loading,
  users,
  title,
  introText,
  loadingText,
  emptyText,
  headerContent,
  loadingMore,
  onReachEnd,
  onClose,
}: AssociateUserListModalProps) {
  return (
    <ProspectTrackerListModal
      open={open}
      ownerName={ownerName}
      loading={loading}
      users={users as ProspectTrackerListUser[]}
      title={title}
      introText={introText}
      loadingText={loadingText}
      emptyText={emptyText}
      headerContent={headerContent}
      loadingMore={loadingMore}
      onReachEnd={onReachEnd}
      onClose={onClose}
    />
  );
}

interface PointsSummary {
  currentMonthPersonal: number | null | undefined;
  currentMonthTeam: number | null | undefined;
  pendingPersonal: number | null | undefined;
  pendingTeam: number | null | undefined;
  rollingThreeMonthPersonal: number | null | undefined;
  rollingThreeMonthTeam: number | null | undefined;
}

function RecruitSummaryCard({
  title,
  personalRecruits,
  teamRecruits,
}: {
  title: string;
  personalRecruits: number | null | undefined;
  teamRecruits: number | null | undefined;
}) {
  return (
    <div className="w-60 rounded-lg border border-white/10 bg-black/30 px-5 py-3 shadow-sm">
      <div className="mb-2 text-center text-[10px] uppercase tracking-widest text-white/60">{title}</div>
      <div className="grid grid-cols-2 divide-x divide-white/10">
        <div className="pr-3 text-center">
          <div className="text-[10px] font-semibold text-amber-300">Personal Recruits</div>
          <div className="mt-1 text-2xl font-semibold text-white">{personalRecruits ?? 0}</div>
        </div>
        <div className="pl-3 text-center">
          <div className="text-[10px] font-semibold text-amber-300">Team Recruits</div>
          <div className="mt-1 text-2xl font-semibold text-white">{teamRecruits ?? 0}</div>
        </div>
      </div>
    </div>
  );
}

function formatPoints(value: number | null | undefined): string {
  return Number(value || 0).toLocaleString();
}

function pointsValueClassName(value: string): string {
  if (value.length > 13) return 'text-xs';
  if (value.length > 10) return 'text-sm';
  if (value.length > 8) return 'text-base';
  return 'text-2xl';
}

function PointsSummaryCard({
  title,
  personalPoints,
  teamPoints,
  highlight = false,
}: {
  title: string;
  personalPoints: number | null | undefined;
  teamPoints: number | null | undefined;
  highlight?: boolean;
}) {
  const formattedPersonalPoints = formatPoints(personalPoints);
  const formattedTeamPoints = formatPoints(teamPoints);

  return (
    <div
      className={`w-80 rounded-lg bg-black/30 px-4 py-3 shadow-sm ${
        highlight ? 'border border-amber-400/60' : 'border border-white/10'
      }`}
    >
      <div className={`mb-2 text-center text-[10px] uppercase tracking-widest ${highlight ? 'text-amber-300' : 'text-white/60'}`}>
        {title}
      </div>
      <div className="grid grid-cols-2 divide-x divide-white/10">
        <div className="min-w-0 pr-3 text-center">
          <div className="text-[10px] font-semibold text-amber-300">Personal Points</div>
          <div
            className={`mt-1 whitespace-nowrap font-semibold tabular-nums text-white ${pointsValueClassName(formattedPersonalPoints)}`}
            title={formattedPersonalPoints}
          >
            {formattedPersonalPoints}
          </div>
        </div>
        <div className="min-w-0 pl-3 text-center">
          <div className="text-[10px] font-semibold text-amber-300">Team Points</div>
          <div
            className={`mt-1 whitespace-nowrap font-semibold tabular-nums text-white ${pointsValueClassName(formattedTeamPoints)}`}
            title={formattedTeamPoints}
          >
            {formattedTeamPoints}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AssociateHotRecruitsModal(props: AssociateHotRecruitsModalProps) {
  const summary = props.recruitSummary;

  return (
    <AssociateUserListModal
      open={props.open}
      ownerName={props.ownerName}
      loading={props.loading}
      users={props.recruits}
      title="Hot Recruits - {ownerName}"
      introText="Showing users recruited by {ownerName} that are marked Hot."
      loadingText="Loading hot recruits..."
      emptyText="No hot recruits found."
      headerContent={
        summary ? (
          <div className="flex items-center justify-between gap-3">
            <RecruitSummaryCard
              title="This Month"
              personalRecruits={summary.currentMonthPersonal}
              teamRecruits={summary.currentMonthTeam}
            />
            <RecruitSummaryCard
              title="Rolling 3 Months"
              personalRecruits={summary.rollingThreeMonthPersonal}
              teamRecruits={summary.rollingThreeMonthTeam}
            />
          </div>
        ) : undefined
      }
      loadingMore={props.loadingMore}
      onReachEnd={props.onReachEnd}
      onClose={props.onClose}
    />
  );
}

export function AssociateClientUsersModal(props: AssociateClientUsersModalProps) {
  const summary = props.pointsSummary;

  return (
    <AssociateUserListModal
      open={props.open}
      ownerName={props.ownerName}
      loading={props.loading}
      users={props.users}
      title="45k Personal Points - {ownerName}"
      introText="Showing users recruited by {ownerName} who are clients."
      loadingText="Loading client users..."
      emptyText="No client users found."
      headerContent={
        summary ? (
          <div className="flex items-center justify-between gap-3">
            <PointsSummaryCard
              title="This Month"
              personalPoints={summary.currentMonthPersonal}
              teamPoints={summary.currentMonthTeam}
            />
            <PointsSummaryCard
              title="Pending Points"
              personalPoints={summary.pendingPersonal}
              teamPoints={summary.pendingTeam}
              highlight
            />
            <PointsSummaryCard
              title="Rolling 3 Months"
              personalPoints={summary.rollingThreeMonthPersonal}
              teamPoints={summary.rollingThreeMonthTeam}
            />
          </div>
        ) : undefined
      }
      loadingMore={props.loadingMore}
      onReachEnd={props.onReachEnd}
      onClose={props.onClose}
    />
  );
}

export function AssociateLicensedUsersModal(props: AssociateLicensedUsersModalProps) {
  return (
    <AssociateUserListModal
      open={props.open}
      ownerName={props.ownerName}
      loading={props.loading}
      users={props.users}
      title="3 Licenses - {ownerName}"
      introText="Showing users recruited by {ownerName} whose license flag is true."
      loadingText="Loading licensed users..."
      emptyText="No licensed users found."
      loadingMore={props.loadingMore}
      onReachEnd={props.onReachEnd}
      onClose={props.onClose}
    />
  );
}
