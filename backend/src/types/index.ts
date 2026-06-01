export type AuthUser = {
  id: number;
  username: string;
  createdAt: string;
};

export type TaskRecord = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  payload: Record<string, unknown>;
};
