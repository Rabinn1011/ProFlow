import { Schema, model, type Document, type Types } from "mongoose";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export interface IWorkspaceMember {
  user: Types.ObjectId;
  role: WorkspaceRole;
  joinedAt: Date;
}

export interface IWorkspace {
  name: string;
  createdBy: Types.ObjectId;
  members: IWorkspaceMember[];
}

export interface IWorkspaceDocument extends IWorkspace, Document {}

const workspaceMemberSchema = new Schema<IWorkspaceMember>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["owner", "admin", "member", "viewer"], required: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const workspaceSchema = new Schema<IWorkspaceDocument>(
  {
    name: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    members: { type: [workspaceMemberSchema], default: [] },
  },
  { timestamps: true },
);

workspaceSchema.index({ name: 1, createdBy: 1 });

export const Workspace = model<IWorkspaceDocument>("Workspace", workspaceSchema);

