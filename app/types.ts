export interface InventoryItem {
  item_no: string;
  name: string;
  quantity: number;
  available: number;
  price: number | null;
  location: string | null;
  resources: string | null;
}

export interface IssueRow {
  id: string;
  issue_id: string;
  item_no: string;
  quantity: number;
  member_id: string;
  project_id: string;
  issued_date: string;
  return_date: string | null;
  returned: boolean;
}

export interface Project {
  project_id: string;
  project_name: string;
}
