import { MongoClient, ObjectId } from "mongodb";
import { config } from "./config.js";

if (!config.mongodbUri) throw new Error("MONGODB_URI must be set");
const client = new MongoClient(config.mongodbUri);
let database;
let booksDatabase;

export async function connectDatabase() {
  if (!database) {
    await client.connect();
    database = client.db(config.studentsDatabase);
    booksDatabase = client.db(config.booksDatabase);
    await Promise.all([
      database
        .collection("users")
        .createIndex({ student_id: 1 }, { unique: true, sparse: true }),
      database
        .collection("users")
        .createIndex({ username: 1 }, { unique: true, sparse: true }),
      database.collection("users").createIndex({ email: 1 }, { unique: true }),
      booksDatabase
        .collection("books")
        .createIndex({ isbn: 1 }, { unique: true, sparse: true }),
      booksDatabase
        .collection("copies")
        .createIndex({ barcode: 1 }, { unique: true }),
      database
        .collection("transactions")
        .createIndex({ copy_id: 1, status: 1 }),
      database
        .collection("holds")
        .createIndex({ book_id: 1, user_id: 1, status: 1 }),
      database
        .collection("notifications")
        .createIndex({ user_id: 1, created_at: -1 }),
      database
        .collection("esp_capture_requests")
        .createIndex({ status: 1, created_at: 1 }),
      database.collection("esp_scans").createIndex({ created_at: -1 }),
      database.collection("esp_scans").createIndex({ device_id: 1 }),
    ]);
  }
  return database;
}
export const db = () => {
  if (!database) throw new Error("Database has not connected yet");
  return database;
};
export const booksDb = () => {
  if (!booksDatabase) throw new Error("Database has not connected yet");
  return booksDatabase;
};
export const id = (value) => new ObjectId(String(value));
export const isId = (value) => ObjectId.isValid(String(value));
export const serialize = (document) =>
  document && { ...document, id: document._id?.toString(), _id: undefined };
export const serializeMany = (documents) => documents.map(serialize);
export async function closeDatabase() {
  await client.close();
  database = undefined;
  booksDatabase = undefined;
}
