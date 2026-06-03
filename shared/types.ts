export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'STAFF';

export interface ProjectConfig {
  unique_ticket_validation: boolean;
  max_extra_fields: number;
  extra_fields: Array<{
    label: string,
    type: 'text' | 'number' | 'list',
    required: boolean,
    options?: string[]
  }>;
  photo_slots: Array<{
    label: string,
    required: boolean
  }>;
}

export interface User {
  id: string;
  project_id?: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface Project {
  id: string;
  name: string;
  client_name: string;
  logo_url?: string;
  config: ProjectConfig;
  status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
}

export interface Visit {
  id: string;
  user_id: string;
  point_id: string;
  start_time: string;
  end_time?: string;
  facade_photo: string;
  location: {
    lat: number;
    lng: number;
  };
}

export interface Redemption {
  id: string;
  visit_id: string;
  dni: string;
  amount: number;
  ticket_no: string;
  reward_id: string;
  extra_data: Record<string, any>;
  photos: string[];
  location: {
    lat: number;
    lng: number;
  };
  created_at: string;
}
