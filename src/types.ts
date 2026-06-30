export type Role = 'citizen' | 'technician' | 'admin';
export type AdminLevel = 'community' | 'district' | 'state' | 'country';
export type IssueStatus = 'pending' | 'assigned' | 'in-progress' | 'completed' | 'closed' | 'decision-pending';
export type IssueCategory = 'Potholes' | 'Water Leakages' | 'Damaged Streetlights' | 'Waste Management' | 'Public Infrastructure';
export type IssuePriority = 'low' | 'medium' | 'high';

export interface Citizen {
  id: string;
  name: string;
  community: string;
  district: string;
  state: string;
  phoneNumber: string;
  email: string;
  pin: string;
  points: number;
  role: 'citizen';
}

export interface Technician {
  id: string;
  name: string;
  community: string;
  district: string;
  state: string;
  phoneNumber: string;
  email: string;
  pin: string;
  specialty: IssueCategory;
  rating: number;
  completedTasksCount: number;
  role: 'technician';
}

export interface AdminUser {
  id: string;
  name: string;
  role: 'admin';
  adminLevel: AdminLevel;
  community: string; // empty if country level
  district: string;  // empty if country/state level
  state: string;     // empty if country level
  email: string;
  pin: string;
}

export interface IssueReport {
  id: string;
  citizenId: string;
  citizenName: string;
  category: IssueCategory;
  description: string;
  imageBefore: string; // base64 or storage url or template url
  videoBefore?: string; // base64 or string description or template url
  imageAfter?: string; // base64 uploaded by technician after fix
  latitude: number;
  longitude: number;
  locationName: string;
  community?: string;
  district?: string;
  state?: string;
  status: IssueStatus;
  priority: IssuePriority;
  estimatedDuration: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  createdAt: string;
  resolvedAt?: string;
  aiConfidence?: number;
  aiAnalysis?: string;
  aiValidation?: string;
  rejectionReason?: string;
  pointsAwarded?: number;
  supporters?: string[];
}

export interface LeaderboardItem {
  name: string;
  role: 'citizen' | 'technician';
  score: number; // points for citizens, completed tasks or rating for technicians
  subtext: string;
}
