import { Schema, model, type Document, type Types } from "mongoose";

export interface IMessage {
  workspaceId: Types.ObjectId;
  projectId: Types.ObjectId;
  author: Types.ObjectId;
  body: string;
}

export interface IMessageDocument extends IMessage, Document {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export const MAX_MESSAGE_LENGTH = 2000;

const messageSchema = new Schema<IMessageDocument>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    body: { type: String, required: true, trim: true, maxlength: MAX_MESSAGE_LENGTH },
  },
  { timestamps: true },
);

// History is always "newest first within a project", which this index serves directly.
messageSchema.index({ projectId: 1, createdAt: -1 });

export const Message = model<IMessageDocument>("Message", messageSchema);
