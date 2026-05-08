import { Schema, model, type Document, type Types } from "mongoose";

export type TaskStatus = "todo" | "in_progress" | "done";

export interface ITask {
  workspaceId: Types.ObjectId;
  projectId: Types.ObjectId;
  title: string;
  description?: string | null;
  status: TaskStatus;
  position: number;
  createdBy: Types.ObjectId;
  assigneeId?: Types.ObjectId | null;
  dueDate?: Date | null;
}

export interface ITaskDocument extends ITask, Document {}

const taskSchema = new Schema<ITaskDocument>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null, trim: true },
    status: { type: String, enum: ["todo", "in_progress", "done"], default: "todo", index: true },
    position: { type: Number, required: true, default: 0, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    dueDate: { type: Date, default: null },
  },
  { timestamps: true },
);

taskSchema.index({ workspaceId: 1, projectId: 1, status: 1, position: 1 });

export const Task = model<ITaskDocument>("Task", taskSchema);

