import { Plan } from '@/core/types';

export interface AddAgentFormData {
  amaDate: string;
  agencyCode: string;
  dateOfBirth: string;
  state: string;
  homeAddress: string;
  homeAddress2: string;
  homeCity: string;
  homeZip: string;
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
  level: number | null;
  plan: string;
}

export interface AddProspectFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  recruiter: string;
  recruiterId: number | null;
  leader: string;
  leaderId: number | null;
  gender: string;
  state: string;
  homeAddress: string;
  homeAddress2: string;
  homeCity: string;
  homeZip: string;
  birthday: string;
  howKnown: string;
  relationship: string;
  occupation: string;
  whatTold: string;
  age25Plus: boolean;
  homeowner: boolean;
  solidCareer: boolean;
  income75kPlus: boolean;
  dissatisfied: boolean;
  entrepreneurial: boolean;
  spanishPreferred: boolean;
  married: boolean;
  dependentKids: boolean;
}

export const defaultAddAgentForm: AddAgentFormData = {
  amaDate: '',
  agencyCode: '',
  dateOfBirth: '',
  state: '',
  homeAddress: '',
  homeAddress2: '',
  homeCity: '',
  homeZip: '',
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
  level: null,
  plan: Plan.NewAgent,
};

export const defaultAddProspectForm: AddProspectFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  recruiter: '',
  recruiterId: null,
  leader: '',
  leaderId: null,
  gender: '',
  state: '',
  homeAddress: '',
  homeAddress2: '',
  homeCity: '',
  homeZip: '',
  birthday: '',
  howKnown: '',
  relationship: '',
  occupation: '',
  whatTold: '',
  age25Plus: false,
  homeowner: false,
  solidCareer: false,
  income75kPlus: false,
  dissatisfied: false,
  entrepreneurial: false,
  spanishPreferred: false,
  married: false,
  dependentKids: false,
};
