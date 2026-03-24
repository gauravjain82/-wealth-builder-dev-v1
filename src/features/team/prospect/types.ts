import { Plan } from '@/core/types';
import { LevelCode } from '@/core/constants/levels';

export interface AddAgentFormData {
  amaDate: string;
  agencyCode: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  poloSize: string;
  spouseName: string;
  spousePhone: string;
  spousePoloSize: string;
  recruiter: string;
  recruiterId: number | null;
  leader: string;
  leaderId: number | null;
  level: LevelCode;
  plan: string;
}

export const defaultAddAgentForm: AddAgentFormData = {
  amaDate: new Date().toISOString().split('T')[0],
  agencyCode: '',
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  poloSize: '',
  spouseName: '',
  spousePhone: '',
  spousePoloSize: '',
  recruiter: '',
  recruiterId: null,
  leader: '',
  leaderId: null,
  level: LevelCode.TA,
  plan: Plan.NewAgent,
};
