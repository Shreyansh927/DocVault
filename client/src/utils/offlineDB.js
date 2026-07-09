import { deleteDB, openDB } from "idb";

// const current_user = JSON.parse(localStorage.getItem("current-user"));

export const dbPromise = openDB(`docvault-db`, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("users")) {
      db.createObjectStore("users");
    }
  },
});

export async function saveUsers(users) {
  const db = await dbPromise;
  await db.put("users", users, "all-users");
}

export async function saveUserFolders(folders) {
  const db = await dbPromise;
  await db.put("users", folders, "all-folders");
}

export async function saveUserIndivisualFolder(folder, folderId) {
  const db = await dbPromise;
  await db.put("users", folder, `indivisual-folder-${folderId}`);
}

export async function saveUserIndivisualFile(file, folderID, fileId) {
  const db = await dbPromise;
  await db.put("users", file, `file-folderId:${folderID}-fileId:${fileId}`);
}

export async function saveFileLink(fileLinkBlob, folderId, fileID) {
  const db = await dbPromise;
  await db.put(
    "users",
    fileLinkBlob,
    `blob-folderId:${folderId}-fileID:${fileID}`,
  );
}

export async function getFileBlobLink(folderID, fileID) {
  const db = await dbPromise;
  return await db.get("users", `blob-folderId:${folderID}-fileID:${fileID}`);
}

export async function getUserIndivisualFile(folderId, fileID) {
  const db = await dbPromise;
  return await db.get("users", `file-folderId:${folderId}-fileId:${fileID}`);
}

export async function getFolder(folderId) {
  const db = await dbPromise;
  return await db.get("users", `indivisual-folder-${folderId}`);
}

export async function getUserFolders() {
  const db = await dbPromise;
  return await db.get("users", "all-folders");
}

export async function getUsers() {
  const db = await dbPromise;
  return (await db.get("users", "all-users")) || [];
}

export async function clearOfflineData() {
  await deleteDB(`docvault-db`);
}
