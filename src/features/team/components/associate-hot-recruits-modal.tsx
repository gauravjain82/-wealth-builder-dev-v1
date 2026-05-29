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
  onClose: () => void;
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
  onClose: () => void;
}

interface AssociateClientUsersModalProps {
  open: boolean;
  ownerName: string;
  loading: boolean;
  users: HotRecruitUser[];
  onClose: () => void;
}

interface AssociateLicensedUsersModalProps {
  open: boolean;
  ownerName: string;
  loading: boolean;
  users: HotRecruitUser[];
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
      onClose={onClose}
    />
  );
}

export function AssociateHotRecruitsModal(props: AssociateHotRecruitsModalProps) {
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
      onClose={props.onClose}
    />
  );
}

export function AssociateClientUsersModal(props: AssociateClientUsersModalProps) {
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
      onClose={props.onClose}
    />
  );
}
