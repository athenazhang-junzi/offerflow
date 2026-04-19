export type ApplicationStatus =
  | 'prepare'
  | 'apply'
  | 'submitted'
  | 'assessment'
  | 'interview'
  | 'done';

export interface ApplicationItem {
  id: number;
  company: string;
  role: string;
  deadline: string;
  daysLeft: number;
  status: ApplicationStatus;
  materialsDone: number;
  materialsTotal: number;
  stage: string;
  aiTip: string;
  tag: string;
  interviewStage: string;
}