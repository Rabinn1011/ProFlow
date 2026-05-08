import { Schema, model, type Document, type Types } from "mongoose";

export interface IProject {
  workspaceId: Types.ObjectId;
  name: string;
  description?: string | null;
  createdBy: Types.ObjectId;
}

export interface IProjectDocument extends IProject, Document {}

const projectSchema = new Schema<IProjectDocument>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true },
);

projectSchema.index({ workspaceId: 1, name: 1 });

export const Project = model<IProjectDocument>("Project", projectSchema);

