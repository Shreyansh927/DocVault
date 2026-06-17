import { oauth2Client } from "../config/googleDrive.js";
import { google } from "googleapis";


import { db } from "../db.js";
import { uploadFilesToSupabase } from "../utils/supabase-cloud-storage-users-backup.js";

const drive = google.drive({
  version: "v3",
  auth: oauth2Client,
});

export const getGoogleDriveFiles = async (req, res) => {
  try {
    const result = await db.query(
      `
  SELECT refresh_token
  FROM google_drive_accounts
  WHERE user_id = $1
  `,
      [req.user.id],
    );

    const refreshToken = result.rows[0]?.refresh_token;

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const response = await drive.files.list({
      pageSize: 1000,
      fields: "files(id,name,mimeType,parents,size,createdTime)",
    });

    const files = response.data.files;

    const folders = files.filter(
      (file) => file.mimeType === "application/vnd.google-apps.folder",
    );

    const regularFiles = files.filter(
      (file) => file.mimeType !== "application/vnd.google-apps.folder",
    );

    const folderMap = {};

    folders.forEach((folder) => {
      folderMap[folder.id] = {
        ...folder,
        children: [],
      };
    });

    regularFiles.forEach((file) => {
      const parentId = file.parents?.[0];

      if (parentId && folderMap[parentId]) {
        folderMap[parentId].children.push(file);
      }
    });

    const rootFiles = regularFiles.filter(
      (file) => !file.parents || !folderMap[file.parents[0]],
    );

    console.log(response.data.files);

    return res.json({
      folders: Object.values(folderMap),
      rootFiles,
    });

    return res.status(200).json({ response });
  } catch (error) {
    console.error("FULL ERROR:");
    console.error(error);

    console.error("MESSAGE:", error.message);

    console.error("RESPONSE:", error.response?.data);

    res.status(500).json({
      message: error.message,
      response: error.response?.data,
      stack: error.stack,
    });
  }
};

export const importGoogleDriveFiles = async (req, res) => {
  try {
    const { fileIds, folderId } = req.body;

    const refreshTokenResult = await db.query(
      `
      SELECT refresh_token
      FROM google_drive_accounts
      WHERE user_id = $1
      `,
      [req.user.id],
    );

    const refreshToken = refreshTokenResult.rows[0]?.refresh_token;

    if (!refreshToken) {
      return res.status(400).json({
        error: "Google Drive not connected",
      });
    }

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const drive = google.drive({
      version: "v3",
      auth: oauth2Client,
    });

    const importedFiles = [];

    for (const fileId of fileIds) {
      // metadata
      const metadata = await drive.files.get({
        fileId,
        fields: "id,name,mimeType,size",
      });

      // file content
      const fileResponse = await drive.files.get(
        {
          fileId,
          alt: "media",
        },
        {
          responseType: "arraybuffer",
        },
      );

      const buffer = Buffer.from(fileResponse.data);

      const fileName = metadata.data.name;

      
      const uploadedFile = await uploadFilesToSupabase(req.user.id, folderId, {
        originalname: fileName,
        buffer,
        mimetype: metadata.data.mimeType,
      });

      const storagePath = uploadedFile.storagePath;
      await db.query(
        `
  INSERT INTO files (
    folder_id,
    filename,
    encrypted_name,
    encrypted_link,
    file_type,
    size,
    storage
  )
  VALUES ($1,$2,$3,$4,$5,$6,$7)
  `,
        [
          folderId,
          fileName,
          fileName,
          storagePath,
          metadata.data.mimeType,
          metadata.data.size || 0,
          "supabase",
        ],
      );

      importedFiles.push({
        id: fileId,
        name: fileName,
      });
    }

    return res.status(200).json({
      success: true,
      importedFiles,
      message: "upload successfull"
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message,
    });
  }
};
